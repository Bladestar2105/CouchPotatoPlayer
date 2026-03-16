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
patched = patched.gsub(/(#if\s+os\(iOS\))(\n\s*import\s+Flutter\b)/, '\1 || os(tvOS)\2')
patched = patched.gsub(/\n\s*#else\n\s*#error\("Unsupported platform\."\)\n(#endif)/, "\n\\1")
puts patched
