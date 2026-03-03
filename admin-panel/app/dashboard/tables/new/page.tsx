'use client';

import Link from 'next/link';

export default function NewTablePage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Yeni Masa Ekleme Kaldırıldı</h1>
      <p className="text-zinc-600 text-sm mb-4">
        Masa bazlı tanımlama ve yeni masa ekleme akışı artık kullanılmıyor. Rezervasyon kapasitesini
        yönetmek için yalnızca Kapasite ekranını kullanın.
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-4">
        <p>Var olan masalar sadece eski kayıtlar için saklanır; yeni rezervasyonlar bu masalara bağlı değildir.</p>
      </div>
      <Link
        href="/dashboard/capacity"
        className="inline-flex items-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
      >
        Kapasite ekranına git →
      </Link>
    </div>
  );
}
