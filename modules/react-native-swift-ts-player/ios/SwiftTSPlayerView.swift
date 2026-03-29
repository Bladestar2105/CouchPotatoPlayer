import Foundation
import AVFoundation
import UIKit
import React

/// Native AVPlayer-based view for HLS (.m3u8) and MP4 playback ONLY.
///
/// **This view does NOT support raw MPEG-TS streams.**  Apple's AVPlayer
/// cannot demux raw TS — it requires proper HLS playlists or progressive
/// MP4.  For IPTV TS streams, use VLC (TVVLCKit) instead.
@objc(SwiftTSPlayerView)
class SwiftTSPlayerView: UIView {

    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    private var playerItem: AVPlayerItem?
    private var statusObserver: NSKeyValueObservation?
    private var stallObserver: NSObjectProtocol?
    private var keepUpObserver: NSKeyValueObservation?
    private var retryCount: Int = 0
    private let maxRetries: Int = 3
    private var retryTimer: Timer?

    // MARK: - React Native Props

    @objc var streamUrl: String? {
        didSet {
            if let url = streamUrl, url != oldValue {
                retryCount = 0
                setupPlayer(with: url)
            }
        }
    }

    @objc var paused: Bool = false {
        didSet {
            paused ? player?.pause() : player?.play()
        }
    }

    @objc var onVideoLoad: RCTDirectEventBlock?
    @objc var onVideoError: RCTDirectEventBlock?

    // MARK: - Init

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayer()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayer()
    }

    private func setupLayer() {
        backgroundColor = .black
        playerLayer = AVPlayerLayer()
        playerLayer?.videoGravity = .resizeAspect
        if let layer = playerLayer { self.layer.addSublayer(layer) }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = bounds
    }

    // MARK: - Player Setup

    private func teardown() {
        retryTimer?.invalidate()
        retryTimer = nil
        statusObserver?.invalidate()
        statusObserver = nil
        keepUpObserver?.invalidate()
        keepUpObserver = nil
        if let obs = stallObserver { NotificationCenter.default.removeObserver(obs) }
        stallObserver = nil
        player?.pause()
        player?.replaceCurrentItem(with: nil)
        playerItem = nil
        player = nil
    }

    private func setupPlayer(with urlString: String) {
        teardown()

        guard let url = URL(string: urlString) else {
            onVideoError?(["error": "Invalid URL: \(urlString)"])
            return
        }

        let asset = AVURLAsset(url: url, options: [
            "AVURLAssetHTTPHeaderFieldsKey": ["User-Agent": "Mozilla/5.0"]
        ])

        playerItem = AVPlayerItem(asset: asset)
        playerItem?.preferredForwardBufferDuration = 6.0

        player = AVPlayer(playerItem: playerItem)
        player?.automaticallyWaitsToMinimizeStalling = true
        playerLayer?.player = player

        // Observe status
        statusObserver = playerItem?.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async { self?.handleStatus(item) }
        }

        // Observe stalls for recovery
        stallObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemPlaybackStalled,
            object: playerItem, queue: .main
        ) { [weak self] _ in
            self?.handleStall()
        }

        // Auto-resume when buffer recovers
        keepUpObserver = playerItem?.observe(\.isPlaybackLikelyToKeepUp, options: [.new]) { [weak self] item, _ in
            if item.isPlaybackLikelyToKeepUp, self?.paused == false {
                DispatchQueue.main.async { self?.player?.play() }
            }
        }

        if !paused { player?.play() }
    }

    // MARK: - Status Handling

    private func handleStatus(_ item: AVPlayerItem) {
        switch item.status {
        case .readyToPlay:
            retryCount = 0
            reportVideoMetadata(item)
            if !paused { player?.play() }

        case .failed:
            let msg = item.error?.localizedDescription ?? "Unknown playback error"
            print("[SwiftTSPlayer] Failed: \(msg)")
            attemptRetry(reason: msg)

        case .unknown:
            break
        @unknown default:
            break
        }
    }

    private func reportVideoMetadata(_ item: AVPlayerItem) {
        var width: CGFloat = 0
        var height: CGFloat = 0
        if let track = item.asset.tracks(withMediaType: .video).first {
            let size = track.naturalSize.applying(track.preferredTransform)
            width = abs(size.width)
            height = abs(size.height)
        }
        onVideoLoad?(["width": width, "height": height])
    }

    // MARK: - Error Recovery

    private func handleStall() {
        guard let player = player, let item = player.currentItem else { return }
        let time = item.currentTime()
        if time.isValid && !time.isIndefinite {
            player.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                if self?.paused == false { self?.player?.play() }
            }
        }
    }

    private func attemptRetry(reason: String) {
        guard retryCount < maxRetries else {
            onVideoError?(["error": reason])
            return
        }
        retryCount += 1
        let delay = min(Double(retryCount) * 1.5, 4.0)
        print("[SwiftTSPlayer] Retry \(retryCount)/\(maxRetries) in \(delay)s")

        retryTimer?.invalidate()
        retryTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            guard let self = self, let url = self.streamUrl else { return }
            self.setupPlayer(with: url)
        }
    }

    // MARK: - Cleanup

    deinit {
        teardown()
    }
}