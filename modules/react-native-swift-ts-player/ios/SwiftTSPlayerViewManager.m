#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(SwiftTSPlayerViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(streamUrl, NSString)
RCT_EXPORT_VIEW_PROPERTY(paused, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onSwiftVideoLoad, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onSwiftVideoError, RCTDirectEventBlock)

@end
