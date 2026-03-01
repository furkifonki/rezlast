import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Business = { id: string; name: string };
type Customer = { user_id: string; customer_email: string | null; customer_name: string | null; total_points: number };

export default function LoyaltyScreen() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name');
      const list = (data ?? []) as Business[];
      setBusinesses(list);
      if (list.length > 0 && !selectedBusinessId) setSelectedBusinessId(list[0].id);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedBusinessId || !supabase) {
      setCustomers([]);
      setSelectedUserId('');
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_business_customers_with_points', {
        p_business_id: selectedBusinessId,
      });
      if (!cancelled) {
        const rows = (data ?? []) as Customer[];
        setCustomers(rows);
        setSelectedUserId('');
      }
    })();
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  const handleSubmit = async () => {
    setError(null);
    setSuccess(null);
    const pts = parseInt(points, 10);
    if (Number.isNaN(pts) || pts === 0) {
      setError('Geçerli bir puan girin (pozitif ekler, negatif düşer).');
      return;
    }
    if (!selectedUserId || !selectedBusinessId || !supabase) {
      setError('İşletme ve müşteri seçin.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.from('loyalty_transactions').insert({
      user_id: selectedUserId,
      business_id: selectedBusinessId,
      reservation_id: null,
      points: pts,
      transaction_type: pts > 0 ? 'manual_add' : 'manual_deduct',
      description: description.trim() || (pts > 0 ? 'Manuel puan ekleme' : 'Manuel puan düşme'),
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccess(pts > 0 ? `${pts} puan eklendi.` : `${Math.abs(pts)} puan düşüldü.`);
    setPoints('');
    setDescription('');
    const { data } = await supabase.rpc('get_business_customers_with_points', {
      p_business_id: selectedBusinessId,
    });
    setCustomers((data ?? []) as Customer[]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.desc}>
        Müşterilerin puan bakiyesini görün; manuel puan ekleyebilir veya düşebilirsiniz (indirimde kullandığında negatif girin).
      </Text>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Nasıl kullanılır?</Text>
        <Text style={styles.infoText}>• İşletme ve müşteri seçin; müşterinin güncel puan bakiyesi yanında gösterilir.</Text>
        <Text style={styles.infoText}>• Puan eklemek: Pozitif sayı girin (örn. kampanya bonusu).</Text>
        <Text style={styles.infoText}>• Puan düşmek: Negatif sayı girin (müşteri indirimde puan harcadığında).</Text>
      </View>

      {businesses.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Önce bir işletme ekleyin. Menüden İşletmelerim ile ekleyebilirsiniz.</Text>
        </View>
      ) : (
        <View style={styles.form}>
          {error ? (
            <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>
          ) : null}
          {success ? (
            <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View>
          ) : null}

          <Text style={styles.label}>İşletme</Text>
          <View style={styles.pickerWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {businesses.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, selectedBusinessId === b.id && styles.chipActive]}
                  onPress={() => setSelectedBusinessId(b.id)}
                >
                  <Text style={[styles.chipText, selectedBusinessId === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={styles.label}>Müşteri (Ad Soyad · E-posta — Puan)</Text>
          <View style={styles.pickerWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {customers.map((c) => {
                const name = (c.customer_name || '').trim() || '—';
                const email = (c.customer_email || '').trim() || '—';
                const label = `${name} · ${email} — ${c.total_points} puan`;
                return (
                  <TouchableOpacity
                    key={c.user_id}
                    style={[styles.chip, selectedUserId === c.user_id && styles.chipActive]}
                    onPress={() => setSelectedUserId(c.user_id)}
                  >
                    <Text style={[styles.chipText, selectedUserId === c.user_id && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          {selectedUserId ? (() => {
            const c = customers.find((x) => x.user_id === selectedUserId);
            return c ? (
              <Text style={styles.hint}>Güncel bakiye: <Text style={styles.hintBold}>{c.total_points} puan</Text></Text>
            ) : null;
          })() : null}
          {customers.length === 0 && selectedBusinessId ? (
            <Text style={styles.hint}>Bu işletmede henüz rezervasyon yapan müşteri yok.</Text>
          ) : null}

          <Text style={styles.label}>Puan</Text>
          <TextInput
            style={styles.input}
            value={points}
            onChangeText={setPoints}
            placeholder="Örn. 50 veya -20"
            placeholderTextColor="#a1a1aa"
            keyboardType="numeric"
          />
          <Text style={styles.hint}>Pozitif = ekleme, negatif = düşme.</Text>

          <Text style={styles.label}>Açıklama (opsiyonel)</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Örn. Kampanya bonusu"
            placeholderTextColor="#a1a1aa"
          />

          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !selectedUserId}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Uygula</Text>}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  desc: { fontSize: 14, color: '#71717a', marginBottom: 16 },
  infoBox: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', borderRadius: 12, padding: 14, marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: '600', color: '#92400e', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#78350f', marginBottom: 2 },
  emptyBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e4e4e7' },
  emptyText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
  form: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e4e4e7' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  successBox: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 8, padding: 12, marginBottom: 16 },
  successText: { fontSize: 14, color: '#166534' },
  label: { fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 },
  pickerWrap: { marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7', marginRight: 8, marginBottom: 4 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b', maxWidth: 200 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 12, color: '#71717a', marginBottom: 16 },
  hintBold: { fontWeight: '700', color: '#18181b' },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#18181b', marginBottom: 8 },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
