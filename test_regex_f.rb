content = <<~TEXT
// some comment
  import Flutter
class MyClass {}
TEXT
patched = content
if !patched.include?("os(tvOS)") && !patched.include?("os(iOS)") && !patched.include?("canImport(Flutter)")
  patched = patched.gsub(/^[ \t]*import Flutter[ \t]*\n/, "#if os(iOS) || os(tvOS)\nimport Flutter\n#endif\n")
end
puts patched
