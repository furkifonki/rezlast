import { StatusBar } from 'expo-status-bar';
import { View, Text, Button, StyleSheet } from 'react-native';
import { supabase } from './lib/supabase';
import { useState, Component, type ReactNode } from 'react';

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
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    if (!supabase) {
      setMessage(
        'Hata: .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalı.'
      );
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const { data, error } = await supabase.from('categories').select('*');
      if (error) {
        setMessage('Supabase hata: ' + error.message);
        return;
      }
      setMessage('Bağlantı OK. Kategori sayısı: ' + (data?.length ?? 0));
    } catch (e: unknown) {
      setMessage('Hata: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  if (!supabase) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Rezervasyon App</Text>
        <Text style={styles.error}>
          Supabase yapılandırılmamış. .env dosyasında EXPO_PUBLIC_SUPABASE_URL ve
          EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı olmalı.
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rezervasyon App</Text>
      <Button
        title={loading ? 'Bekle...' : 'Test Connection'}
        onPress={testConnection}
        disabled={loading}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 16,
  },
  message: {
    marginTop: 16,
    color: '#333',
    textAlign: 'center',
  },
  error: {
    marginTop: 8,
    color: '#c00',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
