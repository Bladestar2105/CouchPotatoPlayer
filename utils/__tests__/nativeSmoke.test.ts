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
});
