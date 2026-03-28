/**
 * Expo Config Plugin: withFixHermescPath
 *
 * In React Native 0.84+, the Hermes compiler (hermesc) binary is shipped via
 * the `hermes-compiler` npm package instead of the old location at
 * `react-native/sdks/hermesc/<platform>/hermesc`.
 *
 * The react-native-gradle-plugin's detectOSAwareHermesCommand() still looks
 * for the old path. This plugin patches android/app/build.gradle to explicitly
 * set `react.hermesCommand` to point to the hermes-compiler package binary.
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

      // Resolve the hermes-compiler package directory at prebuild time
      let hermescDir;
      try {
        const hermescPkgJson = require.resolve('hermes-compiler/package.json');
        hermescDir = path.dirname(hermescPkgJson);
      } catch (e) {
        console.warn('[withFixHermescPath] hermes-compiler not found, skipping');
        return config;
      }

      // Determine the correct OS-specific binary path
      const linuxBin = path.join(hermescDir, 'hermesc', 'linux64-bin', 'hermesc');
      const osxBin = path.join(hermescDir, 'hermesc', 'osx-bin', 'hermesc');

      // Make both binaries executable
      for (const bin of [linuxBin, osxBin]) {
        if (fs.existsSync(bin)) {
          fs.chmodSync(bin, 0o755);
          console.log(`[withFixHermescPath] chmod +x ${bin}`);
        }
      }

      // Add react.hermesCommand to the react {} block in build.gradle
      // The react-native gradle plugin reads this property to find hermesc
      const hermescRelPath = path.relative(
        config.modRequest.platformProjectRoot,
        path.join(hermescDir, 'hermesc')
      );

      const hermesCommandLine = `    hermesCommand = new File(["node", "--print", "require.resolve('hermes-compiler/package.json')"].execute(null, rootDir).text.trim()).parentFile.absolutePath + "/hermesc/%OS-BIN%/hermesc"`;

      // Check if react {} block already has hermesCommand
      if (contents.includes('hermesCommand')) {
        // Replace existing hermesCommand
        contents = contents.replace(
          /hermesCommand\s*=\s*.*/,
          hermesCommandLine.trim()
        );
        console.log('[withFixHermescPath] Updated existing hermesCommand in build.gradle');
      } else {
        // Insert hermesCommand into the react {} block
        contents = contents.replace(
          /react\s*\{/,
          `react {\n${hermesCommandLine}`
        );
        console.log('[withFixHermescPath] Added hermesCommand to react {} block in build.gradle');
      }

      fs.writeFileSync(buildGradlePath, contents, 'utf-8');
      return config;
    },
  ]);
};