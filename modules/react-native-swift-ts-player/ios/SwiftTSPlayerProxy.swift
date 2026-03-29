import Foundation
import Network

/// A lightweight local TCP proxy that forwards HTTP GET requests to remote
/// IPTV stream URLs.  This is used by VLC (and potentially other players) on
/// Apple platforms to ensure proper header forwarding and to work around
/// App Transport Security restrictions for plain-HTTP streams.
///
/// **AVPlayer should NOT be pointed at this proxy for raw TS streams.**
/// AVPlayer only supports HLS (.m3u8) and progressive MP4 natively.
/// Raw MPEG-TS must be played through VLC / TVVLCKit.
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
    /// The returned URL can be handed to VLC or any player that supports
    /// raw TS / arbitrary HTTP streams.
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
        return mapQueue.sync { streamMap[uuid] }
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

        // Expected: /stream/<uuid>
        let pathComponents = pathWithoutQuery.components(separatedBy: "/").filter { !$0.isEmpty }
        guard pathComponents.count == 2, pathComponents[0] == "stream" else {
            sendResponse(status: 404, body: "Not Found", to: connection)
            return
        }

        let uuid = pathComponents[1]
        guard let targetUrlString = getTargetUrl(for: uuid),
              let targetUrl = URL(string: targetUrlString) else {
            sendResponse(status: 404, body: "Stream not found", to: connection)
            return
        }

        // Extract request headers
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            if line.isEmpty { break }
            let parts = line.split(separator: ":", maxSplits: 1).map { String($0).trimmingCharacters(in: .whitespaces) }
            if parts.count == 2 {
                headers[parts[0]] = parts[1]
            }
        }

        proxyStream(to: targetUrl, headers: headers, connection: connection)
    }

    // MARK: - Stream Proxying

    private func proxyStream(to url: URL, headers: [String: String], connection: NWConnection) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")

        // Forward select client headers
        let forwardHeaders = ["Range", "Accept", "Accept-Language", "Accept-Encoding"]
        for key in forwardHeaders {
            if let value = headers.first(where: { $0.key.caseInsensitiveCompare(key) == .orderedSame })?.value {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 86400 // Long-lived stream

        let delegate = ProxySessionDelegate(connection: connection)
        let context = ConnectionContext(connection: connection, delegate: delegate)
        activeConnections.append(context)

        let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
        let task = session.dataTask(with: request)
        delegate.task = task
        task.resume()
    }

    // MARK: - Helpers

    private func sendResponse(status: Int, body: String, to connection: NWConnection) {
        let statusText: String
        switch status {
        case 200: statusText = "OK"
        case 404: statusText = "Not Found"
        case 500: statusText = "Internal Server Error"
        default:  statusText = "Error"
        }
        let bodyData = body.data(using: .utf8) ?? Data()
        let response = "HTTP/1.1 \(status) \(statusText)\r\nContent-Length: \(bodyData.count)\r\nConnection: close\r\n\r\n"
        var fullData = response.data(using: .utf8)!
        fullData.append(bodyData)
        connection.send(content: fullData, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }
}

// MARK: - ProxySessionDelegate
/// Forwards the remote HTTP response (headers + body) back to the local
/// TCP client byte-for-byte.  Uses raw streaming (no chunked encoding) so
/// that VLC receives an uninterrupted TS byte stream.

class ProxySessionDelegate: NSObject, URLSessionDataDelegate {
    let connection: NWConnection
    var headersSent = false
    var task: URLSessionDataTask?

    init(connection: NWConnection) {
        self.connection = connection
    }

    func urlSession(_ session: URLSession,
                    dataTask: URLSessionDataTask,
                    didReceive response: URLResponse,
                    completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        guard !headersSent, let httpResponse = response as? HTTPURLResponse else {
            completionHandler(.allow)
            return
        }

        let statusCode = httpResponse.statusCode
        let statusText = HTTPURLResponse.localizedString(forStatusCode: statusCode)
        var headerString = "HTTP/1.1 \(statusCode) \(statusText)\r\n"

        // Forward all headers except those that would confuse the local player
        let skipHeaders: Set<String> = ["transfer-encoding", "content-encoding", "connection"]
        for (key, value) in httpResponse.allHeaderFields {
            if let k = key as? String, let v = value as? String {
                if !skipHeaders.contains(k.lowercased()) {
                    headerString += "\(k): \(v)\r\n"
                }
            }
        }

        // Ensure Content-Type is set for TS streams
        if httpResponse.allHeaderFields["Content-Type"] == nil {
            headerString += "Content-Type: video/mp2t\r\n"
        }
        headerString += "Connection: close\r\n"
        headerString += "\r\n"

        if let data = headerString.data(using: .utf8) {
            connection.send(content: data, completion: .contentProcessed({ [weak self] error in
                if error != nil {
                    self?.task?.cancel()
                    self?.connection.cancel()
                }
            }))
        }
        headersSent = true
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession,
                    dataTask: URLSessionDataTask,
                    didReceive data: Data) {
        connection.send(content: data, completion: .contentProcessed({ [weak self] error in
            if error != nil {
                self?.task?.cancel()
                self?.connection.cancel()
            }
        }))
    }

    func urlSession(_ session: URLSession,
                    task sessionTask: URLSessionTask,
                    didCompleteWithError error: Error?) {
        if let error = error, (error as NSError).code != NSURLErrorCancelled {
            print("[SwiftTSPlayerProxy] Upstream ended: \(error.localizedDescription)")
        }
        connection.cancel()
        session.invalidateAndCancel()
    }
}