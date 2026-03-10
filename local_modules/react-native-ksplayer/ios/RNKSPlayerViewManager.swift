import Foundation
import React
import KSPlayer

@objc(RNKSPlayerViewManager)
class RNKSPlayerViewManager: RCTViewManager {

  override func view() -> UIView! {
    return RNKSPlayerView()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
