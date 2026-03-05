import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
    const token = tokenResult?.data ?? null;
    return token;
  } catch {
    return null;
  }
}

export async function savePushTokenToSupabase(userId: string, expoPushToken: string): Promise<void> {
  if (!supabase) return;
  const platform = Platform.OS;
  const now = new Date().toISOString();
  const row = { user_id: userId, expo_push_token: expoPushToken, platform, app_type: 'customer' as const, updated_at: now };

  const { error: e1 } = await supabase.from('push_tokens').upsert(row, { onConflict: 'user_id,app_type' });
  if (!e1) return;

  await supabase.from('push_tokens').delete().eq('user_id', userId).eq('app_type', 'customer');
  await supabase.from('push_tokens').delete().eq('user_id', userId).is('app_type', null);
  await supabase.from('push_tokens').insert(row);
}
