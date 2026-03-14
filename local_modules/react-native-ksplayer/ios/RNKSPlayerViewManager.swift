import Foundation
import React
import KSPlayer

@objc(RNKSPlayerViewManager)
public class RNKSPlayerViewManager: RCTViewManager {

  public override func view() -> UIView! {
    return RNKSPlayerView()
  }

  public override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
