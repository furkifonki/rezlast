/**
 * Admin panel push bildirim API'lerini çağırır (işletme uygulaması).
 * EXPO_PUBLIC_ADMIN_API_URL ile admin panel base URL verilmeli.
 */

import Constants from 'expo-constants';

const getBaseUrl = (): string => {
  const extra = Constants.expoConfig?.extra ?? {};
  const url = (extra.EXPO_PUBLIC_ADMIN_API_URL ?? process.env.EXPO_PUBLIC_ADMIN_API_URL ?? '').trim().replace(/\/$/, '');
  return url;
};

export async function notifyCustomer(reservationId: string, accessToken: string): Promise<void> {
  const base = getBaseUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/push-notify-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reservation_id: reservationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('notifyCustomer failed:', res.status, err);
    }
  } catch (e) {
    console.warn('notifyCustomer error:', e);
  }
}

export async function notifyCustomerCancelled(reservationId: string, accessToken: string): Promise<void> {
  const base = getBaseUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/api/push-notify-cancelled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reservation_id: reservationId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('notifyCustomerCancelled failed:', res.status, err);
    }
  } catch (e) {
    console.warn('notifyCustomerCancelled error:', e);
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
