import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, test } from './bunTestCompat';

function readRepoFile(relPath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relPath), 'utf8');
}

describe('native smoke guards', () => {
  test('KSPlayerView deinit keeps synchronous main-thread-safe teardown', () => {
    const source = readRepoFile('modules/react-native-ksplayer/ios/KSPlayerView.swift');
    expect(source).toContain('deinit');
    expect(source).toContain('Thread.isMainThread');
    expect(source).toContain('DispatchQueue.main.sync');
    expect(source).toContain('layer.stop()');
  });

  test('SwiftTSPlayerView teardown keeps retryTimer cleanup and deinit teardown call', () => {
    const source = readRepoFile('modules/react-native-swift-ts-player/ios/SwiftTSPlayerView.swift');
    expect(source).toContain('retryTimer?.invalidate()');
    expect(source).toContain('retryTimer = nil');
    expect(source).toContain('deinit');
    expect(source).toContain('teardownPlayer()');
  });

  test('SwiftTSPlayerProxy retains dedicated queues for connection handling', () => {
    const source = readRepoFile('modules/react-native-swift-ts-player/ios/SwiftTSPlayerProxy.swift');
    expect(source).toContain('DispatchQueue(label: "com.couchpotatoplayer.proxy")');
    expect(source).toContain('DispatchQueue(label: "com.couchpotatoplayer.proxy.state")');
    expect(source).toContain('activeConnections');
  });

  test('SwiftTSPlayerProxy serializes activeConnections access through stateQueue', () => {
    const source = readRepoFile('modules/react-native-swift-ts-player/ios/SwiftTSPlayerProxy.swift');
    // Every mutation of `activeConnections` must happen inside a `stateQueue.sync` block
    // to avoid data races between the network queue, URLSession delegate callbacks,
    // and external callers invoking `stop()`.
    const mutationPattern = /activeConnections\.(append|remove|removeAll)/g;
    const matches = source.match(mutationPattern) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      const idx = source.indexOf(match);
      const preceding = source.slice(Math.max(0, idx - 400), idx);
      expect(
        preceding.includes('stateQueue.sync'),
        `activeConnections mutation "${match}" must be inside stateQueue.sync`,
      ).toBe(true);
    }
  });

  test('Android manifest declares Android TV compatibility', () => {
    // Play Store infers `android.hardware.touchscreen` as required unless
    // the app explicitly opts out, which silently excludes Android TV /
    // Google TV devices from the listing. `android.software.leanback` is
    // the standard companion flag for TV-capable apps. Both must be
    // marked `required="false"` so phones/tablets still install normally.
    // The Leanback launcher category and banner make the release visible from
    // Android TV launchers instead of only being install-compatible.
    const manifest = readRepoFile('android/app/src/main/AndroidManifest.xml');
    expect(manifest).toMatch(
      /<uses-feature[^>]*android:name="android\.hardware\.touchscreen"[^>]*android:required="false"/,
    );
    expect(manifest).toMatch(
      /<uses-feature[^>]*android:name="android\.software\.leanback"[^>]*android:required="false"/,
    );
    expect(manifest).toContain('android:banner="@drawable/android_tv_banner"');
    expect(manifest).toContain('android.intent.category.LEANBACK_LAUNCHER');
    expect(
      fs.existsSync(path.join(process.cwd(), 'android/app/src/main/res/drawable-nodpi/android_tv_banner.png')),
    ).toBe(true);
  });

  test('ErrorBoundary fallback keeps TV navigation recoverable', () => {
    const source = readRepoFile('components/ErrorBoundary.tsx');
    expect(source).toContain('onFallbackBack');
    expect(source).toContain('isTVSelectable={true}');
    expect(source).toContain('hasTVPreferredFocus={Platform.isTV}');
    expect(source).toContain('errorBoundary.goHome');
  });

  test('Player sleep timer marks the armed preset as selected', () => {
    const source = readRepoFile('screens/PlayerScreen.tsx');
    expect(source).toContain('sleepTimerPresetMinutes');
    expect(source).toContain('setSleepTimerPresetMinutes(minutes)');
    expect(source).toContain('selected: sleepTimerPresetMinutes === minutes');
  });

  test('Android release build permits cleartext (HTTP) IPTV traffic', () => {
    // Most IPTV providers serve over plain HTTP. Android 9+ blocks cleartext
    // traffic by default once `targetSdkVersion >= 28`, so the application
    // element MUST opt in via `android:usesCleartextTraffic="true"`. The debug
    // and debugOptimized flavors already set it; the main (release) manifest
    // had been missing it, silently breaking HTTP playback in production.
    const mainManifest = readRepoFile('android/app/src/main/AndroidManifest.xml');
    expect(mainManifest).toMatch(/<application[^>]*android:usesCleartextTraffic="true"/);

    const debugManifest = readRepoFile('android/app/src/debug/AndroidManifest.xml');
    expect(debugManifest).toContain('android:usesCleartextTraffic="true"');

    // Mirror the override in app.json so a future `expo prebuild` regenerates
    // the main manifest with the same attribute.
    const appJson = JSON.parse(readRepoFile('app.json'));
    expect(appJson?.expo?.android?.usesCleartextTraffic).toBe(true);
  });

  test('IPTVContext EPG cache load isolates JSON.parse failures from the outer catch', () => {
    // A corrupted EPG cache file used to throw out of the shared `runLoad`
    // try/catch, which aborted the whole load and left the user with an empty
    // EPG until they cleared the cache manually. The parse must be wrapped in
    // its own try/catch so the fresh-network-fetch branch can still run.
    const source = readRepoFile('context/IPTVContext.tsx');
    const anchor = source.indexOf('if (cachedEpgStr)');
    expect(anchor, 'expected EPG cache load block').toBeGreaterThan(-1);
    // Look inside the next ~900 chars (the block that reads + validates cache).
    const block = source.slice(anchor, anchor + 900);
    // The parse itself must be guarded.
    expect(block).toMatch(/try\s*\{\s*[^}]*JSON\.parse\(cachedEpgStr\)/s);
    // And the block must validate the parsed shape with Array.isArray before
    // handing it to `setEpg`.
    expect(block.includes('Array.isArray')).toBe(true);
  });

  test('IPTVContext storage loader validates JSON.parse shape before consuming it', () => {
    // Corrupted-but-syntactically-valid storage (e.g. `42`, `{}`, `null`) used to
    // crash the app on startup because downstream code calls `.find` / `.map` /
    // `new Set(...)` on the parsed value. Each storage payload that is read in
    // `loadDataFromStorage` must therefore be guarded with `Array.isArray(...)`.
    const source = readRepoFile('context/IPTVContext.tsx');
    const guardedKeys = [
      'profilesJson',
      'favoritesJson',
      'recentlyWatchedJson',
      'lockedJson',
    ];
    for (const key of guardedKeys) {
      const idx = source.indexOf(`if (${key})`);
      expect(idx, `expected guarded block for ${key}`).toBeGreaterThan(-1);
      // The shape guard must appear inside the same block (within the next ~600 chars).
      const block = source.slice(idx, idx + 600);
      expect(
        block.includes('Array.isArray'),
        `${key} block must validate JSON.parse result with Array.isArray`,
      ).toBe(true);
    }
  });
});
