const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Xcode 26 / Swift 6 enforces consistent access levels for imports.
 * ExpoModulesProvider.swift (auto-generated) uses `internal import Expo`
 * while AppDelegate.swift uses `import Expo` (implicitly public).
 * This plugin patches AppDelegate.swift to use `internal import Expo`
 * to match the access level and avoid the compilation error.
 */
module.exports = function withFixSwiftImports(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      const appDelegatePath = path.join(
        config.modRequest.platformProjectRoot,
        config.modRequest.projectName || "CouchPotatoPlayer",
        "AppDelegate.swift"
      );

      if (fs.existsSync(appDelegatePath)) {
        let content = fs.readFileSync(appDelegatePath, "utf-8");
        // Replace bare `import Expo` with `internal import Expo`
        // but don't touch lines that already have an access modifier
        content = content.replace(
          /^import Expo$/m,
          "internal import Expo"
        );
        fs.writeFileSync(appDelegatePath, content);
        console.log("[withFixSwiftImports] Patched AppDelegate.swift: import Expo → internal import Expo");
      } else {
        console.warn("[withFixSwiftImports] AppDelegate.swift not found at", appDelegatePath);
      }

      return config;
    },
  ]);
};