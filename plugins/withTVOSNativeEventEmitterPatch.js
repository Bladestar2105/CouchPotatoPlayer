const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches React Native's NativeAnimatedHelper.js to fix the NativeEventEmitter error on tvOS.
 *
 * On tvOS, Platform.OS is 'ios' but NativeAnimatedModule may be null, causing:
 * `Invariant Violation: new NativeEventEmitter() requires a non-null argument.`
 *
 * This plugin patches the nativeEventEmitter getter to also check for Platform.isTV
 * and pass null if running on TV (similar to Android behavior).
 */
module.exports = function withTVOSNativeEventEmitterPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const reactNativePath = path.dirname(require.resolve('react-native/package.json'));
      
      // Patch NativeAnimatedHelper.js
      const nativeAnimatedHelperPath = path.join(
        reactNativePath,
        'src/private/animated/NativeAnimatedHelper.js'
      );

      if (fs.existsSync(nativeAnimatedHelperPath)) {
        let content = fs.readFileSync(nativeAnimatedHelperPath, 'utf8');

        // Check if already patched
        if (content.includes('Platform.isTV')) {
          console.log('NativeAnimatedHelper.js already patched for tvOS');
          return config;
        }

        // Find and replace the nativeEventEmitter getter
        // Original: Platform.OS !== 'ios' ? null : NativeAnimatedModule
        // Patched: (Platform.OS !== 'ios' || Platform.isTV) ? null : NativeAnimatedModule
        const originalPattern = /Platform\.OS !== 'ios' \? null : NativeAnimatedModule/g;
        const patchedCode = "(Platform.OS !== 'ios' || Platform.isTV) ? null : NativeAnimatedModule";
        
        if (originalPattern.test(content)) {
          content = content.replace(originalPattern, patchedCode);
          fs.writeFileSync(nativeAnimatedHelperPath, content);
          console.log('Patched NativeAnimatedHelper.js for tvOS NativeEventEmitter support');
        } else {
          console.warn('Could not find expected pattern in NativeAnimatedHelper.js');
        }
      } else {
        console.warn('NativeAnimatedHelper.js not found at expected path');
      }

      return config;
    },
  ]);
};