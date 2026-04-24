import type { Channel, EPGProgram } from '../types';

export interface ChannelListPerfConfig {
  initialNumToRender: number;
  maxToRenderPerBatch: number;
  windowSize: number;
  updateCellsBatchingPeriod: number;
  removeClippedSubviews: boolean;
}

export interface ChannelListPerfInput {
  isTV: boolean;
  platformOS: 'ios' | 'android' | 'web' | string;
}

export function getChannelListPerfConfig({ isTV, platformOS }: ChannelListPerfInput): ChannelListPerfConfig {
  if (isTV) {
    const isAndroidTV = platformOS === 'android';
    return isAndroidTV
      ? { initialNumToRender: 16, maxToRenderPerBatch: 12, windowSize: 9, updateCellsBatchingPeriod: 20, removeClippedSubviews: false }
      : { initialNumToRender: 12, maxToRenderPerBatch: 10, windowSize: 7, updateCellsBatchingPeriod: 24, removeClippedSubviews: false };
  }
  return { initialNumToRender: 12, maxToRenderPerBatch: 10, windowSize: 6, updateCellsBatchingPeriod: 24, removeClippedSubviews: true };
}

export function shouldDeferPrefetch(platformOS: string): boolean {
  return platformOS === 'android';
}

export type ChannelListBackAction = 'closeUnlockDialog' | 'showCategories' | 'bubble';

export function resolveChannelListBackAction(input: {
  unlockMode: string | null;
  isCompactLayout: boolean;
  showCategories: boolean;
}): ChannelListBackAction {
  if (input.unlockMode) return 'closeUnlockDialog';
  if (input.isCompactLayout && !input.showCategories) return 'showCategories';
  return 'bubble';
}

export function getEpgTickIntervalMs(): number {
  return 30_000;
}

export function getProgramProgressPercent(program: Pick<EPGProgram, 'start' | 'end'>, now: number): number {
  const totalDuration = program.end - program.start;
  if (totalDuration <= 0) return 0;
  const elapsed = now - program.start;
  return Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
}

export function getEpgKeyForChannel(channel: Pick<Channel, 'epgChannelId' | 'tvgId' | 'id'>): string {
  if (channel.epgChannelId && channel.epgChannelId.length > 0) {
    return channel.epgChannelId;
  }
  return channel.tvgId || channel.id;
}

export function scheduleFocusRestore(
  channelRefs: Record<string, any>,
  focusedChannelId: string,
  setTimeoutImpl: typeof setTimeout,
  clearTimeoutImpl: typeof clearTimeout,
): () => void {
  const timeoutId = setTimeoutImpl(() => {
    channelRefs[focusedChannelId]?.focus?.();
  }, 300);

  return () => clearTimeoutImpl(timeoutId);
}

export function shouldCategoryHavePreferredFocus(input: {
  restoreFocusOnSelectedChannel: boolean;
  isSelected: boolean;
  isFirstItem: boolean;
}): boolean {
  if (input.restoreFocusOnSelectedChannel) {
    return false;
  }
  return input.isFirstItem;
}

export function shouldChannelHavePreferredFocus(input: {
  preferredFocusChannelId: string | null | undefined;
  channelId: string;
  shouldFocusFirstItem: boolean;
  isFirstItem: boolean;
}): boolean {
  if (input.preferredFocusChannelId) {
    return input.preferredFocusChannelId === input.channelId;
  }
  return input.shouldFocusFirstItem && input.isFirstItem;
}
