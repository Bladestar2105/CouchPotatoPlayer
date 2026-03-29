import Foundation
import React

// ---------------------------------------------------------------------------
// KSPlayerViewManager — React Native ViewManager for KSPlayerView
//
// This class bridges the Swift KSPlayerView to React Native's UI infrastructure.
// It is declared @objc to be visible to the Objective-C runtime.
// The RCT_EXTERN_MODULE macro in KSPlayerViewManager.m references this class.
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