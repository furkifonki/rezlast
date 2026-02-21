'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
  ];

  return (
    <div className="min-h-screen flex bg-zinc-50">
      <aside className="w-56 bg-zinc-900 text-white flex flex-col">
        <div className="p-4 border-b border-zinc-700">
          <h1 className="font-semibold text-green-400">Rezervasyon Admin</h1>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {nav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                pathname === href
                  ? 'bg-green-700 text-white'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
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
          <span className="text-zinc-600 text-sm">Admin Panel</span>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
