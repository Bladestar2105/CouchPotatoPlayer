export type PlaybackTrackKind = 'audio' | 'text';

export interface PlaybackTrack {
  id: number | string;
  label: string;
  language?: string;
  selected?: boolean;
  kind: PlaybackTrackKind;
}

export interface PlaybackTrackGroups {
  audioTracks: PlaybackTrack[];
  textTracks: PlaybackTrack[];
}

export const EMPTY_PLAYBACK_TRACKS: PlaybackTrackGroups = {
  audioTracks: [],
  textTracks: [],
};

const serializeTrackList = (tracks: PlaybackTrack[]): string => (
  tracks
    .map((track) => `${track.kind}:${String(track.id)}:${track.label}:${track.language ?? ''}:${track.selected ? '1' : '0'}`)
    .join('|')
);

export const serializePlaybackTrackGroups = (groups: PlaybackTrackGroups): string => (
  `${serializeTrackList(groups.audioTracks)}::${serializeTrackList(groups.textTracks)}`
);
