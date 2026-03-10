#import <React/RCTViewManager.h>

@interface RNKSPlayerViewManager : RCTViewManager
@end

@implementation RNKSPlayerViewManager

RCT_EXPORT_MODULE(RNKSPlayerView)

// We define the properties we want to pass from React Native
RCT_EXPORT_VIEW_PROPERTY(source, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onLoadStart, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLoad, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onError, RCTDirectEventBlock)

@end
