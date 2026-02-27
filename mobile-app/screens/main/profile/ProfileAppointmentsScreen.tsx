import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useSimpleStack } from '../../../navigation/SimpleStackContext';
import { supabase } from '../../../lib/supabase';

type Reservation = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  special_requests: string | null;
  businesses: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#15803d',
  cancelled: '#64748b',
  completed: '#0ea5e9',
  no_show: '#dc2626',
};

const TZ = 'Europe/Istanbul';
function isUpcoming(reservation_date: string, reservation_time: string): boolean {
  try {
    const d = new Date();
    const todayIstanbul = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const nowTimeIstanbul = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    const resDate = reservation_date.slice(0, 10);
    const resTime = String(reservation_time).slice(0, 5);
    if (resDate > todayIstanbul) return true;
    if (resDate < todayIstanbul) return false;
    return resTime >= nowTimeIstanbul;
  } catch {
    return reservation_date >= new Date().toISOString().slice(0, 10);
  }
}

export default function ProfileAppointmentsScreen() {
  const { goBack, navigate } = useSimpleStack();
  const { session } = useAuth();
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  type TabKey = 'upcoming' | 'past';
  const [tab, setTab] = useState<TabKey>('upcoming');

  const { upcoming, past } = React.useMemo(() => {
    const up: Reservation[] = [];
    const pa: Reservation[] = [];
    for (const r of list) {
      if (isUpcoming(r.reservation_date, r.reservation_time)) up.push(r);
      else pa.push(r);
    }
    return { upcoming: up, past: pa };
  }, [list]);

  const displayedList = tab === 'upcoming' ? upcoming : past;

  const load = async () => {
    if (!supabase || !session?.user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    setError(null);
    await supabase.rpc('close_my_past_reservations');
    const { data, err } = await supabase
      .from('reservations')
      .select('id, reservation_date, reservation_time, party_size, status, special_requests, businesses ( name )')
      .eq('user_id', session.user.id)
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });
    if (err) {
      setError(err.message);
      setList([]);
    } else {
      setList((data ?? []) as Reservation[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    load();
  }, [session?.user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyonlarım</Text>
      </View>

      {!session ? (
        <View style={styles.centered}>
          <Text style={styles.subtitle}>Giriş yapın, rezervasyonlarınız burada listelenecek.</Text>
        </View>
      ) : loading && list.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryButtonText}>Tekrar dene</Text>
          </TouchableOpacity>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.title}>Rezervasyonlarım</Text>
          <Text style={styles.subtitle}>Henüz rezervasyonunuz yok.</Text>
          <Text style={styles.hint}>Keşfet sekmesinden bir işletme seçip "Rezervasyon Yap" ile ekleyebilirsiniz.</Text>
        </View>
      ) : (
        <>
          <View style={styles.tabRow}>
            <TouchableOpacity
              style={[styles.tabChip, tab === 'upcoming' && styles.tabChipActive]}
              onPress={() => setTab('upcoming')}
            >
              <Text style={[styles.tabChipText, tab === 'upcoming' && styles.tabChipTextActive]}>Gelecek</Text>
              {upcoming.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{upcoming.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabChip, tab === 'past' && styles.tabChipActive]}
              onPress={() => setTab('past')}
            >
              <Text style={[styles.tabChipText, tab === 'past' && styles.tabChipTextActive]}>Geçmiş</Text>
              {past.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{past.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          <FlatList
            data={displayedList}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[styles.listContent, displayedList.length === 0 && styles.emptyList]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />
            }
            ListEmptyComponent={
              displayedList.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Text style={styles.emptyTabText}>
                    {tab === 'upcoming' ? 'Gelecek rezervasyonunuz yok.' : 'Geçmiş rezervasyonunuz yok.'}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => navigate('ReservationDetail', { reservationId: item.id })}
                activeOpacity={0.7}
              >
                <View style={styles.cardRow}>
                  <Text style={styles.cardTitle}>
                    {(item.businesses as { name: string } | null)?.name ?? '—'}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[item.status] ?? '#64748b'}20` }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] ?? '#64748b' }]}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardDate}>
                  {item.reservation_date} · {String(item.reservation_time).slice(0, 5)}
                </Text>
                <Text style={styles.cardMeta}>{item.party_size} kişi</Text>
                {item.special_requests ? (
                  <Text style={styles.cardNote} numberOfLines={2}>{item.special_requests}</Text>
                ) : null}
                <Text style={styles.tapHint}>Detay ve düzenleme için dokunun</Text>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  listContent: { padding: 16, paddingBottom: 24 },
  emptyList: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#e2e8f0' },
  tabChipActive: { backgroundColor: '#15803d' },
  tabChipText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabChipTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 10, minWidth: 20, alignItems: 'center', paddingHorizontal: 6 },
  tabBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#0f172a', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardDate: { fontSize: 14, color: '#64748b', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#94a3b8' },
  cardNote: { fontSize: 13, color: '#64748b', marginTop: 8, fontStyle: 'italic' },
  tapHint: { fontSize: 12, color: '#94a3b8', marginTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#15803d' },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  emptyTab: { flex: 1, justifyContent: 'center', paddingVertical: 48, alignItems: 'center' },
  emptyTabText: { fontSize: 15, color: '#64748b' },
});
