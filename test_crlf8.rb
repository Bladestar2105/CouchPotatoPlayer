content = File.read("test_dl/darwin/path_provider_foundation/Sources/path_provider_foundation/messages.g.swift")
error_str_a = '#if os(iOS)' + "\n" + '  import Flutter' + "\n" + '#elseif os(macOS)' + "\n" + '  import FlutterMacOS' + "\n" + '#else' + "\n" + '  #error(' + '"' + 'Unsupported platform.' + '"' + ')' + "\n" + '#endif'
puts content.include?(error_str_a)
