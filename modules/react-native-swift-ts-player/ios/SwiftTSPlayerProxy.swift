import Foundation
import AVFoundation
import Network

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
        weak var segmenter: TSSegmenter?

        init(connection: NWConnection, delegate: ProxySessionDelegate? = nil, segmenter: TSSegmenter? = nil) {
            self.connection = connection
            self.delegate = delegate
            self.segmenter = segmenter
        }
    }

    @objc var port: UInt16 = 8080
    @objc var isRunning: Bool = false

    // Mapping of uuids to stream info
    private var streamMap: [String: StreamInfo] = [:]

    class StreamInfo {
        let targetUrl: String
        let segmenter: TSSegmenter

        init(targetUrl: String) {
            self.targetUrl = targetUrl
            self.segmenter = TSSegmenter()
        }
    }

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
        mapQueue.sync {
            for (_, info) in streamMap {
                info.segmenter.stop()
            }
            streamMap.removeAll()
        }
        isRunning = false
    }

    @objc func registerStream(targetUrl: String) -> String {
        let uuid = UUID().uuidString
        mapQueue.sync {
            manageStreamMap()
            let info = StreamInfo(targetUrl: targetUrl)
            streamMap[uuid] = info
        }

        return "http://127.0.0.1:\(port)/\(uuid)/live.m3u8"
    }

    /// Register a stream and return the direct proxy TS URL (for VLC / non-HLS players)
    @objc func registerStreamDirect(targetUrl: String) -> String {
        let uuid = UUID().uuidString
        mapQueue.sync {
            manageStreamMap()
            let info = StreamInfo(targetUrl: targetUrl)
            streamMap[uuid] = info
        }

        return "http://127.0.0.1:\(port)/\(uuid)/direct.ts"
    }

    // Caller must be on mapQueue
    private func manageStreamMap() {
        if streamMap.count > 10 {
            for (_, info) in streamMap {
                info.segmenter.stop()
            }
            streamMap.removeAll()
        }
    }

    private func getStreamInfo(for uuid: String) -> StreamInfo? {
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
            activeConnections[index].delegate?.task?.cancel()
            activeConnections.remove(at: index)
        }
    }

    private func receiveData(on connection: NWConnection) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { [weak self] content, _, isComplete, error in
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

        // Expected paths:
        // /<uuid>/live.m3u8
        // /<uuid>/seg<N>.ts
        // /<uuid>/direct.ts

        let pathComponents = pathWithoutQuery.components(separatedBy: "/").filter { !$0.isEmpty }
        guard pathComponents.count == 2 else {
            sendNotFoundResponse(to: connection)
            return
        }

        let uuid = pathComponents[0]
        let filename = pathComponents[1]

        guard let streamInfo = getStreamInfo(for: uuid) else {
            sendNotFoundResponse(to: connection)
            return
        }

        // Extract headers from request
        var headers: [String: String] = [:]
        for line in lines.dropFirst() {
            if line.isEmpty { break }
            let headerComponents = line.split(separator: ":", maxSplits: 1).map { String($0).trimmingCharacters(in: .whitespaces) }
            if headerComponents.count == 2 {
                headers[headerComponents[0]] = headerComponents[1]
            }
        }

        if filename == "live.m3u8" {
            serveLivePlaylist(streamInfo: streamInfo, uuid: uuid, connection: connection)
        } else if filename.hasPrefix("seg") && filename.hasSuffix(".ts") {
            serveSegment(filename: filename, streamInfo: streamInfo, connection: connection)
        } else if filename == "direct.ts" {
            // Direct TS proxy pass-through for VLC and other players that handle raw TS
            proxyStreamDirect(to: URL(string: streamInfo.targetUrl)!, headers: headers, connection: connection)
        } else {
            sendNotFoundResponse(to: connection)
        }
    }

    // MARK: - Live HLS Playlist

    private func serveLivePlaylist(streamInfo: StreamInfo, uuid: String, connection: NWConnection) {
        let segmenter = streamInfo.segmenter

        // Start the segmenter if not already running
        if !segmenter.isRunning {
            segmenter.start(url: URL(string: streamInfo.targetUrl)!)
        }

        let playlist = segmenter.generatePlaylist(baseUrl: "/\(uuid)")

        let playlistData = playlist.data(using: .utf8)!
        let response = "HTTP/1.1 200 OK\r\nContent-Type: application/vnd.apple.mpegurl\r\nContent-Length: \(playlistData.count)\r\nCache-Control: no-cache, no-store\r\nConnection: close\r\n\r\n"

        var fullData = response.data(using: .utf8)!
        fullData.append(playlistData)

        connection.send(content: fullData, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }

    // MARK: - Segment Serving

    private func serveSegment(filename: String, streamInfo: StreamInfo, connection: NWConnection) {
        // Parse segment index from filename like "seg0.ts", "seg1.ts", etc.
        let name = filename.replacingOccurrences(of: "seg", with: "").replacingOccurrences(of: ".ts", with: "")
        guard let index = Int(name) else {
            sendNotFoundResponse(to: connection)
            return
        }

        let segmenter = streamInfo.segmenter
        guard let segmentData = segmenter.getSegment(at: index) else {
            // Segment not yet available — return 404 so AVPlayer retries on next playlist reload
            sendNotFoundResponse(to: connection)
            return
        }

        let header = "HTTP/1.1 200 OK\r\nContent-Type: video/mp2t\r\nContent-Length: \(segmentData.count)\r\nCache-Control: no-cache\r\nConnection: close\r\n\r\n"

        var fullData = header.data(using: .utf8)!
        fullData.append(segmentData)

        connection.send(content: fullData, completion: .contentProcessed({ [weak self] _ in
            self?.cleanupConnection(connection)
            connection.cancel()
        }))
    }

    // MARK: - Direct TS proxy (for VLC)

    private func proxyStreamDirect(to url: URL, headers: [String: String], connection: NWConnection) {
        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        let headersToForward = ["Range", "User-Agent", "Accept", "Accept-Language"]
        for headerKey in headersToForward {
            if let headerValue = headers.first(where: { $0.key.caseInsensitiveCompare(headerKey) == .orderedSame })?.value {
                request.setValue(headerValue, forHTTPHeaderField: headerKey)
            }
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

// MARK: - TSSegmenter
// Fetches a live TS stream from the upstream URL, splits it into fixed-duration
// segments in memory, and generates a rolling live HLS playlist for AVPlayer.

class TSSegmenter: NSObject, URLSessionDataDelegate {
    private let segmentQueue = DispatchQueue(label: "com.couchpotatoplayer.segmenter")

    // Each segment targets ~2 seconds of data. For a typical IPTV stream at
    // 3-5 Mbps this is roughly 750KB–1.25MB per segment.
    private let targetSegmentDuration: TimeInterval = 2.0
    // Approximate bytes per segment — recalculated dynamically from bitrate
    private var targetSegmentBytes: Int = 800_000 // Initial conservative estimate (~3.2 Mbps)

    // Rolling window of segments kept in memory
    private let maxSegments = 8

    private var segments: [(index: Int, data: Data, duration: TimeInterval)] = []
    private var currentSegmentData = Data()
    private var currentSegmentStart: Date = Date()
    private var nextSegmentIndex: Int = 0

    private var session: URLSession?
    private var dataTask: URLSessionDataTask?
    private(set) var isRunning = false

    // Bitrate estimation
    private var totalBytesReceived: Int = 0
    private var streamStartTime: Date?

    func start(url: URL) {
        guard !isRunning else { return }
        isRunning = true

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")

        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 86400
        session = URLSession(configuration: config, delegate: self, delegateQueue: nil)
        dataTask = session?.dataTask(with: request)
        currentSegmentStart = Date()
        streamStartTime = Date()
        dataTask?.resume()
    }

    func stop() {
        isRunning = false
        dataTask?.cancel()
        session?.invalidateAndCancel()
        session = nil
        dataTask = nil
        segmentQueue.sync {
            segments.removeAll()
            currentSegmentData = Data()
            nextSegmentIndex = 0
            totalBytesReceived = 0
            streamStartTime = nil
        }
    }

    // MARK: URLSessionDataDelegate

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        // Accept the response regardless of status to keep the stream open
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        segmentQueue.sync {
            currentSegmentData.append(data)
            totalBytesReceived += data.count

            // Dynamically adjust target segment size based on observed bitrate
            if let startTime = streamStartTime {
                let elapsed = Date().timeIntervalSince(startTime)
                if elapsed > 1.0 {
                    let bytesPerSecond = Double(totalBytesReceived) / elapsed
                    targetSegmentBytes = max(100_000, Int(bytesPerSecond * targetSegmentDuration))
                }
            }

            // Check if we have enough data for a segment
            let elapsed = Date().timeIntervalSince(currentSegmentStart)
            if currentSegmentData.count >= targetSegmentBytes || elapsed >= targetSegmentDuration + 0.5 {
                finalizeCurrentSegment()
            }
        }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if let error = error {
            print("[TSSegmenter] Stream ended with error: \(error.localizedDescription)")
        } else {
            print("[TSSegmenter] Stream ended")
        }
        // Finalize any remaining data as a final segment
        segmentQueue.sync {
            if !currentSegmentData.isEmpty {
                finalizeCurrentSegment()
            }
        }
        isRunning = false
    }

    // MARK: Segment management (must be called on segmentQueue)

    private func finalizeCurrentSegment() {
        guard !currentSegmentData.isEmpty else { return }

        let duration = Date().timeIntervalSince(currentSegmentStart)
        let segment = (index: nextSegmentIndex, data: currentSegmentData, duration: max(duration, 0.5))
        segments.append(segment)
        nextSegmentIndex += 1
        currentSegmentData = Data()
        currentSegmentStart = Date()

        // Trim old segments beyond the rolling window
        while segments.count > maxSegments {
            segments.removeFirst()
        }
    }

    // MARK: Playlist generation

    func generatePlaylist(baseUrl: String) -> String {
        return segmentQueue.sync {
            // If no segments yet, return a playlist that tells AVPlayer to wait
            if segments.isEmpty {
                // Return a minimal live playlist with no segments yet — AVPlayer will
                // reload after the target duration
                return """
                #EXTM3U
                #EXT-X-VERSION:3
                #EXT-X-TARGETDURATION:3
                #EXT-X-MEDIA-SEQUENCE:0
                
                """
            }

            let targetDuration = Int(ceil(segments.map { $0.duration }.max() ?? targetSegmentDuration))
            let mediaSequence = segments.first?.index ?? 0

            var playlist = "#EXTM3U\n"
            playlist += "#EXT-X-VERSION:3\n"
            playlist += "#EXT-X-TARGETDURATION:\(targetDuration)\n"
            playlist += "#EXT-X-MEDIA-SEQUENCE:\(mediaSequence)\n"

            for segment in segments {
                playlist += "#EXTINF:\(String(format: "%.3f", segment.duration)),\n"
                playlist += "\(baseUrl)/seg\(segment.index).ts\n"
            }

            return playlist
        }
    }

    // MARK: Segment data access

    func getSegment(at index: Int) -> Data? {
        return segmentQueue.sync {
            return segments.first(where: { $0.index == index })?.data
        }
    }
}

// MARK: - ProxySessionDelegate (for direct TS pass-through)

class ProxySessionDelegate: NSObject, URLSessionDataDelegate {
    let connection: NWConnection
    var headersSent = false
    var task: URLSessionDataTask?

    init(connection: NWConnection) {
        self.connection = connection
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive response: URLResponse, completionHandler: @escaping (URLSession.ResponseDisposition) -> Void) {
        if !headersSent, let httpResponse = response as? HTTPURLResponse {
            let statusCode = httpResponse.statusCode
            let statusText = HTTPURLResponse.localizedString(forStatusCode: statusCode)
            var headerString = "HTTP/1.1 \(statusCode) \(statusText)\r\n"
            headerString += "Content-Type: video/mp2t\r\n"
            headerString += "Connection: keep-alive\r\n"
            headerString += "Transfer-Encoding: chunked\r\n"
            headerString += "Cache-Control: no-cache\r\n"
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
        // Send data as chunked transfer encoding
        let chunkHeader = String(format: "%X\r\n", data.count)
        var chunkData = chunkHeader.data(using: .utf8)!
        chunkData.append(data)
        chunkData.append("\r\n".data(using: .utf8)!)

        connection.send(content: chunkData, completion: .contentProcessed({ [weak self] error in
            if error != nil {
                self?.task?.cancel()
                self?.connection.cancel()
            }
        }))
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        // Send final chunk terminator
        if headersSent {
            let terminator = "0\r\n\r\n".data(using: .utf8)!
            connection.send(content: terminator, completion: .contentProcessed({ [weak self] _ in
                self?.connection.cancel()
            }))
        } else {
            connection.cancel()
        }
        session.invalidateAndCancel()
    }
}