const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Xcode 26 / Swift 6 enforces consistent access levels for imports.
 * ExpoModulesProvider.swift (auto-generated) uses `internal import Expo`
 * while AppDelegate.swift uses `import Expo` (implicitly public/internal).
 *
 * Additionally, SDK 55+ removed `bindReactNativeFactory` — if the committed
 * AppDelegate.swift still references it, we must remove that call.
 *
 * Fix: change `import Expo` to `internal import Expo` AND remove `public`
 * from the class and method declarations (make them internal to match).
 * Also remove `bindReactNativeFactory(factory)` if present and update
 * `@UIApplicationMain` to `@main`.
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

        // 5. Remove `bindReactNativeFactory(factory)` (removed in SDK 55+)
        content = content.replace(/^\s*bindReactNativeFactory\(factory\)\s*\n?/m, "");

        // 6. Replace @UIApplicationMain with @main (Swift 5.3+ / SDK 55+)
        content = content.replace(/@UIApplicationMain/g, "@main");

        // Avoid double-internal (if prebuild already set internal)
        content = content.replace(/internal internal import/g, "internal import");

        fs.writeFileSync(appDelegatePath, content);
        console.log("[withFixSwiftImports] Patched AppDelegate.swift: made all imports internal, removed public modifiers, cleaned up SDK 55+ changes");
      } else {
        console.warn("[withFixSwiftImports] AppDelegate.swift not found at", appDelegatePath);
      }

      return config;
    },
  ]);
};