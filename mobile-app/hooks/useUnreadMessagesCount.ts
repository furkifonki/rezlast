import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Lightweight hook: only fetches unread messages count for the current user.
 * Unread = messages where sender_type = 'restaurant' and read_at_user IS NULL,
 * in conversations where user_id = current user.
 */
export function useUnreadMessagesCount() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setCount(0);
      return;
    }
    const { data: convData } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', session.user.id);

    const list = (convData ?? []) as Array<{ id: string }>;
    const convIds = list.map((c) => c.id);
    if (convIds.length === 0) {
      setCount(0);
      return;
    }

    const { count: unreadCount, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .eq('sender_type', 'restaurant')
      .is('read_at_user', null);

    if (!error) setCount(unreadCount ?? 0);
  }, [session?.user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { count, refetch };
}
