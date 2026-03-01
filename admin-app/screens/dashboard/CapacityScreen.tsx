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

export default function CapacityScreen() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [capacityTables, setCapacityTables] = useState('');
  const [slotDuration, setSlotDuration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredBusinesses = searchLower
    ? businesses.filter((b) => b.name.toLowerCase().includes(searchLower))
    : businesses;

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
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
    if (!selectedBusinessId || !supabase) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('businesses')
        .select('capacity_tables, slot_duration_minutes')
        .eq('id', selectedBusinessId)
        .single();
      if (!cancelled && data) {
        const row = data as { capacity_tables?: number; slot_duration_minutes?: number };
        setCapacityTables(String(row.capacity_tables ?? 0));
        setSlotDuration(String(row.slot_duration_minutes ?? 90));
      }
    })();
    return () => { cancelled = true; };
  }, [selectedBusinessId]);

  const handleSave = async () => {
    if (!supabase || !selectedBusinessId) return;
    const cap = parseInt(capacityTables, 10);
    const slot = parseInt(slotDuration, 10);
    if (Number.isNaN(cap) || cap < 0) {
      setError('Toplam kapasite 0 veya pozitif bir sayı olmalı.');
      return;
    }
    if (Number.isNaN(slot) || slot < 15 || slot > 480) {
      setError('Slot süresi 15–480 dakika arası olmalı.');
      return;
    }
    setError(null);
    setSuccess(false);
    setSaving(true);
    const { error: err } = await supabase
      .from('businesses')
      .update({
        capacity_tables: cap,
        slot_duration_minutes: slot,
        capacity_enabled: cap > 0,
      })
      .eq('id', selectedBusinessId);
    setSaving(false);
    if (err) setError(err.message);
    else setSuccess(true);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (businesses.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Önce bir işletme ekleyin.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.desc}>Onaylanan rezervasyonlar kapasiteden düşer. Toplam kapasite ve slot süresini işletme bazında belirleyin.</Text>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>Kaydedildi.</Text></View> : null}

      <Text style={styles.label}>İşletme</Text>
      <TextInput
        style={styles.searchInput}
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="İşletme ara..."
        placeholderTextColor="#a1a1aa"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {filteredBusinesses.map((b) => (
          <TouchableOpacity
            key={b.id}
            style={[styles.chip, selectedBusinessId === b.id && styles.chipActive]}
            onPress={() => setSelectedBusinessId(b.id)}
          >
            <Text style={[styles.chipText, selectedBusinessId === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Toplam kapasite (masa sayısı)</Text>
      <TextInput
        style={styles.input}
        value={capacityTables}
        onChangeText={setCapacityTables}
        placeholder="Örn. 10"
        placeholderTextColor="#a1a1aa"
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>Aynı zaman diliminde en fazla bu kadar onaylı rezervasyon olabilir.</Text>

      <Text style={styles.label}>Slot süresi (dakika)</Text>
      <TextInput
        style={styles.input}
        value={slotDuration}
        onChangeText={setSlotDuration}
        placeholder="Örn. 90"
        placeholderTextColor="#a1a1aa"
        keyboardType="number-pad"
      />
      <Text style={styles.hint}>Her rezervasyonun süresi (15–480 dk).</Text>

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  hint: { fontSize: 12, color: '#71717a', marginBottom: 16 },
  desc: { fontSize: 14, color: '#52525b', marginBottom: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  successBox: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 8, padding: 12, marginBottom: 16 },
  successText: { fontSize: 14, color: '#166534' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  searchInput: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#18181b', marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7' },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#18181b', marginBottom: 6 },
  saveBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
