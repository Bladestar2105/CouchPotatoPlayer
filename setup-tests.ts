import { mock } from "bun:test";
mock.module("react-native", () => {
  return {
    LogBox: {
      ignoreLogs: () => {},
      ignoreAllLogs: () => {},
    },
    Platform: {
      OS: 'ios',
      select: () => {},
    },
  };
});
