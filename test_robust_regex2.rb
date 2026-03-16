content = <<~TEXT
import Foundation\r
#if os(iOS)\r
import Flutter\r
#elseif os(macOS)\r
import FlutterMacOS\r
#endif\r
TEXT

patched = content
patched = patched.gsub(
  /#if os\(iOS\)\s+import Flutter\s+#elseif os\(macOS\)\s+import FlutterMacOS\s+#endif/,
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif\n"
)
puts patched
