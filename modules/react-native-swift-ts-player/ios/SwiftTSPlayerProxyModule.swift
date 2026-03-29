import Foundation
import React

/// Exposes the local TS proxy to JavaScript so that VLC (and other players)
/// can obtain a `http://127.0.0.1:8080/stream/<uuid>` URL that proxies the
/// remote IPTV stream with proper header forwarding.
@objc(SwiftTSPlayerProxyModule)
class SwiftTSPlayerProxyModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool {
        return false
    }

    @objc func start() {
        SwiftTSPlayerProxy.shared.start()
    }

    /// Register a remote stream URL and return a local proxy URL.
    @objc func registerStream(_ targetUrl: String,
                              resolver resolve: @escaping RCTPromiseResolveBlock,
                              rejecter reject: @escaping RCTPromiseRejectBlock) {
        SwiftTSPlayerProxy.shared.start()
        let localUrl = SwiftTSPlayerProxy.shared.registerStream(targetUrl: targetUrl)
        resolve(localUrl)
    }
}