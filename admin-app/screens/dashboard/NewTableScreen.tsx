import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { MainStackParamList } from './MenuScreen';

type Business = { id: string; name: string };

const TABLE_TYPES = [
  { value: 'indoor', label: 'İç Mekân' },
  { value: 'outdoor', label: 'Dış Mekân' },
  { value: 'terrace', label: 'Teras' },
  { value: 'seaside', label: 'Deniz Kenarı' },
  { value: 'vip', label: 'VIP' },
  { value: 'bar', label: 'Bar' },
];

type Props = NativeStackScreenProps<MainStackParamList, 'NewTable'>;

export default function NewTableScreen({ navigation, route }: Props) {
  const businessIdFromParam = route.params?.businessId;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState(businessIdFromParam || '');
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState(2);
  const [floorNumber, setFloorNumber] = useState(1);
  const [tableType, setTableType] = useState('indoor');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
      const list = (data ?? []) as Business[];
      if (!cancelled) {
        setBusinesses(list);
        setBusinessId(businessIdFromParam && list.some((b) => b.id === businessIdFromParam) ? businessIdFromParam : (list[0]?.id || ''));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [businessIdFromParam]);

  const handleSave = async () => {
    if (!businessId || !tableNumber.trim()) {
      setError('İşletme ve masa numarası zorunludur.');
      return;
    }
    if (capacity < 1 || capacity > 99) {
      setError('Kapasite 1–99 arası olmalıdır.');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase!.from('tables').insert({
      business_id: businessId,
      table_number: tableNumber.trim(),
      capacity,
      floor_number: floorNumber,
      table_type: tableType || null,
      is_active: isActive,
    });
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
        <Text style={styles.emptyText}>Önce bir işletme eklemeniz gerekiyor.</Text>
        <TouchableOpacity onPress={() => navigation.navigate('BusinessesList')} style={styles.linkBtn}>
          <Text style={styles.linkText}>İşletmelerim →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.field}>
        <Text style={styles.label}>İşletme *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {businesses.map((b) => (
            <TouchableOpacity key={b.id} onPress={() => setBusinessId(b.id)} style={[styles.chip, businessId === b.id && styles.chipActive]}>
              <Text style={[styles.chipText, businessId === b.id && styles.chipTextActive]}>{b.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Masa numarası *</Text>
        <TextInput style={styles.input} value={tableNumber} onChangeText={setTableNumber} placeholder="Örn. 1, A1" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Kapasite (kişi) *</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={String(capacity)} onChangeText={(t) => setCapacity(Math.max(1, Math.min(99, Number(t) || 1)))} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Kat</Text>
        <TextInput style={styles.input} keyboardType="number-pad" value={String(floorNumber)} onChangeText={(t) => setFloorNumber(Math.max(1, Number(t) || 1))} />
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Alan tipi</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
          {TABLE_TYPES.map((t) => (
            <TouchableOpacity key={t.value} onPress={() => setTableType(t.value)} style={[styles.chip, tableType === t.value && styles.chipActive]}>
              <Text style={[styles.chipText, tableType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <TouchableOpacity style={styles.checkRow} onPress={() => setIsActive(!isActive)}>
        <View style={[styles.checkbox, isActive && styles.checkboxChecked]} />
        <Text style={styles.checkLabel}>Aktif</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 8, fontSize: 14, color: '#71717a' },
  emptyText: { fontSize: 15, color: '#52525b', textAlign: 'center' },
  linkBtn: { marginTop: 12 },
  linkText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
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
  saveBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
