import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { spacing, typography } from '../../theme/tokens';

interface SectionHeaderProps {
  title: string;
  color: string;
  style?: TextStyle;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, color, style }) => {
  return <Text style={[styles.header, { color }, style]}>{title}</Text>;
};

const styles = StyleSheet.create({
  header: {
    ...typography.section,
    marginBottom: spacing.lg,
  },
});

export default SectionHeader;
