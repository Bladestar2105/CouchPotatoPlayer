import Foundation
import React

@objc(SwiftTSPlayerViewManager)
class SwiftTSPlayerViewManager: RCTViewManager {

    override func view() -> UIView! {
        return SwiftTSPlayerView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
