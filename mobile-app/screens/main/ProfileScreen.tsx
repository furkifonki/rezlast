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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type UserRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  total_points: number;
  loyalty_level: string | null;
};
type TxRow = { id: string; points: number; transaction_type: string; description: string | null; created_at: string; businesses: { name: string } | null };

function normalizePhone(v: string): string {
  return v.replace(/\D/g, '').slice(0, 15);
}

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? '';
  const [user, setUser] = useState<UserRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);

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
          .select('id, first_name, last_name, phone, total_points, loyalty_level')
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
      Alert.alert('Hata', error.message);
      return;
    }
    setUser((prev) => (prev ? { ...prev, first_name: fn, last_name: ln, phone: ph } : null));
    Alert.alert('Kaydedildi', 'Profil bilgileriniz güncellendi.');
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

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Profil bilgileri</Text>
          <Text style={styles.hint}>Rezervasyon ve iletişim için ad, soyad ve telefon zorunludur.</Text>
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
            </>
          )}
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
