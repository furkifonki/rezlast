import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type AuthStackParamList = { Login: undefined; Register: undefined; ForgotPassword: undefined };
type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    setSuccess('');
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalı.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase?.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    }) ?? { data: null, error: new Error('Supabase yok') };
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data?.user) {
      if (data.user.identities?.length === 0) {
        setError('Bu e-posta adresi zaten kullanılıyor. Giriş yapmayı deneyin.');
        return;
      }
      setSuccess('Hesap oluşturuldu. Giriş sayfasına yönlendiriliyorsunuz...');
      setTimeout(() => navigation.replace('Login'), 1500);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Rezvio Admin - Kayıt</Text>
        <Text style={styles.subtitle}>İşletme sahibi hesabı oluşturun.</Text>
        <TextInput style={styles.input} placeholder="Ad Soyad" placeholderTextColor="#71717a" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="E-posta" placeholderTextColor="#71717a" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Şifre (en az 6 karakter)" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Kayıt Ol</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.linkWrap}>
          <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş yap</Text>
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
  successBox: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', borderRadius: 8, padding: 12, marginBottom: 12 },
  successText: { fontSize: 14, color: '#15803d' },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
});
