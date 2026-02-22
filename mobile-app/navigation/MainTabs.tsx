import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ExploreScreen from '../screens/main/ExploreScreen';
import ReservationsScreen from '../screens/main/ReservationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

export type MainTabsParamList = {
  Explore: undefined;
  Reservations: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

export function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTintColor: '#0f172a',
        tabBarActiveTintColor: '#15803d',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          paddingBottom: insets.bottom + 4,
          paddingTop: 8,
          height: 56 + insets.bottom + 4,
          backgroundColor: '#fff',
          borderTopColor: '#e2e8f0',
        },
        tabBarLabelStyle: { fontSize: 12 },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{ title: 'Keşfet', tabBarLabel: 'Keşfet' }}
      />
      <Tab.Screen
        name="Reservations"
        component={ReservationsScreen}
        options={{ title: 'Rezervasyonlarım', tabBarLabel: 'Rezervasyonlarım' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil', tabBarLabel: 'Profil' }}
      />
    </Tab.Navigator>
  );
}
