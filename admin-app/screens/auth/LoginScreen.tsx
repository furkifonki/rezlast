import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('E-posta ve şifre gerekli.');
      return;
    }
    setLoading(true);
    const { error: err } = await supabase?.auth.signInWithPassword({ email: email.trim(), password }) ?? { error: new Error('Supabase yok') };
    setLoading(false);
    if (err) {
      setError(err.message || 'Giriş başarısız.');
      return;
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Rezvio Admin</Text>
        <Text style={styles.subtitle}>Giriş yapın</Text>
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor="#71717a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#71717a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
          <Text style={styles.forgotText}>Şifremi unuttum</Text>
        </TouchableOpacity>
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Giriş Yap</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.linkWrap}>
          <Text style={styles.linkText}>Hesabınız yok mu? Kayıt ol</Text>
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
  forgotLink: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  linkWrap: { marginTop: 20, alignItems: 'center' },
  linkText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
});
