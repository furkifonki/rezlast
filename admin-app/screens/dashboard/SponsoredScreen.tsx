import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

type Sponsored = {
  id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  priority: number;
  payment_status: string | null;
  businesses: { name: string } | null;
};

export default function SponsoredScreen() {
  const [items, setItems] = useState<Sponsored[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setItems([]); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('sponsored_listings')
        .select('id, business_id, start_date, end_date, priority, payment_status, businesses ( name )')
        .in('business_id', businessIds)
        .order('priority', { ascending: false });
      if (cancelled) return;
      if (err) setItems([]);
      else setItems((data ?? []) as Sponsored[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {items.length === 0 ? (
            <Text style={styles.empty}>Öne çıkan liste kaydı yok.</Text>
          ) : (
            items.map((s) => (
              <View key={s.id} style={styles.card}>
                <Text style={styles.cardName}>{(s.businesses as { name: string } | null)?.name ?? '—'}</Text>
                <Text style={styles.cardMeta}>{s.start_date} – {s.end_date} · Öncelik: {s.priority}</Text>
                <Text style={styles.cardMeta}>Ödeme: {s.payment_status ?? '—'}</Text>
                <Text style={styles.hint}>Düzenleme için web panelini kullanın.</Text>
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
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 2 },
  hint: { fontSize: 12, color: '#a1a1aa', marginTop: 8 },
});
