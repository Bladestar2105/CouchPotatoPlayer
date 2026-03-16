content_lf = "#if os(iOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#else\n  #error(\"Unsupported platform.\")\n#endif"
content_crlf = "#if os(iOS)\r\n  import Flutter\r\n#elseif os(macOS)\r\n  import FlutterMacOS\r\n#else\r\n  #error(\"Unsupported platform.\")\r\n#endif"

def patch(patched)
  patched = patched.gsub(/(#if\s+os\(iOS\))(\s+import\s+Flutter\b)/, '\1 || os(tvOS)\2')
  if patched.include?("os(tvOS)") && patched.include?("#error(\"Unsupported platform.\")")
    patched = patched.gsub(/\s*#else\s*#error\("Unsupported platform\."\)\s*(#endif)/, "\n\\1")
  end
  patched
end

puts "LF:\n#{patch(content_lf).inspect}"
puts "CRLF:\n#{patch(content_crlf).inspect}"
