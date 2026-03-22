const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Patches React Native's RCTThirdPartyComponentsProvider generator scripts.
 *
 * Some third-party libraries define Fabric components via codegen that aren't
 * actually linked into the final binary (e.g. they don't support tvOS but
 * the codegen still includes them).
 *
 * The standard React Native codegen script generates an NSDictionary literal:
 * `@{ @"ComponentName": NSClassFromString(@"ClassName") }`
 *
 * If `ClassName` is not found at runtime, `NSClassFromString` returns `nil`.
 * Inserting `nil` into an NSDictionary literal causes a crash:
 * `-[__NSPlaceholderDictionary initWithObjects:forKeys:count:]: attempt to insert nil object from objects[0]`
 *
 * This plugin safely modifies the generator and its template to use an `NSMutableDictionary`
 * and checks for `nil` before inserting.
 */
module.exports = function withPatchThirdPartyFabricComponents(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      // Find the path to the react-native package
      const reactNativePath = path.dirname(require.resolve('react-native/package.json'));

      const generateScriptPath = path.join(
        reactNativePath,
        'scripts/codegen/generate-artifacts-executor/generateRCTThirdPartyComponents.js'
      );
      const templatePath = path.join(
        reactNativePath,
        'scripts/codegen/templates/RCTThirdPartyComponentsProviderMM.template'
      );

      if (fs.existsSync(generateScriptPath)) {
        let content = fs.readFileSync(generateScriptPath, 'utf8');

        // We replace the logic that builds the mapping strings
        const safeMappingLogic = `const thirdPartyComponentsMapping = Object.keys(componentsInLibraries)
    .flatMap(library => {
      const components = componentsInLibraries[library];
      return components.map(({componentName, className}) => {
        return \`\\t\\tClass \${className}Class = NSClassFromString(@"\${className}");\\n\\t\\tif (\${className}Class != nil) {\\n\\t\\t\\t[dict setObject:\${className}Class forKey:@"\${componentName}"];\\n\\t\\t}\`;
      });
    })
    .join('\\n');`;

        // The original script uses: `const thirdPartyComponentsMapping = Object.keys(componentsInLibraries) ... .join('\n');`
        content = content.replace(
          /const thirdPartyComponentsMapping = Object\.keys\(componentsInLibraries\)[\s\S]*?\.join\('\\n'\);/,
          safeMappingLogic
        );
        fs.writeFileSync(generateScriptPath, content);
      }

      if (fs.existsSync(templatePath)) {
        let templateContent = fs.readFileSync(templatePath, 'utf8');

        // The original template uses:
        // `thirdPartyComponents = @{ \n {thirdPartyComponentsMapping} \n };`
        templateContent = templateContent.replace(
          /thirdPartyComponents = @\{\s*\{thirdPartyComponentsMapping\}\s*\};/,
          `NSMutableDictionary *dict = [NSMutableDictionary new];\n{thirdPartyComponentsMapping}\n    thirdPartyComponents = [dict copy];`
        );
        fs.writeFileSync(templatePath, templateContent);
      }

      return config;
    },
  ]);
};
