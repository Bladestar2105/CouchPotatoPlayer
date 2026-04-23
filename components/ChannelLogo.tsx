import React, { memo, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { proxyImageUrl } from '../utils/imageProxy';

interface ChannelLogoProps {
  url?: string | null;
  name?: string;
  size?: number;
  style?: StyleProp<ImageStyle>;
  borderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
}

const ChannelLogoComponent = ({
  url,
  name = '?',
  size = 50,
  style,
  borderRadius = 8,
  backgroundColor = '#2C2C2E',
  textColor = '#FFF',
}: ChannelLogoProps) => {
  const [error, setError] = useState(false);
  const proxiedUrl = useMemo(() => proxyImageUrl(url), [url]);

  if (!proxiedUrl || error) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <View
        style={[
          styles.fallbackContainer,
          { width: size, height: size, borderRadius, backgroundColor },
          style as StyleProp<ViewStyle>,
        ]}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={name !== '?' ? `Logo for ${name}` : 'Channel logo placeholder'}
      >
        <Text style={[styles.fallbackText, { color: textColor, fontSize: size * 0.45 }]}>
          {initial}
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: proxiedUrl }}
      style={[styles.image, { width: size, height: size, borderRadius }, style]}
      resizeMode="contain"
      onError={() => setError(true)}
      accessible={true}
      accessibilityRole="image"
      accessibilityLabel={name !== '?' ? `Logo for ${name}` : 'Channel logo'}
    />
  );
};

export const ChannelLogo = memo(ChannelLogoComponent);

const styles = StyleSheet.create({
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  fallbackText: {
    fontWeight: 'bold',
  },
  image: {
    backgroundColor: 'transparent',
  },
});
