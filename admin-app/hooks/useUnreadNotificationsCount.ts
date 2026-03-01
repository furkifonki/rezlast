import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/** Okunmamış app bildirimleri sayısı (app_notifications, read_at IS NULL). */
export function useUnreadNotificationsCount() {
  const { session } = useAuth();
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setCount(0);
      return;
    }
    const { count: n, error } = await supabase
      .from('app_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .is('read_at', null);
    if (!error) setCount(n ?? 0);
  }, [session?.user?.id]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { count, refetch };
}
