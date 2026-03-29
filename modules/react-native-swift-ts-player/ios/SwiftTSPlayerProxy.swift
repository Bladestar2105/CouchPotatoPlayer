import Foundation
import Network

/// A lightweight local TCP proxy that forwards HTTP GET requests to remote
/// IPTV stream URLs. Used by VLC (and potentially other players) on Apple
/// platforms for header forwarding and ATS bypass.
///
/// **AVPlayer should NOT be pointed at this proxy for raw TS streams.**
/// AVPlayer only supports HLS (.m3u8) and progressive MP4 natively.
/// Raw MPEG-TS must be played through VLC / TVVLCKit or KSPlayer / FFmpeg.
@objc(SwiftTSPlayerProxy)
class SwiftTSPlayerProxy: NSObject {
    @objc static let shared = SwiftTSPlayerProxy()

    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.couchpotatoplayer.proxy")
    private let mapQueue = DispatchQueue(label: "com.couchpotatoplayer.proxy.mapQueue")

    private var activeConnections: [ConnectionContext] = []

    class ConnectionContext {
        let connection: NWConnection
        let delegate: ProxySessionDelegate?

        init(connection: NWConnection, delegate: ProxySessionDelegate? = nil) {
            self.connection = connection
            self.delegate = delegate
        }
    }

    @objc var port: UInt16 = 8080
    @objc var isRunning: Bool = false

    /// Maps UUID → remote stream URL
    private var streamMap: [String: String] = [:]

    // MARK: - Lifecycle

    @objc func start() {
        if isRunning { return }
        do {
            listener = try NWListener(using: .tcp, on: NWEndpoint.Port(rawValue: port)!)
            listener?.stateUpdateHandler = { [weak self] state in
                switch state {
                case .ready:
                    print("[SwiftTSPlayerProxy] Started on port \(self?.port ?? 0)")
                    self?.isRunning = true
                case .failed(let error):
                    print("[SwiftTSPlayerProxy] Failed to start: \(error)")
                    self?.isRunning = false
                case .cancelled:
                    print("[SwiftTSPlayerProxy] Cancelled")
                    self?.isRunning = false
                default:
                    break
                }
            }
            listener?.newConnectionHandler = { [weak self] connection in
                self?.handleConnection(connection)
            }
            listener?.start(queue: queue)
        } catch {
            print("[SwiftTSPlayerProxy] Initialization error: \(error)")
        }
    }

    @objc func stop() {
        listener?.cancel()
        listener = nil
        for context in activeConnections {
            context.delegate?.task?.cancel()
            context.connection.cancel()
        }
        activeConnections.removeAll()
        mapQueue.sync { streamMap.removeAll() }
        isRunning = false
    }

    // MARK: - Stream Registration

    /// Register a stream and return a local proxy URL.
    /// The returned URL can be handed to VLC, KSPlayer, or any player that
    /// supports raw TS / arbitrary HTTP streams.
    @objc func registerStream(targetUrl: String) -> String {
        let uuid = UUID().uuidString
        mapQueue.sync {
            pruneStreamMap()
            streamMap[uuid] = targetUrl
        }
        return "http://127.0.0.1:\(port)/stream/\(uuid)"
    }

    // Caller must be on mapQueue
    private func pruneStreamMap() {
        if streamMap.count > 20 {
            streamMap.removeAll()
        }
    }

    private func getTargetUrl(for uuid: String) -> String? {
        return mapQueue.sync {
            return streamMap[uuid]
        }
    }

    // MARK: - Connection Handling

    private func handleConnection(_ connection: NWConnection) {
        connection.stateUpdateHandler = { [weak self] state in
            switch state {
            case .ready:
                self?.receiveData(on: connection)
            case .failed, .cancelled:
                self?.cleanupConnection(connection)
            default:
                break
            }
        }
        connection.start(queue: queue)
    }

    private func cleanupConnection(_ connection: NWConnection) {
        if let index = activeConnections.firstIndex(where: { $0.connection === connection }) {
            activeConnections[index].delegate?.task?.cancel()
            activeConnections.remove(at: index)
        }
    }

    private func receiveData(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] content, _, _, error in
            if error != nil {
                self?.cleanupConnection(connection)
                connection.cancel()
                return
            }

