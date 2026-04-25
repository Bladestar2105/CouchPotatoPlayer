// ─────────────────────────────────────────────────────────────────────────
// Voice search wrapper around expo-speech-recognition
// ─────────────────────────────────────────────────────────────────────────
// Provides a tiny, defensive surface so the SearchScreen doesn't have to
// reach into the native module directly. Two reasons:
//
//   1. The module isn't available on every target — TV builds (tvOS /
//      Android TV) and the web build can't ship it. Calling into it
//      blindly there would crash. The wrapper exposes `isAvailable()`
//      so the UI can hide the mic button cleanly.
//
//   2. The native module throws if requestPermissionsAsync() rejects or
//      if `start()` is called twice. The wrapper centralises the safe
//      "request permission, then start" sequence and lets callers focus
//      on react state.
// ─────────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import Logger from './logger';

type SpeechModule = typeof import('expo-speech-recognition').ExpoSpeechRecognitionModule;

let cachedModule: SpeechModule | null | undefined;

const loadModule = (): SpeechModule | null => {
  if (cachedModule !== undefined) return cachedModule;
  // Voice search needs a real microphone + native speech recognizer; neither
  // is meaningfully available on web or on the TV remote builds. Skip the
  // require() altogether on those platforms so the metro bundle never tries
  // to resolve it for the surfaces that don't ship the native module.
  if (Platform.OS === 'web' || Platform.isTV) {
    cachedModule = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const mod = require('expo-speech-recognition');
    const resolved: SpeechModule | null = mod?.ExpoSpeechRecognitionModule ?? null;
    cachedModule = resolved;
    return resolved;
  } catch (e) {
    Logger.warn('[voiceSearch] expo-speech-recognition not available', e);
    cachedModule = null;
    return null;
  }
};

export const isVoiceSearchAvailable = (): boolean => loadModule() !== null;

export interface StartVoiceSearchOptions {
  lang?: string;
  /** Continuous recognition keeps appending words; default false (single-shot). */
  continuous?: boolean;
  /** Emit interim partial results so the UI can show live text. Default true. */
  interimResults?: boolean;
}

const DEFAULT_OPTIONS: StartVoiceSearchOptions = {
  continuous: false,
  interimResults: true,
};

/**
 * Requests permissions if needed and starts recognition. Returns true if
 * recognition actually started, false on permission denial or any other
 * failure (logged). Caller is responsible for stopping via `stopVoiceSearch`.
 */
export async function startVoiceSearch(opts: StartVoiceSearchOptions = {}): Promise<boolean> {
  const mod = loadModule();
  if (!mod) return false;

  try {
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) {
      Logger.warn('[voiceSearch] permission denied', perm);
      return false;
    }
  } catch (e) {
    Logger.warn('[voiceSearch] permission request threw', e);
    return false;
  }

  try {
    const merged = { ...DEFAULT_OPTIONS, ...opts };
    mod.start({
      lang: merged.lang ?? 'en-US',
      continuous: merged.continuous,
      interimResults: merged.interimResults,
      requiresOnDeviceRecognition: false,
      addsPunctuation: false,
      contextualStrings: [],
    } as any);
    return true;
  } catch (e) {
    Logger.error('[voiceSearch] start failed', e);
    return false;
  }
}

export function stopVoiceSearch(): void {
  const mod = loadModule();
  if (!mod) return;
  try {
    mod.stop();
  } catch (e) {
    Logger.warn('[voiceSearch] stop threw', e);
  }
}

export function abortVoiceSearch(): void {
  const mod = loadModule();
  if (!mod) return;
  try {
    mod.abort();
  } catch (e) {
    Logger.warn('[voiceSearch] abort threw', e);
  }
}

export type VoiceEventName = 'result' | 'error' | 'end' | 'start' | 'audiostart' | 'audioend';

export interface VoiceSubscription {
  remove: () => void;
}

/**
 * Subscribe to a single recognition event. Safe to call from anywhere — if
 * the underlying module isn't installed (web / TV) the returned subscription
 * is a no-op object so callers can always unconditionally call `.remove()`.
 */
export function addVoiceListener(eventName: VoiceEventName, listener: (event: any) => void): VoiceSubscription {
  const mod = loadModule();
  if (!mod) return { remove: () => {} };
  try {
    const subscription: any = (mod as any).addListener(eventName, listener);
    return {
      remove: () => {
        try {
          subscription?.remove?.();
        } catch (e) {
          Logger.warn('[voiceSearch] subscription.remove threw', e);
        }
      },
    };
  } catch (e) {
    Logger.warn('[voiceSearch] addListener threw', e);
    return { remove: () => {} };
  }
}
