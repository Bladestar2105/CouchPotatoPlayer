import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ImageBackground,
  Platform,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { Play, Star, Calendar, ArrowRight, Tv } from 'lucide-react-native';
import {
  useIPTVCollections,
  useIPTVGuide,
  useIPTVLibrary,
  useIPTVPlayback,
} from '../../context/IPTVContext';
import { useTheme } from '../../context/ThemeContext';
import BrandMark from '../BrandMark';
import { FocusableButton, FocusableCard } from '../Focusable';
import { colors, posters, radii, shadows, spacing, typography } from '../../theme/tokens';
import type { Channel, Movie, RecentlyWatchedItem, Series } from '../../types';
import type { HomeContentRef } from './types';
import { getEpgKeyForChannel } from '../../utils/channelListBehavior';

const characterLogo = require('../../assets/character_logo.png');

const isTV = Platform.isTV;

const pickFeaturedItem = (
  recentlyWatched: RecentlyWatchedItem[],
  movies: Movie[],
  series: Series[],
):
  | { kind: 'recent'; item: RecentlyWatchedItem }
  | { kind: 'movie'; item: Movie }
  | { kind: 'series'; item: Series }
  | null => {
  // Prefer the most recent VOD/Series (if not adult) so the hero feels personal.
  const recentVod = recentlyWatched.find((r) => (r.type === 'vod' || r.type === 'series') && !r.isAdult);
  if (recentVod) return { kind: 'recent', item: recentVod };

  // Otherwise pick a series with cover, then a movie with cover.
  const seriesWithCover = series.find((s) => s.cover && !s.isAdult);
  if (seriesWithCover) return { kind: 'series', item: seriesWithCover };

  const movieWithCover = movies.find((m) => m.cover && !m.isAdult);
  if (movieWithCover) return { kind: 'movie', item: movieWithCover };

  if (movies.length > 0) return { kind: 'movie', item: movies[0] };
  if (series.length > 0) return { kind: 'series', item: series[0] };
  return null;
};

