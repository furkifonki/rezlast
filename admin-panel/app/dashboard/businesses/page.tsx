'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type Category = { id: string; name: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  district: string | null;
  is_active: boolean;
  categories: Category | null;
};

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          slug,
          address,
          city,
          district,
          is_active,
          categories ( id, name )
        `)
        .order('created_at', { ascending: false });
      if (err) {
        setError(err.message);
        setBusinesses([]);
      } else {
        setBusinesses((data ?? []) as Business[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">İşletmelerim</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">İşletmelerim</h1>
          <p className="text-zinc-600 text-sm">
            İşletmelerinizi ekleyebilir ve düzenleyebilirsiniz.
          </p>
        </div>
        <Link
          href="/dashboard/businesses/new"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Yeni İşletme Ekle
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {businesses.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Henüz işletme eklenmedi.
          <br />
          <Link
            href="/dashboard/businesses/new"
            className="mt-3 inline-block text-green-700 hover:underline"
          >
            İlk işletmenizi ekleyin →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  İşletme
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Kategori
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Adres
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">
                  Durum
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">
                  İşlem
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {businesses.map((b) => (
                <tr key={b.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-zinc-900">{b.name}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {(b.categories as Category)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 text-sm">
                    {b.district ? `${b.district}, ` : ''}
                    {b.city}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {b.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/businesses/${b.id}/edit`}
                      className="text-sm text-green-700 hover:underline"
                    >
                      Düzenle
                    </Link>
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
