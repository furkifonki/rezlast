import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setReady(true);
    }).catch(() => {
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider initialSession={session}>
        <AppNavigator />
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
});
