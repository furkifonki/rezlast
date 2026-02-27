import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/NotificationContext';
import { supabase } from '../../lib/supabase';
import PointsInfoScreen from './PointsInfoScreen';
import HizmetlerScreen from './HizmetlerScreen';
import LegalTextScreen from './LegalTextScreen';

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  total_points: number;
  loyalty_level: string | null;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
  kvkk_accepted_at?: string | null;
  etk_accepted_at?: string | null;
};
type TxRow = { id: string; points: number; transaction_type: string; description: string | null; created_at: string; businesses: { name: string } | null };

function normalizePhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 15);
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const toast = useToast();
  const email = session?.user?.email ?? '';
  const [user, setUser] = useState<UserRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [activeSubScreen, setActiveSubScreen] = useState<'points' | 'hizmetler' | 'kvkk' | 'etk' | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [openEtkWithAcceptButton, setOpenEtkWithAcceptButton] = useState(false);
  const [pendingEmailConsent, setPendingEmailConsent] = useState(false);
  const [pendingSmsConsent, setPendingSmsConsent] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [uRes, txRes] = await Promise.all([
        supabase
          .from('users')
          .select('id, first_name, last_name, phone, total_points, loyalty_level, email_marketing_consent, sms_marketing_consent, kvkk_accepted_at, etk_accepted_at')
          .eq('id', session.user.id)
          .single(),
        supabase
          .from('loyalty_transactions')
          .select('id, points, transaction_type, description, created_at, businesses ( name )')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (uRes.data) {
        const u = uRes.data as UserRow;
        setUser(u);
        setFirstName(u.first_name ?? '');
        setLastName(u.last_name ?? '');
        setPhone(u.phone ?? '');
        setEmailConsent(!!u.email_marketing_consent);
        setSmsConsent(!!u.sms_marketing_consent);
      }
      setTransactions((txRes.data ?? []) as TxRow[]);
      setLoading(false);
    })();
  }, [session?.user?.id]);

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
    setUser((prev) => (prev ? { ...prev, first_name: fn, last_name: ln, phone: ph } : null));
    toast.success('Profil bilgileriniz güncellendi.', 'Kaydedildi');
  };

  const handleSignOut = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: signOut },
    ]);
  };

  const points = user?.total_points ?? 0;
  const level = user?.loyalty_level ?? 'bronze';
  const levelLabel = { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin' }[level] ?? level;

  const etkAcceptedAt = user?.etk_accepted_at ?? null;
  const kvkkAcceptedAt = user?.kvkk_accepted_at ?? null;

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
    setUser((prev) =>
      prev
        ? {
            ...prev,
            email_marketing_consent: email,
            sms_marketing_consent: sms,
            ...(setEtkAccepted !== undefined && { etk_accepted_at: setEtkAccepted }),
          }
        : null
    );
  };

  const handleEtkAccept = () => {
    setEmailConsent(pendingEmailConsent);
    setSmsConsent(pendingSmsConsent);
    saveConsent(pendingEmailConsent, pendingSmsConsent, new Date().toISOString());
    setPendingEmailConsent(false);
    setPendingSmsConsent(false);
    setOpenEtkWithAcceptButton(false);
    setActiveSubScreen(null);
  };

  if (activeSubScreen === 'points') {
    return <PointsInfoScreen onBack={() => setActiveSubScreen(null)} />;
  }
  if (activeSubScreen === 'hizmetler') {
    return <HizmetlerScreen onBack={() => setActiveSubScreen(null)} />;
  }
  if (activeSubScreen === 'kvkk') {
    return (
      <LegalTextScreen
        legalKey="kvkk"
        onBack={() => setActiveSubScreen(null)}
        showAcceptButton={false}
      />
    );
  }
  if (activeSubScreen === 'etk') {
    return (
      <LegalTextScreen
        legalKey="etk"
        onBack={() => {
          setOpenEtkWithAcceptButton(false);
          setActiveSubScreen(null);
        }}
        onAccept={handleEtkAccept}
        showAcceptButton={openEtkWithAcceptButton && !etkAcceptedAt}
      />
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil bilgileri</Text>
          <Text style={styles.hint}>Rezvio’da rezervasyon ve iletişim için ad, soyad ve telefon zorunludur.</Text>
          {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
          <Text style={styles.label}>Ad *</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Adınız"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
            editable={!loading}
          />
          <Text style={styles.label}>Soyad *</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Soyadınız"
            placeholderTextColor="#94a3b8"
            autoCapitalize="words"
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
          <TextInput style={[styles.input, styles.inputReadOnly]} value={email} editable={false} placeholder="E-posta" />
          {loading ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : (
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Özet</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : (
            <>
              <View style={styles.pointsRow}>
                <Text style={styles.pointsLabel}>Toplam puan</Text>
                <Text style={styles.pointsValue}>{points}</Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{levelLabel}</Text>
              </View>
              <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubScreen('points')}>
                <Text style={styles.linkText}>Puanlarımı nasıl kullanırım?</Text>
                <Text style={styles.linkArrow}>→</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hizmetler</Text>
          <Text style={styles.hint}>Rezvio ile neler yapabileceğinizi öğrenin.</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => setActiveSubScreen('hizmetler')}>
            <Text style={styles.linkText}>Hizmetler ve özellikler</Text>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>KVKK</Text>
          <View style={styles.kvkkRow}>
            <TouchableOpacity onPress={() => setActiveSubScreen('kvkk')}>
              <Text style={styles.legalLinkText}>KVKK Aydınlatma Metni</Text>
            </TouchableOpacity>
            <View style={styles.kvkkBadge}>
              <Text style={styles.kvkkBadgeText}>Kabul edildi</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>İletişim tercihleri (ETK)</Text>
          <Text style={styles.hint}>Kampanya ve bilgilendirmeler için e-posta/SMS izinleri (isteğe bağlı). Açtığınızda ETK metnini kabul etmeniz gerekir.</Text>
          <View style={styles.consentRow}>
            <Text style={styles.consentLabel}>E-posta ile ticari ileti</Text>
            <Switch
              value={emailConsent}
              onValueChange={(v) => {
                if (v) {
                  if (etkAcceptedAt) {
                    saveConsent(true, smsConsent);
                    setEmailConsent(true);
                  } else {
                    setPendingEmailConsent(true);
                    setPendingSmsConsent(smsConsent);
                    setOpenEtkWithAcceptButton(true);
                    setActiveSubScreen('etk');
                  }
                } else {
                  setEmailConsent(false);
                  saveConsent(false, smsConsent, !smsConsent ? null : undefined);
                }
              }}
              disabled={consentSaving}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={emailConsent ? '#15803d' : '#94a3b8'}
            />
          </View>
          <View style={styles.consentRow}>
            <Text style={styles.consentLabel}>SMS ile ticari ileti</Text>
            <Switch
              value={smsConsent}
              onValueChange={(v) => {
                if (v) {
                  if (etkAcceptedAt) {
                    saveConsent(emailConsent, true);
                    setSmsConsent(true);
                  } else {
                    setPendingEmailConsent(emailConsent);
                    setPendingSmsConsent(true);
                    setOpenEtkWithAcceptButton(true);
                    setActiveSubScreen('etk');
                  }
                } else {
                  setSmsConsent(false);
                  saveConsent(emailConsent, false, !emailConsent ? null : undefined);
                }
              }}
              disabled={consentSaving}
              trackColor={{ false: '#e2e8f0', true: '#86efac' }}
              thumbColor={smsConsent ? '#15803d' : '#94a3b8'}
            />
          </View>
          <TouchableOpacity onPress={() => { setOpenEtkWithAcceptButton(false); setActiveSubScreen('etk'); }} style={{ marginTop: 12 }}>
            <Text style={styles.legalLinkText}>ETK / İletişim İzinleri metnini oku</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Puan geçmişi</Text>
          {loading ? null : transactions.length === 0 ? (
            <Text style={styles.emptyText}>Henüz puan hareketi yok. Rezervasyon tamamlandıkça puan kazanırsınız.</Text>
          ) : (
            <View style={styles.txList}>
              {transactions.map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txDesc}>{tx.description || (tx.points > 0 ? 'Puan kazanıldı' : 'Puan kullanıldı')}</Text>
                    <Text style={styles.txBusiness}>{(tx.businesses as { name: string } | null)?.name ?? '—'}</Text>
                  </View>
                  <Text style={[styles.txPoints, tx.points >= 0 ? styles.txPointsPlus : styles.txPointsMinus]}>
                    {tx.points >= 0 ? '+' : ''}{tx.points}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  hint: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  fieldError: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
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
  loader: { marginVertical: 8 },
  saveButton: { backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  saveButtonDisabled: { opacity: 0.7 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pointsLabel: { fontSize: 14, color: '#64748b' },
  pointsValue: { fontSize: 20, fontWeight: '700', color: '#15803d' },
  levelBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  levelText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingVertical: 8 },
  linkText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  linkArrow: { fontSize: 16, color: '#15803d' },
  consentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  consentLabel: { fontSize: 15, color: '#0f172a' },
  kvkkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kvkkBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  kvkkBadgeText: { fontSize: 12, fontWeight: '600', color: '#15803d' },
  legalLinkText: { fontSize: 14, color: '#64748b', textDecorationLine: 'underline' },
  emptyText: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  txList: { marginTop: 4 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txLeft: { flex: 1 },
  txDesc: { fontSize: 14, color: '#0f172a' },
  txBusiness: { fontSize: 12, color: '#64748b', marginTop: 2 },
  txPoints: { fontSize: 15, fontWeight: '600' },
  txPointsPlus: { color: '#15803d' },
  txPointsMinus: { color: '#dc2626' },
  signOutButton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  signOutButtonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
});
