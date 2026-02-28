import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Hizmetler'>;

type Service = {
  id: string;
  name: string;
  duration_minutes: number | null;
  duration_display: string | null;
  price: number | null;
  is_active: boolean;
  businesses: { name: string } | null;
};

const DURATION_LABELS: Record<string, string> = {
  no_limit: 'Süre sınırı yok',
  all_day: 'Tüm gün',
  all_evening: 'Tüm akşam',
};

export default function HizmetlerScreen() {
  const navigation = useNavigation<Nav>();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setServices([]); setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('services')
        .select('id, name, duration_minutes, duration_display, price, is_active, businesses ( name )')
        .in('business_id', businessIds)
        .order('name');
      if (cancelled) return;
      if (err) setServices([]);
      else setServices((data ?? []) as Service[]);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const durationText = (s: Service) => {
    if (s.duration_minutes != null && s.duration_minutes > 0) return `${s.duration_minutes} dk`;
    return (s.duration_display && DURATION_LABELS[s.duration_display]) ?? '—';
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewService')} activeOpacity={0.7}>
            <Text style={styles.addBtnText}>+ Yeni Hizmet Ekle</Text>
          </TouchableOpacity>
          {services.length === 0 ? (
            <Text style={styles.empty}>Henüz hizmet eklenmedi. Yukarıdaki butondan ekleyebilirsiniz.</Text>
          ) : (
            services.map((s) => (
              <TouchableOpacity key={s.id} style={styles.card} onPress={() => navigation.navigate('EditService', { serviceId: s.id })} activeOpacity={0.7}>
                <Text style={styles.cardName}>{s.name}</Text>
                <Text style={styles.cardMeta}>{(s.businesses as { name: string } | null)?.name ?? '—'}</Text>
                <Text style={styles.cardMeta}>Süre: {durationText(s)} · Fiyat: {s.price != null ? `${s.price} ₺` : '—'}</Text>
                <View style={[styles.badge, !s.is_active && styles.badgeInactive]}><Text style={styles.badgeText}>{s.is_active ? 'Aktif' : 'Pasif'}</Text></View>
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
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  addBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 2 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 8 },
  badgeInactive: { backgroundColor: '#f4f4f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
});
