import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  is_hidden: boolean;
  created_at: string;
  businesses: { name: string } | null;
};

export default function ReviewsScreen() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadReviews = async () => {
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user || !supabase) { setLoading(false); return; }
    const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
    const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
    if (businessIds.length === 0) { setReviews([]); setLoading(false); return; }
    const { data, error: err } = await supabase
      .from('reviews')
      .select('id, rating, comment, is_hidden, created_at, businesses ( name )')
      .in('business_id', businessIds)
      .order('created_at', { ascending: false });
    if (err) setReviews([]);
    else setReviews((data ?? []) as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadReviews();
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, []);

  const toggleHidden = async (id: string, current: boolean) => {
    setActionLoading(id);
    const { error: err } = await supabase
      ?.from('reviews')
      .update({ is_hidden: !current, updated_at: new Date().toISOString() })
      .eq('id', id) ?? { error: new Error('Supabase yok') };
    setActionLoading(null);
    if (err) {
      Alert.alert('Hata', err.message);
      return;
    }
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, is_hidden: !current } : r)));
  };

  const deleteReview = (id: string) => {
    Alert.alert(
      'Yorumu sil',
      'Bu yorumu kalıcı olarak silmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(id);
            const { error: err } = await supabase?.from('reviews').delete().eq('id', id) ?? { error: new Error('Supabase yok') };
            setActionLoading(null);
            if (err) {
              Alert.alert('Hata', err.message);
              return;
            }
            setReviews((prev) => prev.filter((r) => r.id !== id));
          },
        },
      ]
    );
  };

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
                {r.comment ? <Text style={styles.cardBody} numberOfLines={3}>{r.comment}</Text> : null}
                <Text style={styles.cardDate}>{r.created_at.slice(0, 10)}</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={[styles.btnToggle, r.is_hidden && styles.btnShow]}
                    onPress={() => toggleHidden(r.id, r.is_hidden)}
                    disabled={actionLoading === r.id}
                  >
                    <Text style={[styles.btnToggleText, r.is_hidden && styles.btnShowText]}>
                      {actionLoading === r.id ? '...' : r.is_hidden ? 'Göster' : 'Gizle'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnDelete}
                    onPress={() => deleteReview(r.id)}
                    disabled={actionLoading === r.id}
                  >
                    <Text style={styles.btnDeleteText}>Sil</Text>
                  </TouchableOpacity>
                </View>
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
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnToggle: { backgroundColor: '#e4e4e7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnToggleText: { fontSize: 13, fontWeight: '600', color: '#52525b' },
  btnShow: { backgroundColor: '#dcfce7' },
  btnShowText: { color: '#166534' },
  btnDelete: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#f87171', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnDeleteText: { fontSize: 13, fontWeight: '600', color: '#b91c1c' },
});
