'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Conversation = {
  id: string;
  reservation_id: string;
  restaurant_id: string;
  user_id: string;
  status: string;
  last_message_at: string | null;
  created_at: string;
  reservations?: {
    reservation_date: string;
    reservation_time: string;
    status: string;
    businesses: { name: string } | null;
  } | null;
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
    businesses ( name )
  )
`;

function getBusinessName(r: Conversation['reservations']): string {
  if (!r?.businesses || typeof r.businesses !== 'object') return '—';
  return (r.businesses as { name: string }).name ?? '—';
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<(Conversation & { businessName: string; reservationLabel: string; lastMessageText: string | null; unreadCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const load = useCallback(async () => {
    if (!supabase) { setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const { data: convData, error: convErr } = await supabase
      .from('conversations')
      .select(CONV_SELECT)
      .eq('user_id', user.id)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (convErr) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const list = (convData ?? []) as Conversation[];
    const convIds = list.map((c) => c.id);
    if (convIds.length === 0) {
      setConversations([]);
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
      if (row.conversation_id && !(row.conversation_id in lastByConv)) lastByConv[row.conversation_id] = row.text;
    });

    let total = 0;
    const withMeta = list.map((c) => {
      const res = c.reservations;
      const date = res?.reservation_date ?? '';
      const time = res?.reservation_time ?? '';
      const reservationLabel = [date, typeof time === 'string' ? time.slice(0, 5) : ''].filter(Boolean).join(' · ') || '—';
      const unread = unreadByConv[c.id] ?? 0;
      total += unread;
      return {
        ...c,
        businessName: getBusinessName(c.reservations),
        reservationLabel,
        lastMessageText: lastByConv[c.id] ?? null,
        unreadCount: unread,
      };
    });
    setConversations(withMeta);
    setTotalUnread(total);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-0 md:max-w-2xl md:mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-[#0f172a]">Mesajlar</h1>
        {totalUnread > 0 && (
          <span className="bg-[#dc2626] text-white text-xs font-bold rounded-full min-w-[22px] h-5 px-2 flex items-center justify-center">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </div>
      {conversations.length === 0 ? (
        <div className="py-12 text-center rounded-xl bg-white border border-[#e2e8f0]">
          <p className="text-[#64748b]">Henüz sohbet yok</p>
          <p className="text-sm text-[#94a3b8] mt-1">Rezervasyon detayından restoranla mesajlaşabilirsiniz.</p>
        </div>
      ) : (
        <ul className="space-y-0 divide-y divide-[#f1f5f9] bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/messages/${c.id}`}
                className="block p-4 hover:bg-[#f8fafc] transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-[#0f172a] truncate">{c.businessName}</span>
                  {c.unreadCount > 0 && (
                    <span className="flex-shrink-0 bg-[#dc2626] text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748b] mt-0.5">{c.reservationLabel}</p>
                {c.lastMessageText && (
                  <p className="text-sm text-[#94a3b8] truncate mt-1">{c.lastMessageText}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
