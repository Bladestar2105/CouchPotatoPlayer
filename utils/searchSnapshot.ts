// ─────────────────────────────────────────────────────────────────────────
// Universal-search snapshots
// ─────────────────────────────────────────────────────────────────────────
// Each loaded provider profile writes a compact snapshot of its library
// (channels + movies + series + a small EPG selection) to AsyncStorage so
// the SearchScreen can offer a "search across all your providers" view
// without having to re-hit each provider's backend on every keystroke.
//
// The snapshot intentionally strips fields that aren't needed to surface
// a search result (descriptions, container_extension on individual items,
// raw EPG for every channel) — keeping each entry small enough that even
// a power-user library with 5+ providers stays well under AsyncStorage's
// per-key budget.
// ─────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from './logger';
import type { Channel, EPGProgram, IPTVProfile, Movie, Series } from '../types';

const SNAPSHOT_PREFIX = 'IPTV_SEARCH_SNAPSHOT_';
const SNAPSHOT_VERSION = 1;
const MAX_EPG_PROGRAMS_PER_CHANNEL = 6; // upcoming-only window per channel
const MAX_EPG_HORIZON_MS = 24 * 60 * 60 * 1000; // 24h ahead

export interface SnapshotChannel {
  id: string;
  name: string;
  url: string;
  logo?: string;
  group: string;
  isAdult?: boolean;
  categoryId?: string;
  epgChannelId?: string;
  tvgId?: string;
}

export interface SnapshotMovie {
  id: string;
  name: string;
  streamUrl: string;
  cover?: string;
  group: string;
  isAdult?: boolean;
  categoryId?: string;
}

export interface SnapshotSeries {
  id: string;
  name: string;
  cover?: string;
  group: string;
  isAdult?: boolean;
  categoryId?: string;
}

export interface SnapshotEpgProgram {
  channelKey: string;
  channelId: string;
  channelName: string;
  channelLogo?: string;
  channelUrl: string;
  title: string;
  start: number;
  end: number;
}

export interface ProfileSearchSnapshot {
  version: number;
  profileId: string;
  profileName: string;
  savedAt: number;
  channels: SnapshotChannel[];
  movies: SnapshotMovie[];
  series: SnapshotSeries[];
  upcomingEpg: SnapshotEpgProgram[];
}

const snapshotKey = (profileId: string) => `${SNAPSHOT_PREFIX}${profileId}`;

const projectChannel = (c: Channel): SnapshotChannel => ({
  id: c.id,
  name: c.name,
  url: c.url,
  logo: c.logo,
  group: c.group,
  isAdult: c.isAdult,
  categoryId: c.categoryId,
  epgChannelId: c.epgChannelId,
  tvgId: c.tvgId,
});

const projectMovie = (m: Movie): SnapshotMovie => ({
  id: m.id,
  name: m.name,
  streamUrl: m.streamUrl,
  cover: m.cover,
  group: m.group,
  isAdult: m.isAdult,
  categoryId: m.categoryId,
});

const projectSeries = (s: Series): SnapshotSeries => ({
  id: s.id,
  name: s.name,
  cover: s.cover,
  group: s.group,
  isAdult: s.isAdult,
  categoryId: s.categoryId,
});

export function buildSearchSnapshot(
  profile: IPTVProfile,
  channels: Channel[],
  movies: Movie[],
  series: Series[],
  epg: Record<string, EPGProgram[]>,
): ProfileSearchSnapshot {
  const nowMs = Date.now();
  const horizonMs = nowMs + MAX_EPG_HORIZON_MS;
  const upcomingEpg: SnapshotEpgProgram[] = [];

  // Walk channels and pull a few upcoming programs per channel so that
  // search can match EPG titles even when the snapshotted profile isn't
  // currently active.
  for (let i = 0; i < channels.length; i += 1) {
    const channel = channels[i];
    const key = channel.epgChannelId && channel.epgChannelId.length > 0
      ? channel.epgChannelId
      : channel.tvgId || channel.id;
    const programs = epg[key];
    if (!programs || programs.length === 0) continue;
    let added = 0;
    for (let j = 0; j < programs.length && added < MAX_EPG_PROGRAMS_PER_CHANNEL; j += 1) {
      const prog = programs[j];
      if (prog.end <= nowMs) continue;
      if (prog.start > horizonMs) break;
      upcomingEpg.push({
        channelKey: key,
        channelId: channel.id,
        channelName: channel.name,
        channelLogo: channel.logo,
        channelUrl: channel.url,
        title: prog.title,
        start: prog.start,
        end: prog.end,
      });
      added += 1;
    }
  }

  return {
    version: SNAPSHOT_VERSION,
    profileId: profile.id,
    profileName: profile.name,
    savedAt: nowMs,
    channels: channels.map(projectChannel),
    movies: movies.map(projectMovie),
    series: series.map(projectSeries),
    upcomingEpg,
  };
}

export async function persistSearchSnapshot(snapshot: ProfileSearchSnapshot): Promise<void> {
  try {
    const json = JSON.stringify(snapshot);
    await AsyncStorage.setItem(snapshotKey(snapshot.profileId), json);
  } catch (e) {
    Logger.error('[searchSnapshot] failed to persist', e);
  }
}

export async function deleteSearchSnapshot(profileId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(snapshotKey(profileId));
  } catch (e) {
    Logger.error('[searchSnapshot] failed to delete', e);
  }
}

export async function loadAllSearchSnapshots(): Promise<ProfileSearchSnapshot[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const matchingKeys = allKeys.filter((k) => k.startsWith(SNAPSHOT_PREFIX));
    if (matchingKeys.length === 0) return [];
    const entries = await AsyncStorage.multiGet(matchingKeys);
    const snapshots: ProfileSearchSnapshot[] = [];
    for (const [, value] of entries) {
      if (!value) continue;
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && parsed.version === SNAPSHOT_VERSION) {
          snapshots.push(parsed as ProfileSearchSnapshot);
        }
      } catch {
        /* skip corrupted entries */
      }
    }
    return snapshots;
  } catch (e) {
    Logger.error('[searchSnapshot] failed to load', e);
    return [];
  }
}
