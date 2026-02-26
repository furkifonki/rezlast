import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  total_points: number;
  loyalty_level: string | null;
  email_marketing_consent?: boolean;
  sms_marketing_consent?: boolean;
  kvkk_accepted_at?: string | null;
  etk_accepted_at?: string | null;
};

export function useUserProfile() {
  const { session } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('users')
      .select('id, first_name, last_name, phone, total_points, loyalty_level, email_marketing_consent, sms_marketing_consent, kvkk_accepted_at, etk_accepted_at')
      .eq('id', session.user.id)
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      setProfile(null);
      return;
    }
    setProfile({
      ...(data as UserProfile),
      email: session.user.email ?? null,
    });
  }, [session?.user?.id, session?.user?.email]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { profile, loading, error, refetch };
}
