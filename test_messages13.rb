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
patched = content

# Instead of specific indentations, just use regex!
# Pattern 1: With macOS
patched = patched.gsub(/#if\s+os\(iOS\)\n\s*import\s+Flutter\n#elseif\s+os\(macOS\)\n\s*import\s+FlutterMacOS\n#else\n\s*#error\("Unsupported platform\."\)\n#endif/) { |match|
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
}

# Pattern 2: Without macOS
patched = patched.gsub(/#if\s+os\(iOS\)\n\s*import\s+Flutter\n#endif/) { |match|
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#endif"
}

# Pattern 3: With macOS but no error (ends with #endif after macOS)
patched = patched.gsub(/#if\s+os\(iOS\)\n\s*import\s+Flutter\n#elseif\s+os\(macOS\)\n\s*import\s+FlutterMacOS\n#endif/) { |match|
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
}

puts patched
