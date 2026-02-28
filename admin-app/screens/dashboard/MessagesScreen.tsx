import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
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
  businesses: { name: string } | null;
};

export default function MessagesScreen() {
  const navigation = useNavigation<Nav>();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = React.useCallback(async () => {
    const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
    if (!user || !supabase) { setConvs([]); setLoading(false); return; }
    const [ownerRes, staffRes] = await Promise.all([
      supabase.from('businesses').select('id').eq('owner_id', user.id),
      supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
    ]);
    const ownerIds = (ownerRes.data ?? []).map((b: { id: string }) => b.id);
    const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
    const ids = [...new Set([...ownerIds, ...staffIds])];
    if (ids.length === 0) { setConvs([]); setLoading(false); return; }
    const { data: convData } = await supabase.from('conversations').select('id, reservation_id, restaurant_id').in('restaurant_id', ids);
    if (!convData?.length) { setConvs([]); setLoading(false); return; }
    const convIds = convData.map((c: { id: string }) => c.id);
    const bizMap: Record<string, string> = {};
    const { data: bizData } = await supabase.from('businesses').select('id, name').in('id', ids);
    (bizData ?? []).forEach((b: { id: string; name: string }) => { bizMap[b.id] = b.name; });
    const unreadRes = await supabase.from('messages').select('conversation_id').in('conversation_id', convIds).eq('sender_type', 'user').is('read_at_restaurant', null);
    const unreadByConv: Record<string, number> = {};
    (unreadRes.data ?? []).forEach((m: { conversation_id: string }) => { unreadByConv[m.conversation_id] = (unreadByConv[m.conversation_id] ?? 0) + 1; });
    const list: Conv[] = convData.map((c: { id: string; reservation_id: string | null; restaurant_id: string }) => ({
      id: c.id,
      reservation_id: c.reservation_id,
      restaurant_id: c.restaurant_id,
      unread: unreadByConv[c.id] ?? 0,
      businesses: { name: bizMap[c.restaurant_id] ?? '—' },
    }));
    setConvs(list);
    setLoading(false);
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useFocusEffect(React.useCallback(() => { if (!loading) loadConversations(); }, [loadConversations, loading]));

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {convs.length === 0 ? (
            <Text style={styles.empty}>Henüz konuşma yok.</Text>
          ) : (
            convs.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={styles.card}
              onPress={() => navigation.navigate('MessageThread', { conversationId: c.id })}
              activeOpacity={0.7}
            >
              <Text style={styles.cardName}>{(c.businesses as { name: string } | null)?.name ?? '—'}</Text>
              <Text style={styles.cardMeta}>Rezervasyon konuşması</Text>
              {c.unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{c.unread > 99 ? '99+' : c.unread}</Text></View>}
              <Text style={styles.cardHint}>Dokunun, mesajları görüntüleyin ve yanıtlayın.</Text>
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ef4444', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  cardHint: { fontSize: 12, color: '#15803d', marginTop: 8, fontWeight: '500' },
});
