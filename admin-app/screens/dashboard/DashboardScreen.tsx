import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, PanResponder } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { useMenu } from '../../contexts/MenuContext';
import { supabase } from '../../lib/supabase';
import { RESERVATION_STATUS_LABELS, getReservationStatusStyle } from '../../constants/statusColors';
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

const STATUS_LABELS = RESERVATION_STATUS_LABELS;

export default function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { open: openMenu } = useMenu();
  const [businessCount, setBusinessCount] = useState(0);
  const [reservationCount, setReservationCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const panStartX = useRef(0);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => g.dx > 50,
      onPanResponderGrant: (e) => { panStartX.current = e.nativeEvent.pageX; },
      onPanResponderRelease: (_, g) => { if (g.dx > 60 && panStartX.current < 40) openMenu(); },
    })
  ).current;

  const loadDashboard = React.useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
    const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
    if (businessIds.length === 0) {
      setLoading(false);
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const [ownerRes, staffRes] = await Promise.all([
      supabase.from('businesses').select('id').eq('owner_id', user.id),
      supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
    ]);
    const ownerIds = (ownerRes.data ?? []).map((b: { id: string }) => b.id);
    const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
    const ids = [...new Set([...ownerIds, ...staffIds])];
    let messagesUnreadCount = 0;
    if (ids.length > 0) {
      const { data: convData } = await supabase.from('conversations').select('id').in('restaurant_id', ids);
      const convIds = (convData ?? []).map((c: { id: string }) => c.id);
      if (convIds.length > 0) {
        const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('conversation_id', convIds).eq('sender_type', 'user').is('read_at_restaurant', null);
        messagesUnreadCount = count ?? 0;
      }
    }
    const [bRes, rRes, pRes, tRes, recentRes] = await Promise.all([
      supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('status', 'pending'),
      supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('reservation_date', today),
      supabase.from('reservations').select('id, reservation_date, reservation_time, party_size, status, customer_name, businesses ( name )').in('business_id', businessIds).order('reservation_date', { ascending: false }).order('reservation_time', { ascending: false }).limit(5),
    ]);
    setBusinessCount(bRes.count ?? 0);
    setReservationCount(rRes.count ?? 0);
    setPendingCount(pRes.count ?? 0);
    setTodayCount(tRes.count ?? 0);
    setMessagesUnread(messagesUnreadCount);
    const raw = (recentRes.data ?? []) as Array<Record<string, unknown>>;
    setRecentReservations(raw.map((r) => {
      const b = r.businesses;
      const biz = Array.isArray(b) && b.length ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
      return { ...r, businesses: biz } as Reservation;
    }));
    setLoading(false);
  }, []);

  useFocusEffect(React.useCallback(() => { if (!loading) loadDashboard(); }, [loadDashboard, loading]));

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      </View>
    );
  }

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {(messagesUnread > 0 || pendingCount > 0 || todayCount > 0) && (
          <View style={styles.notifStrip}>
            {messagesUnread > 0 && (
              <TouchableOpacity style={styles.notifChip} onPress={() => navigation.navigate('Messages')} activeOpacity={0.8}>
                <Text style={styles.notifChipText}>💬 {messagesUnread} okunmamış mesaj</Text>
              </TouchableOpacity>
            )}
            {pendingCount > 0 && (
              <TouchableOpacity style={[styles.notifChip, styles.notifChipWarning]} onPress={() => navigation.navigate('ReservationsList')} activeOpacity={0.8}>
                <Text style={styles.notifChipTextWarning}>⏳ {pendingCount} bekleyen onay</Text>
              </TouchableOpacity>
            )}
            {todayCount > 0 && (
              <TouchableOpacity style={styles.notifChip} onPress={() => navigation.navigate('ReservationsList')} activeOpacity={0.8}>
                <Text style={styles.notifChipText}>📅 Bugün {todayCount} rezervasyon</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <View style={styles.welcomeBlock}>
          <Text style={styles.h1}>Ana Sayfa</Text>
          <Text style={styles.subtitle}>İşletme ve rezervasyon özetiniz. Sol üst menüden veya soldan sağa kaydırarak diğer bölümlere geçebilirsiniz.</Text>
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
                <View style={[styles.rowBadgeWrap, { backgroundColor: getReservationStatusStyle(r.status).bg }]}>
                  <Text style={[styles.rowBadge, { color: getReservationStatusStyle(r.status).text }]}>{STATUS_LABELS[r.status] ?? r.status}</Text>
                </View>
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
  notifStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  notifChip: { backgroundColor: '#dbeafe', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  notifChipWarning: { backgroundColor: '#fef3c7' },
  notifChipText: { fontSize: 13, fontWeight: '600', color: '#1e40af' },
  notifChipTextWarning: { fontSize: 13, fontWeight: '600', color: '#92400e' },
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
  rowBadgeWrap: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
  rowBadge: { fontSize: 12, fontWeight: '600' },
});
