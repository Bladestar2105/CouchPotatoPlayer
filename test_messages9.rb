content = <<~SWIFT
import Foundation

#if os(iOS)
  import Flutter
#elseif os(macOS)
  import FlutterMacOS
#else
#endif
SWIFT

patched = content

# Replace all os(iOS) with os(iOS) || os(tvOS) for Pigeon imports
# But wait, we also want to remove #error("Unsupported platform.")
# A simpler regex:
patched = patched.gsub(/(#if\s+os\(iOS\))(\n\s*import\s+Flutter)/, '\1 || os(tvOS)\2')
patched = patched.gsub(/\n\s*#else\n\s*#error\("Unsupported platform\."\)/, '')

puts patched
