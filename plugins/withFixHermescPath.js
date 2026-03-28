const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Fixes the Hermes compiler (hermesc) path in the Android build.gradle.
 *
 * Starting with React Native 0.84 / Hermes V1, the `hermesc` binary is no
 * longer shipped inside `react-native/sdks/hermesc/`. Instead it is provided
 * by the `hermes-compiler` npm package.
 *
 * Expo's prebuild template still generates the old path:
 *   `require.resolve('react-native/package.json') + "/sdks/hermesc/%OS-BIN%/hermesc"`
 *
 * The React Native Gradle Plugin already knows how to find the binary at:
 *   `node_modules/hermes-compiler/hermesc/%OS-BIN%/hermesc`
 *
 * This plugin removes the explicit `hermesCommand` line from the generated
 * `build.gradle` so the Gradle plugin's built-in resolution logic takes over,
 * which correctly locates `hermes-compiler`.
 */
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
        console.warn('[withFixHermescPath] build.gradle not found, skipping.');
        return config;
      }

      let content = fs.readFileSync(buildGradlePath, 'utf-8');

      // Replace the old hardcoded hermesCommand that points to react-native/sdks/hermesc/
      // with a resolution that uses the hermes-compiler npm package directly.
      const oldPattern = /hermesCommand\s*=\s*new File\(\["node".*?require\.resolve\('react-native\/package\.json'\).*?\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/sdks\/hermesc\/%OS-BIN%\/hermesc"/;

      if (oldPattern.test(content)) {
        // Replace with a path that resolves hermes-compiler from node_modules
        content = content.replace(
          oldPattern,
          'hermesCommand = new File(["node", "--print", "require.resolve(\'hermes-compiler/package.json\')"].execute(null, rootDir).text.trim()).getParentFile().getAbsolutePath() + "/hermesc/%OS-BIN%/hermesc"'
        );
        fs.writeFileSync(buildGradlePath, content, 'utf-8');
        console.log('[withFixHermescPath] ✅ Updated hermesCommand to use hermes-compiler package.');
      } else {
        console.log('[withFixHermescPath] hermesCommand already patched or not found, skipping.');
      }

      return config;
    },
  ]);
};