import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  TextInput,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'TablePlan'>;

type Business = { id: string; name: string };
type TableRow = {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  position_x: number | null;
  position_y: number | null;
  table_type: string | null;
};

const REF_W = 800;
const REF_H = 560;
const TABLE_W = 110;
const TABLE_H = 88;

const AREA_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  indoor: { bg: '#f0fdf4', border: '#22c55e', label: 'İç Mekân' },
  outdoor: { bg: '#fef3c7', border: '#f59e0b', label: 'Dış Mekân' },
  terrace: { bg: '#e0e7ff', border: '#6366f1', label: 'Teras' },
  seaside: { bg: '#e0f2fe', border: '#0ea5e9', label: 'Deniz Kenarı' },
  vip: { bg: '#fce7f3', border: '#ec4899', label: 'VIP' },
  bar: { bg: '#f3e8ff', border: '#a855f7', label: 'Bar' },
};

function getStyle(type: string | null) {
  const key = type && AREA_COLORS[type] ? type : 'indoor';
  return AREA_COLORS[key] ?? AREA_COLORS.indoor;
}

const TABLE_TYPE_ENTRIES = Object.entries(AREA_COLORS);

export default function TablePlanScreen() {
  const navigation = useNavigation<Nav>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = React.useRef<Record<string, { x: number; y: number }>>({});
  useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);

  const filteredBusinesses = useMemo(() => {
    const q = businessSearch.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, businessSearch]);

  const loadBusinesses = useCallback(async () => {
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user || !supabase) return;
    const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
    const list = (data ?? []) as Business[];
    setBusinesses(list);
    if (list.length && !selectedBusinessId) setSelectedBusinessId(list[0].id);
  }, [selectedBusinessId]);

  const loadTables = useCallback(async () => {
    if (!selectedBusinessId || !supabase) {
      setTables([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setDragOffset({});
    const { data, error: err } = await supabase
      .from('tables')
      .select('id, business_id, table_number, capacity, position_x, position_y, table_type')
      .eq('business_id', selectedBusinessId)
      .eq('is_active', true)
      .order('table_number');
    if (err) {
      setError(err.message);
      setTables([]);
    } else {
      const rows = (data ?? []) as TableRow[];
      setTables(rows.map((t, i) => {
        if (t.position_x != null && t.position_y != null) return t;
        const col = i % 6;
        const row = Math.floor(i / 6);
        return {
          ...t,
          position_x: 60 + col * (TABLE_W + 24),
          position_y: 60 + row * (TABLE_H + 24),
        };
      }));
    }
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => { loadBusinesses(); }, []);
  useFocusEffect(useCallback(() => { if (selectedBusinessId) loadTables(); }, [selectedBusinessId, loadTables]));

  const savePosition = useCallback(async (id: string, x: number, y: number) => {
    if (!supabase) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from('tables').update({ position_x: Math.round(x), position_y: Math.round(y) }).eq('id', id);
    setSaving(false);
    if (err) setError(err.message);
    else setTables((prev) => prev.map((t) => (t.id === id ? { ...t, position_x: x, position_y: y } : t)));
  }, []);

  const { width: screenWidth } = Dimensions.get('window');
  const padding = 24;
  const availableW = screenWidth - padding * 2;
  const scale = Math.min(1.4, availableW / REF_W);
  const canvasW = REF_W * scale;
  const canvasH = REF_H * scale;
  const tableW = TABLE_W * scale;
  const tableH = TABLE_H * scale;
  const maxX = canvasW - tableW;
  const maxY = canvasH - tableH;

  if (businesses.length === 0 && !loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.helper}>Önce bir işletme ekleyin.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}><Text style={styles.linkText}>Geri</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>İşletme seçin</Text>
          <TextInput
            style={styles.searchInput}
            value={businessSearch}
            onChangeText={setBusinessSearch}
            placeholder="İşletme ara..."
            placeholderTextColor="#a1a1aa"
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <View style={styles.chipRow}>
              {filteredBusinesses.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, selectedBusinessId === b.id && styles.chipActive]}
                  onPress={() => setSelectedBusinessId(b.id)}
                >
                  <Text style={[styles.chipText, selectedBusinessId === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Masa tipleri</Text>
          <View style={styles.legendRow}>
            {TABLE_TYPE_ENTRIES.map(([key, { bg, border, label }]) => (
              <View key={key} style={[styles.legendItem, { backgroundColor: bg, borderColor: border }]}>
                <View style={[styles.legendDot, { backgroundColor: border }]} />
                <Text style={styles.legendText}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {saving ? <Text style={styles.saving}>Konum kaydediliyor...</Text> : null}
        {!selectedBusinessId ? (
          <Text style={styles.helper}>Yukarıdan bir işletme seçin.</Text>
        ) : loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
        ) : (
          <>
            <Text style={styles.hint}>Masayı tutup sürükleyin; bırakınca konum kaydedilir.</Text>
            <TouchableOpacity style={styles.backToList} onPress={() => navigation.goBack()}>
              <Text style={styles.backToListText}>← Geri</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {selectedBusinessId && !loading && tables.length > 0 && (
        <View style={[styles.canvasOuter, { width: canvasW + 32, height: canvasH + 32 }]}>
          <View style={[styles.canvasWrap, { width: canvasW, height: canvasH }]}>
            <View style={styles.canvas} collapsable={false}>
              {tables.map((t) => {
                const baseX = (t.position_x ?? 0) * scale;
                const baseY = (t.position_y ?? 0) * scale;
                const off = dragOffset[t.id];
                const x = off ? baseX + off.x : baseX;
                const y = off ? baseY + off.y : baseY;
                const style = getStyle(t.table_type);
                const pan = PanResponder.create({
                  onStartShouldSetPanResponder: () => true,
                  onMoveShouldSetPanResponder: () => true,
                  onPanResponderGrant: () => setDraggingId(t.id),
                  onPanResponderMove: (_, g) => {
                    let nx = g.dx;
                    let ny = g.dy;
                    if (baseX + nx < 0) nx = -baseX;
                    if (baseY + ny < 0) ny = -baseY;
                    if (baseX + nx > maxX) nx = maxX - baseX;
                    if (baseY + ny > maxY) ny = maxY - baseY;
                    setDragOffset((prev) => ({ ...prev, [t.id]: { x: nx, y: ny } }));
                  },
                  onPanResponderRelease: (_, g) => {
                    let clampX = baseX + (dragOffsetRef.current[t.id]?.x ?? g.dx);
                    let clampY = baseY + (dragOffsetRef.current[t.id]?.y ?? g.dy);
                    clampX = Math.max(0, Math.min(maxX, clampX));
                    clampY = Math.max(0, Math.min(maxY, clampY));
                    setDragOffset((prev) => {
                      const next = { ...prev };
                      delete next[t.id];
                      return next;
                    });
                    setDraggingId(null);
                    savePosition(t.id, clampX / scale, clampY / scale);
                  },
                });
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.tableBox,
                      {
                        left: x,
                        top: y,
                        width: tableW,
                        height: tableH,
                        backgroundColor: draggingId === t.id ? '#dcfce7' : style.bg,
                        borderColor: draggingId === t.id ? '#16a34a' : style.border,
                      },
                    ]}
                    {...pan.panHandlers}
                  >
                    <Text style={styles.tableNum}>{t.table_number}</Text>
                    <Text style={styles.tableCap}>{t.capacity} kişi</Text>
                    <Text style={[styles.tableType, { color: style.border }]} numberOfLines={1}>{style.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 6, textTransform: 'uppercase' },
  searchInput: {
    backgroundColor: '#f4f4f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#18181b',
    marginBottom: 10,
  },
  chipScroll: { marginHorizontal: -4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7', maxWidth: 200 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  legendCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  legendTitle: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 8, textTransform: 'uppercase' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 2, marginRight: 4, marginBottom: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  saving: { fontSize: 13, color: '#15803d', marginBottom: 8 },
  helper: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 24 },
  link: { marginTop: 12 },
  linkText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  hint: { fontSize: 13, color: '#52525b', marginBottom: 12 },
  canvasOuter: { padding: 16, alignSelf: 'center', backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 2, borderColor: 'rgba(148,163,184,0.3)' },
  canvasWrap: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc' },
  canvas: { flex: 1, position: 'relative', width: '100%', height: '100%' },
  tableBox: { position: 'absolute', borderRadius: 14, borderWidth: 2, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  tableNum: { fontSize: 16, fontWeight: '700', color: '#18181b' },
  tableCap: { fontSize: 11, color: '#52525b', marginTop: 2 },
  tableType: { fontSize: 9, marginTop: 2, fontWeight: '600' },
  backToList: { marginTop: 16, padding: 12 },
  backToListText: { fontSize: 15, color: '#15803d', fontWeight: '500' },
});
