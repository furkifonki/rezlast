import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExploreScreen from '../screens/main/ExploreScreen';
import FavoritesScreen from '../screens/main/FavoritesScreen';
import ReservationsScreen from '../screens/main/ReservationsScreen';
import ProfileHomeScreen from '../screens/main/ProfileHomeScreen';

export type TabName = 'Explore' | 'Favorites' | 'Reservations' | 'Profile';

const TABS: { key: TabName; label: string }[] = [
  { key: 'Explore', label: 'Keşfet' },
  { key: 'Favorites', label: 'Favoriler' },
  { key: 'Reservations', label: 'Rezervasyonlarım' },
  { key: 'Profile', label: 'Profil' },
];

type TabContainerProps = {
  initialTab?: TabName;
  onTabChange?: (tab: TabName) => void;
};

export function TabContainer({ initialTab = 'Explore', onTabChange }: TabContainerProps) {
  const [tab, setTab] = useState<TabName>(initialTab);
  const insets = useSafeAreaInsets();
  const explorePopToRoot = useRef<(() => void) | null>(null);
  const favoritesPopToRoot = useRef<(() => void) | null>(null);
  const reservationsPopToRoot = useRef<(() => void) | null>(null);
  const profilePopToRoot = useRef<(() => void) | null>(null);

  const handleTabPress = (key: TabName) => {
    if (key === tab) {
      if (key === 'Explore') explorePopToRoot.current?.();
      else if (key === 'Favorites') favoritesPopToRoot.current?.();
      else if (key === 'Reservations') reservationsPopToRoot.current?.();
      else if (key === 'Profile') profilePopToRoot.current?.();
    } else {
      setTab(key);
      onTabChange?.(key);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => handleTabPress('Explore')} activeOpacity={0.7} accessibilityLabel="Keşfet sayfasına git">
          <Image source={require('../assets/icon.png')} style={styles.headerLogo} resizeMode="contain" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {TABS.find((t) => t.key === tab)?.label ?? 'Keşfet'}
        </Text>
      </View>
      <View style={styles.content}>
        {tab === 'Explore' && <ExploreScreen popToRootRef={explorePopToRoot} />}
        {tab === 'Favorites' && <FavoritesScreen popToRootRef={favoritesPopToRoot} />}
        {tab === 'Reservations' && <ReservationsScreen popToRootRef={reservationsPopToRoot} />}
        {tab === 'Profile' && <ProfileHomeScreen popToRootRef={profilePopToRoot} />}
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
              style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
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
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLogo: { width: 36, height: 36, marginRight: 12, borderRadius: 10 },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 2,
    borderRadius: 14,
    marginHorizontal: 1,
    minWidth: 0,
  },
  tabActive: {
    backgroundColor: '#f0fdf4',
  },
  tabLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#15803d',
    fontWeight: '700',
  },
});
