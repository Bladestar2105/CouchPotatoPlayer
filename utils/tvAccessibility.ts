import { Platform, StyleSheet, TextStyle } from 'react-native';

const TV_FONT_SCALE = 1.2;
let isPatched = false;

const scaleTypography = (value: number): number =>
  Platform.isTV ? Math.round(value * TV_FONT_SCALE) : value;

const scaleStyleObject = <T extends Record<string, unknown>>(style: T): T => {
  const nextStyle: Record<string, unknown> = { ...style };

  if (typeof nextStyle.fontSize === 'number') {
    nextStyle.fontSize = scaleTypography(nextStyle.fontSize);
  }

  if (typeof nextStyle.lineHeight === 'number') {
    nextStyle.lineHeight = scaleTypography(nextStyle.lineHeight);
  }

  return nextStyle as T;
};

export const setupTVAccessibility = () => {
  if (!Platform.isTV || isPatched) {
    return;
  }

  const originalCreate = StyleSheet.create.bind(StyleSheet);
  StyleSheet.create = <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(styles: T): T => {
    const scaledStyles: Record<string, unknown> = {};

    Object.entries(styles).forEach(([styleName, styleValue]) => {
      if (styleValue && typeof styleValue === 'object' && !Array.isArray(styleValue)) {
        scaledStyles[styleName] = scaleStyleObject(styleValue as Record<string, unknown>);
      } else {
        scaledStyles[styleName] = styleValue;
      }
    });

    return originalCreate(scaledStyles as T);
  };

  isPatched = true;
};

export const tvTextSize = (fontSize: number): TextStyle['fontSize'] => scaleTypography(fontSize);


setupTVAccessibility();
