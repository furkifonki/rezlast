import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { markConversationAsReadByUser, sendMessage as sendMessageApi } from '../lib/messaging';
import type { Message } from '../types/messaging';

const PENDING_PREFIX = 'pending-';

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
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
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

  const sendMessage = useCallback(
    async (text: string): Promise<Message> => {
      if (!conversationId || !session?.user?.id) throw new Error('Oturum veya sohbet yok');
      const pendingId = PENDING_PREFIX + Date.now();
      const now = new Date().toISOString();
      const optimistic: Message = {
        id: pendingId,
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: session.user.id,
        text: text.trim(),
        created_at: now,
        read_at_user: null,
        read_at_restaurant: null,
      };
      setMessages((prev) => [...prev, optimistic]);
      try {
        const created = await sendMessageApi(
          conversationId,
          text,
          'user',
          session.user.id
        );
        setMessages((prev) =>
          prev.map((m) => (m.id === pendingId ? created : m))
        );
        return created;
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== pendingId));
        throw e;
      }
    },
    [conversationId, session?.user?.id]
  );

  return { messages, loading, error, refetch: load, sendMessage };
}
