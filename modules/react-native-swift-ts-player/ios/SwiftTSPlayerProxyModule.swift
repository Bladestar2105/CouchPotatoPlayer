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

    /// Register a stream for HLS-based playback (AVPlayer) and return the local m3u8 URL
    @objc func registerStream(_ targetUrl: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        SwiftTSPlayerProxy.shared.start() // Ensure proxy is running
        let localUrl = SwiftTSPlayerProxy.shared.registerStream(targetUrl: targetUrl)
        resolve(localUrl)
    }

    /// Register a stream for direct TS pass-through (VLC) and return the local direct.ts URL
    @objc func registerStreamDirect(_ targetUrl: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        SwiftTSPlayerProxy.shared.start() // Ensure proxy is running
        let localUrl = SwiftTSPlayerProxy.shared.registerStreamDirect(targetUrl: targetUrl)
        resolve(localUrl)
    }
}