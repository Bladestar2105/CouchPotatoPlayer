import { requireNativeComponent, NativeModules } from 'react-native';

export const SwiftTSPlayerView = requireNativeComponent('SwiftTSPlayerView');
export const SwiftTSPlayerProxyModule = NativeModules.SwiftTSPlayerProxyModule;