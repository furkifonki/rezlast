'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase';

type Conversation = {
  id: string;
  reservation_id: string;
  restaurant_id: string;
  user_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  reservations: {
    reservation_date: string;
    reservation_time: string;
    status: string;
    customer_name: string | null;
  } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at_user: string | null;
  read_at_restaurant: string | null;
};

type ConversationWithMeta = Conversation & {
  customerName: string;
  reservationLabel: string;
  lastMessageText: string | null;
  unreadCount: number;
};

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
    customer_name
  )
`;

export default function MessagesPage() {
  const [businessIds, setBusinessIds] = useState<string[]>([]);
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [totalUnread, setTotalUnread] = useState(0);

  const loadConversations = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConversations([]);
      setBusinessIds([]);
      return;
    }
    const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
    const ids = (myBusinesses ?? []).map((b) => b.id);
    setBusinessIds(ids);
    if (ids.length === 0) {
      setConversations([]);
      return;
    }
    const { data: convData, error: convErr } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .in('restaurant_id', ids)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convErr) {
      setConversations([]);
      return;
    }
    const list = (convData ?? []) as Conversation[];
    const convIds = list.map((c) => c.id);

    const { data: unreadData } = await supabase
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .eq('sender_type', 'user')
      .is('read_at_restaurant', null);

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
      const res = c.reservations;
      const customerName = res?.customer_name?.trim() || 'Müşteri';
      const date = res?.reservation_date ?? '';
      const time = res?.reservation_time ?? '';
      const reservationLabel = [date, typeof time === 'string' ? time.slice(0, 5) : ''].filter(Boolean).join(' · ') || '—';
      const unread = unreadByConv[c.id] ?? 0;
      total += unread;
      return {
        ...c,
        customerName,
        reservationLabel,
        lastMessageText: lastByConv[c.id] ?? null,
        unreadCount: unread,
      };
    });
    setConversations(withMeta);
    setTotalUnread(total);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadConversations();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const supabase = createClient();
    setMessagesLoading(true);
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        setMessagesLoading(false);
        if (!error) setMessages((data ?? []) as Message[]);
      });

    const now = new Date().toISOString();
    supabase
      .from('messages')
      .update({ read_at_restaurant: now })
      .eq('conversation_id', selectedId)
      .eq('sender_type', 'user')
      .is('read_at_restaurant', null)
      .then(() => loadConversations());
  }, [selectedId, loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`admin-messages:${selectedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          loadConversations();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedId, loadConversations]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || !selectedId || sending) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedId,
      sender_type: 'restaurant',
      sender_id: user.id,
      text,
    });
    setSending(false);
    if (!error) {
      setReplyText('');
      loadConversations();
    }
  };

  const selected = conversations.find((c) => c.id === selectedId);
  const canMessage = selected?.reservations?.status
    ? ['pending', 'confirmed'].includes(selected.reservations.status)
    : false;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Mesajlar</h1>
      {totalUnread > 0 && (
        <p className="text-zinc-500 text-sm mb-4">
          Toplam {totalUnread} okunmamış mesaj
        </p>
      )}

      {loading ? (
        <p className="text-zinc-500">Yükleniyor...</p>
      ) : (
        <div className="flex gap-4 h-[calc(100vh-12rem)] min-h-[400px]">
          <div className="w-80 flex-shrink-0 bg-white border border-zinc-200 rounded-lg overflow-hidden flex flex-col">
            <div className="p-2 border-b border-zinc-200 font-medium text-zinc-700">
              Sohbetler
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="p-4 text-zinc-500 text-sm">Henüz sohbet yok.</div>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left p-3 border-b border-zinc-100 hover:bg-zinc-50 ${
                      selectedId === c.id ? 'bg-green-50 border-l-4 border-l-green-600' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium text-zinc-900 truncate">{c.customerName}</span>
                      {c.unreadCount > 0 && (
                        <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                          {c.unreadCount > 99 ? '99+' : c.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 mt-0.5">{c.reservationLabel}</div>
                    {c.lastMessageText && (
                      <div className="text-sm text-zinc-600 truncate mt-1">{c.lastMessageText}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 bg-white border border-zinc-200 rounded-lg flex flex-col min-w-0">
            {!selectedId ? (
              <div className="flex-1 flex items-center justify-center text-zinc-500">
                Sohbet seçin
              </div>
            ) : (
              <>
                <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-zinc-900">{selected?.customerName}</span>
                    <span className="text-zinc-500 text-sm ml-2">{selected?.reservationLabel}</span>
                  </div>
                  {!canMessage && (
                    <span className="text-amber-600 text-sm">Mesajlaşma kapalı (rezervasyon durumu)</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messagesLoading ? (
                    <div className="text-zinc-500 text-sm">Yükleniyor...</div>
                  ) : (
                    messages.map((m) => (
                      <div
                        key={m.id}
                        className={`flex ${m.sender_type === 'restaurant' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                            m.sender_type === 'restaurant'
                              ? 'bg-green-600 text-white rounded-br-md'
                              : 'bg-zinc-200 text-zinc-900 rounded-bl-md'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{m.text}</p>
                          <p className={`text-xs mt-1 ${m.sender_type === 'restaurant' ? 'text-green-100' : 'text-zinc-500'}`}>
                            {new Date(m.created_at).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-3 border-t border-zinc-200 flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={canMessage ? 'Mesaj yazın...' : 'Bu rezervasyon için mesajlaşma kapalı.'}
                    disabled={!canMessage || sending}
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 placeholder-zinc-400 disabled:bg-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!replyText.trim() || !canMessage || sending}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Gönderiliyor...' : 'Gönder'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
