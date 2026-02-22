'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };
type TableRow = {
  id: string;
  business_id: string;
  table_number: string;
  capacity: number;
  floor_number: number;
  table_type: string | null;
  is_active: boolean;
};

export default function EditTablePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [form, setForm] = useState<TableRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [tRes, bRes] = await Promise.all([
        supabase.from('tables').select('*').eq('id', id).single(),
        supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name'),
      ]);
      if (tRes.data) setForm(tRes.data as TableRow);
      setBusinesses((bRes.data ?? []) as Business[]);
      setLoading(false);
    }
    load();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase
      .from('tables')
      .update({
        business_id: form.business_id,
        table_number: form.table_number.trim(),
        capacity: form.capacity,
        floor_number: form.floor_number,
        table_type: form.table_type || null,
        is_active: form.is_active,
      })
      .eq('id', id);
    setSaving(false);
    if (err) setError(err.message);
    else { router.push('/dashboard/tables'); router.refresh(); }
  };

  if (loading || !form) return <p className="text-zinc-500">Yükleniyor...</p>;

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/tables" className="text-sm text-zinc-500 hover:text-zinc-700">← Masa Planı</Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Masa Düzenle</h1>
        <p className="text-zinc-600 text-sm">Masa {form.table_number}</p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme *</label>
          <select required value={form.business_id} onChange={(e) => setForm((f) => f ? { ...f, business_id: e.target.value } : f)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900">
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Masa numarası *</label>
          <input type="text" required value={form.table_number} onChange={(e) => setForm((f) => f ? { ...f, table_number: e.target.value } : f)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kapasite (kişi) *</label>
            <input type="number" min={1} required value={form.capacity} onChange={(e) => setForm((f) => f ? { ...f, capacity: Number(e.target.value) || 1 } : f)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kat</label>
            <input type="number" min={1} value={form.floor_number} onChange={(e) => setForm((f) => f ? { ...f, floor_number: Number(e.target.value) || 1 } : f)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Tip</label>
          <select value={form.table_type ?? 'indoor'} onChange={(e) => setForm((f) => f ? { ...f, table_type: e.target.value || null } : f)} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900">
            <option value="indoor">İç mekân</option>
            <option value="outdoor">Teras</option>
            <option value="vip">VIP</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm((f) => f ? { ...f, is_active: e.target.checked } : f)} className="rounded border-zinc-300" />
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
