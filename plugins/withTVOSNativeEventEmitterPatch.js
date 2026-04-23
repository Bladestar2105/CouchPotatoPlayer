const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches React Native's NativeEventEmitter.js to fix the NativeEventEmitter error on tvOS.
 *
 * On tvOS, Platform.OS is 'ios' but some native modules (like Animated or PushNotification)
 * may be null, causing: `Invariant Violation: new NativeEventEmitter() requires a non-null argument.`
 *
 * This plugin patches the constructor to bypass the strict null check on tvOS, allowing
 * it to gracefully degrade like it does on Android, and reverts any incorrect patches
 * previously applied to NativeAnimatedHelper.js.
 */
module.exports = function withTVOSNativeEventEmitterPatch(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const reactNativePath = path.dirname(require.resolve('react-native/package.json'));
      
      // 1. Revert incorrect NativeAnimatedHelper.js patch
      const nativeAnimatedHelperPath = path.join(
        reactNativePath,
        'src/private/animated/NativeAnimatedHelper.js'
      );

      if (fs.existsSync(nativeAnimatedHelperPath)) {
        let content = fs.readFileSync(nativeAnimatedHelperPath, 'utf8');

        // Check if incorrectly patched
        if (content.includes('Platform.isTV')) {
          const patchedPattern = /\(Platform\.OS !== 'ios' \|\| Platform\.isTV\) \? null : NativeAnimatedModule/g;
          const originalCode = "Platform.OS !== 'ios' ? null : NativeAnimatedModule";

          if (patchedPattern.test(content)) {
            content = content.replace(patchedPattern, originalCode);
            fs.writeFileSync(nativeAnimatedHelperPath, content);
            console.log('Reverted NativeAnimatedHelper.js patch for tvOS');
          }
        }
      }

      // 2. Patch NativeEventEmitter.js
      const nativeEventEmitterPath = path.join(
        reactNativePath,
        'Libraries/EventEmitter/NativeEventEmitter.js'
      );

      if (fs.existsSync(nativeEventEmitterPath)) {
        let content = fs.readFileSync(nativeEventEmitterPath, 'utf8');

        // Check if already patched
        if (content.includes("Platform.OS === 'ios' && !Platform.isTV")) {
          console.log('NativeEventEmitter.js already patched for tvOS');
          return config;
        }

        // Find and replace the strict iOS check
        // Original: if (Platform.OS === 'ios') {
        // Patched: if (Platform.OS === 'ios' && !Platform.isTV) {
        const originalPattern = /if \(Platform\.OS === 'ios'\) {/g;
        const patchedCode = "if (Platform.OS === 'ios' && !Platform.isTV) {";
        
        // Ensure we also import Platform if it's not available, although it typically is in this file
        if (originalPattern.test(content)) {
          // If Platform isn't imported, we'll need to add it, but it should be imported at the top
          if (!content.includes("import Platform")) {
             content = "import Platform from '../Utilities/Platform';\n" + content;
          }
          content = content.replace(originalPattern, patchedCode);
          fs.writeFileSync(nativeEventEmitterPath, content);
          console.log('Patched NativeEventEmitter.js for tvOS support');
        } else {
          console.warn('Could not find expected pattern in NativeEventEmitter.js');
        }
      } else {
        console.warn('NativeEventEmitter.js not found at expected path');
      }

      return config;
    },
  ]);
};
