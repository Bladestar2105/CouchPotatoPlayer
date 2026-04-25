import React from 'react';
import { Image, View, type ImageSourcePropType, type ImageStyle, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii } from '../theme/tokens';

export type BrandMarkSize = number | 'mobile-header' | 'tv-header' | 'settings' | 'hero';
export type BrandMarkVariant = 'icon' | 'character';

interface BrandMarkProps {
  size?: BrandMarkSize;
  variant?: BrandMarkVariant;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  /** Use a user-specified accent color for the plate tint. Defaults to brand navy. */
  plateColor?: string;
}

const namedSize = (size: BrandMarkSize): number => {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'mobile-header': return 28;
    case 'tv-header':     return 32;
    case 'settings':      return 88;
    case 'hero':          return 200;
    default:              return 32;
  }
};

const iconSource: ImageSourcePropType = require('../assets/icon.png');
const heroSource: ImageSourcePropType = require('../assets/character_logo.png');

/**
 * Single, canonical way the CouchPotato logo renders. Per DESIGN_SYSTEM.md § 3.1
 * the logo is the potato-on-couch icon on a brand-navy plate. Hero placements
 * use the larger character_logo asset without a plate.
 */
const BrandMark: React.FC<BrandMarkProps> = ({
  size = 'tv-header',
  variant,
  style,
  imageStyle,
  plateColor = colors.brandNavy,
}) => {
  const px = namedSize(size);
  const resolvedVariant: BrandMarkVariant = variant ?? (size === 'hero' ? 'character' : 'icon');

  if (resolvedVariant === 'character') {
    return (
      <View style={[{ width: px, height: px }, style]} accessibilityLabel="CouchPotato Player">
        <Image
          source={heroSource}
          style={[{ width: '100%', height: '100%' }, imageStyle]}
          resizeMode="contain"
        />
      </View>
    );
  }

  const plateRadius = Math.max(6, Math.round(px * 0.25));

  return (
    <View
      style={[
        {
          width: px,
          height: px,
          borderRadius: Math.min(plateRadius, radii.lg),
          backgroundColor: plateColor,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="CouchPotato Player"
    >
      <Image source={iconSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
};

export default BrandMark;
