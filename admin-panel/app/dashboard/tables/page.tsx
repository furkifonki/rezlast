'use client';

import Link from 'next/link';

export default function TablesPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Masa Planı Kaldırıldı</h1>
      <p className="text-zinc-600 text-sm mb-4">
        Masa planı ve masa bazlı yönetim artık kullanılmıyor. Rezervasyon kapasitesi sadece
        <span className="font-semibold"> Kapasite</span> ekranından işletme bazında yönetiliyor.
      </p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-4">
        <p>
          Masa planı üzerinden daha önce tanımladığınız masalar ve konumlar sadece geçmiş verilerde
          saklanmaya devam eder; yeni rezervasyon akışı bunları kullanmaz.
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
