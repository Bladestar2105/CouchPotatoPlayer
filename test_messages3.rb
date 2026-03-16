content = <<~SWIFT
import Foundation

#if os(iOS)
import Flutter
#elseif os(macOS)
import FlutterMacOS
#else
#error("Unsupported platform.")
#endif
SWIFT
puts "Patched: " + content.gsub(/#if os\(iOS\)\n *import Flutter\n#elseif os\(macOS\)\n *import FlutterMacOS\n#else\n *#error\("Unsupported platform."\)\n#endif/) { |match|
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
}
