import Foundation
import AVFoundation
import UIKit
import React

/// Native AVPlayer view for **HLS (.m3u8) and MP4 playback ONLY**.
///
/// This view does NOT support raw MPEG-TS streams — AVPlayer fundamentally
/// cannot demux raw TS containers. For raw TS, use VLC (TVVLCKit) or
/// KSPlayer (FFmpegKit) instead.
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
    private var timeObserverToken: Any?
    private var retryCount: Int = 0
    private let maxRetries: Int = 3
    private var retryTimer: Timer?
    private var hasExplicitAudioSelection = false
    private var hasExplicitTextSelection = false

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

    @objc var seekPosition: NSNumber? {
        didSet {
            guard let seekPosition = seekPosition else { return }
            seek(toMilliseconds: seekPosition.doubleValue)
        }
    }

    @objc var selectedAudioTrackId: NSNumber? {
        didSet {
            hasExplicitAudioSelection = true
            DispatchQueue.main.async { [weak self] in
                self?.applyTrackSelections()
            }
        }
    }

    @objc var selectedTextTrackId: NSNumber? {
        didSet {
            hasExplicitTextSelection = true
            DispatchQueue.main.async { [weak self] in
                self?.applyTrackSelections()
            }
        }
    }

    @objc var onSwiftVideoLoad: RCTDirectEventBlock?
    @objc var onSwiftVideoError: RCTDirectEventBlock?
    @objc var onSwiftProgress: RCTDirectEventBlock?
    @objc var onSwiftTracksChanged: RCTDirectEventBlock?

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
        if let layer = playerLayer {
            self.layer.addSublayer(layer)
        }
    }

    override func layoutSubviews() {
        super.layoutSubviews()
        playerLayer?.frame = bounds
    }

    // MARK: - Teardown

    private func teardownPlayer() {
        retryTimer?.invalidate()
        retryTimer = nil
        playerStatusObserver?.invalidate()
        playerStatusObserver = nil
        bufferEmptyObserver?.invalidate()
        bufferEmptyObserver = nil
        likelyToKeepUpObserver?.invalidate()
        likelyToKeepUpObserver = nil
        if let obs = stalledObserver {
            NotificationCenter.default.removeObserver(obs)
        }
        stalledObserver = nil
        if let obs = failedObserver {
            NotificationCenter.default.removeObserver(obs)
        }
        failedObserver = nil
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
        }
        timeObserverToken = nil
        player?.pause()
        player?.replaceCurrentItem(with: nil)
        playerItem = nil
        player = nil
    }

    // MARK: - Setup

    private func setupPlayer(with urlString: String) {
        teardownPlayer()

        guard let url = URL(string: urlString) else {
            onSwiftVideoError?(["error": "Invalid URL: \(urlString)"])
            return
        }

        let asset = AVURLAsset(url: url, options: [
            "AVURLAssetHTTPHeaderFieldsKey": ["User-Agent": "Mozilla/5.0 (AppleTV; CPU AppleTV OS 18_0 like Mac OS X)"]
        ])

        let item = AVPlayerItem(asset: asset)
        item.preferredForwardBufferDuration = 6.0
        item.canUseNetworkResourcesForLiveStreamingWhilePaused = true
        playerItem = item

        player = AVPlayer(playerItem: item)
        player?.automaticallyWaitsToMinimizeStalling = true
        playerLayer?.player = player
        addPeriodicTimeObserver()

        playerStatusObserver = item.observe(\.status, options: [.new]) { [weak self] item, _ in
            DispatchQueue.main.async {
                self?.handleStatusChange(item: item)
            }
        }

        bufferEmptyObserver = item.observe(\.isPlaybackBufferEmpty, options: [.new]) { _, _ in
            // Buffer empty — AVPlayer handles rebuffering internally.
        }

        likelyToKeepUpObserver = item.observe(\.isPlaybackLikelyToKeepUp, options: [.new]) { [weak self] item, _ in
            if item.isPlaybackLikelyToKeepUp {
                DispatchQueue.main.async {
                    if self?.paused == false {
                        self?.player?.play()
                    }
                }
            }
        }

        stalledObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemPlaybackStalled,
            object: item,
            queue: .main
        ) { [weak self] _ in
            print("[SwiftTSPlayerView] Playback stalled — attempting recovery")
            self?.attemptStallRecovery()
        }

        failedObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemFailedToPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] notification in
            if let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error {
                print("[SwiftTSPlayerView] Failed to play to end: \(error.localizedDescription)")
                self?.attemptRetry()
            }
        }

        if !paused {
            player?.play()
        }
    }

    // MARK: - Status Handling

    private func handleStatusChange(item: AVPlayerItem) {
        switch item.status {
        case .readyToPlay:
            retryCount = 0

            var width: CGFloat = 0
            var height: CGFloat = 0

            if let track = item.asset.tracks(withMediaType: .video).first {
                let size = track.naturalSize.applying(track.preferredTransform)
                width = abs(size.width)
                height = abs(size.height)
            }

            applyTrackSelections()
            emitTracksChanged()
            onSwiftVideoLoad?(["width": width, "height": height])

            if !paused {
                player?.play()
            }

        case .failed:
            let errorMsg = item.error?.localizedDescription ?? "Unknown error"
            print("[SwiftTSPlayerView] Player item failed: \(errorMsg)")
            attemptRetry()

        case .unknown:
            break

        @unknown default:
            break
        }
    }

    // MARK: - Track Discovery

    private func applyTrackSelections() {
        guard let item = playerItem else { return }

        if hasExplicitAudioSelection,
           let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: .audible),
           let selectedAudioTrackId
        {
            let options = group.options
            let index = selectedAudioTrackId.intValue
            if options.indices.contains(index) {
                item.select(options[index], in: group)
            }
        }

        if hasExplicitTextSelection,
           let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: .legible)
        {
            if let selectedTextTrackId {
                let options = group.options
                let index = selectedTextTrackId.intValue
                if options.indices.contains(index) {
                    item.select(options[index], in: group)
                } else {
                    item.select(nil, in: group)
                }
            } else {
                item.select(nil, in: group)
            }
        }
    }

    private func emitTracksChanged() {
        guard let item = playerItem else { return }
        onSwiftTracksChanged?([
            "audioTracks": mediaSelectionPayload(for: .audible, item: item, fallbackPrefix: "Audio"),
            "textTracks": mediaSelectionPayload(for: .legible, item: item, fallbackPrefix: "Subtitle"),
        ])
    }

    private func mediaSelectionPayload(
        for characteristic: AVMediaCharacteristic,
        item: AVPlayerItem,
        fallbackPrefix: String
    ) -> [[String: Any]] {
        guard let group = item.asset.mediaSelectionGroup(forMediaCharacteristic: characteristic) else {
            return []
        }

        let selectedOption = item.currentMediaSelection.selectedMediaOption(in: group)
        return group.options.enumerated().map { index, option in
            var payload: [String: Any] = [
                "id": index,
                "label": option.displayName.isEmpty ? "\(fallbackPrefix) \(index + 1)" : option.displayName,
                "selected": selectedOption == option,
            ]

            if let language = option.extendedLanguageTag ?? option.locale?.identifier {
                payload["language"] = language
            }

            return payload
        }
    }

    // MARK: - Recovery

    private func attemptStallRecovery() {
        guard let player = player, let item = player.currentItem else { return }

        let currentTime = item.currentTime()
        if currentTime.isValid && !currentTime.isIndefinite {
            player.seek(to: currentTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] _ in
                if self?.paused == false {
                    self?.player?.play()
                }
            }
        } else if !paused {
            player.play()
        }
    }

    private func attemptRetry() {
        guard retryCount < maxRetries else {
            let errorMsg = "Playback failed after \(maxRetries) retries"
            print("[SwiftTSPlayerView] \(errorMsg)")
            onSwiftVideoError?(["error": errorMsg])
            return
        }

        retryCount += 1
        let delay = Double(retryCount) * 1.5
        print("[SwiftTSPlayerView] Retrying in \(delay)s (attempt \(retryCount)/\(maxRetries))")

        retryTimer?.invalidate()
        retryTimer = Timer.scheduledTimer(withTimeInterval: delay, repeats: false) { [weak self] _ in
            guard let self = self, let url = self.streamUrl else { return }
            self.setupPlayer(with: url)
        }
    }

    // MARK: - Seek + Progress

    private func seek(toMilliseconds milliseconds: Double) {
        guard let player = player else { return }
        let seconds = max(0, milliseconds / 1000.0)
        let targetTime = CMTime(seconds: seconds, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        player.seek(to: targetTime, toleranceBefore: .zero, toleranceAfter: .zero)
    }

    private func addPeriodicTimeObserver() {
        guard timeObserverToken == nil, let player = player else { return }
        let interval = CMTime(seconds: 1.0, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let currentMs = CMTimeGetSeconds(time) * 1000.0
            let durationMs = CMTimeGetSeconds(player.currentItem?.duration ?? CMTime.zero) * 1000.0
            self.onSwiftProgress?(["currentTime": currentMs.isFinite ? currentMs : 0, "duration": durationMs.isFinite ? durationMs : 0])
        }
    }

    deinit {
        teardownPlayer()
    }
}
