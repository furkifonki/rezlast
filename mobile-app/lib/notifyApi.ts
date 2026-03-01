/**
 * Admin panel push bildirim API'lerini çağırır.
 * EXPO_PUBLIC_ADMIN_API_URL ile admin panel base URL (örn. https://panel.example.com) verilmeli.
 */

import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  const extra = Constants.expoConfig?.extra ?? {};
  const url = (extra.EXPO_PUBLIC_ADMIN_API_URL ?? process.env.EXPO_PUBLIC_ADMIN_API_URL ?? '').trim().replace(/\/$/, '');
  return url;
};

export async function notifyOwner(
  businessId: string,
  reservationId: string | null,
  accessToken: string
): Promise<void> {
  const base = getBaseUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/push-notify-owner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ business_id: businessId, reservation_id: reservationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('notifyOwner failed:', res.status, err);
    }
  } catch (e) {
    console.warn('notifyOwner error:', e);
  }
}

export async function notifyMessage(
  conversationId: string,
  senderType: 'user' | 'restaurant',
  accessToken: string
): Promise<void> {
  const base = getBaseUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/push-notify-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ conversation_id: conversationId, sender_type: senderType }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('notifyMessage failed:', res.status, err);
    }
  } catch (e) {
    console.warn('notifyMessage error:', e);
  }
}
