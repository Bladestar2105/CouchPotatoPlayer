import { Platform } from 'react-native';

let RNKSPlayerView = null;
if (Platform.OS === 'ios' || Platform.OS === 'macos' || Platform.OS === 'tvos') {
    const { requireNativeComponent } = require('react-native');
    RNKSPlayerView = requireNativeComponent('RNKSPlayerView');
}

export { RNKSPlayerView };
