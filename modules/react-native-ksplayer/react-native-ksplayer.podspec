require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-ksplayer"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/kingslay/KSPlayer"
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.0", :tvos => "13.0" }
  s.source       = { :git => "", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"

  s.dependency "React-Core"

  # KSPlayer is not on CocoaPods trunk, so we cannot use s.dependency "KSPlayer/MEPlayer".
  # Instead we inject the framework search path directly into this pod's xcconfig so the
  # Swift compiler can resolve `import KSPlayer` at compile time.
  #
  # The KSPlayer framework is built by CocoaPods into the Pods configuration build dir.
  # We add two paths:
  #   1. $(PODS_CONFIGURATION_BUILD_DIR)/KSPlayer  — standard location
  #   2. $(SYMROOT)/$(CONFIGURATION)-$(EFFECTIVE_PLATFORM_NAME)/KSPlayer — used when
  #      xcodebuild is invoked with a custom SYMROOT (e.g. CI: SYMROOT=$WORKSPACE/build/ios)
  s.xcconfig = {
    "FRAMEWORK_SEARCH_PATHS" => '"$(PODS_CONFIGURATION_BUILD_DIR)/KSPlayer" "$(SYMROOT)/$(CONFIGURATION)-$(EFFECTIVE_PLATFORM_NAME)/KSPlayer"'
  }
end