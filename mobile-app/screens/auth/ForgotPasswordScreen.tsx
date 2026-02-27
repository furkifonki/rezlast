import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/NotificationContext';

type Props = {
  navigation: { navigate: (name: string) => void };
};

export default function ForgotPasswordScreen({ navigation }: Props) {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    const e = email.trim();
    if (!e) {
      toast.error('E-posta adresi girin.');
      return;
    }
    if (!supabase) {
      toast.error('Bağlantı yapılandırılmamış.');
      return;
    }
    setLoading(true);
    const appUrl = process.env.EXPO_PUBLIC_APP_URL;
    const redirectTo = appUrl ? `${appUrl.replace(/\/$/, '')}/reset-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(e, { redirectTo });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Şifremi unuttum</Text>
        <Text style={styles.subtitle}>
          E-posta adresinizi girin, size şifre sıfırlama linki gönderelim. Link web sayfasında açılacak; yeni şifreyi orada belirleyebilirsiniz.
        </Text>
        {sent ? (
          <View style={styles.sentBlock}>
            <Text style={styles.sentText}>
              E-posta gönderildi. Gelen kutunuzu (ve spam klasörünü) kontrol edin.
            </Text>
            <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor="#94a3b8"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sıfırlama linki gönder</Text>
              )}
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Login')}
          disabled={loading}
        >
          <Text style={styles.linkText}>← Giriş sayfasına dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sentBlock: {
    marginBottom: 16,
  },
  sentText: {
    fontSize: 14,
    color: '#15803d',
    marginBottom: 12,
  },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#15803d',
    fontSize: 14,
  },
});