            if let content = content, !content.isEmpty,
               let requestString = String(data: content, encoding: .utf8) {
                self?.processRequest(requestString, connection: connection)
            }
        }
    }

    private func processRequest(_ requestString: String, connection: NWConnection) {
        let lines = requestString.components(separatedBy: "\r\n")
        guard let requestLine = lines.first else {
            connection.cancel()
            return
        }

        let components = requestLine.components(separatedBy: " ")
        guard components.count >= 2, components[0] == "GET" else {
            connection.cancel()
            return
        }

        let path = components[1]
        let pathWithoutQuery = path.components(separatedBy: "?").first ?? path

        // Expected path: /stream/<uuid>
        let pathComponents = pathWithoutQuery.components(separatedBy: "/").filter { !$0.isEmpty }
        guard pathComponents.count == 2,
              pathComponents[0] == "stream",
              let targetUrl = getTargetUrl(for: pathComponents[1]),
              let remoteUrl = URL(string: targetUrl) else {
            sendNotFoundResponse(to: connection)
            return
        }

        // Extract headers from request for forwarding
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            if line.isEmpty { break }
            let headerParts = line.split(separator: ":", maxSplits: 1).map {
                String($0).trimmingCharacters(in: .whitespaces)
            }
            if headerParts.count == 2 {
                headers[headerParts[0]] = headerParts[1]
            }
        }

        proxyStream(to: remoteUrl, headers: headers, connection: connection)
    }

    // MARK: - Pure Pass-through Proxy

    private func proxyStream(to url: URL, headers: [String: String], connection: NWConnection) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        // Forward relevant headers
        let headersToForward = ["Range", "User-Agent", "Accept", "Accept-Language", "Referer"]
        for headerKey in headersToForward {
            if let headerValue = headers.first(where: {
                $0.key.caseInsensitiveCompare(headerKey) == .orderedSame
            })?.value {
                request.setValue(headerValue, forHTTPHeaderField: headerKey)
            }
        }

        // Always set a User-Agent
        if request.value(forHTTPHeaderField: "User-Agent") == nil {
            request.setValue("Mozilla/5.0 (AppleTV; CPU AppleTV OS 18_0 like Mac OS X)", forHTTPHeaderField: "User-Agent")
        }

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 86400 // Long-lived stream
        let delegate = ProxySessionDelegate(connection: connection)
        let context = ConnectionContext(connection: connection, delegate: delegate)
        self.activeConnections.append(context)

        let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
        let task = session.dataTask(with: request)
        delegate.task = task
        task.resume()
    }

    // MARK: - Helpers

    private func sendNotFoundResponse(to connection: NWConnection) {
        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        connection.send(content: response.data(using: .utf8)!, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }
}

// MARK: - ProxySessionDelegate (byte-for-byte pass-through)

class ProxySessionDelegate: NSObject, URLSessionDataDelegate {
    let connection: NWConnection
    var headersSent = false
    var task: URLSessionDataTask?

    init(connection: NWConnection) {
        self.connection = connection
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask,
                    didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        if !headersSent, let httpResponse = response as? HTTPURLResponse {
            let statusCode = httpResponse.statusCode
            let statusText = HTTPURLResponse.localizedString(forStatusCode: statusCode)

            // Forward the response with original content type
            let contentType = httpResponse.value(forHTTPHeaderField: "Content-Type") ?? "video/mp2t"

            var headerString = "HTTP/1.1 \(statusCode) \(statusText)\r\n"
            headerString += "Content-Type: \(contentType)\r\n"
            headerString += "Connection: keep-alive\r\n"
            headerString += "Cache-Control: no-cache\r\n"
            // No Content-Length — stream is continuous
            headerString += "\r\n"

            if let headerData = headerString.data(using: .utf8) {
                connection.send(content: headerData, completion: .contentProcessed({ [weak self] error in
                    if error != nil {
                        self?.task?.cancel()
                        self?.connection.cancel()
                    }
                }))
            }
            headersSent = true
        }
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        // Pass data through byte-for-byte — no chunked encoding, no transformation
        connection.send(content: data, completion: .contentProcessed({ [weak self] error in
            if error != nil {
                self?.task?.cancel()
                self?.connection.cancel()
            }
        }))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error as? NSError, error.code != NSURLErrorCancelled {
            print("[SwiftTSPlayerProxy] Stream ended with error: \(error.localizedDescription)")
        }
        connection.cancel()
        session.invalidateAndCancel()
    }
}