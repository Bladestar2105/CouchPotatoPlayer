/**
 * Logger utility to manage console logs across the application.
 * In production builds, logs and info are silenced to improve performance and code hygiene.
 * Warnings and errors are always preserved.
 */

declare const __DEV__: boolean;

const Logger = {
  log: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug(...args);
    }
  },
};

export default Logger;
