import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type MainStackParamList = {
  Dashboard: undefined;
  BusinessesList: undefined;
  BusinessDetail: { businessId: string };
  NewBusiness: undefined;
  EditBusiness: { businessId: string };
  ReservationsList: undefined;
  ReservationDetail: { reservationId: string };
  Messages: undefined;
  MessageThread: { conversationId: string };
  Gelir: undefined;
  Reviews: undefined;
  Sponsored: undefined;
  Hizmetler: undefined;
  NewService: undefined;
  EditService: { serviceId: string };
  Loyalty: undefined;
  Tables: undefined;
  TablePlan: undefined;
  NewTable: { businessId?: string };
  EditTable: { tableId: string };
  Notifications: undefined;
};

type Nav = NativeStackNavigationProp<MainStackParamList, 'Dashboard'>;

const MENU_ITEMS: { name: keyof MainStackParamList; label: string }[] = [
  { name: 'Dashboard', label: 'Ana Sayfa' },
  { name: 'BusinessesList', label: 'İşletmelerim' },
  { name: 'ReservationsList', label: 'Rezervasyonlar' },
  { name: 'Messages', label: 'Mesajlar' },
  { name: 'Gelir', label: 'Gelir' },
  { name: 'Reviews', label: 'Yorumlar' },
  { name: 'Sponsored', label: 'Öne Çıkan' },
  { name: 'Hizmetler', label: 'Hizmetler' },
  { name: 'Loyalty', label: 'Puan İşlemleri' },
  { name: 'Tables', label: 'Masa Planı' },
  { name: 'Notifications', label: 'Bildirim gönder' },
];

export default function MenuScreen() {
  const navigation = useNavigation<Nav>();
  const { signOut } = useAuth();
  const [messagesUnread, setMessagesUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchUnread() {
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const [ownerRes, staffRes] = await Promise.all([
        supabase.from('businesses').select('id').eq('owner_id', user.id),
        supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
      ]);
      const ownerIds = (ownerRes.data ?? []).map((b: { id: string }) => b.id);
      const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
      const ids = [...new Set([...ownerIds, ...staffIds])];
      if (ids.length === 0) {
        if (!cancelled) setMessagesUnread(0);
        return;
      }
      const { data: convData } = await supabase.from('conversations').select('id').in('restaurant_id', ids);
      const convIds = (convData ?? []).map((c: { id: string }) => c.id);
      if (convIds.length === 0) {
        if (!cancelled) setMessagesUnread(0);
        return;
      }
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('sender_type', 'user')
        .is('read_at_restaurant', null);
      if (!cancelled) setMessagesUnread(count ?? 0);
    }
    fetchUnread();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.logo}>Rezvio</Text>
        <Text style={styles.subtitle}>Admin</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {MENU_ITEMS.map(({ name, label }) => (
          <TouchableOpacity
            key={name}
            style={styles.item}
            onPress={() => navigation.navigate(name)}
            activeOpacity={0.7}
          >
            <Text style={styles.itemText}>{label}</Text>
            {name === 'Messages' && messagesUnread > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{messagesUnread > 99 ? '99+' : messagesUnread}</Text></View>
            )}
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => signOut()} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#18181b' },
  header: { paddingHorizontal: 20, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: '#3f3f46' },
  logo: { fontSize: 22, fontWeight: '700', color: '#4ade80' },
  subtitle: { fontSize: 14, color: '#a1a1aa', marginTop: 4 },
  scroll: { flex: 1 },
  content: { padding: 12, paddingBottom: 24 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  },
  itemText: { flex: 1, fontSize: 16, color: '#e4e4e7', fontWeight: '500' },
  badge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  arrow: { fontSize: 20, color: '#71717a', fontWeight: '300' },
  footer: { borderTopWidth: 1, borderTopColor: '#3f3f46', padding: 16 },
  logoutBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  logoutText: { fontSize: 16, color: '#d4d4d8', fontWeight: '500' },
});
