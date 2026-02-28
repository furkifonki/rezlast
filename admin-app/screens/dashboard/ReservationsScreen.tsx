import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'ReservationsList'>;

type Reservation = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  customer_name: string | null;
  businesses: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

type TabKey = 'active' | 'past' | 'cancelled';

export default function ReservationsScreen() {
  const navigation = useNavigation<Nav>();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('active');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setReservations([]); setLoading(false); return; }
      await supabase.rpc('close_past_reservations_for_owner');
      if (cancelled) return;
      let query = supabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, party_size, status, customer_name, businesses ( name )')
        .in('business_id', businessIds)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });
      if (tab === 'active') query = query.in('status', ['pending', 'confirmed']);
      else if (tab === 'past') query = query.eq('status', 'completed');
      else query = query.in('status', ['cancelled', 'no_show']);
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) setReservations([]);
      else {
        const raw = (data ?? []) as Array<Record<string, unknown>>;
        setReservations(raw.map((r) => {
          const b = r.businesses;
          const biz = Array.isArray(b) && b.length ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          return { ...r, businesses: biz } as Reservation;
        }));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [tab]);

  return (
    <View style={styles.root}>
      <View style={styles.tabs}>
        {(['active', 'past', 'cancelled'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t === 'active' ? 'Aktif' : t === 'past' ? 'Geçmiş' : 'İptal'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {reservations.length === 0 ? (
            <Text style={styles.empty}>Bu sekmede rezervasyon yok.</Text>
          ) : (
            reservations.map((r) => (
              <TouchableOpacity key={r.id} style={styles.card} onPress={() => navigation.navigate('ReservationDetail', { reservationId: r.id })} activeOpacity={0.7}>
                <Text style={styles.cardDate}>{r.reservation_date} · {String(r.reservation_time).slice(0, 5)}</Text>
                <Text style={styles.cardName}>{(r.businesses as { name: string } | null)?.name ?? '—'}</Text>
                <Text style={styles.cardMeta}>{r.customer_name ?? '—'} · {r.party_size} kişi</Text>
                <View style={[styles.badge, r.status === 'pending' && styles.badgePending, r.status === 'cancelled' && styles.badgeCancelled]}>
                  <Text style={styles.badgeText}>{STATUS_LABELS[r.status] ?? r.status}</Text>
                </View>
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
  tabs: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7', paddingHorizontal: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#15803d' },
  tabText: { fontSize: 14, color: '#71717a', fontWeight: '500' },
  tabTextActive: { color: '#15803d', fontWeight: '600' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardDate: { fontSize: 14, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardName: { fontSize: 15, color: '#52525b', marginBottom: 2 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeCancelled: { backgroundColor: '#f4f4f5' },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
});
