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
 * Post-install hook to ensure react-native-ksplayer can find KSPlayer frameworks.
 * This adds the correct framework search paths.
 */
const KSPLAYER_POST_INSTALL = `    # Ensure react-native-ksplayer can find KSPlayer frameworks
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
 * This is critical because use_native_modules! evaluates local podspecs,
 * and the react-native-ksplayer.podspec has s.dependency "KSPlayer/MEPlayer".
 */
function addKSPlayerPods(src) {
  // First try to match after use_frameworks! lines
  const frameworksPattern = /use_frameworks! :linkage => (?:podfile_properties|ENV)/;
  const match = src.match(frameworksPattern);
  
  if (match) {
    // Find the end of the use_frameworks! section (next blank line or end of line)
    const afterFrameworks = src.substring(src.indexOf(match[0]) + match[0].length);
    const endOfLine = afterFrameworks.indexOf('\n');
    
    return mergeContents({
      tag: 'withKSPlayer-pods',
      src,
      newSrc: KSPLAYER_PODS,
      // Insert after use_frameworks! lines
      anchor: frameworksPattern,
      offset: 2, // Skip past the two use_frameworks! lines
      comment: '#',
    });
  }
  
  // Fallback: insert before use_native_modules!
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
 */
function addKSPlayerPostInstall(src) {
  return mergeContents({
    tag: 'withKSPlayer-post-install',
    src,
    newSrc: KSPLAYER_POST_INSTALL,
    // Insert after react_native_post_install call's closing paren
    anchor: /\)\s*\n\s*# Ensure react-native-ksplayer|:\s*ccache_enabled/,
    offset: 3,
    comment: '#',
  });
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
            `Cannot add KSPlayer pods to Podfile: could not find insertion anchor. ` +
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
          if (error.code === 'ERR_NO_MATCH') {
            console.warn(
              '[withKSPlayer] Could not find post_install block to add framework search paths. ' +
              'You may need to add them manually.'
            );
          } else {
            throw error;
          }
        }
      }

      fs.writeFileSync(podfilePath, contents);
      console.log('[withKSPlayer] Added KSPlayer pods to Podfile');

      return config;
    },
  ]);
};