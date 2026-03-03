'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data_reservation_id: string | null;
  data_conversation_id: string | null;
  read_at: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Az önce';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} dk önce`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`;
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationCenterPage() {
  const [list, setList] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('app_notifications')
      .select('id, type, title, body, data_reservation_id, data_conversation_id, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) setList((data ?? []) as NotificationItem[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const markRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('app_notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setList((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  const markAllRead = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return;
    const now = new Date().toISOString();
    await supabase
      .from('app_notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    setList((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || now })));
  };

  const hasUnread = list.some((n) => !n.read_at);

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-zinc-900 mb-4">Bildirim merkezi</h1>
      <p className="text-sm text-zinc-500 mb-4">
        Yeni rezervasyonlar ve mesajlar burada listelenir. Rezervasyon onayı veya mesajlara buradan gidebilirsiniz.
      </p>

      {hasUnread && (
        <button
          type="button"
          onClick={markAllRead}
          className="text-sm font-medium text-green-600 hover:text-green-700 mb-4"
        >
          Tümünü okundu işaretle
        </button>
      )}

      {loading && list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-zinc-500 mt-3">Yükleniyor...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
          <p className="text-4xl mb-4">🔔</p>
          <p className="font-semibold text-zinc-800">Henüz bildirim yok</p>
          <p className="text-sm text-zinc-500 mt-2">Yeni rezervasyonlar ve mesajlar burada görünecek.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => {
            const href = item.data_reservation_id
              ? `/dashboard/reservations/${item.data_reservation_id}`
              : item.data_conversation_id
                ? `/dashboard/messages?conversation=${item.data_conversation_id}`
                : null;
            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 ${
                  !item.read_at ? 'bg-green-50/80 border-green-200' : 'bg-white border-zinc-200'
                }`}
              >
                {href ? (
                  <Link
                    href={href}
                    onClick={() => !item.read_at && markRead(item.id)}
                    className="block"
                  >
                    <p className="font-semibold text-zinc-900">{item.title}</p>
                    {item.body && <p className="text-sm text-zinc-600 mt-1 line-clamp-2">{item.body}</p>}
                    <p className="text-xs text-zinc-400 mt-2">{formatDate(item.created_at)}</p>
                  </Link>
                ) : (
                  <div>
                    <p className="font-semibold text-zinc-900">{item.title}</p>
                    {item.body && <p className="text-sm text-zinc-600 mt-1">{item.body}</p>}
                    <p className="text-xs text-zinc-400 mt-2">{formatDate(item.created_at)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {list.length > 0 && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-4 text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
        >
          {refreshing ? 'Yenileniyor...' : 'Yenile'}
        </button>
      )}
    </div>
  );
}
