/**
 * Expo Config Plugin: withKSPlayer
 *
 * Injects KSPlayer and FFmpegKit pods into the iOS Podfile during prebuild.
 * These pods are not on CocoaPods CDN, so they must be declared with :git sources.
 *
 * This plugin is necessary because `expo prebuild --clean` regenerates the ios directory,
 * losing any manual Podfile modifications.
 *
 * Dependencies:
 *   react-native-ksplayer → KSPlayer/MEPlayer → FFmpegKit → Libass
 */
const { withDangerousMod } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');
const path = require('path');
const fs = require('fs');

/**
 * Pod declarations to inject into the Podfile.
 * Pinned to specific commits for reproducibility.
 */
const KSPLAYER_PODS = `  # ─── KSPlayer (FFmpeg-based player for full IPTV format support on iOS/tvOS) ───
  # KSPlayer/MEPlayer uses FFmpegKit which supports raw MPEG-TS and all FFmpeg formats.
  # This is required by the react-native-ksplayer native module.
  #
  # IMPORTANT: These pods MUST be declared BEFORE use_native_modules! because
  # the react-native-ksplayer.podspec has s.dependency "KSPlayer/MEPlayer".
  # CocoaPods needs to know about KSPlayer before evaluating the podspec.
  #
  # Dependency chain:
  #   react-native-ksplayer → KSPlayer/MEPlayer → FFmpegKit → Libass
  #
  # These pods are not on CocoaPods trunk. All podspecs have version numbers that
  # do not match real git tags (e.g. KSPlayer podspec says 1.1.0 but tags are 2.x.x).
  # We use :git + :commit to pin to HEAD of each repo and bypass tag resolution.
  #
  # Pinned commits (update when upgrading):
  #   FFmpegKit/Libass: d7048037 (HEAD/main as of 2026-03-29)
  #   KSPlayer: 46f08efc (HEAD/main as of 2026-03-29)
  pod 'Libass', :git => 'https://github.com/kingslay/FFmpegKit.git', :commit => 'd7048037a2eb94a3b08113fbf43aa92bdcb332d9'
  pod 'FFmpegKit', :git => 'https://github.com/kingslay/FFmpegKit.git', :commit => 'd7048037a2eb94a3b08113fbf43aa92bdcb332d9'
  pod 'DisplayCriteria', :git => 'https://github.com/kingslay/KSPlayer.git', :commit => '46f08efc4998367690090ae8a37f201f557fdd82'
  # KSPlayer/MEPlayer: the /MEPlayer subspec includes FFmpegKit (KSMEPlayer backend)
  pod 'KSPlayer/MEPlayer', :git => 'https://github.com/kingslay/KSPlayer.git', :commit => '46f08efc4998367690090ae8a37f201f557fdd82'

`;

/**
 * Post-install hook code to add to the post_install block.
 * This will be inserted after the react_native_post_install call.
 */
const KSPLAYER_POST_INSTALL = `
    # Ensure react-native-ksplayer can find KSPlayer frameworks
    installer.pods_project.targets.each do |target|
      if target.name == 'react-native-ksplayer'
        target.build_configurations.each do |config|
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] ||= ['$(inherited)']
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '$(PODS_ROOT)/KSPlayer'
          config.build_settings['FRAMEWORK_SEARCH_PATHS'] << '$(PODS_CONFIGURATION_BUILD_DIR)/KSPlayer'
        end
      end
    end
`;

/**
 * Adds KSPlayer pod declarations to the Podfile, before use_native_modules!
 * Uses mergeContents which works on a single-line anchor.
 */
function addKSPlayerPods(src) {
  return mergeContents({
    tag: 'withKSPlayer-pods',
    src,
    newSrc: KSPLAYER_PODS,
    anchor: /config = use_native_modules!\(/,
    offset: 0,
    comment: '#',
  });
}

/**
 * Adds KSPlayer post-install hook to the Podfile's post_install block.
 * 
 * Since mergeContents only works with single-line anchors, we use a different approach:
 * We find the post_install block and modify it directly using string manipulation.
 * 
 * The Expo-generated Podfile has this structure:
 *   post_install do |installer|
 *     react_native_post_install(
 *       installer,
 *       config[:reactNativePath],
 *       :mac_catalyst_enabled => false,
 *       :ccache_enabled => ccache_enabled?(podfile_properties),
 *     )
 *   end
 * 
 * We need to insert our code after the closing ) of react_native_post_install
 * but before the closing 'end' of the post_install block.
 */
function addKSPlayerPostInstall(src) {
  // Check if already present
  if (src.includes("if target.name == 'react-native-ksplayer'")) {
    return { contents: src };
  }

  // Find the post_install block
  // Look for the pattern: post_install do |installer| ... end
  // We need to find the matching 'end' for the post_install block
  
  // Strategy: Find the line with just ")" (closing the react_native_post_install call)
  // and insert our code after it, before the next "end"
  
  const lines = src.split('\n');
  let result = [];
  let foundPostInstall = false;
  let inserted = false;
  let parenCount = 0;
  let inReactNativePostInstall = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);
    
    // Track when we're inside post_install
    if (line.includes('post_install do |installer|')) {
      foundPostInstall = true;
    }
    
    // Look for react_native_post_install call
    if (foundPostInstall && line.includes('react_native_post_install(')) {
      inReactNativePostInstall = true;
      parenCount = 0;
    }
    
    // Count parentheses to find the end of react_native_post_install call
    if (inReactNativePostInstall) {
      // Count opening parens
      const openParens = (line.match(/\(/g) || []).length;
      // Count closing parens
      const closeParens = (line.match(/\)/g) || []).length;
      parenCount += openParens - closeParens;
      
      // When parenCount goes back to 0 or negative, we've closed the call
      if (parenCount <= 0) {
        inReactNativePostInstall = false;
        // Insert our code after this line, before the 'end'
        if (!inserted) {
          result.push(KSPLAYER_POST_INSTALL);
          inserted = true;
        }
      }
    }
  }
  
  if (!inserted) {
    throw new Error(
      'Could not find the right place to insert post_install hook. ' +
      'Make sure the Podfile has a post_install block with react_native_post_install call.'
    );
  }
  
  return { contents: result.join('\n') };
}

/**
 * The main config plugin function.
 */
module.exports = function withKSPlayer(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      
      if (!fs.existsSync(podfilePath)) {
        throw new Error(`Podfile not found at ${podfilePath}`);
      }

      let contents = fs.readFileSync(podfilePath, 'utf-8');

      // Check if we already added the pods
      if (contents.includes("pod 'Libass'") && contents.includes("pod 'KSPlayer/MEPlayer'")) {
        console.log('[withKSPlayer] Pods already present in Podfile, skipping');
        return config;
      }

      // Add KSPlayer pods
      try {
        const podsResult = addKSPlayerPods(contents);
        contents = podsResult.contents;
      } catch (error) {
        if (error.code === 'ERR_NO_MATCH') {
          throw new Error(
            `Cannot add KSPlayer pods to Podfile: could not find 'use_native_modules!' anchor. ` +
            `Please check your Podfile structure.`
          );
        }
        throw error;
      }

      // Add post-install hook if not already present
      if (!contents.includes("if target.name == 'react-native-ksplayer'")) {
        try {
          const postInstallResult = addKSPlayerPostInstall(contents);
          contents = postInstallResult.contents;
        } catch (error) {
          console.warn(
            '[withKSPlayer] Could not add post_install hook: ' + error.message
          );
          // Don't throw - the pods are more important than the post_install hook
        }
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('[withKSPlayer] Added KSPlayer pods to Podfile');

      return config;
    },
  ]);
};