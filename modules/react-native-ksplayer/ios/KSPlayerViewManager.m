#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

// ---------------------------------------------------------------------------
// KSPlayerViewManager.m — Objective-C bridge for KSPlayerViewManager
//
// Declares the native component name and all props/events so React Native
// can create and configure KSPlayerView instances from JavaScript.
// ---------------------------------------------------------------------------

@interface RCT_EXTERN_MODULE(KSPlayerViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(streamUrl, NSString)
RCT_EXPORT_VIEW_PROPERTY(paused, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onVideoLoad, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onVideoError, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onProgress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPlayerState, RCTBubblingEventBlock)

@end
