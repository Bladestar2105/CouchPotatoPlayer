import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Logger from '../utils/logger';
import i18n from '../utils/i18n';

type ErrorBoundaryFallbackDetails = {
  error: Error | null;
  reset: () => void;
};

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((details: ErrorBoundaryFallbackDetails) => ReactNode);
  onFallbackBack?: () => void;
  fallbackBackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Logger.error('Uncaught error:', error, errorInfo);
  }

  private reset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const { fallback, onFallbackBack } = this.props;
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback({ error: this.state.error, reset: this.reset });
        }
        return fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>{i18n.t('errorBoundary.title')}</Text>
          <Text style={styles.subtitle}>{this.state.error?.message}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={this.reset}
              accessible={true}
              accessibilityRole="button"
              isTVSelectable={true}
              hasTVPreferredFocus={Platform.isTV}
            >
              <Text style={styles.buttonText}>{i18n.t('errorBoundary.retry')}</Text>
            </TouchableOpacity>
            {onFallbackBack ? (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={onFallbackBack}
                accessible={true}
                accessibilityRole="button"
                isTVSelectable={true}
              >
                <Text style={styles.buttonText}>
                  {this.props.fallbackBackLabel ?? i18n.t('errorBoundary.goHome')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Platform.isTV ? 48 : 20,
    backgroundColor: '#121212',
  },
  title: {
    fontSize: Platform.isTV ? 34 : 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Platform.isTV ? 20 : 16,
    color: '#FF453A',
    marginBottom: 24,
    textAlign: 'center',
    maxWidth: 760,
  },
  actions: {
    flexDirection: Platform.isTV ? 'row' : 'column',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    paddingHorizontal: Platform.isTV ? 28 : 20,
    paddingVertical: Platform.isTV ? 14 : 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: Platform.isTV ? 20 : 16,
  },
});
