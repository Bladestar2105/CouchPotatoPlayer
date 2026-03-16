content = <<~TEXT
import Foundation\r
#if os(iOS)\r
import Flutter\r
#endif\r
TEXT

patched = content
patched = patched.gsub(
  /#if os\(iOS\)\s+import Flutter\s+#endif/,
  "#if os(iOS) || os(tvOS)\n  import Flutter\n#endif\n"
)
puts patched
