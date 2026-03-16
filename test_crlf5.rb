content = File.read("test_dl/darwin/path_provider_foundation/Sources/path_provider_foundation/messages.g.swift")

# Replace "#if os(iOS)" with "#if os(iOS) || os(tvOS)" where "import Flutter" is present
patched = content.gsub(/(#if\s+os\(iOS\))(\s+import\s+Flutter\b)/, '\1 || os(tvOS)\2')

# Remove #else \n #error("Unsupported platform.") block if we just patched an iOS/macOS branch
if patched.include?("os(tvOS)") && patched.include?("#error(\"Unsupported platform.\")")
  patched = patched.gsub(/\s*#else\s*#error\("Unsupported platform\."\)\s*(#endif)/, "\n\\1")
end

puts patched.split("\n")[0..15]
