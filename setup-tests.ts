import { mock } from "bun:test";
(global as any).__DEV__ = true;

// Mock ExpoGlobal
(globalThis as any).expo = {
  EventEmitter: class {
    addListener() { return { remove: () => {} }; }
    removeAllListeners() {}
    emit() {}
  },
  uuidv4: () => 'mock-uuid',
};

mock.module("react-native", () => {
  return {
    LogBox: {
      ignoreLogs: () => {},
      ignoreAllLogs: () => {},
    },
    Platform: {
      OS: 'ios',
      select: (objs: any) => objs.ios || objs.default,
      isTV: false,
    },
    Dimensions: {
      get: () => ({ width: 390, height: 844 }),
      addEventListener: () => ({ remove: () => {} }),
    },
    TurboModuleRegistry: {
      getEnforcing: () => null,
      get: () => null,
    },
    NativeEventEmitter: class {},
    NativeModules: {},
    UIManager: {}
  };
});
