content = <<~TEXT
//  messages.g.swift
#if os(iOS)
  import Flutter
#elseif os(macOS)
  import FlutterMacOS
#else
#error("Unsupported platform.")
#endif
TEXT
patched = content
patched = patched.gsub(
  /#if os\(iOS\)\n\s*import Flutter\n#elseif os\(macOS\)\n\s*import FlutterMacOS\n#else\n\s*#error\("Unsupported platform."\)\n#endif/,
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
)
puts patched
