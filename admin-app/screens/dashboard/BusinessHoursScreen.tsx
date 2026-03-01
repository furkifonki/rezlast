import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'BusinessHours'>;

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

type Row = {
  day_of_week: number;
  dayName: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
};

const defaultRow = (day: number): Row => ({
  day_of_week: day,
  dayName: DAY_NAMES[day],
  is_closed: day === 0,
  open_time: '09:00',
  close_time: '18:00',
  break_start: '',
  break_end: '',
});

export default function BusinessHoursScreen({ route, navigation }: Props) {
  const { businessId } = route.params;
  const [businessName, setBusinessName] = useState('');
  const [rows, setRows] = useState<Row[]>(() => DAY_NAMES.map((_, i) => defaultRow(i)));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !businessId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const [bRes, hRes] = await Promise.all([
        supabase.from('businesses').select('name').eq('id', businessId).eq('owner_id', user.id).single(),
        supabase.from('business_hours').select('*').eq('business_id', businessId).order('day_of_week'),
      ]);
      if (cancelled) return;
      if (bRes.data) setBusinessName((bRes.data as { name: string }).name);
      const hours = (hRes.data ?? []) as { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null; break_start: string | null; break_end: string | null }[];
      if (hours.length > 0) {
        const map = new Map(hours.map((h) => [h.day_of_week, h]));
        setRows(
          DAY_NAMES.map((_, day) => {
            const h = map.get(day);
            if (!h) return { ...defaultRow(day), dayName: DAY_NAMES[day] };
            const toStr = (t: string | null) => (t ? String(t).slice(0, 5) : '');
            return {
              day_of_week: day,
              dayName: DAY_NAMES[day],
              is_closed: h.is_closed ?? false,
              open_time: toStr(h.open_time) || '09:00',
              close_time: toStr(h.close_time) || '18:00',
              break_start: toStr(h.break_start),
              break_end: toStr(h.break_end),
            };
          })
        );
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [businessId]);

  React.useEffect(() => {
    navigation.setOptions({ title: businessName ? `Çalışma saatleri · ${businessName}` : 'Çalışma saatleri' });
  }, [businessName, navigation]);

  const updateRow = (day: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const handleSave = async () => {
    if (!supabase || !businessId) return;
    setError(null);
    setSaving(true);
    for (const row of rows) {
      const payload = {
        business_id: businessId,
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        open_time: row.is_closed ? null : (row.open_time || null),
        close_time: row.is_closed ? null : (row.close_time || null),
        break_start: row.break_start || null,
        break_end: row.break_end || null,
      };
      const { error: err } = await supabase.from('business_hours').upsert(payload, {
        onConflict: 'business_id,day_of_week',
      });
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    navigation.goBack();
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.hint}>Haftalık çalışma saatlerini güncelleyin.</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.cardList}>
        {rows.map((row) => (
          <View key={row.day_of_week} style={styles.dayCard}>
            <View style={styles.dayCardHeader}>
              <Text style={styles.dayName}>{row.dayName}</Text>
              <TouchableOpacity
                style={[styles.toggleBtn, row.is_closed && styles.toggleBtnClosed]}
                onPress={() => updateRow(row.day_of_week, { is_closed: !row.is_closed })}
              >
                <Text style={[styles.toggleBtnText, row.is_closed && styles.toggleBtnTextClosed]}>{row.is_closed ? 'Kapalı' : 'Açık'}</Text>
              </TouchableOpacity>
            </View>
            {!row.is_closed && (
              <>
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Açılış</Text>
                    <RNTextInput
                      style={styles.timeInput}
                      value={row.open_time}
                      onChangeText={(v) => updateRow(row.day_of_week, { open_time: v })}
                      placeholder="09:00"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                  <Text style={styles.timeSep}>–</Text>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Kapanış</Text>
                    <RNTextInput
                      style={styles.timeInput}
                      value={row.close_time}
                      onChangeText={(v) => updateRow(row.day_of_week, { close_time: v })}
                      placeholder="18:00"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Mola baş.</Text>
                    <RNTextInput
                      style={styles.timeInput}
                      value={row.break_start}
                      onChangeText={(v) => updateRow(row.day_of_week, { break_start: v })}
                      placeholder="—"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                  <Text style={styles.timeSep}>–</Text>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeLabel}>Mola bit.</Text>
                    <RNTextInput
                      style={styles.timeInput}
                      value={row.break_end}
                      onChangeText={(v) => updateRow(row.day_of_week, { break_end: v })}
                      placeholder="—"
                      placeholderTextColor="#a1a1aa"
                    />
                  </View>
                </View>
              </>
            )}
          </View>
        ))}
      </View>
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
  hint: { fontSize: 14, color: '#71717a', marginBottom: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  cardList: { marginBottom: 16 },
  dayCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 14,
    marginBottom: 12,
  },
  dayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dayName: { fontSize: 16, fontWeight: '700', color: '#18181b' },
  toggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#86efac',
  },
  toggleBtnClosed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  toggleBtnText: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  toggleBtnTextClosed: { color: '#b91c1c' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  timeBlock: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#71717a',
    width: 64,
    fontWeight: '500',
  },
  timeInput: {
    flex: 1,
    minWidth: 56,
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: '#18181b',
  },
  timeSep: { fontSize: 15, color: '#a1a1aa', marginHorizontal: 6 },
  saveBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
