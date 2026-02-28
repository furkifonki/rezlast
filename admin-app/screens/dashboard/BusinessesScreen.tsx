import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'BusinessesList'>;

type Category = { id: string; name: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  district: string | null;
  is_active: boolean;
  categories: Category | null;
};

export default function BusinessesScreen() {
  const navigation = useNavigation<Nav>();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('businesses')
        .select('id, name, slug, address, city, district, is_active, categories ( id, name )')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) { setError(err.message); setBusinesses([]); }
      else {
        const list = (data ?? []) as Array<Record<string, unknown>>;
        const normalized: Business[] = list.map((row) => {
          const c = row.categories;
          const cat: Category | null = Array.isArray(c) && c.length ? (c[0] as Category) : c && typeof c === 'object' && 'id' in c ? (c as Category) : null;
          return { ...row, categories: cat } as Business;
        });
        setBusinesses(normalized);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewBusiness')} activeOpacity={0.7}>
        <Text style={styles.addBtnText}>+ Yeni İşletme Ekle</Text>
      </TouchableOpacity>
      {businesses.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Henüz işletme eklenmedi.</Text>
          <Text style={styles.emptyHint}>Yukarıdaki butondan ilk işletmenizi ekleyebilirsiniz.</Text>
        </View>
      ) : (
        businesses.map((b) => (
          <TouchableOpacity key={b.id} style={styles.card} onPress={() => navigation.navigate('BusinessDetail', { businessId: b.id })} activeOpacity={0.7}>
            <Text style={styles.cardName}>{b.name}</Text>
            <Text style={styles.cardMeta}>{(b.categories as Category)?.name ?? '—'} · {b.district ? `${b.district}, ` : ''}{b.city}</Text>
            <View style={[styles.badge, !b.is_active && styles.badgeInactive]}>
              <Text style={[styles.badgeText, !b.is_active && styles.badgeTextInactive]}>{b.is_active ? 'Aktif' : 'Pasif'}</Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f4f5' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  empty: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#52525b', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#71717a' },
  addBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#15803d', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeInactive: { backgroundColor: '#f4f4f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  badgeTextInactive: { color: '#71717a' },
});
