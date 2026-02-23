import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Props = {
  navigation: { navigate: (name: string) => void };
};

export default function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [showKvkkModal, setShowKvkkModal] = useState(false);
  const [kvkkText, setKvkkText] = useState<string | null>(null);

  useEffect(() => {
    if (!showKvkkModal || !supabase) return;
    supabase.from('app_legal_texts').select('body').eq('key', 'kvkk').single().then(({ data }) => {
      setKvkkText((data as { body?: string } | null)?.body ?? null);
    });
  }, [showKvkkModal]);

  const handleRegister = async () => {
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      Alert.alert('Hata', 'E-posta ve şifre girin.');
      return;
    }
    if (p.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalı.');
      return;
    }
    if (!kvkkAccepted) {
      Alert.alert('Zorunlu', 'Üyelik için KVKK aydınlatma metnini kabul etmeniz gerekmektedir.');
      return;
    }
    setLoading(true);
    const { error } = await signUp(e, p, fullName.trim() || undefined);
    if (error) {
      setLoading(false);
      Alert.alert('Kayıt hatası', error.message);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (userId && supabase) {
      const payload: Record<string, unknown> = {
        kvkk_accepted_at: new Date().toISOString(),
      };
      if (emailConsent || smsConsent) {
        payload.etk_accepted_at = new Date().toISOString();
        payload.email_marketing_consent = emailConsent;
        payload.sms_marketing_consent = smsConsent;
        payload.marketing_consent_at = new Date().toISOString();
      }
      await supabase.from('users').update(payload).eq('id', userId);
    }
    setLoading(false);
    Alert.alert(
      'Kayıt başarılı',
      'E-posta adresinize gelen link ile hesabınızı doğrulayabilirsiniz. (Doğrulama zorunlu değilse doğrudan giriş yapabilirsiniz.)',
      [{ text: 'Tamam' }]
    );
    navigation.navigate('Login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Boolean(false)}
      >
        <View style={styles.card}>
          <View style={styles.logoWrap}>
            <Image source={require('../../assets/icon.png')} style={styles.logo} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Kayıt Ol</Text>
          <Text style={styles.subtitle}>Yeni hesap oluşturun</Text>

          <TextInput
            style={styles.input}
            placeholder="Ad Soyad (opsiyonel)"
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
            editable={Boolean(!loading)}
          />
          <TextInput
            style={styles.input}
            placeholder="E-posta *"
            placeholderTextColor="#94a3b8"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={Boolean(!loading)}
          />
          <TextInput
            style={styles.input}
            placeholder="Şifre * (en az 6 karakter)"
            placeholderTextColor="#94a3b8"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            editable={Boolean(!loading)}
          />

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setKvkkAccepted(!kvkkAccepted)}
            disabled={loading}
          >
            <View style={[styles.checkbox, kvkkAccepted && styles.checkboxChecked]}>
              {kvkkAccepted ? <Text style={styles.checkIcon}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>
              <Text style={styles.checkRequired}>* </Text>
              KVKK aydınlatma metnini okudum ve kabul ediyorum.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowKvkkModal(true)} style={styles.inlineLink}>
            <Text style={styles.linkText}>KVKK metnini oku</Text>
          </TouchableOpacity>

          <Text style={styles.optLabel}>İsteğe bağlı iletişim izinleri (ETK):</Text>
          <TouchableOpacity style={styles.checkRow} onPress={() => setEmailConsent(!emailConsent)} disabled={loading}>
            <View style={[styles.checkbox, emailConsent && styles.checkboxChecked]}>
              {emailConsent ? <Text style={styles.checkIcon}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>E-posta ile ticari ileti almak istiyorum</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.checkRow} onPress={() => setSmsConsent(!smsConsent)} disabled={loading}>
            <View style={[styles.checkbox, smsConsent && styles.checkboxChecked]}>
              {smsConsent ? <Text style={styles.checkIcon}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>SMS ile ticari ileti almak istiyorum</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={Boolean(loading)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.link}
            onPress={() => navigation.navigate('Login')}
            disabled={Boolean(loading)}
          >
            <Text style={styles.linkText}>Zaten hesabınız var mı? Giriş yapın</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showKvkkModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalTitle}>KVKK Aydınlatma Metni</Text>
              <Text style={styles.modalBody}>{kvkkText ?? 'Yükleniyor...'}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setShowKvkkModal(false)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 40,
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
  },
  logoWrap: { alignItems: 'center', marginBottom: 16 },
  logo: { width: 72, height: 72 },
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
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#94a3b8', borderRadius: 6, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#15803d', borderColor: '#15803d' },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkLabel: { flex: 1, fontSize: 14, color: '#0f172a' },
  checkRequired: { color: '#dc2626' },
  inlineLink: { marginBottom: 16 },
  optLabel: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  link: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    color: '#15803d',
    fontSize: 14,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%', padding: 20 },
  modalScroll: { maxHeight: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  modalBody: { fontSize: 14, color: '#475569', lineHeight: 22 },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: '#15803d' },
});
