#!/usr/bin/env ruby
# patch_tvos_pods.rb
# Patches Flutter plugin Swift/ObjC source files in ~/.pub-cache for tvOS compatibility.
# Run this BEFORE pod install and xcodebuild when building for tvOS.

require 'fileutils'

PUB_CACHE_DIR = File.expand_path('~/.pub-cache/hosted/pub.dev')

unless Dir.exist?(PUB_CACHE_DIR)
  puts "pub cache not found at #{PUB_CACHE_DIR}, skipping patches"
  exit 0
end

def collect_files(pattern)
  Dir.glob(File.join(PUB_CACHE_DIR, '**', pattern)).uniq
end

patch_count = 0

# ---------------------------------------------------------------------------
# 1. Package.swift: add .tvOS("15.0") to iOS-only platform declarations
# ---------------------------------------------------------------------------
collect_files('Package.swift').select { |f| f.include?('/ios/') }.each do |file|
  content = File.read(file)
  next if content.include?('tvOS')
  next unless content.include?('.iOS(')

  tvos = '15.0'
  patched = content.gsub(/(\s+\.iOS\("[^"]+"\))(,?\s*\n(\s*)\])/) do |_match|
    ios_line = $1
    rest = $2
    indent = $3
    ios_line + ",\n" + indent + '.tvOS("' + tvos + '")' + rest
  end

  if patched != content
    puts "Patching Package.swift: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 2. Swift files: fix #if os(iOS) import Flutter #else #error(...) patterns
# ---------------------------------------------------------------------------
collect_files('*.swift').each do |file|
  content = File.read(file)
  patched = content

  # Pattern A: 2-space indent with #error
  error_a = '#if os(iOS)' + "\n" + '  import Flutter' + "\n" + '#elseif os(macOS)' + "\n" +
            '  import FlutterMacOS' + "\n" + '#else' + "\n" + '  #error(' + '"' + 'Unsupported platform.' + '"' + ')' + "\n" + '#endif'
  fix_a   = '#if os(iOS) || os(tvOS)' + "\n" + '  import Flutter' + "\n" + '#elseif os(macOS)' + "\n" +
            '  import FlutterMacOS' + "\n" + '#endif'
  patched = patched.gsub(error_a, fix_a)

  # Pattern B: no indent with #error
  error_b = '#if os(iOS)' + "\n" + 'import Flutter' + "\n" + '#elseif os(macOS)' + "\n" +
            'import FlutterMacOS' + "\n" + '#else' + "\n" + '#error(' + '"' + 'Unsupported platform.' + '"' + ')' + "\n" + '#endif'
  fix_b   = '#if os(iOS) || os(tvOS)' + "\n" + 'import Flutter' + "\n" + '#elseif os(macOS)' + "\n" +
            'import FlutterMacOS' + "\n" + '#endif'
  patched = patched.gsub(error_b, fix_b)

  # Pattern C: 2-space indent, iOS only guard
  if patched.include?("#if os(iOS)\n  import Flutter\n#endif") && !patched.include?('os(tvOS)')
    patched = patched.gsub("#if os(iOS)\n  import Flutter\n#endif", "#if os(iOS) || os(tvOS)\n  import Flutter\n#endif")
  end

  if patched.include?("#if os(iOS)\n  import Flutter\n#elseif os(macOS)") && !patched.include?('os(tvOS)')
    patched = patched.gsub(
      "#if os(iOS)\n  import Flutter\n#elseif os(macOS)",
      "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)"
    )
  end

  if patched.include?("#if os(iOS)\nimport Flutter\n#elseif os(macOS)") && !patched.include?('os(tvOS)')
    patched = patched.gsub(
      "#if os(iOS)\nimport Flutter\n#elseif os(macOS)",
      "#if os(iOS) || os(tvOS)\nimport Flutter\n#elseif os(macOS)"
    )
  end

  # Pattern D: no indent, iOS only guard
  if patched.include?("#if os(iOS)\nimport Flutter\n#endif") && !patched.include?('os(tvOS)')
    patched = patched.gsub("#if os(iOS)\nimport Flutter\n#endif", "#if os(iOS) || os(tvOS)\nimport Flutter\n#endif")
  end

  # Pattern E: 2-space indent with macOS elseif, no #error
  if patched.include?("#if os(iOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif") && !patched.include?('os(tvOS)')
    patched = patched.gsub(
      "#if os(iOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif",
      "#if os(iOS) || os(tvOS)\n  import Flutter\n#elseif os(macOS)\n  import FlutterMacOS\n#endif"
    )
  end

  # Pattern F: bare import Flutter (no guard at all)
  if patched.include?('import Flutter') && !patched.include?('os(tvOS)') &&
     !patched.include?('os(iOS)') && !patched.include?('canImport(Flutter)')
    patched = patched.gsub('import Flutter', "#if os(iOS) || os(tvOS)\nimport Flutter\n#endif")
  end

  if patched != content
    puts "Patching Swift: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 3. URLLaunchSession.swift: wrap entire file in #if os(iOS)
# ---------------------------------------------------------------------------
collect_files('URLLaunchSession.swift').each do |file|
  content = File.read(file)
  unless content.start_with?('#if os(iOS)')
    puts "Patching URLLaunchSession.swift: #{file}"
    File.write(file, "#if os(iOS)\n" + content + "\n#endif\n")
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 4. Launcher.swift: wrap in #if os(iOS) (uses UIApplication.shared)
# ---------------------------------------------------------------------------
collect_files('Launcher.swift').each do |file|
  content = File.read(file)
  if content.include?('UIApplication.shared') && !content.start_with?('#if os(iOS)')
    puts "Patching Launcher.swift: #{file}"
    File.write(file, "#if os(iOS)\n" + content + "\n#endif\n")
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 5. ViewPresenter.swift: wrap in #if os(iOS)
# ---------------------------------------------------------------------------
collect_files('ViewPresenter.swift').each do |file|
  content = File.read(file)
  if content.include?('UIViewController') && !content.start_with?('#if os(iOS)')
    puts "Patching ViewPresenter.swift: #{file}"
    File.write(file, "#if os(iOS)\n" + content + "\n#endif\n")
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 6. URLLauncherPlugin.swift: stub iOS-only methods for tvOS
# ---------------------------------------------------------------------------
collect_files('URLLauncherPlugin.swift').each do |file|
  content = File.read(file)
  next if content.include?('os(tvOS)')
  patched = content

  patched = patched.gsub(
    "import Flutter\nimport UIKit",
    "#if os(iOS)\nimport Flutter\nimport UIKit\n#elseif os(tvOS)\nimport Flutter\nimport UIKit\n#endif"
  )

  if patched.include?('  private var currentSession: URLLaunchSession?')
    patched = patched.gsub(
      '  private var currentSession: URLLaunchSession?',
      "#if os(iOS)\n  private var currentSession: URLLaunchSession?\n#endif"
    )
  end

  if patched.include?('  private let viewPresenterProvider: ViewPresenterProvider')
    patched = patched.gsub(
      '  private let viewPresenterProvider: ViewPresenterProvider',
      "#if os(iOS)\n  private let viewPresenterProvider: ViewPresenterProvider\n#endif"
    )
  end

  init_old = "  init(launcher: Launcher = DefaultLauncher(), viewPresenterProvider: ViewPresenterProvider) {\n    self.launcher = launcher\n    self.viewPresenterProvider = viewPresenterProvider\n  }"
  init_new = "#if os(iOS)\n  init(launcher: Launcher = DefaultLauncher(), viewPresenterProvider: ViewPresenterProvider) {\n    self.launcher = launcher\n    self.viewPresenterProvider = viewPresenterProvider\n  }\n#else\n  init(launcher: Launcher = DefaultLauncher()) {\n    self.launcher = launcher\n  }\n#endif"
  patched = patched.gsub(init_old, init_new)

  reg_old = "  public static func register(with registrar: FlutterPluginRegistrar) {\n    let plugin = URLLauncherPlugin(\n      viewPresenterProvider: DefaultViewPresenterProvider(registrar: registrar))\n    UrlLauncherApiSetup.setUp(binaryMessenger: registrar.messenger(), api: plugin)\n    registrar.publish(plugin)\n  }"
  reg_new = "  public static func register(with registrar: FlutterPluginRegistrar) {\n#if os(iOS)\n    let plugin = URLLauncherPlugin(\n      viewPresenterProvider: DefaultViewPresenterProvider(registrar: registrar))\n#else\n    let plugin = URLLauncherPlugin()\n#endif\n    UrlLauncherApiSetup.setUp(binaryMessenger: registrar.messenger(), api: plugin)\n    registrar.publish(plugin)\n  }"
  patched = patched.gsub(reg_old, reg_new)

  if patched.include?('func openUrlInSafariViewController') && !patched.include?("#if os(iOS)\n  func openUrlInSafariViewController")
    patched = patched.gsub(
      /( +func openUrlInSafariViewController[\s\S]*?func closeSafariViewController\(\) \{[\s\S]*?\n  \})/
    ) do |match|
      "#if os(iOS)\n#{match}\n#else\n  func openUrlInSafariViewController(\n    url: String,\n    completion: @escaping (Result<InAppLoadResult, Error>) -> Void\n  ) {\n    completion(.success(.failedToLoad))\n  }\n  func closeSafariViewController() {}\n#endif"
    end
  end

  if patched != content
    puts "Patching URLLauncherPlugin.swift: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 7. UIApplication+idleTimerLock.m/h: wrap in #if !TARGET_OS_TV
# ---------------------------------------------------------------------------
collect_files('UIApplication+idleTimerLock.m').each do |file|
  content = File.read(file)
  unless content.start_with?('#if !TARGET_OS_TV') || content.include?('TARGET_OS_TV')
    puts "Patching UIApplication+idleTimerLock.m: #{file}"
    File.write(file, "#if !TARGET_OS_TV\n" + content + "\n#endif\n")
    patch_count += 1
  end
end

collect_files('UIApplication+idleTimerLock.h').each do |file|
  content = File.read(file)
  unless content.include?('TARGET_OS_TV')
    puts "Patching UIApplication+idleTimerLock.h: #{file}"
    File.write(file, "#if !TARGET_OS_TV\n" + content + "\n#endif\n")
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 8.5 WakelockPlusPlugin.h: replace iOS-only impl with tvOS stub
# ---------------------------------------------------------------------------
collect_files('WakelockPlusPlugin.h').each do |file|
  content = File.read(file)
  patched = content
  if patched.include?("#import <Flutter/Flutter.h>") && !patched.include?("TARGET_OS_TV")
    patched = patched.gsub(
      "#import <Flutter/Flutter.h>",
      "#if TARGET_OS_TV\n#import \"Flutter.h\"\n#else\n#import <Flutter/Flutter.h>\n#endif"
    )
    puts "Patching WakelockPlusPlugin.h: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 8. WakelockPlusPlugin.m: replace iOS-only impl with tvOS stub
# ---------------------------------------------------------------------------
collect_files('WakelockPlusPlugin.m').each do |file|
  content = File.read(file)
  next if content.include?('TARGET_OS_TV')
  patched = content

  if patched.include?('@implementation WakelockPlusPlugin')
    tvos_stub = "#if TARGET_OS_TV\n// tvOS stub - wakelock not supported\n@implementation WakelockPlusPlugin\n+ (void)registerWithRegistrar:(NSObject<FlutterPluginRegistrar>*)registrar {\n  WakelockPlusPlugin* instance = [[WakelockPlusPlugin alloc] init];\n  SetUpWAKELOCKPLUSWakelockPlusApi(registrar.messenger, instance);\n}\n- (void)toggleMsg:(WAKELOCKPLUSToggleMessage*)input error:(FlutterError**)error {\n  // No-op on tvOS\n}\n- (WAKELOCKPLUSIsEnabledMessage*)isEnabledWithError:(FlutterError* __autoreleasing *)error {\n  WAKELOCKPLUSIsEnabledMessage* result = [[WAKELOCKPLUSIsEnabledMessage alloc] init];\n  result.enabled = @NO;\n  return result;\n}\n@end\n#else\n"
    impl_start = patched.index('@implementation WakelockPlusPlugin')
    end_pos = patched.index("\n@end", impl_start)
    if end_pos
      end_pos_after = end_pos + "\n@end".length
      original_impl = patched[impl_start..end_pos_after - 1]
      patched = patched.sub(original_impl, tvos_stub + original_impl + "\n#endif")
    end
  end

  if patched != content
    puts "Patching WakelockPlusPlugin.m: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

# ---------------------------------------------------------------------------
# 9. media_kit_video VideoOutput.swift
# Uses #if canImport(Flutter) which should work, but may need UIKit on tvOS
# ---------------------------------------------------------------------------
collect_files('VideoOutput.swift').each do |file|
  content = File.read(file)
  patched = content

  if patched.include?("#if canImport(Flutter)\n  import Flutter") && !patched.include?("os(tvOS)")
    patched = patched.gsub(
      "#if canImport(Flutter)\n  import Flutter\n#elseif canImport(FlutterMacOS)\n  import FlutterMacOS\n#endif",
      "#if canImport(Flutter)\n  import Flutter\n#elseif canImport(FlutterMacOS)\n  import FlutterMacOS\n#endif\n#if os(tvOS)\nimport UIKit\n#endif"
    )
  end

  if patched != content
    puts "Patching VideoOutput.swift: #{file}"
    File.write(file, patched)
    patch_count += 1
  end
end

puts "\nDone. Applied #{patch_count} patches."
