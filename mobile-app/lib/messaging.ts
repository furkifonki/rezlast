import { supabase } from './supabase';
import type { Message } from '../types/messaging';

export async function getOrCreateConversation(reservationId: string): Promise<string> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await supabase.rpc('get_or_create_conversation', {
    p_reservation_id: reservationId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'string') throw new Error('Beklenmeyen yanıt');
  return data;
}

export async function sendMessage(
  conversationId: string,
  text: string,
  senderType: 'user' | 'restaurant',
  senderId: string
): Promise<Message> {
  if (!supabase) throw new Error('Supabase yapılandırılmamış');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: senderType,
      sender_id: senderId,
      text: text.trim(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Message;
}

/** Müşteri tarafı: restoranın gönderdiği mesajları okundu işaretle (read_at_user) */
export async function markConversationAsReadByUser(conversationId: string): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from('messages')
    .update({ read_at_user: now })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'restaurant')
    .is('read_at_user', null);
}

/** Restoran tarafı: müşterinin gönderdiği mesajları okundu işaretle (read_at_restaurant) */
export async function markConversationAsReadByRestaurant(conversationId: string): Promise<void> {
  if (!supabase) return;
  const now = new Date().toISOString();
  await supabase
    .from('messages')
    .update({ read_at_restaurant: now })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'user')
    .is('read_at_restaurant', null);
}
