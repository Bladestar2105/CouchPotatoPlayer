// setup-tests.ts
import { mock } from 'bun:test';

// Mock React Native LogBox to prevent errors when modules import it
mock.module('react-native', () => {
  return {
    LogBox: {
      ignoreLogs: () => {},
      ignoreAllLogs: () => {},
    },
    Platform: {
      OS: 'web',
      isTV: false,
      select: (objs: any) => objs.web || objs.default,
    },
  };
});