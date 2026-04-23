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

        // 1. Change `import` to `internal import` for key modules
        content = content.replace(
          /^import (Expo|React|ReactAppDependencyProvider)\s*$/gm,
          "internal import $1"
        );

        // 2. Remove `public` from class and method declarations
        //    (they must be internal when the imports are internal)
        content = content.replace(/\bpublic\s+(class|func|override\s+func)\b/g, "$1");

        // 3. Remove `bindReactNativeFactory(factory)` (removed in SDK 55+)
        //    Handles optional `self.` and variable indentation
        content = content.replace(/^\s*(self\.)?bindReactNativeFactory\(factory\)\s*[\r\n]*/gm, "");

        // 4. Replace @UIApplicationMain with @main (Swift 5.3+ / SDK 55+)
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
