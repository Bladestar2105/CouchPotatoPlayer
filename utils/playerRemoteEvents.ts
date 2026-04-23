export type PlayerRemoteAction =
  | 'ignore'
  | 'commitPendingSeek'
  | 'menuBack'
  | 'togglePause'
  | 'seekLeft'
  | 'seekRight'
  | 'switchChannelUp'
  | 'switchChannelDown'
  | 'showOverlay'
  | 'switchToPreviousChannel';

export function isSelectLikeEvent(eventType: string): boolean {
  return (
    eventType === 'select' ||
    eventType === 'enter' ||
    eventType === 'selectDown' ||
    eventType === 'selectUp' ||
    eventType === 'click' ||
    eventType === 'tap'
  );
}

export function resolvePlayerRemoteAction(input: {
  isFocused: boolean;
  eventType?: string;
  showOverlay: boolean;
  canSeek: boolean;
  hasPendingSeek: boolean;
}): PlayerRemoteAction {
  if (!input.isFocused || !input.eventType) return 'ignore';

  const { eventType } = input;
  const isSelectLike = isSelectLikeEvent(eventType);

  if (input.hasPendingSeek && (isSelectLike || eventType === 'playPause')) {
    return 'commitPendingSeek';
  }

  if (eventType === 'menu') return 'menuBack';
  if (eventType === 'playPause') return 'togglePause';
  if (eventType === 'left') return input.canSeek ? 'seekLeft' : 'ignore';
  if (eventType === 'right') return input.canSeek ? 'seekRight' : 'ignore';

  if (input.showOverlay && !isSelectLike) {
    return 'ignore';
  }

  if (eventType === 'pageUp' || eventType === 'channelUp' || eventType === 'up') return 'switchChannelUp';
  if (eventType === 'pageDown' || eventType === 'channelDown' || eventType === 'down') return 'switchChannelDown';
  if (isSelectLike) return 'showOverlay';
  if (eventType === 'rewind' || eventType === 'skipBackward') return 'switchToPreviousChannel';

  return 'ignore';
}
