'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

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

export default function ChatPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [businessName, setBusinessName] = useState<string>('Restoran');
  const [messagingDisabled, setMessagingDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!conversationId || !supabase) return;
    const [convRes, msgRes] = await Promise.all([
      supabase.from('conversations').select('id, reservations ( status, businesses ( name ) )').eq('id', conversationId).single(),
      supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
    ]);
    if (convRes.data) {
      const r = convRes.data as { reservations?: { status?: string; businesses?: { name: string } } | null };
      const res = r.reservations;
      const name = res?.businesses?.name ?? 'Restoran';
      const status = res?.status;
      setBusinessName(name);
      setMessagingDisabled(status ? !['pending', 'confirmed'].includes(status) : true);
    }
    if (msgRes.data) setMessages((msgRes.data ?? []) as Message[]);
    setLoading(false);

    const now = new Date().toISOString();
    await supabase
      .from('messages')
      .update({ read_at_user: now })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'restaurant')
      .is('read_at_user', null);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const client = supabase;
    if (!conversationId || !client) return;
    const channel = client
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
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
      client?.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || !conversationId || !supabase || !session?.user?.id || sending || messagingDisabled) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_type: 'user',
      sender_id: session.user.id,
      text,
      created_at: new Date().toISOString(),
      read_at_user: null,
      read_at_restaurant: null,
    };
    setMessages((prev) => [...prev, optimistic]);
    setReplyText('');
    setSending(true);
    const { data: created, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
        sender_id: session.user.id,
        text,
      })
      .select()
      .single();
    setSending(false);
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? (created as Message) : m))
    );
  };

  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:max-w-2xl md:mx-auto md:border md:border-[#e2e8f0] md:rounded-xl md:overflow-hidden bg-white">
      <div className="flex items-center gap-2 p-3 border-b border-[#e2e8f0] bg-white">
        <Link href="/app/messages" className="text-[#15803d] font-medium hover:underline">← Mesajlar</Link>
        <span className="flex-1 font-semibold text-[#0f172a] truncate">{businessName}</span>
        {messagingDisabled && <span className="text-xs text-[#94a3b8]">Mesajlaşma kapalı</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
        {messages.length === 0 && (
          <p className="text-sm text-[#94a3b8] text-center py-4">Henüz mesaj yok. İlk mesajı siz atın.</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                m.sender_type === 'user'
                  ? 'bg-[#15803d] text-white rounded-br-md'
                  : 'bg-white border border-[#e2e8f0] text-[#0f172a] rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{m.text}</p>
              <p className={`text-xs mt-1 ${m.sender_type === 'user' ? 'text-green-100' : 'text-[#64748b]'}`}>
                {new Date(m.created_at).toLocaleString('tr-TR')}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSend} className="p-3 border-t border-[#e2e8f0] bg-white flex gap-2">
        <input
          type="text"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={messagingDisabled ? 'Bu rezervasyon için mesajlaşma kapalı.' : 'Mesaj yazın...'}
          disabled={messagingDisabled || sending}
          className="flex-1 rounded-xl border border-[#e2e8f0] px-4 py-3 text-[#0f172a] placeholder-[#94a3b8] disabled:bg-[#f1f5f9] focus:outline-none focus:ring-2 focus:ring-[#15803d]"
        />
        <button
          type="submit"
          disabled={!replyText.trim() || messagingDisabled || sending}
          className="px-5 py-3 rounded-xl bg-[#15803d] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? '...' : 'Gönder'}
        </button>
      </form>
    </div>
  );
}
