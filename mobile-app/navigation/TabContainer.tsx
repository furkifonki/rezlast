import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExploreScreen from '../screens/main/ExploreScreen';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import ReservationsScreen from '../screens/main/ReservationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

type TabName = 'Explore' | 'Favorites' | 'Reservations' | 'Profile';

const TABS: { key: TabName; label: string }[] = [
  { key: 'Explore', label: 'Keşfet' },
  { key: 'Favorites', label: 'Favoriler' },
  { key: 'Reservations', label: 'Rezervasyonlarım' },
  { key: 'Profile', label: 'Profil' },
];

export function TabContainer() {
  const [tab, setTab] = useState<TabName>('Explore');
  const insets = useSafeAreaInsets();
  const explorePopToRoot = useRef<(() => void) | null>(null);
  const favoritesPopToRoot = useRef<(() => void) | null>(null);
  const reservationsPopToRoot = useRef<(() => void) | null>(null);

  const handleTabPress = (key: TabName) => {
    if (key === tab) {
      if (key === 'Explore') explorePopToRoot.current?.();
      else if (key === 'Favorites') favoritesPopToRoot.current?.();
      else if (key === 'Reservations') reservationsPopToRoot.current?.();
    } else {
      setTab(key);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image source={require('../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
        <Text style={styles.headerTitle}>
          {TABS.find((t) => t.key === tab)?.label ?? 'Keşfet'}
        </Text>
      </View>
      <View style={styles.content}>
        {tab === 'Explore' && <ExploreScreen popToRootRef={explorePopToRoot} />}
        {tab === 'Favorites' && <FavoritesScreen popToRootRef={favoritesPopToRoot} />}
        {tab === 'Reservations' && <ReservationsScreen popToRootRef={reservationsPopToRoot} />}
        {tab === 'Profile' && <ProfileScreen />}
      </View>
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => handleTabPress(t.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabLabel,
                tab === t.key && styles.tabLabelActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLogo: { width: 32, height: 32, marginRight: 10 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabActive: {
    borderTopWidth: 2,
    borderTopColor: '#15803d',
  },
  tabLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#15803d',
    fontWeight: '600',
  },
});
