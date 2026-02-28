import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useSimpleStack } from '../../navigation/SimpleStackContext';

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
  cancelled: '#dc2626',
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

type ReservationsScreenProps = {
  popToRootRef?: React.MutableRefObject<(() => void) | null>;
};

export default function ReservationsScreen({ popToRootRef }: ReservationsScreenProps) {
  const { session } = useAuth();
  const { navigate } = useSimpleStack();
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

  useEffect(() => {
    if (!popToRootRef) return;
    popToRootRef.current = () => {};
    return () => {
      popToRootRef.current = null;
    };
  }, [popToRootRef]);

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

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.subtitle}>Giriş yapın, rezervasyonlarınız burada listelenecek.</Text>
      </View>
    );
  }

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setLoading(true); load(); }}>
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Rezervasyonlarım</Text>
        <Text style={styles.subtitle}>Henüz rezervasyonunuz yok.</Text>
        <Text style={styles.hint}>Keşfet sekmesinden bir işletme seçip "Rezervasyon Yap" ile ekleyebilirsiniz.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
        contentContainerStyle={[styles.listContent, displayedList.length === 0 && { flex: 1 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />
        }
        ListEmptyComponent={
          displayedList.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>{tab === 'upcoming' ? 'Gelecek rezervasyonunuz yok.' : 'Geçmiş rezervasyonunuz yok.'}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1, letterSpacing: -0.2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardDate: { fontSize: 15, color: '#64748b', marginBottom: 6 },
  cardMeta: { fontSize: 14, color: '#94a3b8', fontWeight: '500' },
  cardNote: { fontSize: 14, color: '#64748b', marginTop: 10, fontStyle: 'italic', lineHeight: 20 },
  tapHint: { fontSize: 13, color: '#94a3b8', marginTop: 10, fontWeight: '500' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  hint: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#64748b', fontWeight: '500' },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  retryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 28,
    backgroundColor: '#f1f5f9',
  },
  tabChipActive: {
    backgroundColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  tabChipText: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  tabChipTextActive: { color: '#fff', fontWeight: '700' },
  tabBadge: { backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, minWidth: 24, alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2 },
  tabBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  emptyTab: { flex: 1, justifyContent: 'center', paddingVertical: 56, alignItems: 'center' },
  emptyTabText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
});
