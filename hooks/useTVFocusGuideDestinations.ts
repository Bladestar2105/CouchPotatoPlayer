import { Platform } from 'react-native';
import { useMemo } from 'react';

type RefLike<T = any> = { current: T | null };

export function useTVFocusGuideDestinations(
  refs: Array<RefLike | null | undefined>,
  enabled = true,
): any[] | undefined {
  const handles = refs.map((ref) => ref?.current ?? null);

  return useMemo(() => {
    if (!enabled || !Platform.isTV) return undefined;
    const destinations = handles.filter((handle): handle is NonNullable<typeof handle> => handle !== null);
    return destinations.length > 0 ? destinations : undefined;
  }, [enabled, ...handles]);
}
