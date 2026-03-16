content = <<~SWIFT
import Foundation
#if os(iOS)
import Flutter
#elseif os(macOS)
import FlutterMacOS
#else
#error("Unsupported platform.")
#endif
SWIFT

patched = content
error_str_b = '#if os(iOS)' + "\n" + 'import Flutter' + "\n" + '#elseif os(macOS)' + "\n" + 'import FlutterMacOS' + "\n" + '#else' + "\n" + '#error(' + '"' + 'Unsupported platform.' + '"' + ')' + "\n" + '#endif'
fix_str_b   = '#if os(iOS) || os(tvOS)' + "\n" + 'import Flutter' + "\n" + '#elseif os(macOS)' + "\n" + 'import FlutterMacOS' + "\n" + '#endif'
patched = patched.gsub(error_str_b, fix_str_b)
puts patched
