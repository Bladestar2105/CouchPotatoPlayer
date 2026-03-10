import Foundation
import UIKit
import KSPlayer
import React

@objc(RNKSPlayerView)
class RNKSPlayerView: UIView {

    private var playerView: IOSVideoPlayerView!
    private var url: URL?

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

    override init(frame: CGRect) {
        super.init(frame: frame)
        KSOptions.firstPlayerType = KSMEPlayer.self
        KSOptions.secondPlayerType = KSAVPlayer.self
        playerView = IOSVideoPlayerView()
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

    private func setupPlayer() {
        guard let url = url else { return }
        onLoadStart?([:])
        playerView.set(url: url)
        playerView.play()
    }
}

extension RNKSPlayerView: PlayerViewDelegate {
    func playerView(stateDidChange state: KSPlayerState) {
        switch state {
        case .readyToPlay:
            onLoad?([:])
        case .error(let error):
            onError?(["error": error.localizedDescription])
        default:
            break
        }
    }

    func playerView(currentTime: TimeInterval, totalTime: TimeInterval) {}
    func playerView(finish error: Error?) {
        if let err = error {
            onError?(["error": err.localizedDescription])
        }
    }
    func playerView(bufferedCount: Int, consumeTime: TimeInterval) {}
}
