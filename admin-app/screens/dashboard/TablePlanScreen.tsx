import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  PanResponder,
  Dimensions,
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

const REF_W = 1000;
const REF_H = 700;
const TABLE_W = 72;
const TABLE_H = 56;

const AREA_COLORS: Record<string, { bg: string; border: string }> = {
  indoor: { bg: '#f0fdf4', border: '#22c55e' },
  outdoor: { bg: '#fef3c7', border: '#f59e0b' },
  terrace: { bg: '#e0e7ff', border: '#6366f1' },
  seaside: { bg: '#e0f2fe', border: '#0ea5e9' },
  vip: { bg: '#fce7f3', border: '#ec4899' },
  bar: { bg: '#f3e8ff', border: '#a855f7' },
};

function getStyle(type: string | null) {
  const key = type && AREA_COLORS[type] ? type : 'indoor';
  return AREA_COLORS[key] ?? AREA_COLORS.indoor;
}

export default function TablePlanScreen() {
  const navigation = useNavigation<Nav>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffsetRef = React.useRef<Record<string, { x: number; y: number }>>({});
  useEffect(() => { dragOffsetRef.current = dragOffset; }, [dragOffset]);

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
        const col = i % 10;
        const row = Math.floor(i / 10);
        return {
          ...t,
          position_x: 80 + col * (TABLE_W + 28),
          position_y: 80 + row * (TABLE_H + 28),
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

  const screenWidth = Dimensions.get('window').width - 32;
  const scale = Math.min(1, screenWidth / REF_W);
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
        <TouchableOpacity onPress={() => navigation.navigate('BusinessesList')} style={styles.link}><Text style={styles.linkText}>İşletmelerim</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>İşletme</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {businesses.map((b) => (
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
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {saving ? <Text style={styles.saving}>Konum kaydediliyor...</Text> : null}
        {!selectedBusinessId ? (
          <Text style={styles.helper}>Yukarıdan işletme seçin.</Text>
        ) : loading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
        ) : (
          <>
            <Text style={styles.hint}>Masaları sürükleyip bırakarak konumlandırın. Bırakınca konum kaydedilir.</Text>
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
                      setDragOffset((prev) => {
                        const cur = prev[t.id] ?? { x: 0, y: 0 };
                        let nx = cur.x + g.dx;
                        let ny = cur.y + g.dy;
                        const newX = baseX + nx;
                        const newY = baseY + ny;
                        if (newX < 0) nx = -baseX;
                        if (newY < 0) ny = -baseY;
                        if (newX > maxX) nx = maxX - baseX;
                        if (newY > maxY) ny = maxY - baseY;
                        return { ...prev, [t.id]: { x: nx, y: ny } };
                      });
                    },
                    onPanResponderRelease: (_, g) => {
                      const cur = dragOffsetRef.current[t.id] ?? { x: 0, y: 0 };
                      const clampX = Math.max(0, Math.min(maxX, baseX + cur.x + g.dx));
                      const clampY = Math.max(0, Math.min(maxY, baseY + cur.y + g.dy));
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
                    </View>
                  );
                })}
              </View>
            </View>
            <TouchableOpacity style={styles.backToList} onPress={() => navigation.navigate('Tables')}>
              <Text style={styles.backToListText}>← Masa listesine dön</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7', maxWidth: 160 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 13, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  saving: { fontSize: 13, color: '#15803d', marginBottom: 8 },
  helper: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 24 },
  link: { marginTop: 12 },
  linkText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  hint: { fontSize: 13, color: '#52525b', marginBottom: 12 },
  canvasWrap: { alignSelf: 'center', borderRadius: 12, overflow: 'hidden', backgroundColor: '#f8fafc', borderWidth: 2, borderColor: 'rgba(148,163,184,0.3)' },
  canvas: { flex: 1, position: 'relative', width: '100%', height: '100%' },
  tableBox: { position: 'absolute', borderRadius: 12, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  tableNum: { fontSize: 14, fontWeight: '700', color: '#18181b' },
  tableCap: { fontSize: 10, color: '#52525b', marginTop: 2 },
  backToList: { marginTop: 16, padding: 12 },
  backToListText: { fontSize: 15, color: '#15803d', fontWeight: '500' },
});
