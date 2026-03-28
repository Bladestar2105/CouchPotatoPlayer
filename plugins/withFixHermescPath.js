/**
 * Expo Config Plugin: withFixHermescPath
 *
 * In React Native 0.84+, the Hermes compiler (hermesc) binary is shipped via
 * the `hermes-compiler` npm package instead of the old location at
 * `react-native/sdks/hermesc/<platform>/hermesc`.
 *
 * The react-native-gradle-plugin's detectOSAwareHermesCommand() still looks
 * for hermesc at `react-native/sdks/hermesc/%OS-BIN%/hermesc`.
 *
 * This plugin creates symlinks at the expected location pointing to the
 * actual hermesc binaries in the hermes-compiler package, and ensures
 * they have execute permissions.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFixHermescPath(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      // Find the react-native package directory
      let rnDir;
      try {
        rnDir = path.dirname(require.resolve('react-native/package.json'));
      } catch (e) {
        console.warn('[withFixHermescPath] react-native package not found, skipping');
        return config;
      }

      // Find the hermes-compiler package directory
      let hermescPkgDir;
      try {
        hermescPkgDir = path.dirname(require.resolve('hermes-compiler/package.json'));
      } catch (e) {
        console.warn('[withFixHermescPath] hermes-compiler package not found, skipping');
        return config;
      }

      const sdksDir = path.join(rnDir, 'sdks', 'hermesc');
      const platforms = ['linux64-bin', 'osx-bin', 'win64-bin'];

      for (const platform of platforms) {
        const srcBin = path.join(hermescPkgDir, 'hermesc', platform, 'hermesc');
        const targetDir = path.join(sdksDir, platform);
        const targetBin = path.join(targetDir, 'hermesc');

        if (!fs.existsSync(srcBin)) {
          continue;
        }

        // Ensure target directory exists
        fs.mkdirSync(targetDir, { recursive: true });

        // Create symlink if target doesn't exist
        if (!fs.existsSync(targetBin)) {
          try {
            fs.symlinkSync(srcBin, targetBin);
            console.log(`[withFixHermescPath] Symlinked ${platform}/hermesc → ${srcBin}`);
          } catch (e) {
            // Fallback: copy the binary
            fs.copyFileSync(srcBin, targetBin);
            console.log(`[withFixHermescPath] Copied ${platform}/hermesc from ${srcBin}`);
          }
        }

        // Ensure execute permission
        try {
          fs.chmodSync(targetBin, 0o755);
          fs.chmodSync(srcBin, 0o755);
        } catch (e) {
          // ignore permission errors on Windows
        }
      }

      return config;
    },
  ]);
};