'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [messagesUnread, setMessagesUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const [ownerRes, staffRes] = await Promise.all([
        supabase.from('businesses').select('id').eq('owner_id', user.id),
        supabase.from('restaurant_staff').select('restaurant_id').eq('user_id', user.id),
      ]);
      const ownerIds = (ownerRes.data ?? []).map((b: { id: string }) => b.id);
      const staffIds = (staffRes.data ?? []).map((s: { restaurant_id: string }) => s.restaurant_id).filter(Boolean);
      const ids = [...new Set([...ownerIds, ...staffIds])];
      if (ids.length === 0) {
        if (!cancelled) setMessagesUnread(0);
        return;
      }
      const { data: convData } = await supabase
        .from('conversations')
        .select('id')
        .in('restaurant_id', ids);
      const convIds = (convData ?? []).map((c: { id: string }) => c.id);
      if (convIds.length === 0) {
        if (!cancelled) setMessagesUnread(0);
        return;
      }
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .eq('sender_type', 'user')
        .is('read_at_restaurant', null);
      if (!cancelled) setMessagesUnread(count ?? 0);
    };
    fetchUnread();
    if (pathname?.startsWith('/dashboard/messages')) {
      const t = setInterval(fetchUnread, 8000);
      return () => { cancelled = true; clearInterval(t); };
    }
    return () => { cancelled = true; };
  }, [pathname]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const nav = [
    { href: '/dashboard', label: 'Ana Sayfa' },
    { href: '/dashboard/businesses', label: 'İşletmelerim' },
    { href: '/dashboard/reservations', label: 'Rezervasyonlar' },
    { href: '/dashboard/messages', label: 'Mesajlar', badge: messagesUnread },
    { href: '/dashboard/gelir', label: 'Gelir' },
    { href: '/dashboard/reviews', label: 'Yorumlar' },
    { href: '/dashboard/sponsored', label: 'Öne Çıkan' },
    { href: '/dashboard/hizmetler', label: 'Hizmetler' },
    { href: '/dashboard/loyalty', label: 'Puan İşlemleri' },
    { href: '/dashboard/tables', label: 'Masa Planı' },
    { href: '/dashboard/notifications', label: 'Bildirim gönder', icon: 'bell' as const },
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <aside className="w-56 bg-zinc-900 text-white flex flex-col">
        <div className="p-4 border-b border-zinc-700 flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img src="/logo.png" alt="Rezvio" className="h-8 w-8 object-contain" />
            <span className="font-semibold text-green-400">Rezvio</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ href, label, badge, icon }) => {
            const isActive = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm gap-2 ${
                  isActive
                    ? 'bg-green-700 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  {icon === 'bell' && (
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <img src="/notification-bell.png" alt="" className="w-5 h-5 object-contain" />
                    </span>
                  )}
                  <span className="truncate">{label}</span>
                </span>
                {typeof badge === 'number' && badge > 0 && (
                  <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-zinc-700">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Çıkış Yap
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <header className="h-14 border-b border-zinc-200 bg-white flex items-center px-6">
          <span className="text-zinc-600 text-sm">Rezvio Admin</span>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
