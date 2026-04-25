import React from 'react';
import { TextInput, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';

interface ThemedTextInputProps extends TextInputProps {
  backgroundColor: string;
  borderColor: string;
  focusedBorderColor?: string;
  textColor: string;
  style?: ViewStyle | ViewStyle[];
}

const ThemedTextInput: React.FC<ThemedTextInputProps> = ({
  backgroundColor,
  borderColor,
  focusedBorderColor,
  textColor,
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const handleFocus: TextInputProps['onFocus'] = (event) => {
    setIsFocused(true);
    onFocus?.(event);
  };

  const handleBlur: TextInputProps['onBlur'] = (event) => {
    setIsFocused(false);
    onBlur?.(event);
  };

  return (
    <TextInput
      {...props}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        styles.input,
        {
          backgroundColor,
          borderColor: isFocused ? (focusedBorderColor || borderColor) : borderColor,
          color: textColor,
          borderWidth: 2,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    padding: spacing.lg - 1,
    borderRadius: radii.sm,
    marginBottom: spacing.xl,
    textAlign: 'center',
    fontSize: typography.body.fontSize,
    borderWidth: 1,
  },
});

export default ThemedTextInput;
