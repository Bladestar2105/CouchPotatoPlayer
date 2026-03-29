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

  # React Native dependencies - use React-RCTFabric for Fabric/New Architecture
  s.dependency "React-Core"
  s.dependency "React-RCTFabric"
  s.dependency "KSPlayer/MEPlayer"
end