import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform, Alert, AppState } from 'react-native';
import { supabase } from './supabase';

const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Varsayılan',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null;

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    if (finalStatus !== 'granted') return null;
  }

  if (!projectId) return null;

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult?.data ?? null;
  } catch {
    return null;
  }
}

export async function savePushTokenToSupabase(userId: string, expoPushToken: string): Promise<boolean> {
  if (!supabase) return false;

  const platform = Platform.OS;
  const now = new Date().toISOString();
  const row = { user_id: userId, expo_push_token: expoPushToken, platform, app_type: 'owner' as const, updated_at: now };

  const { error: e1 } = await supabase.from('push_tokens').upsert(row, { onConflict: 'user_id,app_type' });
  if (!e1) {
    const ok = await verifyTokenSaved(userId, expoPushToken);
    if (ok) return true;
  }

  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('app_type', 'owner');
  await supabase.from('push_tokens').delete().eq('user_id', userId).is('app_type', null);
  const { error: e2 } = await supabase.from('push_tokens').insert(row);
  if (!e2) {
    const ok = await verifyTokenSaved(userId, expoPushToken);
    if (ok) return true;
  }

  return false;
}

async function verifyTokenSaved(userId: string, expoPushToken: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from('push_tokens')
    .select('expo_push_token')
    .eq('user_id', userId)
    .eq('expo_push_token', expoPushToken)
    .limit(1);
  return Array.isArray(data) && data.length > 0;
}

let _pushRegistered = false;

export function setupPushRegistration(getUserId: () => string | undefined) {
  const doRegister = async () => {
    const userId = getUserId();
    if (!userId) return;
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      const saved = await savePushTokenToSupabase(userId, token);
      if (!saved && !_pushRegistered) {
        Alert.alert(
          'Bildirim Kaydı Başarısız',
          'Push bildirimleri için token kaydedilemedi. Bildirimleri almak için uygulamayı yeniden başlatın.',
        );
      }
      _pushRegistered = saved;
    } catch {
      // silent
    }
  };

  doRegister();

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active' && !_pushRegistered) {
      doRegister();
    }
  });

  return () => {
    sub.remove();
  };
}
