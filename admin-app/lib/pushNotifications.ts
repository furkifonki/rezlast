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
  if (!Device.isDevice) {
    console.warn('[PushAdmin] Fiziksel cihaz değil, push token alınamaz.');
    return null;
  }

  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
    if (finalStatus !== 'granted') {
      console.warn('[PushAdmin] Bildirim izni reddedildi.');
      return null;
    }
  }

  if (!projectId) {
    console.warn('[PushAdmin] projectId bulunamadı (app.json extra.eas.projectId).');
    return null;
  }
  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult?.data ?? null;
    console.log('[PushAdmin] Expo push token:', token);
    return token;
  } catch (e) {
    console.error('[PushAdmin] Token alınamadı:', e);
    return null;
  }
}

export async function savePushTokenToSupabase(userId: string, expoPushToken: string): Promise<void> {
  if (!supabase) {
    console.warn('[PushAdmin] Supabase client null, token kaydedilemiyor.');
    return;
  }
  const platform = Platform.OS;
  const payload = {
    user_id: userId,
    expo_push_token: expoPushToken,
    platform,
    updated_at: new Date().toISOString(),
  };

  const { error: errWithType } = await supabase.from('push_tokens').upsert(
    { ...payload, app_type: 'owner' },
    { onConflict: 'user_id,app_type' }
  );
  if (!errWithType) {
    console.log('[PushAdmin] Token kaydedildi (app_type=owner).');
    return;
  }

  console.warn('[PushAdmin] app_type ile kayıt başarısız, fallback deneniyor:', errWithType.message);
  const { error: errFallback } = await supabase.from('push_tokens').upsert(payload, { onConflict: 'user_id' });
  if (errFallback) {
    console.error('[PushAdmin] Fallback kayıt da başarısız:', errFallback.message);
  } else {
    console.log('[PushAdmin] Token fallback ile kaydedildi.');
  }
}
