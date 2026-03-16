content = <<~TEXT
// some comment
#if os(iOS)
  import Flutter
#elseif os(macOS)
  import FlutterMacOS
#else
  #error("Unsupported platform.")
#endif
TEXT

patched = content
patched = patched.gsub(/#else\s+#error\("Unsupported platform."\)\s+#endif/, "#endif\n")
if !patched.include?('os(tvOS)')
  patched = patched.gsub(/#if os\(iOS\)(\s+)import Flutter/, "#if os(iOS) || os(tvOS)\\1import Flutter")
end
puts patched
