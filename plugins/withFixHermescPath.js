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
        console.warn('[withFixHermescPath] build.gradle not found, skipping.');
        return config;
      }

      let content = fs.readFileSync(buildGradlePath, 'utf-8');

      // The previous logic failed in CI because node execution within gradle script
      // returned an empty string, causing .getParentFile() to return null.
      // Instead of running node via string execute, we can resolve the path directly here
      // and inject the absolute string literal into the gradle file.

      try {
        const hermesCompilerPkg = require.resolve('hermes-compiler/package.json', { paths: [config.modRequest.projectRoot] });
        const hermesDir = path.dirname(hermesCompilerPkg);

        const oldPattern = /hermesCommand\s*=\s*new File\(\["node".*?require\.resolve\('react-native\/package\.json'\).*?\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/sdks\/hermesc\/%OS-BIN%\/hermesc"/;
        const previousPatchPattern = /hermesCommand\s*=\s*new File\(\["node".*?require\.resolve\('hermes-compiler\/package\.json'.*?\)\.getParentFile\(\)\.getAbsolutePath\(\)\s*\+\s*"\/hermesc\/%OS-BIN%\/hermesc"/;

        const safePath = hermesDir.replace(/\\/g, '\\\\');
        const newCommand = `hermesCommand = "${safePath}/hermesc/%OS-BIN%/hermesc"`;

        if (oldPattern.test(content)) {
          content = content.replace(oldPattern, newCommand);
          fs.writeFileSync(buildGradlePath, content, 'utf-8');
          console.log('[withFixHermescPath] ✅ Updated hermesCommand to use hermes-compiler package path statically.');
        } else if (previousPatchPattern.test(content)) {
          content = content.replace(previousPatchPattern, newCommand);
          fs.writeFileSync(buildGradlePath, content, 'utf-8');
          console.log('[withFixHermescPath] ✅ Updated previously patched hermesCommand to use static hermes-compiler package path.');
        } else {
          console.log('[withFixHermescPath] hermesCommand already patched correctly or not found, skipping.');
        }
      } catch (error) {
        console.warn('[withFixHermescPath] Failed to resolve hermes-compiler, skipping patch.', error);
      }

      return config;
    },
  ]);
};
