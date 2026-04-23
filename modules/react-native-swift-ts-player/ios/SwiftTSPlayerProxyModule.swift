import Foundation
import React

@objc(SwiftTSPlayerProxyModule)
class SwiftTSPlayerProxyModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    /// Start the proxy server (if not already running)
    @objc func start() {
        SwiftTSPlayerProxy.shared.start()
    }

    /// Register a stream and return a local proxy URL for pass-through playback.
    /// Used by VLC/KSPlayer on Apple platforms for header forwarding & ATS bypass.
    @objc func registerStream(_ targetUrl: String,
                              resolver resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
        SwiftTSPlayerProxy.shared.start()
        let localUrl = SwiftTSPlayerProxy.shared.registerStream(targetUrl: targetUrl)
        resolve(localUrl)
    }
}