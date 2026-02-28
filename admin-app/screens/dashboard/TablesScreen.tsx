import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Tables'>;

type TableRow = {
  id: string;
  table_number: string;
  capacity: number;
  floor_number: number;
  table_type: string | null;
  is_active: boolean;
  businesses: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  indoor: 'İç Mekân',
  outdoor: 'Dış Mekân',
  terrace: 'Teras',
  seaside: 'Deniz Kenarı',
  vip: 'VIP',
  bar: 'Bar',
};

export default function TablesScreen() {
  const navigation = useNavigation<Nav>();
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTables = React.useCallback(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setTables([]); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('tables')
        .select('id, table_number, capacity, floor_number, table_type, is_active, businesses ( name )')
        .in('business_id', businessIds)
        .order('table_number');
      if (cancelled) return;
      if (err) { setError(err.message); setTables([]); }
      else {
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        setTables(rows.map((row) => {
          const b = row.businesses;
          const biz = Array.isArray(b) && b.length ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          return { ...row, businesses: biz } as TableRow;
        }));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(React.useCallback(() => {
    const cleanup = loadTables();
    return cleanup;
  }, [loadTables]));

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewTable')}>
            <Text style={styles.addBtnText}>+ Yeni Masa Ekle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.planBtn} onPress={() => navigation.navigate('TablePlan')}>
            <Text style={styles.planBtnText}>Masa planı (sürükle-bırak)</Text>
          </TouchableOpacity>
          {tables.length === 0 ? (
            <Text style={styles.empty}>Henüz masa tanımlanmadı. Yukarıdaki butondan ekleyebilirsiniz.</Text>
          ) : (
            tables.map((t) => (
              <TouchableOpacity key={t.id} style={styles.card} onPress={() => navigation.navigate('EditTable', { tableId: t.id })} activeOpacity={0.7}>
                <Text style={styles.cardTitle}>Masa {t.table_number}</Text>
                <Text style={styles.cardMeta}>{(t.businesses as { name: string } | null)?.name ?? '—'} · Kapasite: {t.capacity}</Text>
                <Text style={styles.cardMeta}>Kat: {t.floor_number} · {TYPE_LABELS[t.table_type ?? ''] ?? t.table_type ?? '—'}</Text>
                <View style={[styles.badge, !t.is_active && styles.badgeInactive]}>
                  <Text style={styles.badgeText}>{t.is_active ? 'Aktif' : 'Pasif'}</Text>
                </View>
                <Text style={styles.cardHint}>Düzenlemek için dokunun</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 2 },
  cardHint: { fontSize: 12, color: '#15803d', marginTop: 8, fontWeight: '500' },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  badgeInactive: { backgroundColor: '#f4f4f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  addBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  addBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  planBtn: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#15803d' },
  planBtnText: { fontSize: 16, fontWeight: '600', color: '#15803d' },
});
