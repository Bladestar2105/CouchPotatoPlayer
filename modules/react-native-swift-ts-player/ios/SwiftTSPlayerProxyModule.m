#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SwiftTSPlayerProxyModule, NSObject)

RCT_EXTERN_METHOD(start)

RCT_EXTERN_METHOD(registerStream:(NSString *)targetUrl
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end