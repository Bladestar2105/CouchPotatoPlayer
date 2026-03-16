content = File.read("test_dl/darwin/path_provider_foundation/Sources/path_provider_foundation/PathProviderPlugin.swift")
patched = content.gsub(/(#if\s+os\(iOS\))(\s+import\s+Flutter\b)/, '\1 || os(tvOS)\2')
if patched.include?("os(tvOS)") && patched.include?("#error(\"Unsupported platform.\")")
  patched = patched.gsub(/\s*#else\s*#error\("Unsupported platform\."\)\s*(#endif)/, "\n\\1")
end
puts patched.split("\n")[0..15]
