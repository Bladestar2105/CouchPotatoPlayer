import Foundation
import UIKit
import KSPlayer
import React

@objc(RNKSPlayerView)
class RNKSPlayerView: UIView {

    private var playerView: KSPlayer.IOSVideoPlayerView!
    private var url: URL?
    private var hasConfiguredOptions = false

    // ── React Native Props ──────────────────────────────────────────

    @objc var source: NSDictionary? {
        didSet {
            if let uri = source?["uri"] as? String, let newUrl = URL(string: uri) {
                if url != newUrl {
                    url = newUrl
                    setupPlayer()
                }
            }
        }
    }

    @objc var onLoadStart: RCTDirectEventBlock?
    @objc var onLoad: RCTDirectEventBlock?
    @objc var onError: RCTDirectEventBlock?
    @objc var onBuffer: RCTDirectEventBlock?

    /// Buffer duration in seconds (minimum forward buffer)
    @objc var preferredForwardBufferDuration: Double = 10.0 {
        didSet { setupPlayer() }
    }

    /// Maximum buffer duration in seconds
    @objc var maxBufferDuration: Double = 30.0 {
        didSet { setupPlayer() }
    }

    /// Enable hardware decoding (default: true)
    @objc var hardwareDecode: Bool = true {
        didSet { setupPlayer() }
    }

    /// Enable fast second open for quick channel switching
    @objc var isSecondOpen: Bool = true {
        didSet { setupPlayer() }
    }

    /// Enable adaptive bitrate (auto quality switching for HLS)
    @objc var videoAdaptable: Bool = true {
        didSet { setupPlayer() }
    }

    /// Enable auto play
    @objc var isAutoPlay: Bool = true {
        didSet { setupPlayer() }
    }

    /// Max bitrate limit (0 = unlimited)
    @objc var maxBitRate: Double = 0

    // ── Lifecycle ───────────────────────────────────────────────────

    override init(frame: CGRect) {
        super.init(frame: frame)
        configureGlobalOptions()
        playerView = KSPlayer.IOSVideoPlayerView()
        addSubview(playerView)
        playerView.delegate = self
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerView.frame = bounds
    }

    override func removeFromSuperview() {
        playerView.resetPlayer()
        super.removeFromSuperview()
    }

    // ── Configuration ───────────────────────────────────────────────

    private func configureGlobalOptions() {
        // Use FFmpeg-based player as primary (better codec support for IPTV)
        if let mePlayer = NSClassFromString("KSPlayer.KSMEPlayer") as? KSPlayer.MediaPlayerProtocol.Type {
            KSPlayer.KSOptions.firstPlayerType = mePlayer
        }
        // Fallback to AVPlayer for standard formats
        KSPlayer.KSOptions.secondPlayerType = KSPlayer.KSAVPlayer.self
    }

    private func applyOptions() {
        // We will apply instance specific options in setupPlayer() instead
        // to avoid Swift 6 strict concurrency errors on static properties.
    }

    private func setupPlayer() {
        guard let url = url else { return }
        
        onLoadStart?([:])

        // Create options for this specific stream
        let options = KSPlayer.KSOptions()
        options.preferredForwardBufferDuration = preferredForwardBufferDuration
        options.maxBufferDuration = maxBufferDuration
        options.isSecondOpen = isSecondOpen
        options.isAutoPlay = isAutoPlay
        options.videoAdaptable = videoAdaptable
        options.hardwareDecode = hardwareDecode
        
        // For live streams, optimize for low latency
        if url.pathExtension == "m3u8" || url.absoluteString.contains("/live/") {
            options.preferredForwardBufferDuration = min(preferredForwardBufferDuration, 10.0)
            options.isSecondOpen = true
        }
        
        let resource = KSPlayer.KSPlayerResource(url: url, options: options)
        playerView.set(resource: resource)
        if isAutoPlay {
            playerView.play()
        }
    }
}

// ── Player Delegate ─────────────────────────────────────────────────

extension RNKSPlayerView: KSPlayer.PlayerControllerDelegate {
    func playerController(state: KSPlayer.KSPlayerState) {
        switch state {
        case .readyToPlay:
            onLoad?([:])
        case .error(let error):
            onError?(["error": error.localizedDescription])
        case .buffering:
            onBuffer?(["isBuffering": true])
        case .bufferFinished:
            onBuffer?(["isBuffering": false])
        default:
            break
        }
    }

    func playerController(currentTime: TimeInterval, totalTime: TimeInterval) {}
    
    func playerController(finish error: Error?) {
        if let err = error {
            onError?(["error": err.localizedDescription])
        }
    }
    
    func playerController(bufferedCount: Int, consumeTime: TimeInterval) {
        // bufferedCount == 0 means first time loading
        if bufferedCount == 0 {
            onBuffer?(["isBuffering": true])
        }
    }

    func playerController(maskShow: Bool) {}
    func playerController(action: KSPlayer.PlayerButtonType) {}
    func playerController(seek: TimeInterval) {}
}