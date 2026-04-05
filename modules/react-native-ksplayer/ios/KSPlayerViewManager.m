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
RCT_EXPORT_VIEW_PROPERTY(hardwareDecode, BOOL)
RCT_EXPORT_VIEW_PROPERTY(asynchronousDecompression, BOOL)
RCT_EXPORT_VIEW_PROPERTY(displayFrameRate, BOOL)
RCT_EXPORT_VIEW_PROPERTY(seekPosition, NSNumber)

RCT_EXPORT_VIEW_PROPERTY(onKSVideoLoad, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onKSVideoError, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onKSProgress, RCTBubblingEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onKSPlayerState, RCTBubblingEventBlock)

@end
