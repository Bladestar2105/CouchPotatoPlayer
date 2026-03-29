import Foundation
import AVFoundation
import UIKit
import React

@objc(SwiftTSPlayerView)
class SwiftTSPlayerView: UIView {

    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    private var playerItem: AVPlayerItem?

    // React Native Props
    @objc var streamUrl: String? {
        didSet {
            if let streamUrl = streamUrl {
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

    private func setupPlayer(with urlString: String) {
        let localProxyUrlString = SwiftTSPlayerProxy.shared.registerStream(targetUrl: urlString)
        guard let playUrl = URL(string: localProxyUrlString) else { return }

        // Remove old player item observers
        if let currentItem = playerItem {
            currentItem.removeObserver(self, forKeyPath: "status")
            NotificationCenter.default.removeObserver(self, name: .AVPlayerItemFailedToPlayToEndTime, object: currentItem)
        }

        let asset = AVAsset(url: playUrl)
        playerItem = AVPlayerItem(asset: asset)

        // Optimize for low latency Live TV
        playerItem?.preferredForwardBufferDuration = 1.0

        player = AVPlayer(playerItem: playerItem)
        player?.automaticallyWaitsToMinimizeStalling = false // Crucial for low latency

        playerLayer?.player = player

        // Observe status to trigger onVideoLoad
        playerItem?.addObserver(self, forKeyPath: "status", options: [.new, .initial], context: nil)

        NotificationCenter.default.addObserver(self, selector: #selector(playerItemFailedToPlayToEndTime(_:)), name: .AVPlayerItemFailedToPlayToEndTime, object: playerItem)

        if !paused {
            player?.play()
        }
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status" {
            guard let item = object as? AVPlayerItem else { return }

            if item.status == .readyToPlay {
                // Send video metadata back
                var width: CGFloat = 0
                var height: CGFloat = 0

                if let track = item.asset.tracks(withMediaType: .video).first {
                    let size = track.naturalSize.applying(track.preferredTransform)
                    width = abs(size.width)
                    height = abs(size.height)
                }

                if let onVideoLoad = onVideoLoad {
                    onVideoLoad(["width": width, "height": height])
                }

            } else if item.status == .failed {
                let errorMsg = item.error?.localizedDescription ?? "Unknown error"
                if let onVideoError = onVideoError {
                    onVideoError(["error": errorMsg])
                }
                print("[SwiftTSPlayer] Failed to load video: \(errorMsg)")
            }
        }
    }

    @objc private func playerItemFailedToPlayToEndTime(_ notification: Notification) {
        if let error = notification.userInfo?[AVPlayerItemFailedToPlayToEndTimeErrorKey] as? Error {
            if let onVideoError = onVideoError {
                onVideoError(["error": error.localizedDescription])
            }
        }
    }

    deinit {
        if let currentItem = playerItem {
            currentItem.removeObserver(self, forKeyPath: "status")
        }
        NotificationCenter.default.removeObserver(self)
        // We do not stop the shared proxy here to avoid breaking other active players
        // during navigation transitions. The proxy is designed to stay running.
    }
}
