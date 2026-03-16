content = "#if os(iOS)\r\n  import Flutter\r\n#elseif os(macOS)\r\n"

# original regex:
patched1 = content.gsub(/(#if\s+os\(iOS\))(\n\s*import\s+Flutter\b)/, '\1 || os(tvOS)\2')
puts "1: " + patched1.inspect

# new regex:
patched2 = content.gsub(/(#if\s+os\(iOS\))(\s*import\s+Flutter\b)/, '\1 || os(tvOS)\2')
puts "2: " + patched2.inspect
