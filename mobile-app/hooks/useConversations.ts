import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { ConversationWithMeta } from '../types/messaging';

const CONV_SELECT = `
  id,
  reservation_id,
  restaurant_id,
  user_id,
  status,
  last_message_at,
  created_at,
  reservations (
    reservation_date,
    reservation_time,
    status,
    businesses ( name )
  )
`;

export function useConversations() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const load = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setConversations([]);
      setTotalUnread(0);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data: convData, error: convErr } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .eq('user_id', session.user.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convErr) {
      setError(convErr.message);
      setConversations([]);
      setLoading(false);
      return;
    }

    const list = (convData ?? []) as Array<Record<string, unknown>>;
    const convIds = list.map((c) => c.id as string);
    if (convIds.length === 0) {
      setConversations(
        list.map((c) => ({
          ...c,
          businessName: getBusinessName(c.reservations),
          reservationDate: getReservationDate(c.reservations),
          reservationTime: getReservationTime(c.reservations),
          unreadCount: 0,
          lastMessageText: null,
        })) as ConversationWithMeta[]
      );
      setTotalUnread(0);
      setLoading(false);
      return;
    }

    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('sender_type', 'restaurant')
      .is('read_at_user', null);

    const unreadByConv: Record<string, number> = {};
    (unreadData ?? []).forEach((row: { conversation_id: string }) => {
      unreadByConv[row.conversation_id] = (unreadByConv[row.conversation_id] ?? 0) + 1;
    });

    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('conversation_id, text')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastByConv: Record<string, string> = {};
    (lastMsgs ?? []).forEach((row: { conversation_id: string; text: string }) => {
      if (row.conversation_id && !(row.conversation_id in lastByConv)) {
        lastByConv[row.conversation_id] = row.text;
      }
    });

    let total = 0;
    const withMeta: ConversationWithMeta[] = list.map((c) => {
      const id = c.id as string;
      const unread = unreadByConv[id] ?? 0;
      total += unread;
      return {
        ...c,
        businessName: getBusinessName(c.reservations),
        reservationDate: getReservationDate(c.reservations),
        reservationTime: getReservationTime(c.reservations),
        unreadCount: unread,
        lastMessageText: lastByConv[id] ?? null,
      } as ConversationWithMeta;
    });
    setConversations(withMeta);
    setTotalUnread(total);
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  return { conversations, loading, error, totalUnread, refetch: load };
}

function getBusinessName(r: unknown): string {
  if (!r || typeof r !== 'object') return '—';
  const res = r as { businesses?: { name?: string } | null };
  const b = res.businesses;
  if (b && typeof b === 'object' && typeof b.name === 'string') return b.name;
  return '—';
}
function getReservationDate(r: unknown): string {
  if (!r || typeof r !== 'object') return '';
  return String((r as { reservation_date?: string }).reservation_date ?? '');
}
function getReservationTime(r: unknown): string {
  if (!r || typeof r !== 'object') return '';
  const t = (r as { reservation_time?: string }).reservation_time;
  return typeof t === 'string' ? t.slice(0, 5) : '';
}
