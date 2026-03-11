#import <React/RCTViewManager.h>

@interface RNKSPlayerViewManager : RCTViewManager
@end

@implementation RNKSPlayerViewManager

RCT_EXPORT_MODULE(RNKSPlayerView)

// Source & Callbacks
RCT_EXPORT_VIEW_PROPERTY(source, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onLoadStart, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoad, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onBuffer, RCTDirectEventBlock)

// Buffer & Quality Settings
RCT_EXPORT_VIEW_PROPERTY(preferredForwardBufferDuration, double)
RCT_EXPORT_VIEW_PROPERTY(maxBufferDuration, double)
RCT_EXPORT_VIEW_PROPERTY(hardwareDecode, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isSecondOpen, BOOL)
RCT_EXPORT_VIEW_PROPERTY(videoAdaptable, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isAutoPlay, BOOL)
RCT_EXPORT_VIEW_PROPERTY(maxBitRate, double)

@end