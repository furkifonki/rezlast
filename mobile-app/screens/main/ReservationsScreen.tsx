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
import ReservationDetailScreen from './ReservationDetailScreen';

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

type ReservationsScreenProps = {
  popToRootRef?: React.MutableRefObject<(() => void) | null>;
};

export default function ReservationsScreen({ popToRootRef }: ReservationsScreenProps) {
  const { session } = useAuth();
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);

  useEffect(() => {
    if (!popToRootRef) return;
    popToRootRef.current = () => setSelectedReservationId(null);
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

  if (selectedReservationId) {
    return (
      <ReservationDetailScreen
        reservationId={selectedReservationId}
        onBack={() => setSelectedReservationId(null)}
        onUpdated={() => {
          setSelectedReservationId(null);
          load();
        }}
      />
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
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSelectedReservationId(item.id)}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { padding: 16, paddingBottom: 24 },
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#15803d',
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
