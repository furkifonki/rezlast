import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMenu } from '../contexts/MenuContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { MainStackParamList } from '../screens/dashboard/MenuScreen';

const PANEL_WIDTH = 280;

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

export default function MenuOverlay() {
  const { isOpen, close, navigate } = useMenu();
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [messagesUnread, setMessagesUnread] = useState(0);
  const [slideAnim] = useState(() => new Animated.Value(-PANEL_WIDTH));
  const [backdropOpacity] = useState(() => new Animated.Value(0));

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

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    async function refresh() {
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
      if (ids.length === 0) { if (!cancelled) setMessagesUnread(0); return; }
      const { data: convData } = await supabase.from('conversations').select('id').in('restaurant_id', ids);
      const convIds = (convData ?? []).map((c: { id: string }) => c.id);
      if (convIds.length === 0) { if (!cancelled) setMessagesUnread(0); return; }
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).in('conversation_id', convIds).eq('sender_type', 'user').is('read_at_restaurant', null);
      if (!cancelled) setMessagesUnread(count ?? 0);
    }
    refresh();
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: isOpen ? 0 : -PANEL_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: isOpen ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isOpen, slideAnim, backdropOpacity]);

  const handleSelect = (name: keyof MainStackParamList) => {
    close();
    navigate(name as string);
  };

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0,0,0,0.4)', opacity: backdropOpacity },
        ]}
        pointerEvents={isOpen ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>
      <Animated.View
        style={[
          styles.panel,
          {
            width: PANEL_WIDTH,
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 16,
          },
          { transform: [{ translateX: slideAnim }] },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.brand}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.brandLogoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.menuList}>
          {MENU_ITEMS.map(({ name, label }) => (
            <TouchableOpacity
              key={name}
              style={styles.menuItem}
              onPress={() => handleSelect(name)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuItemText}>{label}</Text>
              {name === 'Messages' && messagesUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{messagesUnread > 99 ? '99+' : messagesUnread}</Text>
                </View>
              )}
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => { close(); signOut(); }}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Çıkış Yap</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#18181b',
    borderRightWidth: 1,
    borderRightColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  brand: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  brandLogoImage: {
    width: '100%',
    height: 44,
  },
  divider: {
    height: 1,
    backgroundColor: '#27272a',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  menuList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 2,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: '#e4e4e7',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  arrow: { fontSize: 18, color: '#52525b', fontWeight: '400' },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#27272a',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  logoutBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: { fontSize: 15, color: '#f87171', fontWeight: '600' },
});
