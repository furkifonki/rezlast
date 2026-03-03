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
type CapacityRule = { day_of_week: number; capacity_tables: number | null; slot_duration_minutes: number | null; is_closed: boolean };
const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export default function CapacityScreen() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [capacityTables, setCapacityTables] = useState('');
  const [slotDuration, setSlotDuration] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rules, setRules] = useState<CapacityRule[]>(() =>
    DAY_NAMES.map((_, i) => ({ day_of_week: i, capacity_tables: null, slot_duration_minutes: null, is_closed: false }))
  );

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
      const [{ data }, { data: ruleRows }] = await Promise.all([
        supabase
          .from('businesses')
          .select('capacity_tables, slot_duration_minutes')
          .eq('id', selectedBusinessId)
          .single(),
        supabase
          .from('business_capacity_rules')
          .select('day_of_week, capacity_tables, slot_duration_minutes, is_closed')
          .eq('business_id', selectedBusinessId)
          .order('day_of_week'),
      ]);
      if (!cancelled && data) {
        const row = data as { capacity_tables?: number; slot_duration_minutes?: number };
        setCapacityTables(String(row.capacity_tables ?? 0));
        setSlotDuration(String(row.slot_duration_minutes ?? 90));
      }
      if (!cancelled) {
        const map = new Map<number, CapacityRule>();
        (ruleRows ?? []).forEach((r: any) => {
          map.set(r.day_of_week, {
            day_of_week: r.day_of_week,
            capacity_tables: r.capacity_tables ?? null,
            slot_duration_minutes: r.slot_duration_minutes ?? null,
            is_closed: !!r.is_closed,
          });
        });
        setRules(
          DAY_NAMES.map((_, i) =>
            map.get(i) ?? { day_of_week: i, capacity_tables: null, slot_duration_minutes: null, is_closed: false }
          )
        );
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

  const handleRuleChange = (day: number, patch: Partial<CapacityRule>) => {
    setRules((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const handleSaveRules = async () => {
    if (!supabase || !selectedBusinessId) return;
    setError(null);
    setSuccess(false);
    setSavingRules(true);
    for (const r of rules) {
      const hasValues =
        r.capacity_tables !== null || r.slot_duration_minutes !== null || r.is_closed;
      if (!hasValues) {
        await supabase
          .from('business_capacity_rules')
          .delete()
          .eq('business_id', selectedBusinessId)
          .eq('day_of_week', r.day_of_week);
        continue;
      }
      const payload = {
        business_id: selectedBusinessId,
        day_of_week: r.day_of_week,
        capacity_tables: r.capacity_tables,
        slot_duration_minutes: r.slot_duration_minutes,
        is_closed: r.is_closed,
      };
      const { error: err } = await supabase
        .from('business_capacity_rules')
        .upsert(payload, { onConflict: 'business_id,day_of_week' });
      if (err) {
        setError(err.message);
        setSavingRules(false);
        return;
      }
    }
    setSavingRules(false);
    setSuccess(true);
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

      <Text style={[styles.label, { marginTop: 16 }]}>Haftalık kapasite kuralları (opsiyonel)</Text>
      <Text style={[styles.hint, { marginBottom: 8 }]}>
        Buradaki değerler sadece ilgili gün için geçerli olur. Boş bırakılan günler yukarıdaki genel kapasite ve slot süresini kullanır.
      </Text>
      {rules.map((r) => (
        <View key={r.day_of_week} style={styles.ruleRow}>
          <View style={{ flex: 1.2 }}>
            <Text style={styles.ruleDay}>{DAY_NAMES[r.day_of_week]}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.ruleCheckboxRow}>
              <Text style={styles.ruleLabelSmall}>Kapalı</Text>
              <TouchableOpacity
                onPress={() => handleRuleChange(r.day_of_week, { is_closed: !r.is_closed })}
                style={[
                  styles.ruleCheckbox,
                  r.is_closed && styles.ruleCheckboxActive,
                ]}
              >
                {r.is_closed && <Text style={styles.ruleCheckboxMark}>✓</Text>}
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleLabelSmall}>Kapasite</Text>
            <TextInput
              style={styles.ruleInput}
              value={r.capacity_tables !== null ? String(r.capacity_tables) : ''}
              onChangeText={(txt) =>
                handleRuleChange(r.day_of_week, {
                  capacity_tables: txt === '' ? null : Number(txt) || 0,
                })
              }
              placeholder="-"
              placeholderTextColor="#a1a1aa"
              keyboardType="number-pad"
              editable={!r.is_closed}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ruleLabelSmall}>Süre (dk)</Text>
            <TextInput
              style={styles.ruleInput}
              value={r.slot_duration_minutes !== null ? String(r.slot_duration_minutes) : ''}
              onChangeText={(txt) =>
                handleRuleChange(r.day_of_week, {
                  slot_duration_minutes: txt === '' ? null : Number(txt) || 0,
                })
              }
              placeholder="-"
              placeholderTextColor="#a1a1aa"
              keyboardType="number-pad"
              editable={!r.is_closed}
            />
          </View>
        </View>
      ))}

      <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Genel kapasiteyi kaydet</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={[styles.saveBtnSecondary, savingRules && styles.saveBtnDisabled]} onPress={handleSaveRules} disabled={savingRules}>
        {savingRules ? <ActivityIndicator color="#15803d" /> : <Text style={styles.saveBtnSecondaryText}>Gün bazlı kuralları kaydet</Text>}
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
  saveBtnSecondary: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: '#15803d', backgroundColor: '#ecfdf3' },
  saveBtnSecondaryText: { fontSize: 15, fontWeight: '600', color: '#15803d' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  ruleDay: { fontSize: 13, fontWeight: '500', color: '#111827' },
  ruleLabelSmall: { fontSize: 11, color: '#6b7280', marginBottom: 2 },
  ruleInput: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, fontSize: 13, color: '#111827' },
  ruleCheckboxRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleCheckbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#d4d4d8', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  ruleCheckboxActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  ruleCheckboxMark: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
