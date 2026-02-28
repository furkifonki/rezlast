import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'NewService'>;

type Business = { id: string; name: string };

const DURATION_OPTIONS: { value: 'no_limit' | 'all_day' | 'all_evening' | 'minutes'; label: string }[] = [
  { value: 'no_limit', label: 'Süre sınırı yok' },
  { value: 'all_day', label: 'Tüm gün' },
  { value: 'all_evening', label: 'Tüm akşam' },
  { value: 'minutes', label: 'Belirli süre (dakika)' },
];

export default function NewServiceScreen() {
  const navigation = useNavigation<Nav>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_id: '',
    name: '',
    description: '',
    duration_type: 'minutes' as 'no_limit' | 'all_day' | 'all_evening' | 'minutes',
    duration_minutes: 30,
    price: '' as string,
    is_active: true,
  });
  const [businessSearch, setBusinessSearch] = useState('');

  const filteredBusinesses = useMemo(() => {
    const q = businessSearch.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, businessSearch]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
      if (!cancelled) {
        setBusinesses((data ?? []) as Business[]);
        if (data?.length) setForm((f) => ({ ...f, business_id: data[0].id }));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async () => {
    setError(null);
    if (!form.business_id || !form.name.trim()) {
      setError('İşletme ve hizmet adı zorunludur.');
      return;
    }
    setSaving(true);
    const priceNum = form.price.trim() === '' ? null : parseFloat(form.price.replace(',', '.'));
    const isTimed = form.duration_type === 'minutes';
    const duration_minutes = isTimed ? Math.max(1, form.duration_minutes) : 0;
    const duration_display = isTimed ? null : form.duration_type;
    const { error: err } = await supabase?.from('services').insert({
      business_id: form.business_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes,
      duration_display,
      price: priceNum,
      is_active: form.is_active,
    }) ?? { error: { message: 'Supabase yok' } };
    setSaving(false);
    if (err) setError(err.message);
    else navigation.goBack();
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
    );
  }
  if (businesses.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Önce bir işletme ekleyin.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>Geri</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.label}>İşletme *</Text>
        <TextInput style={styles.searchInput} value={businessSearch} onChangeText={setBusinessSearch} placeholder="İşletme ara..." placeholderTextColor="#a1a1aa" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {filteredBusinesses.map((b) => (
              <TouchableOpacity key={b.id} style={[styles.chip, form.business_id === b.id && styles.chipActive]} onPress={() => setForm((f) => ({ ...f, business_id: b.id }))}>
                <Text style={[styles.chipText, form.business_id === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Hizmet adı *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Örn: Saç kesimi" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Açıklama</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Opsiyonel" placeholderTextColor="#a1a1aa" multiline numberOfLines={2} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Süre *</Text>
        {DURATION_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={[styles.optRow, form.duration_type === opt.value && styles.optRowActive]} onPress={() => setForm((f) => ({ ...f, duration_type: opt.value }))}>
            <Text style={[styles.optText, form.duration_type === opt.value && styles.optTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        {form.duration_type === 'minutes' && (
          <TextInput
            style={styles.input}
            value={String(form.duration_minutes)}
            onChangeText={(v) => setForm((f) => ({ ...f, duration_minutes: Math.max(1, parseInt(v, 10) || 30) }))}
            placeholder="30"
            placeholderTextColor="#a1a1aa"
            keyboardType="number-pad"
          />
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Fiyat (₺)</Text>
        <TextInput style={styles.input} value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} placeholder="Opsiyonel" placeholderTextColor="#a1a1aa" keyboardType="decimal-pad" />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>Aktif</Text>
        <Switch value={form.is_active} onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))} trackColor={{ false: '#d4d4d8', true: '#86efac' }} thumbColor={form.is_active ? '#15803d' : '#f4f4f5'} />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>İptal</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 6, textTransform: 'uppercase' },
  searchInput: { backgroundColor: '#f4f4f5', borderRadius: 10, padding: 12, fontSize: 15, color: '#18181b', marginBottom: 10 },
  input: { backgroundColor: '#f4f4f5', borderRadius: 10, padding: 12, fontSize: 16, color: '#18181b' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7', maxWidth: 160 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 13, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  optRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  optRowActive: { backgroundColor: '#f0fdf4' },
  optText: { fontSize: 15, color: '#18181b' },
  optTextActive: { fontWeight: '600', color: '#15803d' },
  submitBtn: { backgroundColor: '#15803d', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: '#71717a' },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { fontSize: 16, color: '#15803d' },
});
