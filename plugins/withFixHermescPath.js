/**
 * Expo Config Plugin: withFixHermescPath
 *
 * In React Native 0.84+, the Hermes compiler (hermesc) binary is shipped via
 * the `hermes-compiler` npm package instead of the old location at
 * `react-native/sdks/hermesc/<platform>/hermesc`.
 *
 * When Expo prebuild generates android/app/build.gradle, it may still contain
 * a hardcoded hermesCommand pointing to the old path. This plugin patches the
 * generated build.gradle to resolve hermesc from the hermes-compiler package.
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withFixHermescPath(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const buildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'build.gradle'
      );

      if (!fs.existsSync(buildGradlePath)) {
        console.warn('[withFixHermescPath] build.gradle not found, skipping patch');
        return config;
      }

      let contents = fs.readFileSync(buildGradlePath, 'utf-8');

      // Pattern: old hermesCommand pointing to react-native/sdks/hermesc/
      const oldPattern = /hermesCommand\s*=\s*["'].*react-native\/sdks\/hermesc\/.*["']/;

      if (oldPattern.test(contents)) {
        // Resolve the hermes-compiler binary from node_modules
        const newHermesCommand = `hermesCommand = new File(["node", "--print", "require.resolve('hermes-compiler/package.json')"].execute(null, null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/%OS-BIN%/hermesc"`;

        contents = contents.replace(oldPattern, newHermesCommand);
        fs.writeFileSync(buildGradlePath, contents, 'utf-8');
        console.log('[withFixHermescPath] Patched hermesc path in build.gradle');
      } else {
        console.log('[withFixHermescPath] No old hermesc path found, skipping');
      }

      return config;
    },
  ]);
};