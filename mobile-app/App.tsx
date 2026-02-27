import React, { Component, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RootNavigator } from './navigation/RootNavigator';

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: string | null }
> {
  state = { hasError: false, error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <View style={[styles.container, { padding: 24 }]}>
          <Text style={styles.title}>Uygulama hatası</Text>
          <Text style={styles.error}>{this.state.error}</Text>
          <StatusBar style="auto" />
        </View>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  return (
    <>
      <RootNavigator />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
  },
  error: {
    color: '#c00',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
