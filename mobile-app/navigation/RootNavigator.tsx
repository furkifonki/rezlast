import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AuthContainer } from './AuthContainer';
import { MainStack } from './MainStack';

export function RootNavigator() {
  const auth = useAuth();
  const isLoading = Boolean(auth?.loading === true);
  const hasSession = Boolean(auth?.session != null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || isLoading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return hasSession ? <MainStack /> : <AuthContainer />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
  },
});