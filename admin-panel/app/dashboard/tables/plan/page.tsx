'use client';

import Link from 'next/link';

export default function TablePlanPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Masa Planı Editörü Kaldırıldı</h1>
      <p className="text-zinc-600 text-sm mb-4">
        Sürükle-bırak masa planı editörü artık sistemde kullanılmıyor. Rezervasyonlar, işletme
        bazında tanımlanan kapasite kuralları ile yönetiliyor.
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-4">
        <p>
          Eski masa konumları sadece geçmiş kayıtlar için saklanır; yeni rezervasyon akışı bu
          planları kullanmaz. Yeni kapasite ayarları için Kapasite ekranını kullanın.
        </p>
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