const formatProgress = (item: RecentlyWatchedItem): number => {
  if (!item.duration || item.duration <= 0) return 0;
  const value = (item.position ?? 0) / item.duration;
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const timeFormatter = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

interface HeroProps {
  featured: ReturnType<typeof pickFeaturedItem>;
  accent: string;
  onPlay: () => void;
  onDetails: () => void;
  t: (key: string, opts?: any) => string;
}

const Hero: React.FC<HeroProps> = ({ featured, accent, onPlay, onDetails, t }) => {
  if (!featured) {
    return (
      <View style={[styles.heroFallback, { backgroundColor: colors.surface }]}>
        <BrandMark size={120} variant="character" />
        <Text style={styles.heroFallbackText}>{t('home.empty')}</Text>
      </View>
    );
  }

  const title =
    featured.kind === 'recent' ? featured.item.name :
    featured.kind === 'movie' ? featured.item.name :
    featured.item.name;

  const cover =
    featured.kind === 'recent' ? featured.item.icon :
    featured.kind === 'movie' ? featured.item.cover :
    featured.item.cover;

  const subtitle =
    featured.kind === 'recent'
      ? featured.item.type === 'series' && featured.item.episodeName
        ? `S${featured.item.seasonNumber ?? '?'} · E${featured.item.episodeNumber ?? '?'} · ${featured.item.episodeName}`
        : ''
      : featured.kind === 'series'
        ? t('series')
        : t('movies');

  const isResume = featured.kind === 'recent' && (featured.item.position ?? 0) > 30;
  const ctaLabel = isResume ? t('home.heroResume') : t('home.heroPlay');

  return (
    <View style={styles.heroRoot}>
      <ImageBackground
        source={cover ? { uri: cover } : characterLogo}
        style={styles.heroBackdrop}
        imageStyle={styles.heroBackdropImage}
        defaultSource={characterLogo}
      >
        <View style={[styles.heroScrim, styles.heroScrimVertical]} />
        <View style={[styles.heroScrim, styles.heroScrimHorizontal]} />

        <View style={styles.heroContent}>
          <Text style={[styles.heroEyebrow, { color: accent }]}>{t('home.heroEyebrow')}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text> : null}

          <View style={styles.heroActions}>
            <FocusableButton
              variant="primary"
              label={ctaLabel}
              onPress={onPlay}
              hasTVPreferredFocus
              leading={<Play color="#FFF" size={16} fill="#FFF" />}
            />
            <FocusableButton
              variant="ghost"
              label={t('home.heroDetails')}
              onPress={onDetails}
              trailing={<ArrowRight color={colors.text} size={16} />}
            />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

interface RailProps {
  title: string;
  children: React.ReactNode;
  accent: string;
  onSeeAll?: () => void;
  t: (key: string) => string;
}

const Rail: React.FC<RailProps> = ({ title, children, accent, onSeeAll, t }) => (
  <View style={styles.rail}>
    <View style={styles.railHeader}>
      <Text style={styles.railTitle}>{title}</Text>
      {onSeeAll ? (
        <FocusableCard style={styles.seeAllChip} onSelect={onSeeAll} accessibilityRole="button" accessibilityLabel={t('home.seeAll')}>
          <Text style={[styles.seeAllText, { color: accent }]}>{t('home.seeAll')}</Text>
          <ArrowRight size={14} color={accent} />
        </FocusableCard>
      ) : null}
    </View>
    {children}
  </View>
);

interface PosterCardProps {
  title: string;
  cover?: string;
  badge?: string;
  progress?: number;
  accent: string;
  onSelect: () => void;
}

const PosterCard: React.FC<PosterCardProps> = ({ title, cover, badge, progress, accent, onSelect }) => (
  <FocusableCard
    style={styles.posterCard}
    onSelect={onSelect}
    accessibilityRole="button"
    accessibilityLabel={title}
  >
    <View style={styles.posterImageWrap}>
      <Image
        source={cover ? { uri: cover } : characterLogo}
        style={styles.posterImage}
        resizeMode="cover"
        defaultSource={characterLogo}
      />
      {badge ? (
        <View style={[styles.posterBadge, { backgroundColor: accent }]}>
          <Text style={styles.posterBadgeText} numberOfLines={1}>{badge}</Text>
        </View>
      ) : null}
      {typeof progress === 'number' && progress > 0 ? (
        <View style={styles.posterProgressTrack}>
          <View
            style={[
              styles.posterProgressFill,
              { width: `${Math.round(progress * 100)}%`, backgroundColor: accent },
            ]}
          />
        </View>
      ) : null}
    </View>
    <Text style={styles.posterTitle} numberOfLines={2}>{title}</Text>
  </FocusableCard>
);

interface LiveCardProps {
  channel: Channel;
  programTitle: string | null;
  programWindow: string | null;
  accent: string;
  onSelect: () => void;
}

const LiveCard: React.FC<LiveCardProps> = ({ channel, programTitle, programWindow, accent, onSelect }) => (
  <FocusableCard
    style={styles.liveCard}
    onSelect={onSelect}
    accessibilityRole="button"
    accessibilityLabel={channel.name}
  >
    <View style={styles.liveLogoWrap}>
      <Image
        source={channel.logo && channel.logo.startsWith('http') ? { uri: channel.logo } : characterLogo}
        style={styles.liveLogo}
        resizeMode="contain"
        defaultSource={characterLogo}
      />
    </View>
    <View style={styles.liveTextWrap}>
      <View style={[styles.livePill, { backgroundColor: colors.live }]}>
        <View style={styles.livePillDot} />
        <Text style={styles.livePillText}>LIVE</Text>
      </View>
      <Text style={styles.liveChannelName} numberOfLines={1}>{channel.name}</Text>
      {programTitle ? (
        <Text style={[styles.liveProgramTitle, { color: accent }]} numberOfLines={1}>{programTitle}</Text>
      ) : null}
      {programWindow ? (
        <Text style={styles.liveProgramTime} numberOfLines={1}>{programWindow}</Text>
      ) : null}
    </View>
  </FocusableCard>
);

interface HomeDashboardProps {
  onTabSwitch?: (tab: 'channels' | 'movies' | 'series' | 'recent' | 'favorites') => void;
}

const HomeDashboard = forwardRef<HomeContentRef, HomeDashboardProps>(({ onTabSwitch }, ref) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { channels, movies, series } = useIPTVLibrary();
  const { recentlyWatched } = useIPTVCollections();
  const { epg } = useIPTVGuide();
  const { playStream } = useIPTVPlayback();
  const { accent } = useTheme();

  const heroFocusRef = useRef<any>(null);
  const scrollRef = useRef<ScrollView>(null);

  useImperativeHandle(ref, () => ({
    focusFirstItem: () => {
      heroFocusRef.current?.focus?.();
      scrollRef.current?.scrollTo({ y: 0, animated: false });
    },
    handleBack: () => false,
  }));

  const featured = useMemo(
    () => pickFeaturedItem(recentlyWatched, movies, series),
    [recentlyWatched, movies, series],
  );

  // Continue Watching: keep the most recent 10, skip channel-only entries that
  // have no progress (they belong to live TV and are better surfaced via the
  // Live Now rail anyway).
  const continueWatching = useMemo(
    () => recentlyWatched.filter((r) => r.type !== 'live').slice(0, 10),
    [recentlyWatched],
  );

  const liveChannels = useMemo(() => channels.slice(0, 12), [channels]);

  const trendingMovies = useMemo(() => {
    const withCover = movies.filter((m) => m.cover && !m.isAdult);
    return (withCover.length > 0 ? withCover : movies).slice(0, 14);
  }, [movies]);

  const popularSeries = useMemo(() => {
    const withCover = series.filter((s) => s.cover && !s.isAdult);
    return (withCover.length > 0 ? withCover : series).slice(0, 14);
  }, [series]);

  const handleHeroPlay = () => {
    if (!featured) return;

    if (featured.kind === 'recent') {
      const item = featured.item;
      if (item.type === 'series') {
        // Resume series: jump to MediaInfo and let the user pick the episode.
        navigation.navigate('MediaInfo', {
          id: item.seriesId ?? item.id,
          type: 'series',
          title: item.name,
          cover: item.icon,
          returnTab: 'home',
        });
        return;
      }
      // VOD recent: play directly with stored direct source.
      playStream({
        id: item.id,
        url: item.directSource ?? '',
        name: item.name,
        type: 'vod',
        icon: item.icon,
        extension: item.extension,
        direct_source: item.directSource,
        isAdult: item.isAdult,
      });
      navigation.navigate('Player', { returnTab: 'home', returnScreen: 'Home', title: item.name });
      return;
    }

    if (featured.kind === 'movie') {
      navigation.navigate('MediaInfo', {
        id: featured.item.id,
        type: 'vod',
        title: featured.item.name,
        cover: featured.item.cover,
        streamUrl: featured.item.streamUrl,
        returnTab: 'home',
      });
      return;
    }

    navigation.navigate('MediaInfo', {
      id: featured.item.id,
      type: 'series',
      title: featured.item.name,
      cover: featured.item.cover,
      returnTab: 'home',
    });
  };

  const handleHeroDetails = () => {
    if (!featured) return;

    if (featured.kind === 'recent') {
      const item = featured.item;
      navigation.navigate('MediaInfo', {
        id: item.seriesId ?? item.id,
        type: item.type === 'series' ? 'series' : 'vod',
        title: item.name,
        cover: item.icon,
        returnTab: 'home',
      });
      return;
    }

    navigation.navigate('MediaInfo', {
      id: featured.item.id,
      type: featured.kind === 'series' ? 'series' : 'vod',
      title: featured.item.name,
      cover: featured.item.cover,
      streamUrl: featured.kind === 'movie' ? featured.item.streamUrl : undefined,
      returnTab: 'home',
    });
  };

  const handleRecentPress = (item: RecentlyWatchedItem) => {
    if (item.type === 'series') {
      navigation.navigate('MediaInfo', {
        id: item.seriesId ?? item.id,
        type: 'series',
        title: item.name,
        cover: item.icon,
        returnTab: 'home',
      });
      return;
    }
    playStream({
      id: item.id,
      url: item.directSource ?? '',
      name: item.name,
      type: item.type,
      icon: item.icon,
      extension: item.extension,
      direct_source: item.directSource,
      isAdult: item.isAdult,
    });
    navigation.navigate('Player', { returnTab: 'home', returnScreen: 'Home', title: item.name });
  };

  const handleMoviePress = (movie: Movie) => {
    navigation.navigate('MediaInfo', {
      id: movie.id,
      type: 'vod',
      title: movie.name,
      cover: movie.cover,
      streamUrl: movie.streamUrl,
      returnTab: 'home',
    });
  };

  const handleSeriesPress = (s: Series) => {
    navigation.navigate('MediaInfo', {
      id: s.id,
      type: 'series',
      title: s.name,
      cover: s.cover,
      returnTab: 'home',
    });
  };

  const handleChannelPress = (channel: Channel) => {
    playStream({ url: channel.url, id: channel.id, name: channel.name });
    navigation.navigate('Player', {
      focusChannelId: channel.id,
      returnGroupId: channel.group ?? null,
      returnTab: 'home',
      returnScreen: 'Home',
      title: channel.name,
    });
  };

  const buildChannelLiveLabels = (channel: Channel) => {
    const programs = epg[getEpgKeyForChannel(channel)];
    if (!programs || programs.length === 0) return { title: null, window: null };
    const now = Date.now();
    const current = programs.find((p) => p.start <= now && p.end > now);
    if (!current) return { title: null, window: null };
    return {
      title: current.title,
      window: `${timeFormatter.format(current.start)} – ${timeFormatter.format(current.end)}`,
    };
  };

  const renderRecent = ({ item }: { item: RecentlyWatchedItem }) => (
    <PosterCard
      title={item.episodeName ?? item.name}
      cover={item.icon}
      progress={formatProgress(item)}
      accent={accent}
      onSelect={() => handleRecentPress(item)}
    />
  );

  const renderMovie = ({ item }: { item: Movie }) => (
    <PosterCard
      title={item.name}
      cover={item.cover}
      accent={accent}
      onSelect={() => handleMoviePress(item)}
    />
  );

  const renderSeries = ({ item }: { item: Series }) => (
    <PosterCard
      title={item.name}
      cover={item.cover}
      accent={accent}
      onSelect={() => handleSeriesPress(item)}
    />
  );

  const renderChannel = ({ item }: { item: Channel }) => {
    const { title, window } = buildChannelLiveLabels(item);
    return (
      <LiveCard
        channel={item}
        programTitle={title}
        programWindow={window}
        accent={accent}
        onSelect={() => handleChannelPress(item)}
      />
    );
  };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.root}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Hero
        featured={featured}
        accent={accent}
        onPlay={handleHeroPlay}
        onDetails={handleHeroDetails}
        t={t}
      />

      {continueWatching.length > 0 && (
        <Rail
          title={t('home.continueWatching')}
          accent={accent}
          onSeeAll={() => onTabSwitch?.('recent')}
          t={t}
        >
          <FlatList
            data={continueWatching}
            keyExtractor={(item) => `${item.id}:${item.lastWatchedAt}`}
            renderItem={renderRecent}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railListContent}
            ItemSeparatorComponent={RailSeparator}
          />
        </Rail>
      )}

      {liveChannels.length > 0 && (
        <Rail
          title={t('home.liveNow')}
          accent={accent}
          onSeeAll={() => onTabSwitch?.('channels')}
          t={t}
        >
          <FlatList
            data={liveChannels}
            keyExtractor={(item) => item.id}
            renderItem={renderChannel}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railListContent}
            ItemSeparatorComponent={RailSeparator}
          />
        </Rail>
      )}

      {trendingMovies.length > 0 && (
        <Rail
          title={t('home.trendingMovies')}
          accent={accent}
          onSeeAll={() => onTabSwitch?.('movies')}
          t={t}
        >
          <FlatList
            data={trendingMovies}
            keyExtractor={(item) => item.id}
            renderItem={renderMovie}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railListContent}
            ItemSeparatorComponent={RailSeparator}
          />
        </Rail>
      )}

      {popularSeries.length > 0 && (
        <Rail
          title={t('home.popularSeries')}
          accent={accent}
          onSeeAll={() => onTabSwitch?.('series')}
          t={t}
        >
          <FlatList
            data={popularSeries}
            keyExtractor={(item) => item.id}
            renderItem={renderSeries}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railListContent}
            ItemSeparatorComponent={RailSeparator}
          />
        </Rail>
      )}

      {channels.length === 0 && movies.length === 0 && series.length === 0 && (
        <View style={styles.emptyState}>
          <Tv size={48} color={colors.textDim} />
          <Text style={styles.emptyText}>{t('home.empty')}</Text>
        </View>
      )}
    </ScrollView>
  );
});

