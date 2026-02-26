import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { markConversationAsReadByUser } from '../lib/messaging';
import type { Message } from '../types/messaging';

export function useMessages(conversationId: string | null) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !conversationId || !session?.user?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (err) {
      setError(err.message);
      setMessages([]);
    } else {
      setMessages((data ?? []) as Message[]);
    }
    setLoading(false);
  }, [conversationId, session?.user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!supabase || !conversationId) return;
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    markConversationAsReadByUser(conversationId);
  }, [conversationId]);

  return { messages, loading, error, refetch: load };
}
