import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Dashboard</h1>
      <p className="text-zinc-600 mb-6">
        Hoş geldiniz. Sol menüden işletmelerinizi ve rezervasyonları yönetebilirsiniz.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">İşletmeler</h2>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">—</p>
          <Link
            href="/dashboard/businesses"
            className="mt-2 inline-block text-sm text-green-700 hover:underline"
          >
            İşletmeleri yönet →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Rezervasyonlar</h2>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">—</p>
          <Link
            href="/dashboard/reservations"
            className="mt-2 inline-block text-sm text-green-700 hover:underline"
          >
            Rezervasyonları gör →
          </Link>
        </div>
      </div>
    </div>
  );
}
