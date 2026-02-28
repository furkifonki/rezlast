import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Dashboard'>;

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

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const [businessCount, setBusinessCount] = useState(0);
  const [reservationCount, setReservationCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) {
        setLoading(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const [bRes, rRes, pRes, tRes, recentRes] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('status', 'pending'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('reservation_date', today),
        supabase.from('reservations').select('id, reservation_date, reservation_time, party_size, status, customer_name, businesses ( name )').in('business_id', businessIds).order('reservation_date', { ascending: false }).order('reservation_time', { ascending: false }).limit(5),
      ]);
      if (cancelled) return;
      setBusinessCount(bRes.count ?? 0);
      setReservationCount(rRes.count ?? 0);
      setPendingCount(pRes.count ?? 0);
      setTodayCount(tRes.count ?? 0);
      const raw = (recentRes.data ?? []) as Array<Record<string, unknown>>;
      setRecentReservations(raw.map((r) => {
        const b = r.businesses;
        const biz = Array.isArray(b) && b.length ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
        return { ...r, businesses: biz } as Reservation;
      }));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeBlock}>
          <Text style={styles.h1}>Ana Sayfa</Text>
          <Text style={styles.subtitle}>İşletme ve rezervasyon özetiniz. Sol üst menüden diğer bölümlere geçebilirsiniz.</Text>
        </View>

        <View style={styles.cardRow}>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('BusinessesList')} activeOpacity={0.8}>
            <Text style={styles.cardLabel}>İşletmeler</Text>
            <Text style={styles.cardValue}>{businessCount}</Text>
            <Text style={styles.cardLink}>Yönet →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReservationsList')} activeOpacity={0.8}>
            <Text style={styles.cardLabel}>Toplam Rezervasyon</Text>
            <Text style={styles.cardValue}>{reservationCount}</Text>
            <Text style={styles.cardLink}>Tümü →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardRow}>
          <TouchableOpacity style={[styles.card, styles.cardHighlight]} onPress={() => navigation.navigate('ReservationsList')} activeOpacity={0.8}>
            <Text style={styles.cardLabel}>Bekleyen Onay</Text>
            <Text style={[styles.cardValue, styles.cardValueHighlight]}>{pendingCount}</Text>
            <Text style={styles.cardLink}>Onayla →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReservationsList')} activeOpacity={0.8}>
            <Text style={styles.cardLabel}>Bugün</Text>
            <Text style={styles.cardValue}>{todayCount}</Text>
            <Text style={styles.cardLink}>Görüntüle →</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Son Rezervasyonlar</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ReservationsList')} hitSlop={12}>
              <Text style={styles.cardLink}>Tümü →</Text>
            </TouchableOpacity>
          </View>
          {recentReservations.length === 0 ? (
            <Text style={styles.empty}>Henüz rezervasyon yok.</Text>
          ) : (
            recentReservations.map((r) => (
              <TouchableOpacity
                key={r.id}
                style={styles.row}
                onPress={() => navigation.navigate('ReservationDetail', { reservationId: r.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.rowText}>{r.reservation_date} · {String(r.reservation_time).slice(0, 5)}</Text>
                <Text style={styles.rowText}>{(r.businesses as { name: string } | null)?.name ?? '—'}</Text>
                <Text style={styles.rowText}>{r.customer_name ?? '—'} · {r.party_size} kişi</Text>
                <Text style={styles.rowBadge}>{STATUS_LABELS[r.status] ?? r.status}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  welcomeBlock: { marginBottom: 24 },
  h1: { fontSize: 24, fontWeight: '700', color: '#18181b', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#52525b', lineHeight: 20 },
  cardRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHighlight: { borderColor: '#fef3c7', backgroundColor: '#fffbeb' },
  cardValueHighlight: { color: '#b45309' },
  cardLabel: { fontSize: 12, color: '#71717a', marginBottom: 6, fontWeight: '500' },
  cardValue: { fontSize: 22, fontWeight: '700', color: '#18181b' },
  cardLink: { fontSize: 13, color: '#15803d', fontWeight: '600', marginTop: 10 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#18181b' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 28 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  rowText: { fontSize: 13, color: '#52525b' },
  rowBadge: { fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 4 },
});
