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

# Replace "#if os(iOS)" with "#if os(iOS) || os(tvOS)" where "import Flutter" is present
patched = patched.gsub(/(#if\s+os\(iOS\))(\n\s*import\s+Flutter\b)/, '\1 || os(tvOS)\2')

# Remove #else \n #error("Unsupported platform.") block if we just patched an iOS/macOS branch
if patched.include?("os(tvOS)") && patched.include?("#error(\"Unsupported platform.\")")
  patched = patched.gsub(/\n\s*#else\n\s*#error\("Unsupported platform\."\)\n(#endif)/, "\n\\1")
end

puts patched
