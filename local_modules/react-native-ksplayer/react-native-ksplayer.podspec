require("Pathname")

Pod::Spec.new do |s|
  s.name         = "react-native-ksplayer"
  s.version      = "1.0.0"
  s.summary      = "KSPlayer for React Native"
  s.homepage     = "https://github.com/react-native-ksplayer"
  s.license      = "MIT"
  s.author       = { "Author" => "author@example.com" }
  s.platforms    = { :ios => "13.0", :tvos => "13.0" }
  s.source       = { :git => "https://github.com/react-native-ksplayer.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.dependency "React-Core"
  s.dependency "KSPlayer"
end
