import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type AuthStackParamList = { Login: undefined; Register: undefined; ForgotPassword: undefined };
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError(null);
    if (!email.trim()) {
      setError('E-posta gerekli.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase?.auth.resetPasswordForEmail(email.trim()) ?? { error: new Error('Supabase yok') };
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  const handleVerifyAndReset = async () => {
    setError(null);
    const code = otpCode.trim().replace(/\s/g, '');
    if (!code || code.length !== 8) {
      setError('8 haneli doğrulama kodunu girin.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    setLoading(true);
    const { error: verifyErr } = await supabase?.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' }) ?? { error: new Error('Supabase yok') };
    if (verifyErr) {
      setLoading(false);
      setError(verifyErr.message || 'Kod geçersiz veya süresi dolmuş.');
      return;
    }
    const { error: updateErr } = await supabase?.auth.updateUser({ password }) ?? { error: new Error('Supabase yok') };
    setLoading(false);
    if (updateErr) {
      setError(updateErr.message);
      return;
    }
    setDone(true);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Şifremi unuttum</Text>
        <Text style={styles.subtitle}>
          {done ? 'Şifreniz güncellendi.' : sent ? 'E-postanıza gelen 8 haneli kodu ve yeni şifrenizi girin.' : 'E-posta adresinizi girin, size 8 haneli doğrulama kodu göndereceğiz.'}
        </Text>
        {done ? (
          <>
            <Text style={styles.successText}>Giriş sayfasına yönlendiriliyorsunuz...</Text>
            <TouchableOpacity onPress={() => navigation.replace('Login')} style={[styles.button, { marginTop: 12 }]}>
              <Text style={styles.buttonText}>Girişe dön</Text>
            </TouchableOpacity>
          </>
        ) : sent ? (
          <>
            <TextInput style={[styles.input, { backgroundColor: '#f4f4f5', color: '#71717a' }]} value={email} editable={false} />
            <TextInput
              style={[styles.input, { textAlign: 'center', letterSpacing: 8, fontSize: 20 }]}
              placeholder="00000000"
              placeholderTextColor="#71717a"
              value={otpCode}
              onChangeText={(t) => setOtpCode(t.replace(/\D/g, '').slice(0, 8))}
              keyboardType="number-pad"
              maxLength={8}
              autoComplete="one-time-code"
            />
            <TextInput style={styles.input} placeholder="Yeni şifre (en az 6 karakter)" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} secureTextEntry />
            <TextInput style={styles.input} placeholder="Şifre (tekrar)" placeholderTextColor="#71717a" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleVerifyAndReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Şifreyi güncelle</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setSent(false); setOtpCode(''); setPassword(''); setConfirmPassword(''); setError(null); }} style={styles.linkWrap}>
              <Text style={styles.linkText}>← Yeni kod iste</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="E-posta"
              placeholderTextColor="#71717a"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Doğrulama kodu gönder</Text>}
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.linkWrap}>
          <Text style={styles.linkText}>Girişe dön</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 20, fontWeight: '700', color: '#18181b', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#71717a', marginBottom: 20 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#18181b', marginBottom: 12 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  successText: { fontSize: 14, color: '#15803d', marginBottom: 16 },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
});
