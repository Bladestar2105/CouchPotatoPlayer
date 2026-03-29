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

  # KSPlayer/MEPlayer is declared in the Podfile via :git => ... source.
  # We must also declare it as a dependency here so that CocoaPods generates
  # the correct Xcode build order (KSPlayer compiles before react-native-ksplayer).
  # Without this, Xcode tries to compile react-native-ksplayer in parallel with
  # (or before) KSPlayer, causing "header 'KSPlayer-Swift.h' not found" errors
  # because the Swift-generated header does not exist yet.
  #
  # NOTE: CocoaPods resolves this dependency from the Podfile's :git source for
  # KSPlayer/MEPlayer — it does NOT require KSPlayer to be on the CocoaPods trunk CDN.
  s.dependency "KSPlayer/MEPlayer"
end