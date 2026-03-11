import React, { Component, ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { isMobile } from '../utils/platform';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
            </Text>
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorScroll}>
                <Text style={styles.errorDetail}>{this.state.error.toString()}</Text>
                {this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack?.substring(0, 500)}
                  </Text>
                )}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.retryBtn} onPress={this.handleRecover}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// ── Lightweight wrapper for individual screens ──
export class ScreenErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ScreenError:', error.message);
    this.setState({ errorInfo });
  }

  handleRecover = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.screenError}>
          <Text style={styles.screenErrorText}>Failed to load</Text>
          <TouchableOpacity style={styles.screenRetryBtn} onPress={this.handleRecover}>
            <Text style={styles.screenRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: isMobile ? 30 : 50,
    alignItems: 'center',
    maxWidth: isMobile ? '90%' : 500,
    width: '100%',
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    color: '#FFF',
    fontSize: isMobile ? 22 : 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#AAA',
    fontSize: isMobile ? 14 : 18,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: isMobile ? 20 : 26,
  },
  errorScroll: {
    maxHeight: 120,
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
  },
  errorDetail: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  errorStack: {
    color: '#888',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  retryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  retryText: {
    color: '#FFF',
    fontSize: isMobile ? 16 : 20,
    fontWeight: '600',
  },
  screenError: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenErrorText: {
    color: '#FF453A',
    fontSize: 18,
    marginBottom: 16,
  },
  screenRetryBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  screenRetryText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});