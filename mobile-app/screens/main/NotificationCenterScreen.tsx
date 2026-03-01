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
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data_reservation_id: string | null;
  data_conversation_id: string | null;
  read_at: string | null;
  created_at: string;
};

type Props = {
  onBack: () => void;
};

export default function NotificationCenterScreen({ onBack }: Props) {
  const { navigate } = useSimpleStack();
  const { session } = useAuth();
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!supabase || !session?.user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, type, title, body, data_reservation_id, data_conversation_id, read_at, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setList((data ?? []) as NotificationItem[]);
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

  const markRead = async (id: string) => {
    if (!supabase) return;
    await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    if (!supabase || !session?.user?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from('app_notifications')
      .update({ read_at: now })
      .eq('user_id', session.user.id)
      .is('read_at', null);
    setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
  };

  const hasUnread = list.some((n) => !n.read_at);

  const onPress = (item: NotificationItem) => {
    if (!item.read_at) markRead(item.id);
    if (item.data_reservation_id) navigate('ReservationDetail', { reservationId: item.data_reservation_id });
    else if (item.data_conversation_id) navigate('Chat', { conversationId: item.data_conversation_id, businessName: undefined, messagingDisabled: false });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'Az önce';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderItem = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[styles.card, !item.read_at && styles.cardUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.title}>{item.title}</Text>
      {item.body ? <Text style={styles.body} numberOfLines={2}>{item.body}</Text> : null}
      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
    </TouchableOpacity>
  );

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Giriş yapın, bildirimleriniz burada listelenecek.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={12}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        {hasUnread ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={12}>
            <Text style={styles.markAllReadText}>Tümünü okundu işaretle</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerRightPlaceholder} />
        )}
      </View>
      {loading && list.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : list.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>Henüz bildirim yok</Text>
          <Text style={styles.emptyHint}>Rezervasyon onayları ve mesajlar burada görünecek.</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backText: { fontSize: 16, color: '#15803d', fontWeight: '600', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 },
  markAllReadText: { fontSize: 13, color: '#15803d', fontWeight: '600' },
  headerRightPlaceholder: { minWidth: 1 },
  listContent: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cardUnread: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  title: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  body: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  date: { fontSize: 12, color: '#94a3b8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  hint: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#64748b', textAlign: 'center' },
});
