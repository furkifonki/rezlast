'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type TableRow = {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  floor_number: number;
  table_type: string | null;
  is_active: boolean;
  businesses: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  indoor: 'İç mekân',
  outdoor: 'Teras',
  vip: 'VIP',
};

export default function TablesPage() {
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('tables')
        .select('id, business_id, table_number, capacity, floor_number, table_type, is_active, businesses ( name )')
        .order('table_number');
      if (err) {
        setError(err.message);
        setTables([]);
      } else {
        setTables((data ?? []) as TableRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu masayı silmek istediğinize emin misiniz?')) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from('tables').delete().eq('id', id);
    if (err) setError(err.message);
    else setTables((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Masa Planı</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Masa Planı</h1>
          <p className="text-zinc-600 text-sm">
            Restoran işletmeleriniz için masa tanımlayın (kapasite, kat, tip).
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/dashboard/tables/plan"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Masa planı editörü (sürükle-bırak)
          </Link>
          <Link
            href="/dashboard/tables/new"
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
          >
            Yeni Masa Ekle
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {tables.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Henüz masa tanımı yok.
          <br />
          <Link href="/dashboard/tables/new" className="mt-3 inline-block text-green-700 hover:underline">
            İlk masayı ekleyin →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Masa no</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kapasite</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tip</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {tables.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-medium text-zinc-900">{t.table_number}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{(t.businesses as { name: string } | null)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{t.capacity} kişi</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{t.floor_number}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{t.table_type ? TYPE_LABELS[t.table_type] ?? t.table_type : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {t.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/tables/${t.id}/edit`} className="mr-2 text-sm text-green-700 hover:underline">Düzenle</Link>
                    <button type="button" onClick={() => handleDelete(t.id)} className="text-sm text-red-600 hover:underline">Sil</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
