import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { MainStackParamList } from './MenuScreen';

type Nav = NativeStackNavigationProp<MainStackParamList, 'Messages'>;

type Conv = {
  id: string;
  reservation_id: string | null;
  restaurant_id: string;
  unread: number;
  customer_name: string;
  business_name: string;
  reservation_date: string | null;
  reservation_time: string | null;
};

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [businesses, setBusinesses] = useState<{ id: string; name: string }[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [businessSearch, setBusinessSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadConversations = React.useCallback(async () => {
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user || !supabase) { setConvs([]); setLoading(false); return; }
    const [ownerRes, staffRes] = await Promise.all([
      supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name'),
      supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
    ]);
    const ownerList = (ownerRes.data ?? []) as { id: string; name: string }[];
    const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
    const ids = [...new Set([...ownerList.map((b) => b.id), ...staffIds])];
    let businessList = ownerList;
    if (staffIds.length > 0) {
      const { data: staffBiz } = await supabase.from('businesses').select('id, name').in('id', staffIds);
      const staffBizList = (staffBiz ?? []) as { id: string; name: string }[];
      const seen = new Set(ownerList.map((b) => b.id));
      staffBizList.forEach((b) => { if (!seen.has(b.id)) { seen.add(b.id); businessList = [...businessList, b]; } });
    }
    setBusinesses(businessList);
    if (businessList.length && !selectedBusinessId) setSelectedBusinessId(businessList[0].id);

    if (ids.length === 0) { setConvs([]); setLoading(false); return; }

    const { data: convData } = await supabase
      .from('conversations')
      .select('id, reservation_id, restaurant_id')
      .in('restaurant_id', ids);
    if (!convData?.length) { setConvs([]); setLoading(false); return; }

    const convIds = convData.map((c: { id: string }) => c.id);
    const resIds = (convData as { reservation_id: string | null }[]).map((c) => c.reservation_id).filter(Boolean) as string[];
    const bizIds = [...new Set((convData as { restaurant_id: string }[]).map((c) => c.restaurant_id))];

    const [unreadRes, resData, bizData] = await Promise.all([
      supabase.from('messages').select('conversation_id').in('conversation_id', convIds).eq('sender_type', 'user').is('read_at_restaurant', null),
      resIds.length > 0 ? supabase.from('reservations').select('id, customer_name, reservation_date, reservation_time').in('id', resIds) : { data: [] },
      supabase.from('businesses').select('id, name').in('id', bizIds),
    ]);

    const unreadByConv: Record<string, number> = {};
    (unreadRes.data ?? []).forEach((m: { conversation_id: string }) => { unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1; });
    const resMap: Record<string, { customer_name: string | null; reservation_date: string; reservation_time: string | null }> = {};
    (resData.data ?? []).forEach((r: { id: string; customer_name: string | null; reservation_date: string; reservation_time: string | null }) => {
      resMap[r.id] = { customer_name: r.customer_name, reservation_date: r.reservation_date, reservation_time: r.reservation_time };
    });
    const bizMap: Record<string, string> = {};
    (bizData.data ?? []).forEach((b: { id: string; name: string }) => { bizMap[b.id] = b.name; });

    const list: Conv[] = convData.map((c: { id: string; reservation_id: string | null; restaurant_id: string }) => {
      const res = c.reservation_id ? resMap[c.reservation_id] : null;
      return {
        id: c.id,
        reservation_id: c.reservation_id,
        restaurant_id: c.restaurant_id,
        unread: unreadByConv[c.id] ?? 0,
        customer_name: res?.customer_name?.trim() || 'Müşteri',
        business_name: bizMap[c.restaurant_id] ?? '—',
        reservation_date: res?.reservation_date ?? null,
        reservation_time: res?.reservation_time ?? null,
      };
    });
    setConvs(list);
    setLoading(false);
  }, [selectedBusinessId]);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useFocusEffect(React.useCallback(() => { if (!loading) loadConversations(); }, [loadConversations, loading]));

  const filteredBusinesses = useMemo(() => {
    const q = businessSearch.trim().toLowerCase();
    if (!q) return businesses;
    return businesses.filter((b) => b.name.toLowerCase().includes(q));
  }, [businesses, businessSearch]);

  const filteredConvs = useMemo(() => {
    if (!selectedBusinessId) return convs;
    return convs.filter((c) => c.restaurant_id === selectedBusinessId);
  }, [convs, selectedBusinessId]);

  const showDetail = (c: Conv) => {
    const date = c.reservation_date ? new Date(c.reservation_date).toLocaleDateString('tr-TR') : '—';
    const time = c.reservation_time ? String(c.reservation_time).slice(0, 5) : '—';
    Alert.alert(
      'Rezervasyon bilgisi',
      `Müşteri: ${c.customer_name}\nİşletme: ${c.business_name}\nTarih: ${date}\nSaat: ${time}`,
      [{ text: 'Tamam' }]
    );
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <>
          <View style={styles.filterCard}>
            <Text style={styles.label}>İşletmeye göre filtrele</Text>
            <TextInput
              style={styles.searchInput}
              value={businessSearch}
              onChangeText={setBusinessSearch}
              placeholder="İşletme ara..."
              placeholderTextColor="#a1a1aa"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, !selectedBusinessId && styles.chipActive]}
                  onPress={() => setSelectedBusinessId('')}
                >
                  <Text style={[styles.chipText, !selectedBusinessId && styles.chipTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {filteredBusinesses.map((b) => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.chip, selectedBusinessId === b.id && styles.chipActive]}
                    onPress={() => setSelectedBusinessId(b.id)}
                  >
                    <Text style={[styles.chipText, selectedBusinessId === b.id && styles.chipTextActive]} numberOfLines={1}>{b.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
            {filteredConvs.length === 0 ? (
              <Text style={styles.empty}>{selectedBusinessId ? 'Bu işletme için konuşma yok.' : 'Henüz konuşma yok.'}</Text>
            ) : (
              filteredConvs.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.card}
                  onPress={() => navigation.navigate('MessageThread', { conversationId: c.id })}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHead}>
                    <Text style={styles.cardName}>{c.customer_name}</Text>
                    {c.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{c.unread > 99 ? '99+' : c.unread}</Text></View>}
                  </View>
                  <Text style={styles.cardMeta}>{c.business_name}</Text>
                  <View style={styles.cardFooter}>
                    <TouchableOpacity style={styles.detailBtn} onPress={(e) => { e.stopPropagation(); showDetail(c); }}>
                      <Text style={styles.detailBtnText}>Rezervasyon detayı</Text>
                    </TouchableOpacity>
                    <Text style={styles.cardHint}>Dokunun, mesajları görüntüleyin.</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </>
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
  filterCard: { backgroundColor: '#fff', padding: 16, marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 8, textTransform: 'uppercase' },
  searchInput: { backgroundColor: '#f4f4f5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: '#18181b', marginBottom: 10 },
  chipScroll: { marginHorizontal: -4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7', maxWidth: 200 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', flex: 1 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  detailBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#f4f4f5', borderRadius: 8 },
  detailBtnText: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  cardHint: { fontSize: 12, color: '#a1a1aa', fontWeight: '500' },
  badge: { backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
