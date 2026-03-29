import Foundation

// ---------------------------------------------------------------------------
// KSPlayerViewManager — React Native ViewManager for KSPlayerView
//
// Registers KSPlayerView as a native component and declares all props/events.
// ---------------------------------------------------------------------------

@objc(KSPlayerViewManager)
class KSPlayerViewManager: RCTViewManager {

    override func view() -> UIView! {
        return KSPlayerView()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }
}