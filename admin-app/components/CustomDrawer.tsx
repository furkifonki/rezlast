import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type Props = React.ComponentProps<typeof DrawerContentScrollView>;

async function fetchUnreadCount(): Promise<number> {
  if (!supabase) return 0;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const [ownerRes, staffRes] = await Promise.all([
    supabase.from('businesses').select('id').eq('owner_id', user.id),
    supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
  ]);
  const ownerIds = (ownerRes.data ?? []).map((b: { id: string }) => b.id);
  const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
  const ids = [...new Set([...ownerIds, ...staffIds])];
  if (ids.length === 0) return 0;
  const { data: convData } = await supabase.from('conversations').select('id').in('restaurant_id', ids);
  const convIds = (convData ?? []).map((c: { id: string }) => c.id);
  if (convIds.length === 0) return 0;
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', convIds)
    .eq('sender_type', 'user')
    .is('read_at_restaurant', null);
  return count ?? 0;
}

export default function CustomDrawer(props: Props) {
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const [messagesUnread, setMessagesUnread] = useState(0);

  const load = React.useCallback(() => {
    fetchUnreadCount().then(setMessagesUnread);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const unsub = navigation.addListener('state', () => { load(); });
    return unsub;
  }, [navigation, load]);

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.container} style={styles.drawer}>
      <View style={styles.header}>
        <Text style={styles.logo}>Rezvio</Text>
        <Text style={styles.subtitle}>Admin</Text>
      </View>
      <DrawerItemList {...props} />
      {messagesUnread > 0 && (
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>Mesajlar: {messagesUnread > 99 ? '99+' : messagesUnread}</Text>
        </View>
      )}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => signOut()}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  drawer: { backgroundColor: '#18181b' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3f3f46',
  },
  logo: { fontSize: 20, fontWeight: '700', color: '#4ade80' },
  subtitle: { fontSize: 14, color: '#a1a1aa', marginTop: 2 },
  badgeWrap: { paddingHorizontal: 16, paddingTop: 8 },
  badgeText: { fontSize: 12, color: '#f87171', fontWeight: '600' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#3f3f46',
    padding: 12,
    marginTop: 'auto',
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  logoutText: { fontSize: 15, color: '#d4d4d8', fontWeight: '500' },
});
