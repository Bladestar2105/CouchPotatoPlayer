import Foundation
import AVFoundation
import UIKit
import React

@objc(SwiftTSPlayerView)
class SwiftTSPlayerView: UIView {

    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    private var playerItem: AVPlayerItem?
    private var playerStatusObserver: NSKeyValueObservation?
    private var bufferEmptyObserver: NSKeyValueObservation?
    private var likelyToKeepUpObserver: NSKeyValueObservation?
    private var stalledObserver: NSObjectProtocol?
    private var failedObserver: NSObjectProtocol?
    private var retryCount: Int = 0
    private let maxRetries: Int = 5
    private var retryTimer: Timer?

    // React Native Props
    @objc var streamUrl: String? {
        didSet {
            if let streamUrl = streamUrl, streamUrl != oldValue {
                retryCount = 0
                setupPlayer(with: streamUrl)
            }
        }
    }

    @objc var paused: Bool = false {
        didSet {
            if paused {
                player?.pause()
            } else {
                player?.play()
            }
        }
    }

    @objc var onVideoLoad: RCTDirectEventBlock?
    @objc var onVideoError: RCTDirectEventBlock?

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayer()
        SwiftTSPlayerProxy.shared.start()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayer()
        SwiftTSPlayerProxy.shared.start()
    }

    private func setupLayer() {
        self.backgroundColor = .black
        playerLayer = AVPlayerLayer()
        playerLayer?.videoGravity = .resizeAspect
        if let layer = playerLayer {
            self.layer.addSublayer(layer)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = self.bounds
    }

    private func teardownPlayer() {
        retryTimer?.invalidate()
        retryTimer = nil
        playerStatusObserver?.invalidate()
        playerStatusObserver = nil
        bufferEmptyObserver?.invalidate()
        bufferEmptyObserver = nil
        likelyToKeepUpObserver?.invalidate()
        likelyToKeepUpObserver = nil
        if let stalledObserver = stalledObserver {
            NotificationCenter.default.removeObserver(stalledObserver)
        }
        stalledObserver = nil
        if let failedObserver = failedObserver {
            NotificationCenter.default.removeObserver(failedObserver)
        }
        failedObserver = nil
        player?.pause()
        player?.replaceCurrentItem(with: nil)
        playerItem = nil
        player = nil
    }

    private func setupPlayer(with urlString: String) {
        teardownPlayer()

        let playUrl: URL?

        let lowerUrl = urlString.lowercased()
        if lowerUrl.contains(".m3u8") || lowerUrl.contains(".mp4") {
            // Native HLS or MP4 — play directly without proxy
            playUrl = URL(string: urlString)
        } else {
            // TS stream — register with proxy to get a proper live HLS URL
            let localProxyUrlString = SwiftTSPlayerProxy.shared.registerStream(targetUrl: urlString)
            playUrl = URL(string: localProxyUrlString)
        }

        guard let finalUrl = playUrl else { return }

        let asset = AVURLAsset(url: finalUrl, options: [
            "AVURLAssetHTTPHeaderFieldsKey": ["User-Agent": "Mozilla/5.0"]
        ])

        playerItem = AVPlayerItem(asset: asset)

        // Configure for live streaming
        playerItem?.preferredForwardBufferDuration = 4.0
        // Allow some buffer to build before declaring "ready"
        playerItem?.canUseNetworkResourcesForLiveStreamingWhilePaused = true

        player = AVPlayer(playerItem: playerItem)
        // For live content, allow AVPlayer to manage stall recovery
        player?.automaticallyWaitsToMinimizeStalling = true

        playerLayer?.player = player

        // Observe playerItem status using modern KVO
        playerStatusObserver = playerItem?.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async {
                self?.handleStatusChange(item: item)
            }
        }

        // Observe buffer state for stall recovery
        bufferEmptyObserver = playerItem?.observe(\.isPlaybackBufferEmpty, options: [.new]) { [weak self] item, _ in
            if item.isPlaybackBufferEmpty {
                print("[SwiftTSPlayer] Buffer empty — waiting for data")
            }
        }

        likelyToKeepUpObserver = playerItem?.observe(\.isPlaybackLikelyToKeepUp, options: [.new]) { [weak self] item, _ in
            if item.isPlaybackLikelyToKeepUp {
                DispatchQueue.main.async {
                    if self?.paused == false {
                        self?.player?.play()
                    }
                }
            }
        }

        // Observe playback stall
        stalledObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemPlaybackStalled,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            print("[SwiftTSPlayer] Playback stalled — attempting recovery")
            self?.attemptStallRecovery()
        }

        // Observe failure to play to end
        failedObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] notification in
            if let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error {
                print("[SwiftTSPlayer] Failed to play to end: \(error.localizedDescription)")
                self?.attemptRetry()
            }
        }

        if !paused {
            player?.play()
        }
    }

    private func handleStatusChange(item: AVPlayerItem) {
        switch item.status {
        case .readyToPlay:
            retryCount = 0 // Reset on successful playback
            // Extract video metadata
            var width: CGFloat = 0
            var height: CGFloat = 0

            if let track = item.asset.tracks(withMediaType: .video).first {
                let size = track.naturalSize.applying(track.preferredTransform)
                width = abs(size.width)
                height = abs(size.height)
            }

            onVideoLoad?(["width": width, "height": height])

            if !paused {
                player?.play()
            }

        case .failed:
            let errorMsg = item.error?.localizedDescription ?? "Unknown error"
            print("[SwiftTSPlayer] Player item failed: \(errorMsg)")
            attemptRetry()

        case .unknown:
            break

        @unknown default:
            break
        }
    }

    private func attemptStallRecovery() {
        // Try to nudge playback forward by seeking to current time
        guard let player = player, let item = player.currentItem else { return }

        let currentTime = item.currentTime()
        if currentTime.isValid && !currentTime.isIndefinite {
            player.seek(to: currentTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                if self?.paused == false {
                    self?.player?.play()
                }
            }
        } else {
            // If current time is not valid, just try to play
            if !paused {
                player.play()
            }
        }
    }

    private func attemptRetry() {
        guard retryCount < maxRetries else {
            let errorMsg = "Playback failed after \(maxRetries) retries"
            print("[SwiftTSPlayer] \(errorMsg)")
            onVideoError?(["error": errorMsg])
            return
        }

        retryCount += 1
        let delay = min(Double(retryCount) * 1.0, 3.0) // 1s, 2s, 3s backoff
        print("[SwiftTSPlayer] Retrying playback in \(delay)s (attempt \(retryCount)/\(maxRetries))")

        retryTimer?.invalidate()
        retryTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            guard let self = self, let url = self.streamUrl else { return }
            self.setupPlayer(with: url)
        }
    }

    deinit {
        teardownPlayer()
    }
}