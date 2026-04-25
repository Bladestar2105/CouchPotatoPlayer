import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';
import { focus, radii, spacing, typography } from '../../theme/tokens';

interface ThemedButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  backgroundColor: string;
  textColor?: string;
  focusBorderColor?: string;
  enableTvFocusStyle?: boolean;
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

const ThemedButton: React.FC<ThemedButtonProps> = ({
  label,
  onPress,
  backgroundColor,
  textColor = '#FFF',
  focusBorderColor,
  enableTvFocusStyle = true,
  accessibilityLabel,
  disabled,
  style,
  textStyle,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor,
          opacity: disabled ? 0.7 : 1,
          borderColor: enableTvFocusStyle && isFocused ? (focusBorderColor || textColor) : 'transparent',
          borderWidth: enableTvFocusStyle ? focus.ringWidth : 0,
          transform: [{ scale: enableTvFocusStyle && isFocused ? focus.scale : 1 }],
        },
        enableTvFocusStyle && isFocused ? {
          shadowColor: focusBorderColor || textColor,
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
        } : null,
        style,
      ]}
      onPress={onPress}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      disabled={disabled}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
    >
      <Text style={[styles.buttonText, { color: textColor }, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: spacing.lg - 1,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    ...typography.body,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default ThemedButton;
