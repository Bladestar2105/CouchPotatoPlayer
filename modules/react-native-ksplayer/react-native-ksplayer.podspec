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
  # We cannot use s.dependency here because KSPlayer is not on the CocoaPods CDN.
  # The Podfile explicitly declares the dependency, which will link the frameworks.
  # 
  # To ensure correct build order (KSPlayer must build before this module so that
  # KSPlayer-Swift.h exists), we rely on the Podfile's explicit pod declarations.
  # CocoaPods will process pods in the order they are declared in the Podfile.
end