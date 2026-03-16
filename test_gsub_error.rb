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

# Replace #error if it's there
patched = patched.gsub(/#else\s+#error\("Unsupported platform."\)\s+#endif/, "#endif\n")

puts patched
