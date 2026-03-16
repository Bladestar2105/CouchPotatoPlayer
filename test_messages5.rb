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

# Add the new regex patterns
patched = content.gsub(/#if\s+os\(iOS\)\n\s*import\s+Flutter\n#elseif\s+os\(macOS\)\n\s*import\s+FlutterMacOS\n#else\n\s*#error\("Unsupported platform\."\)\n#endif/) { |match|
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
}
puts patched
