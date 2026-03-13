import Foundation
import React

@objc(RNKSPlayerViewManager)
class RNKSPlayerViewManager: RCTViewManager {

  override func view() -> UIView! {
    return RNKSPlayerView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
