const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Xcode 26 / Swift 6 enforces consistent access levels for imports.
 * ExpoModulesProvider.swift (auto-generated) uses `internal import Expo`
 * while AppDelegate.swift uses `import Expo` (implicitly public/internal).
 *
 * The conflict arises because the AppDelegate class and its methods are
 * declared `public`, but when Expo is imported as `internal` elsewhere,
 * Swift 6 requires consistency.
 *
 * Fix: change `import Expo` to `internal import Expo` AND remove `public`
 * from the class and method declarations (make them internal to match).
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

        // 1. Change `import Expo` to `internal import Expo`
        content = content.replace(
          /^import Expo$/m,
          "internal import Expo"
        );

        // 2. Change `import React` to `internal import React` (same issue)
        content = content.replace(
          /^import React$/m,
          "internal import React"
        );

        // 3. Change `import ReactAppDependencyProvider` to internal
        content = content.replace(
          /^import ReactAppDependencyProvider$/m,
          "internal import ReactAppDependencyProvider"
        );

        // 4. Remove `public` from class and method declarations
        //    (they must be internal when the imports are internal)
        content = content.replace(/public class AppDelegate/g, "class AppDelegate");
        content = content.replace(/public override func/g, "override func");

        fs.writeFileSync(appDelegatePath, content);
        console.log("[withFixSwiftImports] Patched AppDelegate.swift: made all imports internal, removed public modifiers");
      } else {
        console.warn("[withFixSwiftImports] AppDelegate.swift not found at", appDelegatePath);
      }

      return config;
    },
  ]);
};