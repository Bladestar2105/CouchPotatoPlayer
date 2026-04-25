import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent, ViewStyle, TextStyle } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';

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
          borderWidth: enableTvFocusStyle && isFocused ? 2 : 0,
        },
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
    borderRadius: radii.sm,
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
