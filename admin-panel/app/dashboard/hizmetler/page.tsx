'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type ServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  duration_display?: string | null;
  price: number | null;
  is_active: boolean;
  businesses: { name: string } | null;
};

function getDurationLabel(s: ServiceRow): string {
  if (s.duration_minutes !== 0 && s.duration_minutes != null) return `${s.duration_minutes} dk`;
  switch (s.duration_display) {
    case 'all_day': return 'Tüm gün';
    case 'all_evening': return 'Tüm akşam';
    case 'no_limit': return 'Süre sınırı yok';
    default: return s.duration_minutes === 0 ? 'Süre yok' : `${s.duration_minutes} dk`;
  }
}

function getBusinessName(s: ServiceRow): string {
  const b = s.businesses;
  if (b && typeof b === 'object' && 'name' in b) return (b as { name: string }).name;
  return '—';
}

export default function HizmetlerPage() {
  const [list, setList] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setList([]);
        setLoading(false);
        return;
      }
      const { data: myBusinesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b) => b.id);
      if (businessIds.length === 0) {
        setList([]);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('services')
        .select('id, business_id, name, description, duration_minutes, duration_display, price, is_active, businesses ( name )')
        .in('business_id', businessIds)
        .order('created_at', { ascending: false });
      if (err) {
        setError(err.message);
        setList([]);
      } else {
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const normalized: ServiceRow[] = rows.map((row) => {
          const b = row.businesses;
          const businessesNormalized: { name: string } | null =
            Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          return { ...row, businesses: businessesNormalized } as ServiceRow;
        });
        setList(normalized);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hizmeti silmek istediğinize emin misiniz?')) return;
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from('services').delete().eq('id', id);
    if (err) setError(err.message);
    else setList((prev) => prev.filter((s) => s.id !== id));
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Hizmetler</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Hizmetler</h1>
          <p className="text-zinc-600 text-sm">
            Berber / güzellik salonu gibi işletmeleriniz için hizmet tanımlayın (süre, fiyat).
          </p>
        </div>
        <Link
          href="/dashboard/hizmetler/new"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Yeni Hizmet Ekle
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Henüz hizmet tanımı yok.
          <br />
          <Link href="/dashboard/hizmetler/new" className="mt-3 inline-block text-green-700 hover:underline">
            İlk hizmeti ekleyin
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Hizmet</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Süre</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Fiyat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {list.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{s.name}</span>
                    {s.description ? (
                      <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[200px]">{s.description}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{getBusinessName(s)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{getDurationLabel(s)}</td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {s.price != null ? `₺${Number(s.price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-zinc-100 text-zinc-600'}`}>
                      {s.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/dashboard/hizmetler/${s.id}/edit`} className="mr-2 text-sm text-green-700 hover:underline">
                      Düzenle
                    </Link>
                    <button type="button" onClick={() => handleDelete(s.id)} className="text-sm text-red-600 hover:underline">
                      Sil
                    </button>
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
