import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { registerForPushNotificationsAsync, savePushTokenToSupabase } from '../lib/pushNotifications';
import type { StackEntry } from './SimpleStackContext';
import { SimpleStackProvider } from './SimpleStackContext';
import { StackScreenWrapper } from './StackScreenWrapper';
import { TabContainer, type TabName } from './TabContainer';
import BusinessDetailScreen from '../screens/main/BusinessDetailScreen';
import ReservationFlowScreen from '../screens/main/ReservationFlowScreen';
import ProfileAccountScreen from '../screens/main/profile/ProfileAccountScreen';
import ProfilePointsScreen from '../screens/main/profile/ProfilePointsScreen';
import ProfileAppointmentsScreen from '../screens/main/profile/ProfileAppointmentsScreen';
import ProfileFavoritesScreen from '../screens/main/profile/ProfileFavoritesScreen';
import ProfilePaymentsScreen from '../screens/main/profile/ProfilePaymentsScreen';
import ProfileSettingsScreen from '../screens/main/profile/ProfileSettingsScreen';
import LegalTextScreen from '../screens/main/LegalTextScreen';
import MessagesListScreen from '../screens/main/messages/MessagesListScreen';
import ChatScreen from '../screens/main/messages/ChatScreen';
import ExploreMapScreen from '../screens/main/ExploreMapScreen';
import BusinessReviewsScreen from '../screens/main/BusinessReviewsScreen';
import ReservationDetailScreen from '../screens/main/ReservationDetailScreen';

const initialStack: StackEntry[] = [{ screen: 'Main', params: undefined }];

function MainStackContent() {
  const auth = useAuth();
  const [stack, setStack] = useState<StackEntry[]>(initialStack);
  const [mainTab, setMainTab] = useState<TabName>('Explore');
  const current = stack[stack.length - 1];

  useEffect(() => {
    const userId = auth?.session?.user?.id;
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (cancelled || !token) return;
      await savePushTokenToSupabase(userId, token);
    })();
    return () => { cancelled = true; };
  }, [auth?.session?.user?.id]);
  const goBack = useCallback(
    () => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)),
    []
  );
  if (!current) return null;

  return (
    <SimpleStackProvider stack={stack} setStack={setStack}>
      <View style={styles.container}>
        {current.screen === 'Main' && (
          <TabContainer initialTab={mainTab} onTabChange={setMainTab} />
        )}
        {current.screen === 'BusinessDetail' && current.params && (
          <StackScreenWrapper onGoBack={goBack}>
            <BusinessDetailScreen
              businessId={current.params.businessId}
              onBack={goBack}
              onReservationPress={(id, name) =>
                setStack((prev) => [...prev, { screen: 'ReservationFlow', params: { businessId: id, businessName: name } }])
              }
              onReviewsPress={(id, name) =>
                setStack((prev) => [...prev, { screen: 'BusinessReviews', params: { businessId: id, businessName: name } }])
              }
            />
          </StackScreenWrapper>
        )}
        {current.screen === 'ReservationFlow' && current.params && (
          <StackScreenWrapper onGoBack={goBack}>
            <ReservationFlowScreen
              businessId={current.params.businessId}
              businessName={current.params.businessName}
              onBack={goBack}
              onDone={goBack}
            />
          </StackScreenWrapper>
        )}
        {current.screen === 'ReservationDetail' && current.params && (
          <StackScreenWrapper onGoBack={goBack}>
            <ReservationDetailScreen
              reservationId={current.params.reservationId}
              onBack={goBack}
              onUpdated={() => {}}
            />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfileAccount' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfileAccountScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfilePoints' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfilePointsScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfileAppointments' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfileAppointmentsScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfileFavorites' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfileFavoritesScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfilePayments' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfilePaymentsScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'ProfileSettings' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ProfileSettingsScreen />
          </StackScreenWrapper>
        )}
        {current.screen === 'LegalText' && current.params && (
          <StackScreenWrapper onGoBack={goBack}>
            <LegalTextScreen legalKey={current.params.legalKey} onBack={goBack} />
          </StackScreenWrapper>
        )}
        {current.screen === 'MessagesList' && (
          <StackScreenWrapper onGoBack={goBack}>
            <MessagesListScreen
              onBack={goBack}
              onOpenChat={(conversationId, businessName, messagingDisabled) =>
                setStack((prev) => [
                  ...prev,
                  {
                    screen: 'Chat',
                    params: { conversationId, businessName, messagingDisabled },
                  },
                ])
              }
            />
          </StackScreenWrapper>
        )}
        {current.screen === 'Chat' && current.params && (
          <StackScreenWrapper onGoBack={goBack} noTopPadding>
            <ChatScreen
              conversationId={current.params.conversationId}
              businessName={current.params.businessName}
              messagingDisabled={current.params.messagingDisabled}
              onBack={goBack}
            />
          </StackScreenWrapper>
        )}
        {current.screen === 'ExploreMap' && (
          <StackScreenWrapper onGoBack={goBack}>
            <ExploreMapScreen onBack={goBack} />
          </StackScreenWrapper>
        )}
        {current.screen === 'BusinessReviews' && current.params && (
          <StackScreenWrapper onGoBack={goBack}>
            <BusinessReviewsScreen
              businessId={current.params.businessId}
              businessName={current.params.businessName}
              onBack={goBack}
            />
          </StackScreenWrapper>
        )}
      </View>
    </SimpleStackProvider>
  );
}

export function MainStack() {
  return (
    <View style={styles.wrapper}>
      <MainStackContent />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
});
