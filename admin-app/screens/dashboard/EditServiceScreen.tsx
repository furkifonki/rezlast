import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'EditService'>;

type Business = { id: string; name: string };
type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  duration_display?: string | null;
  price: number | null;
  is_active: boolean;
};

const DURATION_OPTIONS: { value: 'no_limit' | 'all_day' | 'all_evening' | 'minutes'; label: string }[] = [
  { value: 'no_limit', label: 'Süre sınırı yok' },
  { value: 'all_day', label: 'Tüm gün' },
  { value: 'all_evening', label: 'Tüm akşam' },
  { value: 'minutes', label: 'Belirli süre (dakika)' },
];

type FormState = ServiceRow & { duration_type: 'no_limit' | 'all_day' | 'all_evening' | 'minutes' };

export default function EditServiceScreen({ route, navigation }: Props) {
  const { serviceId } = route.params;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!serviceId || !supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const [sRes, bRes] = await Promise.all([
        supabase.from('services').select('*').eq('id', serviceId).single(),
        supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name'),
      ]);
      if (!cancelled) {
        setBusinesses((bRes.data ?? []) as Business[]);
        if (sRes.data) {
          const row = sRes.data as ServiceRow;
          const duration_type = (row.duration_minutes === 0 && row.duration_display)
            ? (row.duration_display as FormState['duration_type'])
            : 'minutes';
          setForm({
            ...row,
            duration_type,
            duration_minutes: row.duration_minutes > 0 ? row.duration_minutes : 30,
          });
        } else setError(sRes.error?.message ?? 'Hizmet bulunamadı.');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [serviceId]);

  useEffect(() => {
    navigation.setOptions({ title: form ? `Düzenle: ${form.name}` : 'Hizmet Düzenle' });
  }, [form?.name, navigation]);

  const handleSubmit = async () => {
    if (!form || !supabase) return;
    setError(null);
    setSuccess(null);
    if (!form.name.trim()) { setError('Hizmet adı zorunludur.'); return; }
    setSaving(true);
    const isTimed = form.duration_type === 'minutes';
    const duration_minutes = isTimed ? Math.max(1, form.duration_minutes) : 0;
    const duration_display = isTimed ? null : form.duration_type;
    const { error: err } = await supabase
      .from('services')
      .update({
        business_id: form.business_id,
        name: form.name.trim(),
        description: form.description?.trim() || null,
        duration_minutes,
        duration_display,
        price: form.price != null ? form.price : null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceId);
    setSaving(false);
    if (err) setError(err.message);
    else {
      setSuccess('Kaydedildi.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleDelete = () => {
    Alert.alert('Hizmeti sil', 'Bu hizmeti silmek istediğinize emin misiniz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!supabase) return;
          setSaving(true);
          const { error: err } = await supabase.from('services').delete().eq('id', serviceId);
          setSaving(false);
          if (err) setError(err.message);
          else navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
    );
  }
  if (error && !form) {
    return (
      <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}><Text style={styles.backBtnText}>Geri</Text></TouchableOpacity></View>
    );
  }
  if (!form) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.label}>İşletme *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {businesses.map((b) => (
              <TouchableOpacity key={b.id} style={[styles.chip, form.business_id === b.id && styles.chipActive]} onPress={() => setForm((f) => (f ? { ...f, business_id: b.id } : f))}>
                <Text style={[styles.chipText, form.business_id === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Hizmet adı *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))} placeholder="Hizmet adı" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Açıklama</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.description ?? ''} onChangeText={(v) => setForm((f) => (f ? { ...f, description: v || null } : f))} placeholder="Opsiyonel" placeholderTextColor="#a1a1aa" multiline numberOfLines={2} />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Süre *</Text>
        {DURATION_OPTIONS.map((opt) => (
          <TouchableOpacity key={opt.value} style={[styles.optRow, form.duration_type === opt.value && styles.optRowActive]} onPress={() => setForm((f) => (f ? { ...f, duration_type: opt.value } : f))}>
            <Text style={[styles.optText, form.duration_type === opt.value && styles.optTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
        {form.duration_type === 'minutes' && (
          <TextInput
            style={styles.input}
            value={String(form.duration_minutes)}
            onChangeText={(v) => setForm((f) => (f ? { ...f, duration_minutes: Math.max(1, parseInt(v, 10) || 30) } : f))}
            placeholder="30"
            placeholderTextColor="#a1a1aa"
            keyboardType="number-pad"
          />
        )}
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Fiyat (₺)</Text>
        <TextInput
          style={styles.input}
          value={form.price != null ? String(form.price) : ''}
          onChangeText={(v) => setForm((f) => (f ? { ...f, price: v === '' ? null : parseFloat(v.replace(',', '.')) || 0 } : f))}
          placeholder="Opsiyonel"
          placeholderTextColor="#a1a1aa"
          keyboardType="decimal-pad"
        />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>Aktif</Text>
        <Switch value={form.is_active} onValueChange={(v) => setForm((f) => (f ? { ...f, is_active: v } : f))} trackColor={{ false: '#d4d4d8', true: '#86efac' }} thumbColor={form.is_active ? '#15803d' : '#f4f4f5'} />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} disabled={saving}>
        <Text style={styles.deleteBtnText}>Hizmeti sil</Text>
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
  successBox: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 12, marginBottom: 16 },
  successText: { fontSize: 14, color: '#166534' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 6, textTransform: 'uppercase' },
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
  deleteBtn: { marginTop: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f87171', borderRadius: 10 },
  deleteBtnText: { fontSize: 16, fontWeight: '600', color: '#b91c1c' },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: '#71717a' },
  backBtn: { marginTop: 16, padding: 12 },
  backBtnText: { fontSize: 16, color: '#15803d' },
});
