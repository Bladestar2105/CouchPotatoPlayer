import { Share, Platform } from 'react-native';

interface ShareOptions {
  channelName: string;
  type: 'live' | 'vod' | 'series';
  streamUrl?: string;
}

export const shareStream = async (options: ShareOptions): Promise<boolean> => {
  const { channelName, type } = options;

  const typeLabel = type === 'live' ? 'Live TV' : type === 'vod' ? 'Movie' : 'Series';
  const emoji = type === 'live' ? '📺' : type === 'vod' ? '🎬' : '📺';

  const message = `${emoji} I'm watching "${channelName}" (${typeLabel}) on CouchPotato Player!`;

  try {
    const result = await Share.share(
      {
        message,
        title: `Watch ${channelName}`,
      },
      {
        dialogTitle: `Share ${typeLabel}`,
        subject: `Watch ${channelName} on CouchPotato Player`,
      }
    );

    return result.action === Share.sharedAction;
  } catch (error) {
    console.error('Share failed:', error);
    return false;
  }
};
