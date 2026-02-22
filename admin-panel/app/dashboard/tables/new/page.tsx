'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };

function NewTableContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams.get('business_id');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_id: businessIdFromUrl || '',
    table_number: '',
    capacity: 2,
    floor_number: 1,
    table_type: 'indoor' as string,
    is_active: true,
  });

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
      setBusinesses((data ?? []) as Business[]);
      const firstId = data?.length ? data[0].id : '';
      setForm((f) => ({ ...f, business_id: businessIdFromUrl && data?.some((b) => b.id === businessIdFromUrl) ? businessIdFromUrl : firstId }));
      setLoading(false);
    }
    load();
  }, [businessIdFromUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_id || !form.table_number.trim()) {
      setError('İşletme ve masa numarası zorunludur.');
      return;
    }
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('tables').insert({
      business_id: form.business_id,
      table_number: form.table_number.trim(),
      capacity: form.capacity,
      floor_number: form.floor_number,
      table_type: form.table_type || null,
      is_active: form.is_active,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/dashboard/tables');
    router.refresh();
  };

  if (loading) return <p className="text-zinc-500">Yükleniyor...</p>;
  if (businesses.length === 0) {
    return (
      <div>
        <p className="text-zinc-600">Önce bir işletme eklemeniz gerekiyor.</p>
        <Link href="/dashboard/businesses/new" className="mt-2 inline-block text-green-700 hover:underline">İşletme ekle →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/tables" className="text-sm text-zinc-500 hover:text-zinc-700">← Masa Planı</Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Yeni Masa Ekle</h1>
        <p className="text-zinc-600 text-sm">Restoran için masa numarası, kapasite ve tip.</p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme *</label>
          <select required value={form.business_id} onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Masa numarası *</label>
          <input type="text" required value={form.table_number} onChange={(e) => setForm((f) => ({ ...f, table_number: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" placeholder="Örn. 1, A1, Teras-3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Kapasite (kişi sayısı) *</label>
          <input type="number" min={1} max={99} required value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" placeholder="Örn. 4" />
          <p className="mt-1 text-xs text-zinc-500">Bu masada kaç kişi oturabilir?</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kat</label>
            <input type="number" min={1} value={form.floor_number} onChange={(e) => setForm((f) => ({ ...f, floor_number: Number(e.target.value) || 1 }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Alan tipi</label>
            <select value={form.table_type} onChange={(e) => setForm((f) => ({ ...f, table_type: e.target.value }))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900">
              <option value="indoor">İç Mekân</option>
              <option value="outdoor">Dış Mekân</option>
              <option value="terrace">Teras</option>
              <option value="seaside">Deniz Kenarı</option>
              <option value="vip">VIP</option>
              <option value="bar">Bar</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-zinc-300" />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Aktif</label>
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/tables" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">İptal</Link>
          <button type="submit" disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </form>
    </div>
  );
}

export default function NewTablePage() {
  return (
    <Suspense fallback={<p className="text-zinc-500">Yükleniyor...</p>}>
      <NewTableContent />
    </Suspense>
  );
}
