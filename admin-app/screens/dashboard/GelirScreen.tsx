import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

type Row = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  amount: number | null;
  businesses: { name: string } | null;
  payment_methods: { name: string } | null;
};

export default function GelirScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setRows([]); setTotal(0); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, amount, businesses ( name ), payment_methods ( name )')
        .in('business_id', businessIds)
        .gte('reservation_date', dateFrom)
        .lte('reservation_date', dateTo)
        .not('amount', 'is', null)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });
      if (cancelled) return;
      if (err) { setRows([]); setTotal(0); }
      else {
        const list = (data ?? []) as Row[];
        setRows(list);
        setTotal(list.reduce((s, r) => s + (Number(r.amount) || 0), 0));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [dateFrom, dateTo]);

  return (
    <View style={styles.root}>
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Seçili dönem toplam</Text>
        <Text style={styles.summaryValue}>{total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺</Text>
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>Bu tarih aralığında gelir kaydı yok.</Text>
          ) : (
            rows.map((r) => (
              <View key={r.id} style={styles.card}>
                <Text style={styles.cardDate}>{r.reservation_date} · {String(r.reservation_time).slice(0, 5)}</Text>
                <Text style={styles.cardName}>{(r.businesses as { name: string } | null)?.name ?? '—'}</Text>
                <Text style={styles.cardAmount}>{Number(r.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</Text>
                {(r.payment_methods as { name: string } | null)?.name ? <Text style={styles.cardMeta}>{(r.payment_methods as { name: string }).name}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  summary: { backgroundColor: '#dcfce7', padding: 16, marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  summaryLabel: { fontSize: 12, color: '#166534', fontWeight: '600', marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '700', color: '#166534' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardDate: { fontSize: 14, color: '#71717a', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardAmount: { fontSize: 18, fontWeight: '700', color: '#15803d' },
  cardMeta: { fontSize: 13, color: '#71717a', marginTop: 4 },
});
