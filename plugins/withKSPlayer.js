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
  # KSPlayer/Core: contains Utility.swift with runOnMainThread() used by AVPlayer
  # This is needed because the podspec's AVPlayer subspec doesn't declare this dependency.
  pod 'KSPlayer/Core', :git => 'https://github.com/kingslay/KSPlayer.git', :commit => '46f08efc4998367690090ae8a37f201f557fdd82'
  # KSPlayer/Video: contains KSOptions extensions (canBackgroundPlay, animateDelayTimeInterval)
  # Used by AVPlayer code but not declared as a dependency in the podspec.
  pod 'KSPlayer/Video', :git => 'https://github.com/kingslay/KSPlayer.git', :commit => '46f08efc4998367690090ae8a37f201f557fdd82'
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

    # react-native-tvos can fail to compile fmt on some Xcode/Clang toolchains
    # for both iOS and tvOS due to consteval FMT_STRING checks in format-inl.h.
    # Workaround: disable fmt's NTTP/consteval formatting path for the fmt pod.
    installer.pods_project.targets.each do |target|
      next unless target.name == 'fmt'

      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'

        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= ['$(inherited)']
        defs = config.build_settings['GCC_PREPROCESSOR_DEFINITIONS']
        defs << 'FMT_USE_NONTYPE_TEMPLATE_ARGS=0' unless defs.include?('FMT_USE_NONTYPE_TEMPLATE_ARGS=0')
        defs << 'FMT_USE_CONSTEVAL=0' unless defs.include?('FMT_USE_CONSTEVAL=0')
        defs << 'FMT_USE_CONSTEXPR=0' unless defs.include?('FMT_USE_CONSTEXPR=0')
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] = defs

        config.build_settings['WARNING_CFLAGS'] ||= ['$(inherited)']
        warning_flags = config.build_settings['WARNING_CFLAGS']
        warning_flags << '-Wno-invalid-constexpr' unless warning_flags.include?('-Wno-invalid-constexpr')
        config.build_settings['WARNING_CFLAGS'] = warning_flags
      end
    end
`;

/**
 * Post-install hook code to keep App Store upload compatibility fixes persistent
 * across `expo prebuild --clean` regenerations.
 */
const APPLE_UPLOAD_POST_INSTALL = `
    # Ensure release archives include dSYMs for symbol upload.
    installer.pods_project.build_configurations.each do |build_config|
      build_config.build_settings['DEBUG_INFORMATION_FORMAT'] = 'dwarf-with-dsym'
      build_config.build_settings['GCC_GENERATE_DEBUGGING_SYMBOLS'] = 'YES'
    end

    # Patch CocoaPods framework embedding scripts used during archive to ensure
    # App Store upload validation passes for TVVLCKit and Hermes.
    support_files_root = File.join(installer.sandbox.root.to_s, 'Target Support Files')
    frameworks_scripts = Dir.glob(File.join(support_files_root, 'Pods-*', 'Pods-*-frameworks.sh'))
    frameworks_scripts.each do |script_path|
      script = File.read(script_path)

      unless script.include?('Final release safety net for TVVLCKit bitcode upload validation.')
        script += <<~'SH'

        # Final release safety net for TVVLCKit bitcode upload validation.
        if [[ "$CONFIGURATION" == "Release" ]]; then
          TVVLC_BINARY="\${TARGET_BUILD_DIR}/\${FRAMEWORKS_FOLDER_PATH}/TVVLCKit.framework/TVVLCKit"
          if [[ -f "\${TVVLC_BINARY}" ]]; then
            xcrun bitcode_strip "\${TVVLC_BINARY}" -r -o "\${TVVLC_BINARY}"
          fi
        fi
        SH
      end

      unless script.include?('Ensure archive contains hermesvm.framework dSYM expected by App Store upload validation.')
        script += <<~'SH'

        # Ensure archive contains hermesvm.framework dSYM expected by App Store upload validation.
        if [[ "$CONFIGURATION" == "Release" ]]; then
          HERMES_BINARY="\${TARGET_BUILD_DIR}/\${FRAMEWORKS_FOLDER_PATH}/hermesvm.framework/hermesvm"
          if [[ -f "\${HERMES_BINARY}" && -n "\${DWARF_DSYM_FOLDER_PATH:-}" ]]; then
            HERMES_DSYM="\${DWARF_DSYM_FOLDER_PATH}/hermesvm.framework.dSYM"
            rm -rf "\${HERMES_DSYM}"
            xcrun dsymutil "\${HERMES_BINARY}" -o "\${HERMES_DSYM}"
          fi
        fi
        SH
      end

      File.write(script_path, script)
    end

    # App Store Connect rejects tvOS uploads when TVVLCKit still contains bitcode.
    # Strip bitcode from all vendored TVVLCKit framework binaries after pods integration.
    bitcode_strip = \`xcrun --find bitcode_strip\`.strip
    if !bitcode_strip.empty?
      tvvlc_frameworks = Dir.glob(File.join(Pod::Config.instance.installation_root.to_s, 'Pods', '**', 'TVVLCKit.framework', 'TVVLCKit'))
      tvvlc_frameworks.each do |tvvlc_framework|
        next unless File.exist?(tvvlc_framework)
        Pod::UI.puts("Stripping bitcode from #{tvvlc_framework}")
        system(bitcode_strip, tvvlc_framework, '-r', '-o', tvvlc_framework)
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
 * Adds a post-install hook snippet to the Podfile's post_install block.
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
function addPostInstallSnippet(src, marker, snippet) {
  // Check if already present
  if (src.includes(marker)) {
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
          result.push(snippet);
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

      // Add KSPlayer pods when not already present.
      if (!(contents.includes("pod 'Libass'") && contents.includes("pod 'KSPlayer/MEPlayer'"))) {
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
      }

      // Ensure KSPlayer-specific post-install hook exists.
      try {
        const postInstallResult = addPostInstallSnippet(
          contents,
          "if target.name == 'react-native-ksplayer'",
          KSPLAYER_POST_INSTALL
        );
        contents = postInstallResult.contents;
      } catch (error) {
        console.warn(
          '[withKSPlayer] Could not add KSPlayer post_install hook: ' + error.message
        );
        // Don't throw - the pods are more important than the post_install hook.
      }

      // Ensure Apple upload compatibility fixes exist.
      try {
        const appleUploadResult = addPostInstallSnippet(
          contents,
          'Final release safety net for TVVLCKit bitcode upload validation.',
          APPLE_UPLOAD_POST_INSTALL
        );
        contents = appleUploadResult.contents;
      } catch (error) {
        console.warn(
          '[withKSPlayer] Could not add Apple upload post_install hook: ' + error.message
        );
        // Don't throw - keep prebuild resilient.
      }

      fs.writeFileSync(podfilePath, contents);

      return config;
    },
  ]);
};