const RailSeparator = () => <View style={{ width: spacing.md }} />;

const POSTER_WIDTH = isTV ? posters.md.w + 20 : posters.sm.w + 12;
const POSTER_HEIGHT = isTV ? posters.md.h + 30 : posters.sm.h + 18;
const LIVE_CARD_WIDTH = isTV ? 280 : 220;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingBottom: spacing.huge,
  },

  // Hero
  heroRoot: {
    width: '100%',
    height: isTV ? 420 : 280,
    overflow: 'hidden',
  },
  heroBackdrop: {
    flex: 1,
  },
  heroBackdropImage: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  heroScrimVertical: {
    backgroundColor: 'rgba(7,7,10,0.55)',
  },
  heroScrimHorizontal: {
    backgroundColor: 'transparent',
  },
  heroContent: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    bottom: spacing.xxl,
    maxWidth: 640,
  },
  heroEyebrow: {
    ...typography.eyebrow,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.display,
    color: colors.text,
    fontSize: isTV ? 48 : 30,
    lineHeight: isTV ? 52 : 34,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.textDim,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  heroFallback: {
    width: '100%',
    height: isTV ? 360 : 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  heroFallbackText: {
    ...typography.body,
    color: colors.textDim,
  },

  // Rails
  rail: {
    marginTop: spacing.xl,
  },
  railHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.md,
  },
  railTitle: {
    ...typography.title,
    color: colors.text,
  },
  seeAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
  seeAllText: {
    ...typography.eyebrow,
    fontSize: 11,
  },
  railListContent: {
    paddingHorizontal: spacing.xxl,
  },

  // Poster card
  posterCard: {
    width: POSTER_WIDTH,
  },
  posterImageWrap: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...shadows.poster,
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  posterBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  posterBadgeText: {
    ...typography.eyebrow,
    fontSize: 10,
    color: '#FFF',
  },
  posterProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  posterProgressFill: {
    height: '100%',
  },
  posterTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    marginTop: spacing.sm,
  },

  // Live card
  liveCard: {
    width: LIVE_CARD_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  liveLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  liveLogo: {
    width: '100%',
    height: '100%',
  },
  liveTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  livePillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFF',
  },
  livePillText: {
    ...typography.eyebrow,
    fontSize: 9,
    color: '#FFF',
  },
  liveChannelName: {
    ...typography.subtitle,
    color: colors.text,
    fontSize: 14,
  },
  liveProgramTitle: {
    ...typography.caption,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  liveProgramTime: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },

  // Empty state
  emptyState: {
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textDim,
    textAlign: 'center',
  },
});

HomeDashboard.displayName = 'HomeDashboard';

export default HomeDashboard;
