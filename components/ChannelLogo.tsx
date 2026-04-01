import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { proxyImageUrl } from '../utils/imageProxy';

interface ChannelLogoProps {
  url?: string | null;
  name?: string;
  size?: number;
  style?: any;
  borderRadius?: number;
  backgroundColor?: string;
  textColor?: string;
}

export const ChannelLogo = ({
  url,
  name = '?',
  size = 50,
  style,
  borderRadius = 8,
  backgroundColor = '#2C2C2E',
  textColor = '#FFF',
}: ChannelLogoProps) => {
  const [error, setError] = useState(false);
  const proxiedUrl = proxyImageUrl(url);

  if (!proxiedUrl || error) {
    const initial = name ? name.charAt(0).toUpperCase() : '?';
    return (
      <View
        style={[
          styles.fallbackContainer,
          { width: size, height: size, borderRadius, backgroundColor },
          style,
        ]}
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
    />
  );
};

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
