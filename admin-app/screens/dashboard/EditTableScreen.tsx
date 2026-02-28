import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { MainStackParamList } from './MenuScreen';

type Business = { id: string; name: string };
type TableForm = {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  floor_number: number;
  table_type: string | null;
  is_active: boolean;
};

const TABLE_TYPES = [
  { value: 'indoor', label: 'İç Mekân' },
  { value: 'outdoor', label: 'Dış Mekân' },
  { value: 'terrace', label: 'Teras' },
  { value: 'seaside', label: 'Deniz Kenarı' },
  { value: 'vip', label: 'VIP' },
  { value: 'bar', label: 'Bar' },
];

type Props = NativeStackScreenProps<MainStackParamList, 'EditTable'>;

export default function EditTableScreen({ navigation, route }: Props) {
  const { tableId } = route.params;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState<TableForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase || !tableId) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const [tRes, bRes] = await Promise.all([
        supabase.from('tables').select('*').eq('id', tableId).single(),
        supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name'),
      ]);
      if (!cancelled) {
        if (tRes.data) setForm(tRes.data as TableForm);
        setBusinesses((bRes.data ?? []) as Business[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tableId]);

  const handleSave = async () => {
    if (!form || !supabase) return;
    if (!form.business_id || !form.table_number.trim()) {
      setError('İşletme ve masa numarası zorunludur.');
      return;
    }
    if (form.capacity < 1 || form.capacity > 99) {
      setError('Kapasite 1–99 arası olmalıdır.');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('tables').update({
      business_id: form.business_id,
      table_number: form.table_number.trim(),
      capacity: form.capacity,
      floor_number: form.floor_number,
      table_type: form.table_type || null,
      is_active: form.is_active,
    }).eq('id', tableId);
    setSaving(false);
    if (err) setError(err.message);
    else navigation.goBack();
  };

  const handleDelete = () => {
    Alert.alert('Masayı sil', 'Bu masayı silmek istediğinize emin misiniz? Bu masaya ait rezervasyon varsa silinemez.', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        if (!supabase) return;
        const { error: err } = await supabase.from('tables').delete().eq('id', tableId);
        if (err) setError(err.message || 'Silinemedi. Bu masaya ait rezervasyon olabilir.');
        else navigation.goBack();
      }},
    ]);
  };

  if (loading || !form) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.field}>
        <Text style={styles.label}>İşletme *</Text>
        <View style={styles.chipRow}>
          {businesses.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => setForm((f) => f ? { ...f, business_id: b.id } : f)} style={[styles.chip, form.business_id === b.id && styles.chipActive]}>
              <Text style={[styles.chipText, form.business_id === b.id && styles.chipTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Masa numarası *</Text>
        <TextInput style={styles.input} value={form.table_number} onChangeText={(t) => setForm((f) => f ? { ...f, table_number: t } : f)} placeholder="Örn. 1" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Kapasite (kişi) *</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={String(form.capacity)} onChangeText={(t) => setForm((f) => f ? { ...f, capacity: Math.max(1, Math.min(99, Number(t) || 1)) } : f)} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Kat</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={String(form.floor_number)} onChangeText={(t) => setForm((f) => f ? { ...f, floor_number: Math.max(1, Number(t) || 1) } : f)} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Alan tipi</Text>
        <View style={styles.chipRow}>
          {TABLE_TYPES.map((t) => (
            <TouchableOpacity key={t.value} onPress={() => setForm((f) => f ? { ...f, table_type: t.value } : f)} style={[styles.chip, (form.table_type || 'indoor') === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, (form.table_type || 'indoor') === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <TouchableOpacity style={styles.checkRow} onPress={() => setForm((f) => f ? { ...f, is_active: !f.is_active } : f)}>
        <View style={[styles.checkbox, form.is_active && styles.checkboxChecked]} />
        <Text style={styles.checkLabel}>Aktif</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>Masayı sil</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, fontSize: 14, color: '#71717a' },
  errorBox: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fecaca' },
  errorText: { fontSize: 14, color: '#b91c1c' },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, color: '#18181b', borderWidth: 1, borderColor: '#e4e4e7' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e4e7', marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d4d4d8', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#15803d', borderColor: '#15803d' },
  checkLabel: { fontSize: 15, color: '#374151' },
  saveBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  deleteBtn: { padding: 16, alignItems: 'center' },
  deleteBtnText: { fontSize: 15, color: '#b91c1c', fontWeight: '500' },
});
