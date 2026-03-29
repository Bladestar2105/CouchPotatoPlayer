import Foundation
import AVFoundation
import Network

@objc(SwiftTSPlayerProxy)
class SwiftTSPlayerProxy: NSObject {
    @objc static let shared = SwiftTSPlayerProxy()

    private var listener: NWListener?
    private let queue = DispatchQueue(label: "com.couchpotatoplayer.proxy")
    private let mapQueue = DispatchQueue(label: "com.couchpotatoplayer.proxy.mapQueue")

    // Use an Array of objects to avoid Hashable requirement on NWConnection
    private var activeConnections: [ConnectionContext] = []

    class ConnectionContext {
        let connection: NWConnection
        let delegate: ProxySessionDelegate

        init(connection: NWConnection, delegate: ProxySessionDelegate) {
            self.connection = connection
            self.delegate = delegate
        }
    }

    @objc var port: UInt16 = 8080
    @objc var isRunning: Bool = false

    // Mapping of uuids to target URLs
    private var streamMap: [String: String] = [:]

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
            context.delegate.task?.cancel()
            context.connection.cancel()
        }
        activeConnections.removeAll()
        mapQueue.sync {
            streamMap.removeAll()
        }
        isRunning = false
    }

    @objc func registerStream(targetUrl: String) -> String {
        let uuid = UUID().uuidString
        mapQueue.sync {
            manageStreamMap()
            streamMap[uuid] = targetUrl
        }

        // Return the local proxy URL for the m3u8 playlist
        return "http://127.0.0.1:\(port)/\(uuid)/stream.m3u8"
    }

    // Caller must be on mapQueue
    private func manageStreamMap() {
        if streamMap.count > 10 {
            streamMap.removeAll()
        }
    }

    private func getStreamUrl(for uuid: String) -> String? {
        return mapQueue.sync {
            return streamMap[uuid]
        }
    }

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
            activeConnections[index].delegate.task?.cancel()
            activeConnections.remove(at: index)
        }
    }

    private func receiveData(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 4096) { [weak self] content, _, isComplete, error in
            if error != nil {
                self?.cleanupConnection(connection)
                connection.cancel()
                return
            }

            if let content = content, !content.isEmpty,
               let requestString = String(data: content, encoding: .utf8) {
                self?.processRequest(requestString, connection: connection)
            }

            // Do not cancel the connection on `isComplete` because the client may
            // half-close the socket (EOF on receive) after sending the GET request,
            // while still waiting to receive the proxied TS stream response.
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

        // Expected paths:
        // /<uuid>/stream.m3u8
        // /<uuid>/stream.ts

        let pathComponents = pathWithoutQuery.components(separatedBy: "/").filter { !$0.isEmpty }
        guard pathComponents.count == 2 else {
            sendNotFoundResponse(to: connection)
            return
        }

        let uuid = pathComponents[0]
        let filename = pathComponents[1]

        guard let targetUrlString = getStreamUrl(for: uuid), let targetUrl = URL(string: targetUrlString) else {
            sendNotFoundResponse(to: connection)
            return
        }

        if filename == "stream.m3u8" {
            // Serve a virtual M3U8 playlist that points to our local TS endpoint
            servePlaylist(uuid: uuid, connection: connection)
        } else if filename == "stream.ts" {
            // Proxy the actual TS stream
            proxyStream(to: targetUrl, connection: connection)
        } else {
            sendNotFoundResponse(to: connection)
        }
    }

    private func servePlaylist(uuid: String, connection: NWConnection) {
        // A VOD HLS playlist tricking AVPlayer to stream the infinite TS as a progressive file.
        // This prevents AVPlayer from expecting a 10s segment and aborting or constantly polling.
        let playlist = """
        #EXTM3U
        #EXT-X-VERSION:3
        #EXT-X-TARGETDURATION:86400
        #EXT-X-MEDIA-SEQUENCE:0
        #EXT-X-PLAYLIST-TYPE:VOD
        #EXTINF:86400.0,
        stream.ts
        #EXT-X-ENDLIST
        """

        let playlistData = playlist.data(using: .utf8)!
        let response = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.apple.mpegurl\r\nContent-Length: \(playlistData.count)\r\nConnection: close\r\n\r\n"

        var fullData = response.data(using: .utf8)!
        fullData.append(playlistData)

        connection.send(content: fullData, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }

    private func proxyStream(to url: URL, connection: NWConnection) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        let config = URLSessionConfiguration.default
        let delegate = ProxySessionDelegate(connection: connection)
        let context = ConnectionContext(connection: connection, delegate: delegate)
        self.activeConnections.append(context)

        let session = URLSession(configuration: config, delegate: delegate, delegateQueue: nil)
        let task = session.dataTask(with: request)
        delegate.task = task
        task.resume()
    }

    private func sendNotFoundResponse(to connection: NWConnection) {
        let response = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
        connection.send(content: response.data(using: .utf8)!, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }
}

class ProxySessionDelegate: NSObject, URLSessionDataDelegate {
    let connection: NWConnection
    var headersSent = false
    var task: URLSessionDataTask?

    init(connection: NWConnection) {
        self.connection = connection
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        if !headersSent, let httpResponse = response as? HTTPURLResponse {
            var headerString = "HTTP/1.1 \(httpResponse.statusCode) OK\r\n"
            headerString += "Content-Type: video/mp2t\r\n" // Force TS MIME type
            headerString += "Connection: keep-alive\r\n"
            headerString += "Accept-Ranges: bytes\r\n\r\n"

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
        connection.send(content: data, completion: .contentProcessed({ [weak self] error in
            if error != nil {
                self?.task?.cancel()
                self?.connection.cancel()
            }
        }))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        self.task?.cancel()
        connection.cancel()
        session.invalidateAndCancel()
    }
}
