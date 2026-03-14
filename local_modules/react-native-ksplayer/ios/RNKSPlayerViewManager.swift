import Foundation
import React
import KSPlayer

@objc(RNKSPlayerViewManager)
public class RNKSPlayerViewManager: RCTViewManager {

  public override func view() -> UIView! {
    return RNKSPlayerView()
  }

  @objc
  public override class func requiresMainQueueSetup() -> Bool {
    return true
  }
}
