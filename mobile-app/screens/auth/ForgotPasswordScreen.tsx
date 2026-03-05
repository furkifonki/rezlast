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
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  const handleSendCode = async () => {
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
    const { error } = await supabase.auth.resetPasswordForEmail(e);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  const handleVerifyAndReset = async () => {
    const code = otpCode.trim().replace(/\s/g, '');
    if (!code || code.length !== 8) {
      toast.error('8 haneli doğrulama kodunu girin.');
      return;
    }
    if (password.length < 6) {
      toast.error('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Şifreler eşleşmiyor.');
      return;
    }
    if (!supabase) {
      toast.error('Bağlantı yapılandırılmamış.');
      return;
    }
    setLoading(true);
    const { error: verifyErr } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
    if (verifyErr) {
      setLoading(false);
      toast.error(verifyErr.message || 'Kod geçersiz veya süresi dolmuş.');
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateErr) {
      toast.error(updateErr.message);
      return;
    }
    setDone(true);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Şifremi unuttum</Text>
        <Text style={styles.subtitle}>
          {done ? 'Şifreniz güncellendi.' : sent ? 'E-postanıza gelen 8 haneli kodu ve yeni şifrenizi girin.' : 'E-posta adresinizi girin, size 8 haneli doğrulama kodu gönderelim.'}
        </Text>
        {done ? (
          <View style={styles.sentBlock}>
            <Text style={styles.sentText}>Giriş sayfasına yönlendiriliyorsunuz.</Text>
            <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Giriş sayfasına dön</Text>
            </TouchableOpacity>
          </View>
        ) : sent ? (
          <>
            <TextInput style={[styles.input, { backgroundColor: '#f1f5f9', color: '#64748b' }]} value={email} editable={false} />
            <TextInput
              style={[styles.input, { textAlign: 'center', letterSpacing: 8, fontSize: 20 }]}
              placeholder="00000000"
              placeholderTextColor="#94a3b8"
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 8))}
              keyboardType="number-pad"
              maxLength={8}
              autoComplete="one-time-code"
              editable={!loading}
            />
            <TextInput style={styles.input} placeholder="Yeni şifre (en az 6 karakter)" placeholderTextColor="#94a3b8" value={password} onChangeText={setPassword} secureTextEntry editable={!loading} />
            <TextInput style={styles.input} placeholder="Şifre (tekrar)" placeholderTextColor="#94a3b8" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry editable={!loading} />
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi güncelle</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSent(false); setOtpCode(''); setPassword(''); setConfirmPassword(''); }} style={styles.link}>
              <Text style={styles.linkText}>← Yeni kod iste</Text>
            </TouchableOpacity>
          </>
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
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Doğrulama kodu gönder</Text>}
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Login')} disabled={loading}>
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
