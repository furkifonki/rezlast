import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

type Review = {
  id: string;
  rating: number;
  body: string | null;
  is_hidden: boolean;
  created_at: string;
  businesses: { name: string } | null;
};

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setReviews([]); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('reviews')
        .select('id, rating, body, is_hidden, created_at, businesses ( name )')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) setReviews([]);
      else setReviews((data ?? []) as Review[]);
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
          {reviews.length === 0 ? (
            <Text style={styles.empty}>Henüz yorum yok.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardHead}>
                  <Text style={styles.stars}>{'★'.repeat(Math.round(r.rating))}{'☆'.repeat(5 - Math.round(r.rating))}</Text>
                  <View style={[styles.badge, r.is_hidden && styles.badgeHidden]}><Text style={styles.badgeText}>{r.is_hidden ? 'Gizli' : 'Görünür'}</Text></View>
                </View>
                <Text style={styles.cardBiz}>{(r.businesses as { name: string } | null)?.name ?? '—'}</Text>
                {r.body ? <Text style={styles.cardBody} numberOfLines={3}>{r.body}</Text> : null}
                <Text style={styles.cardDate}>{r.created_at.slice(0, 10)}</Text>
                <Text style={styles.hint}>Gizleme / silme için web panelini kullanın.</Text>
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
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stars: { fontSize: 16, color: '#eab308' },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeHidden: { backgroundColor: '#f4f4f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  cardBiz: { fontSize: 14, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#52525b', marginBottom: 4 },
  cardDate: { fontSize: 12, color: '#a1a1aa' },
  hint: { fontSize: 12, color: '#a1a1aa', marginTop: 8 },
});
