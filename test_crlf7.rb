Dir.glob("test_dl/url_launcher/ios/url_launcher_ios/Sources/url_launcher_ios/*.swift").each do |file|
  content = File.read(file)
  patched = content.gsub(/(#if\s+os\(iOS\))(\s+import\s+Flutter\b)/, '\1 || os(tvOS)\2')
  if patched.include?("os(tvOS)") && patched.include?("#error(\"Unsupported platform.\")")
    patched = patched.gsub(/\s*#else\s*#error\("Unsupported platform\."\)\s*(#endif)/, "\n\\1")
  end
  puts "====== #{file}"
  puts patched.split("\n")[0..15]
end
