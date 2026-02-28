import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useSimpleStack } from '../../../navigation/SimpleStackContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/NotificationContext';
import { supabase } from '../../../lib/supabase';
import { useUserProfile } from '../../../hooks/useUserProfile';

function normalizePhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 15);
}

export default function ProfileAccountScreen() {
  const { goBack, navigate } = useSimpleStack();
  const { session } = useAuth();
  const toast = useToast();
  const { profile, loading, refetch } = useUserProfile();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const userExpandedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name ?? '');
      setLastName(profile.last_name ?? '');
      setPhone(profile.phone ?? '');
      setEmailConsent(!!profile.email_marketing_consent);
      setSmsConsent(!!profile.sms_marketing_consent);
    }
  }, [profile]);

  const hasValidProfile = Boolean(
    profile?.first_name?.trim() && profile?.last_name?.trim() && profile?.phone && String(profile.phone).replace(/\D/g, '').length >= 10
  );
  useEffect(() => {
    if (hasValidProfile && !userExpandedRef.current) setDetailsCollapsed(true);
  }, [hasValidProfile]);

  const saveConsent = async (email: boolean, sms: boolean, setEtkAccepted?: string | null) => {
    if (!supabase || !session?.user?.id) return;
    setConsentSaving(true);
    const payload: Record<string, unknown> = {
      email_marketing_consent: email,
      sms_marketing_consent: sms,
      marketing_consent_at: new Date().toISOString(),
    };
    if (setEtkAccepted !== undefined) payload.etk_accepted_at = setEtkAccepted;
    await supabase.from('users').update(payload).eq('id', session.user.id);
    setConsentSaving(false);
    refetch();
  };

  const handleEmailConsentChange = (v: boolean) => {
    if (v && !profile?.etk_accepted_at) {
      setEmailConsent(true);
      saveConsent(true, smsConsent, new Date().toISOString());
    } else {
      setEmailConsent(v);
      saveConsent(v, smsConsent, !smsConsent ? null : undefined);
    }
  };

  const handleSmsConsentChange = (v: boolean) => {
    if (v && !profile?.etk_accepted_at) {
      setSmsConsent(true);
      saveConsent(emailConsent, true, new Date().toISOString());
    } else {
      setSmsConsent(v);
      saveConsent(emailConsent, v, !emailConsent ? null : undefined);
    }
  };

  const handleSave = async () => {
    setFieldError(null);
    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = normalizePhone(phone);
    if (!fn) {
      setFieldError('Ad zorunludur.');
      return;
    }
    if (!ln) {
      setFieldError('Soyad zorunludur.');
      return;
    }
    if (ph.length < 10) {
      setFieldError('Geçerli bir telefon numarası girin (en az 10 rakam).');
      return;
    }
    if (!supabase || !session?.user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update({ first_name: fn, last_name: ln, phone: ph === '' ? null : ph })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    refetch();
    userExpandedRef.current = false;
    setDetailsCollapsed(true);
    toast.success('Profil bilgileriniz güncellendi.', 'Kaydedildi');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hesap</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {profile && (!(profile.first_name ?? '').trim() || !(profile.last_name ?? '').trim()) && !detailsCollapsed && (
          <View style={styles.emptyNameBanner}>
            <Text style={styles.emptyNameText}>Ad ve soyad bilginiz eksik. Lütfen aşağıdaki alanları doldurup kaydedin.</Text>
          </View>
        )}
        <View style={styles.card}>
          {detailsCollapsed && hasValidProfile ? (
            <View style={styles.detailsSummary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Ad Soyad</Text>
                <Text style={styles.summaryValue}>{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim() || '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Telefon</Text>
                <Text style={styles.summaryValue}>{profile?.phone ?? '—'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>E-posta</Text>
                <Text style={styles.summaryValue} numberOfLines={1}>{session?.user?.email ?? '—'}</Text>
              </View>
              <TouchableOpacity onPress={() => { userExpandedRef.current = true; setDetailsCollapsed(false); }} style={styles.summaryEditLink}>
                <Text style={styles.summaryEditLinkText}>Düzenle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Ad *</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Adınız"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>Soyad *</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Soyadınız"
                placeholderTextColor="#94a3b8"
                editable={!loading}
              />
              <Text style={styles.label}>Telefon *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(t) => setPhone(normalizePhone(t))}
                placeholder="5XX XXX XX XX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                maxLength={15}
                editable={!loading}
              />
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={session?.user?.email ?? ''}
                editable={false}
                placeholder="E-posta"
              />
              {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
              {loading ? (
                <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
              ) : (
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>KVKK</Text>
          <View style={styles.kvkkRow}>
            <TouchableOpacity onPress={() => navigate('LegalText', { legalKey: 'kvkk' })}>
              <Text style={styles.legalLink}>KVKK Aydınlatma Metni</Text>
            </TouchableOpacity>
            {profile?.kvkk_accepted_at ? (
              <View style={styles.kvkkBadge}>
                <Text style={styles.kvkkBadgeText}>Kabul edildi</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>İletişim tercihleri (ETK)</Text>
          <Text style={styles.hint}>Kampanya ve bilgilendirmeler için e-posta/SMS izinleri. Açtığınızda ETK metnini kabul etmiş sayılırsınız.</Text>
          <View style={styles.consentRow}>
            <Text style={styles.consentLabel}>E-posta ile ticari ileti</Text>
            <Switch
              value={emailConsent}
              onValueChange={handleEmailConsentChange}
              disabled={consentSaving}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={emailConsent ? '#15803d' : '#94a3b8'}
            />
          </View>
          <View style={styles.consentRow}>
            <Text style={styles.consentLabel}>SMS ile ticari ileti</Text>
            <Switch
              value={smsConsent}
              onValueChange={handleSmsConsentChange}
              disabled={consentSaving}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={smsConsent ? '#15803d' : '#94a3b8'}
            />
          </View>
          <TouchableOpacity onPress={() => navigate('LegalText', { legalKey: 'etk' })}>
            <Text style={styles.legalLink}>ETK / İletişim İzinleri metnini oku</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  scroll: { flex: 1 },
  detailsSummary: { paddingVertical: 4 },
  summaryRow: { marginBottom: 12 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 16, color: '#0f172a', lineHeight: 22 },
  summaryEditLink: { marginTop: 16, alignSelf: 'flex-start' },
  summaryEditLinkText: { fontSize: 16, color: '#15803d', fontWeight: '700' },
  content: { padding: 20, paddingBottom: 48 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  inputReadOnly: { backgroundColor: '#f8fafc', color: '#64748b' },
  fieldError: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  loader: { marginVertical: 8 },
  saveButton: { backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  saveButtonDisabled: { opacity: 0.7 },
  emptyNameBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  emptyNameText: { fontSize: 14, color: '#92400e' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  kvkkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  legalLink: { fontSize: 15, color: '#15803d', fontWeight: '500' },
  kvkkBadge: { backgroundColor: '#15803d', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  kvkkBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  consentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  consentLabel: { fontSize: 15, color: '#0f172a', flex: 1 },
});
