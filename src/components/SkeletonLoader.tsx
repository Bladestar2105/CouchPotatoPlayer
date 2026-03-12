import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { isMobile } from '../utils/platform';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 6,
  style,
}) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: '#2C2C2E',
          opacity,
        },
        style,
      ]}
    />
  );
};

// ── Pre-built skeleton layouts ──

export const ChannelCardSkeleton: React.FC = () => (
  <View style={skStyles.channelCard}>
    <Skeleton width={50} height={50} borderRadius={25} />
    <View style={skStyles.channelCardText}>
      <Skeleton width="70%" height={14} />
      <Skeleton width="40%" height={12} style={{ marginTop: 6 }} />
    </View>
  </View>
);

export const GridCardSkeleton: React.FC = () => (
  <View style={skStyles.gridCard}>
    <Skeleton width="100%" height={isMobile ? 140 : 200} borderRadius={8} />
    <Skeleton width="80%" height={14} style={{ marginTop: 8 }} />
    <Skeleton width="50%" height={12} style={{ marginTop: 4 }} />
  </View>
);

export const HorizontalCardSkeleton: React.FC = () => (
  <View style={skStyles.horizontalCard}>
    <Skeleton width={isMobile ? 100 : 140} height={isMobile ? 60 : 80} borderRadius={8} />
    <Skeleton width={80} height={12} style={{ marginTop: 6 }} />
  </View>
);

export const ChannelListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(<ChannelCardSkeleton key={i} />);
  }
  return <View>{skeletons}</View>;
};

export const GridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(<GridCardSkeleton key={i} />);
  }
  return <View style={skStyles.gridContainer}>{skeletons}</View>;
};

export const HorizontalRowSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const skeletons = [];
  for (let i = 0; i < count; i++) {
    skeletons.push(<HorizontalCardSkeleton key={i} />);
  }
  return <View style={skStyles.horizontalRow}>{skeletons}</View>;
};

const skStyles = StyleSheet.create({
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 4,
  },
  channelCardText: {
    flex: 1,
    marginLeft: 12,
  },
  gridCard: {
    width: isMobile ? '47%' : 180,
    marginBottom: 16,
    marginHorizontal: isMobile ? '1.5%' : 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: isMobile ? 8 : 16,
  },
  horizontalCard: {
    marginRight: 12,
    alignItems: 'center',
  },
  horizontalRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});