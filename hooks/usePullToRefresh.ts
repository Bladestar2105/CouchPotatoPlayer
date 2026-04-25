import { useCallback } from 'react';
import { useIPTVAppState, useIPTVProfiles } from '../context/IPTVContext';

/**
 * Wires a `FlatList`'s `RefreshControl` to the IPTV provider's "force reload
 * profile" flow. The refresh path reuses `loadProfile(..., true)`, which
 * sets the `isUpdating` flag but keeps the existing data on screen, so the
 * list does not blank out during the reload.
 *
 * Guarded against re-entrant pulls: if a refresh is already in flight
 * (`isUpdating === true`) or there is no profile to reload, the callback is
 * a no-op.
 */
export const usePullToRefresh = () => {
  const { isUpdating } = useIPTVAppState();
  const { currentProfile, loadProfile } = useIPTVProfiles();

  const onRefresh = useCallback(() => {
    if (!currentProfile || isUpdating) return;
    void loadProfile(currentProfile, true);
  }, [currentProfile, isUpdating, loadProfile]);

  return { refreshing: isUpdating, onRefresh };
};
