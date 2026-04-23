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
    expect(source).toContain('DispatchQueue(label: "com.couchpotatoplayer.proxy.mapQueue")');
    expect(source).toContain('activeConnections');
  });
});
