'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

const TABS = [
  { key: 'explore', label: 'Keşfet', href: '/app' },
  { key: 'favorites', label: 'Favoriler', href: '/app/favorites' },
  { key: 'reservations', label: 'Rezervasyonlarım', href: '/app/reservations' },
  { key: 'messages', label: 'Mesajlar', href: '/app/messages' },
  { key: 'profile', label: 'Profil', href: '/app/profile' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
  }, [session, loading, router]);

  if (loading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <p className="text-[#64748b] text-sm">Yükleniyor...</p>
      </div>
    );
  }

  const currentTab =
    pathname === '/app' || pathname === '/app/'
      ? 'explore'
      : pathname.startsWith('/app/favorites')
        ? 'favorites'
        : pathname.startsWith('/app/reservations')
          ? 'reservations'
          : pathname.startsWith('/app/messages')
            ? 'messages'
            : pathname.startsWith('/app/profile')
              ? 'profile'
              : 'explore';

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc]">
      {/* Mobile: header */}
      <header className="flex md:hidden items-center bg-white border-b border-[#e2e8f0] px-4 py-3 sticky top-0 z-10">
        <Link href="/app" className="w-8 h-8 bg-[#f1f5f9] rounded-lg flex items-center justify-center text-lg mr-2.5">
          📱
        </Link>
        <h1 className="text-xl font-semibold text-[#0f172a] flex-1">
          {TABS.find((t) => t.key === currentTab)?.label ?? 'Keşfet'}
        </h1>
      </header>

      {/* Desktop: sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 md:flex-shrink-0 md:bg-white md:border-r md:border-[#e2e8f0] md:sticky md:top-0 md:h-screen">
        <div className="p-4 border-b border-[#e2e8f0]">
          <Link href="/app" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-[#f0fdf4] rounded-xl flex items-center justify-center text-xl">
              📱
            </div>
            <span className="font-semibold text-[#0f172a]">Rezvio</span>
          </Link>
        </div>
        <nav className="p-3 flex flex-col gap-0.5">
          {TABS.map((t) => {
            const isActive = currentTab === t.key;
            return (
              <Link
                key={t.key}
                href={t.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#f0fdf4] text-[#15803d]'
                    : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto md:min-w-0">
        <div className="md:max-w-5xl md:mx-auto md:px-6 md:py-6">
          {children}
        </div>
      </main>

      {/* Mobile: bottom nav */}
      <nav className="flex md:hidden bg-white border-t border-[#e2e8f0] py-2 sticky bottom-0">
        {TABS.map((t) => {
          const isActive = currentTab === t.key;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={`flex-1 text-center py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#15803d] font-semibold border-t-2 border-[#15803d] -mt-0.5 pt-2'
                  : 'text-[#64748b]'
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
