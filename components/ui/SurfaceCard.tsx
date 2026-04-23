import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { effects, radii, spacing } from '../../theme/tokens';

interface SurfaceCardProps {
  children: React.ReactNode;
  backgroundColor: string;
  borderColor: string;
  style?: ViewStyle | ViewStyle[];
}

const SurfaceCard: React.FC<SurfaceCardProps> = ({ children, backgroundColor, borderColor, style }) => {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: effects.subtleBorderWidth,
    marginBottom: spacing.md,
  },
});

export default SurfaceCard;
