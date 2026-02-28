import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import type { NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { MenuProvider, useMenu } from '../contexts/MenuContext';
import MenuOverlay from '../components/MenuOverlay';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { type MainStackParamList } from '../screens/dashboard/MenuScreen';
import DashboardScreen from '../screens/dashboard/DashboardScreen';
import BusinessesScreen from '../screens/dashboard/BusinessesScreen';
import BusinessDetailScreen from '../screens/dashboard/BusinessDetailScreen';
import NewBusinessScreen from '../screens/dashboard/NewBusinessScreen';
import EditBusinessScreen from '../screens/dashboard/EditBusinessScreen';
import ReservationsScreen from '../screens/dashboard/ReservationsScreen';
import ReservationDetailScreen from '../screens/dashboard/ReservationDetailScreen';
import TablesScreen from '../screens/dashboard/TablesScreen';
import TablePlanScreen from '../screens/dashboard/TablePlanScreen';
import MessagesScreen from '../screens/dashboard/MessagesScreen';
import MessageThreadScreen from '../screens/dashboard/MessageThreadScreen';
import NewTableScreen from '../screens/dashboard/NewTableScreen';
import EditTableScreen from '../screens/dashboard/EditTableScreen';
import GelirScreen from '../screens/dashboard/GelirScreen';
import ReviewsScreen from '../screens/dashboard/ReviewsScreen';
import SponsoredScreen from '../screens/dashboard/SponsoredScreen';
import HizmetlerScreen from '../screens/dashboard/HizmetlerScreen';
import NewServiceScreen from '../screens/dashboard/NewServiceScreen';
import EditServiceScreen from '../screens/dashboard/EditServiceScreen';
import LoyaltyScreen from '../screens/dashboard/LoyaltyScreen';
import NotificationsScreen from '../screens/dashboard/NotificationsScreen';

type Props = Record<string, never>;

const Stack = createNativeStackNavigator<MainStackParamList>();
const AuthStackNav = createNativeStackNavigator<{ Login: undefined; Register: undefined; ForgotPassword: undefined }>();

function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
      <AuthStackNav.Screen name="Register" component={RegisterScreen} />
      <AuthStackNav.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStackNav.Navigator>
  );
}

const MAIN_SCREENS: { name: keyof MainStackParamList; component: React.ComponentType<any>; title: string; headerShown: boolean }[] = [
  { name: 'Dashboard', component: DashboardScreen, title: 'Ana Sayfa', headerShown: true },
  { name: 'BusinessesList', component: BusinessesScreen, title: 'İşletmelerim', headerShown: true },
  { name: 'BusinessDetail', component: BusinessDetailScreen, title: 'İşletme', headerShown: true },
  { name: 'NewBusiness', component: NewBusinessScreen, title: 'Yeni İşletme', headerShown: true },
  { name: 'EditBusiness', component: EditBusinessScreen, title: 'İşletme Düzenle', headerShown: true },
  { name: 'ReservationsList', component: ReservationsScreen, title: 'Rezervasyonlar', headerShown: true },
  { name: 'ReservationDetail', component: ReservationDetailScreen, title: 'Rezervasyon', headerShown: true },
  { name: 'Messages', component: MessagesScreen, title: 'Mesajlar', headerShown: true },
  { name: 'MessageThread', component: MessageThreadScreen, title: 'Konuşma', headerShown: true },
  { name: 'Gelir', component: GelirScreen, title: 'Gelir', headerShown: true },
  { name: 'Reviews', component: ReviewsScreen, title: 'Yorumlar', headerShown: true },
  { name: 'Sponsored', component: SponsoredScreen, title: 'Öne Çıkan', headerShown: true },
  { name: 'Hizmetler', component: HizmetlerScreen, title: 'Hizmetler', headerShown: true },
  { name: 'NewService', component: NewServiceScreen, title: 'Yeni Hizmet', headerShown: true },
  { name: 'EditService', component: EditServiceScreen, title: 'Hizmet Düzenle', headerShown: true },
  { name: 'Loyalty', component: LoyaltyScreen, title: 'Puan İşlemleri', headerShown: true },
  { name: 'Tables', component: TablesScreen, title: 'Masa Planı', headerShown: true },
  { name: 'TablePlan', component: TablePlanScreen, title: 'Masa planı (sürükle-bırak)', headerShown: true },
  { name: 'NewTable', component: NewTableScreen, title: 'Yeni Masa', headerShown: true },
  { name: 'EditTable', component: EditTableScreen, title: 'Masa Düzenle', headerShown: true },
  { name: 'Notifications', component: NotificationsScreen, title: 'Bildirim gönder', headerShown: true },
];

const ROOT_SCREENS: (keyof MainStackParamList)[] = [
  'Dashboard', 'BusinessesList', 'ReservationsList', 'Messages', 'Gelir', 'Reviews',
  'Sponsored', 'Hizmetler', 'Loyalty', 'Tables', 'Notifications',
];

function MenuButton() {
  const { open } = useMenu();
  return (
    <TouchableOpacity onPress={open} style={styles.menuButton} hitSlop={12}>
      <Text style={styles.menuButtonText}>☰</Text>
    </TouchableOpacity>
  );
}

function MainStack() {
  return (
    <Stack.Navigator
      initialRouteName="Dashboard"
      screenOptions={({ route, navigation }) => {
        const config = MAIN_SCREENS.find((s) => s.name === route.name);
        const headerShown = config ? config.headerShown : true;
        const isRoot = ROOT_SCREENS.includes(route.name as keyof MainStackParamList);
        return {
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#18181b',
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          headerShown,
          fullScreenGestureEnabled: true,
          headerLeft: isRoot
            ? () => <MenuButton />
            : () => (
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
                  <Text style={styles.backButtonText}>← Geri</Text>
                </TouchableOpacity>
              ),
        };
      }}
    >
      {MAIN_SCREENS.map(({ name, component, title, headerShown }) => (
        <Stack.Screen
          key={name}
          name={name}
          component={component}
          options={{ title, headerShown }}
        />
      ))}
    </Stack.Navigator>
  );
}

export default function AppNavigator(_props: Props) {
  const { session } = useAuth();
  const isAuthenticated = session != null;
  const navigationRef = useRef<NavigationContainerRef<MainStackParamList>>(null);

  const navigate = (name: string, params?: object) => {
    if (navigationRef.current?.isReady()) {
      navigationRef.current.navigate(name as keyof MainStackParamList, params as never);
    }
  };

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? (
        <MenuProvider navigateFn={navigate}>
          <View style={styles.mainWrap}>
            <MainStack />
            <MenuOverlay />
          </View>
        </MenuProvider>
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  mainWrap: { flex: 1 },
  menuButton: { marginLeft: 4, padding: 8 },
  menuButtonText: { fontSize: 22, fontWeight: '600', color: '#18181b' },
  backButton: { marginLeft: 4, padding: 8 },
  backButtonText: { fontSize: 17, color: '#15803d', fontWeight: '600' },
});
