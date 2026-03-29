import Foundation
import UIKit
import AVFoundation
import KSPlayer

// ---------------------------------------------------------------------------
// KSPlayerView — React Native native view wrapping KSPlayer's KSPlayerLayer
//
// KSPlayer uses KSMEPlayer (FFmpegKit backend) which natively supports:
//   • Raw MPEG-TS live streams (all IPTV formats)
//   • HLS (.m3u8)
//   • MP4, MKV, AVI and all FFmpeg-supported container formats
//   • Hardware VideoToolbox decoding (H.264 / H.265) on Apple Silicon
//   • iOS 13+ and tvOS 13+
//
// Design decisions:
//   - For TS / live / unknown streams: force KSMEPlayer (FFmpegKit backend)
//   - For HLS / MP4: allow KSAVPlayer (AVFoundation, battery efficient)
//   - The local Swift proxy URL is accepted as-is (header forwarding handled upstream)
//   - Progress is reported via KSPlayerLayerDelegate, not a polling timer
// ---------------------------------------------------------------------------

// Typealias for React Native callback block
// RCTBubblingEventBlock is defined in React and available via the Objective-C bridge
typealias RCTBubblingEventBlock = ([String: Any]) -> Void

@objc(KSPlayerView)
class KSPlayerView: UIView {

    // MARK: - React Native Callbacks
    @objc var onVideoLoad: RCTBubblingEventBlock?
    @objc var onVideoError: RCTBubblingEventBlock?
    @objc var onProgress: RCTBubblingEventBlock?
    @objc var onPlayerState: RCTBubblingEventBlock?

    // MARK: - Props
    @objc var streamUrl: String = "" {
        didSet {
            guard streamUrl != oldValue, !streamUrl.isEmpty else { return }
            DispatchQueue.main.async { [weak self] in
                self?.loadStream(urlString: self?.streamUrl ?? "")
            }
        }
    }

    @objc var paused: Bool = false {
        didSet {
            guard paused != oldValue else { return }
            DispatchQueue.main.async { [weak self] in
                guard let self else { return }
                if self.paused {
                    self.playerLayer?.pause()
                } else {
                    self.playerLayer?.play()
                }
            }
        }
    }

    // MARK: - Private State
    private var playerLayer: KSPlayerLayer?

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .black
        // Force KSMEPlayer (FFmpegKit) as the primary player type for TS/live streams
        // KSAVPlayer remains as fallback for HLS/MP4 via KSOptions.secondPlayerType
        KSOptions.firstPlayerType = KSMEPlayer.self
        KSOptions.secondPlayerType = KSAVPlayer.self
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        // KSPlayerLayer is @MainActor — schedule teardown on main thread
        let layer = playerLayer
        playerLayer = nil
        if let layer {
            DispatchQueue.main.async {
                layer.delegate = nil
                layer.player.view?.removeFromSuperview()
                layer.stop()
            }
        }
    }

    // MARK: - Layout
    override func layoutSubviews() {
        super.layoutSubviews()
        // Keep player view filling our bounds
        if let renderView = playerLayer?.player.view {
            renderView.frame = bounds
        }
    }

    // MARK: - Stream Loading
    @MainActor
    private func loadStream(urlString: String) {
        tearDown()

        guard let url = URL(string: urlString) else {
            sendError("Invalid URL: \(urlString)")
            return
        }

        let options = buildOptions(for: url)

        let layer = KSPlayerLayer(
            url: url,
            isAutoPlay: !paused,
            options: options,
            delegate: self
        )
        playerLayer = layer
    }

    private func buildOptions(for url: URL) -> KSOptions {
        let options = KSOptions()

        let kind = detectStreamKind(url: url)
        let isLiveOrTS = (kind == .ts || kind == .unknown)

        // Hardware VideoToolbox decoding
        options.hardwareDecode = true

        if isLiveOrTS {
            // Live / raw TS stream — optimize for low latency
            options.nobuffer = true          // minimize buffering delay
            options.maxBufferDuration = 10   // 10 seconds max buffer
            options.preferredForwardBufferDuration = 2 // start playing quickly
        } else {
            // VOD (HLS / MP4) — optimize for smooth playback
            options.maxBufferDuration = 30
            options.preferredForwardBufferDuration = 4
        }

        // Reconnect on disconnect — essential for live IPTV streams
        // (already set in KSOptions.init via formatContextOptions["reconnect"] = 1)

        // Apple TV user agent for IPTV servers that check UA
        options.userAgent = "Mozilla/5.0 (AppleTV; CPU AppleTV OS 18_0 like Mac OS X) AppleWebKit/605.1.15"

        // Remote control center (media controls) — disable in-app to avoid conflicts
        options.registerRemoteControll = false

        return options
    }

    /// Must be called on the main thread (KSPlayerLayer is @MainActor)
    @MainActor
    private func tearDown() {
        guard let layer = playerLayer else { return }
        playerLayer = nil // nil first to prevent delegate callbacks during teardown
        layer.delegate = nil
        // Remove the render view from our view hierarchy
        layer.player.view?.removeFromSuperview()
        // Fully stop and release resources
        layer.stop()
    }

    // MARK: - Stream Kind Detection
    private enum StreamKind { case hls, mp4, ts, unknown }

    private func detectStreamKind(url: URL) -> StreamKind {
        let path = url.path.lowercased()
        if path.hasSuffix(".m3u8") || path.contains("/m3u8") { return .hls }
        if path.hasSuffix(".mp4") || path.contains(".mp4?") { return .mp4 }
        if path.hasSuffix(".ts") || path.contains(".ts?") { return .ts }
        return .unknown
    }

    // MARK: - Error Helper
    private func sendError(_ message: String) {
        print("[KSPlayerView] ❌ \(message)")
        onVideoError?(["error": message])
    }
}

// MARK: - KSPlayerLayerDelegate
@MainActor
extension KSPlayerView: KSPlayerLayerDelegate {

    func player(layer: KSPlayerLayer, state: KSPlayerState) {
        print("[KSPlayerView] State → \(state.description)")
        onPlayerState?(["state": state.description])

        switch state {
        case .readyToPlay:
            DispatchQueue.main.async { [weak self, weak layer] in
                guard let self, let layer else { return }
                self.attachRenderView(from: layer)
                let size = layer.player.naturalSize
                let duration = layer.player.duration
                self.onVideoLoad?([
                    "width": size.width,
                    "height": size.height,
                    "duration": duration,
                ])
            }

        case .error:
            sendError("KSPlayer playback error")

        default:
            break
        }
    }

    func player(layer: KSPlayerLayer, currentTime: TimeInterval, totalTime: TimeInterval) {
        onProgress?([
            "currentTime": currentTime * 1000,
            "duration": totalTime * 1000,
        ])
    }

    func player(layer: KSPlayerLayer, finish error: Error?) {
        if let error {
            sendError(error.localizedDescription)
        }
    }

    func player(layer: KSPlayerLayer, bufferedCount: Int, consumeTime: TimeInterval) {
        // Could report buffering status to JS if needed
    }

    // MARK: - Render View Attachment
    private func attachRenderView(from layer: KSPlayerLayer) {
        guard let renderView = layer.player.view else { return }
        if renderView.superview != self {
            renderView.frame = bounds
            renderView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
            addSubview(renderView)
        }
    }
}