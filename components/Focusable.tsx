import React, { useState, useCallback, useMemo } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { colors as tokenColors, focus, radii, spacing, typography } from '../theme/tokens';

// ─────────────────────────────────────────────────────────────────────────
// Focus contract (DESIGN_SYSTEM.md § 1.3 and tokens.ts):
//   • focused element scales by 1.04
//   • gains a 3px accent ring
//   • casts an accent-colored glow
//   • 160ms transition
// Reduce-motion kills the scale but keeps the ring.
// ─────────────────────────────────────────────────────────────────────────

const useReduceMotion = () => {
  const [reduce, setReduce] = useState(false);
  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((value) => {
        if (mounted) setReduce(!!value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.('reduceMotionChanged', (value: boolean) => {
      setReduce(!!value);
    });
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return reduce;
};

interface BaseFocusableProps extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  focusedStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Fire a haptic-free selection callback. */
  onSelect?: (event: GestureResponderEvent) => void;
  /** Disable the focus ring (useful for nested focusables). */
  noRing?: boolean;
}

const useFocusState = () => {
  const [focused, setFocused] = useState(false);
  const onFocus = useCallback(() => setFocused(true), []);
  const onBlur = useCallback(() => setFocused(false), []);
  return { focused, onFocus, onBlur };
};

const buildFocusStyle = (
  focused: boolean,
  reduceMotion: boolean,
  accent: string,
  noRing: boolean,
): ViewStyle => {
  if (!focused) return {};
  const ringStyle: ViewStyle = noRing
    ? {}
    : {
        borderWidth: focus.ringWidth,
        borderColor: accent,
      };
  const glowStyle: ViewStyle = noRing
    ? {}
    : {
        shadowColor: accent,
        shadowOpacity: focus.glow.shadowOpacity,
        shadowRadius: focus.glow.shadowRadius,
        shadowOffset: focus.glow.shadowOffset,
        elevation: focus.glow.elevation,
      };
  return {
    ...ringStyle,
    ...glowStyle,
    transform: reduceMotion ? undefined : [{ scale: focus.scale }],
  };
};

// ─── FocusableCard ────────────────────────────────────────────────────────

export const FocusableCard: React.FC<BaseFocusableProps> = ({
  style,
  focusedStyle,
  children,
  onSelect,
  onPress,
  noRing = false,
  ...rest
}) => {
  const { accent } = useTheme();
  const reduceMotion = useReduceMotion();
  const { focused, onFocus, onBlur } = useFocusState();
  const focusStyle = useMemo(
    () => buildFocusStyle(focused, reduceMotion, accent, noRing),
    [focused, reduceMotion, accent, noRing],
  );

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onSelect?.(event);
      onPress?.(event);
    },
    [onSelect, onPress],
  );

  return (
    <Pressable
      {...rest}
      focusable
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={handlePress}
      style={[cardStyles.base, style, focusStyle, focused ? focusedStyle : null]}
    >
      {children}
    </Pressable>
  );
};

const cardStyles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 0,
    borderColor: 'transparent',
  },
});

// ─── FocusableButton ──────────────────────────────────────────────────────

export type FocusableButtonVariant = 'primary' | 'ghost' | 'destructive';

interface FocusableButtonProps extends BaseFocusableProps {
  label: string;
  variant?: FocusableButtonVariant;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const FocusableButton: React.FC<FocusableButtonProps> = ({
  label,
  variant = 'primary',
  leading,
  trailing,
  style,
  textStyle,
  children,
  onPress,
  onSelect,
  fullWidth,
  disabled,
  ...rest
}) => {
  const { accent } = useTheme();
  const reduceMotion = useReduceMotion();
  const { focused, onFocus, onBlur } = useFocusState();

  const { containerStyle, labelColor } = useMemo(() => {
    switch (variant) {
      case 'ghost':
        return {
          containerStyle: {
            backgroundColor: focused ? tokenColors.elevated : 'transparent',
            borderWidth: 1,
            borderColor: tokenColors.border,
          },
          labelColor: tokenColors.text,
        };
      case 'destructive':
        return {
          containerStyle: {
            backgroundColor: tokenColors.danger,
            borderWidth: 0,
          },
          labelColor: '#FFFFFF',
        };
      case 'primary':
      default:
        return {
          containerStyle: {
            backgroundColor: focused ? tokenColors.accentDeep : accent,
            borderWidth: 0,
          },
          labelColor: '#FFFFFF',
        };
    }
  }, [variant, focused, accent]);

  const focusStyle = buildFocusStyle(focused, reduceMotion, accent, false);

  const handlePress = useCallback(
    (event: GestureResponderEvent) => {
      onSelect?.(event);
      onPress?.(event);
    },
    [onPress, onSelect],
  );

  return (
    <Pressable
      {...rest}
      focusable
      disabled={disabled}
      onFocus={onFocus}
      onBlur={onBlur}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={rest.accessibilityLabel ?? label}
      style={[
        buttonStyles.base,
        Platform.isTV ? buttonStyles.tv : buttonStyles.mobile,
        fullWidth ? buttonStyles.fullWidth : null,
        containerStyle,
        focusStyle,
        disabled ? buttonStyles.disabled : null,
        style,
      ]}
    >
      {leading ? <View style={buttonStyles.adornment}>{leading}</View> : null}
      <Text style={[buttonStyles.label, { color: labelColor }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
      {trailing ? <View style={buttonStyles.adornment}>{trailing}</View> : null}
      {children}
    </Pressable>
  );
};

const buttonStyles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  mobile: {
    minHeight: 44,
  },
  tv: {
    minHeight: 56,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    ...typography.subtitle,
    fontWeight: '700' as const,
  },
  adornment: {
    marginHorizontal: 0,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FocusableButton;
