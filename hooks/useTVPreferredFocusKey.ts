import { Platform } from 'react-native';
import { useEffect, useRef, useState } from 'react';

export function useTVPreferredFocusKey(triggerKey: string | null, resetMs = 220): string | null {
  const [preferredKey, setPreferredKey] = useState<string | null>(null);
  const lastTriggerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!Platform.isTV) {
      setPreferredKey(null);
      lastTriggerKeyRef.current = triggerKey;
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const didChange = triggerKey !== lastTriggerKeyRef.current;

    if (triggerKey && didChange) {
      setPreferredKey(triggerKey);
      timeoutId = setTimeout(() => {
        setPreferredKey((current) => (current === triggerKey ? null : current));
      }, resetMs);
    }

    if (!triggerKey) {
      setPreferredKey(null);
    }

    lastTriggerKeyRef.current = triggerKey;

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [triggerKey, resetMs]);

  return preferredKey;
}
