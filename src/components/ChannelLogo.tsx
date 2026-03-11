import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface ChannelLogoProps {
  uri?: string;
  name: string;
  size?: number;
  borderRadius?: number;
}

// Generate a consistent color from a string
const getColorFromName = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#82E0AA', '#F0B27A', '#AED6F1', '#D7BDE2',
    '#A3E4D7', '#FAD7A0', '#A9CCE3', '#D5F5E3', '#FADBD8',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const ChannelLogo: React.FC<ChannelLogoProps> = ({
  uri,
  name,
  size = 44,
  borderRadius = 22,
}) => {
  const [imgError, setImgError] = useState(false);

  if (uri && !imgError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        onError={() => setImgError(true)}
        resizeMode="contain"
      />
    );
  }

  // Fallback: colored circle with initials
  const bgColor = getColorFromName(name);
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1C1C1E',
  },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#FFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});