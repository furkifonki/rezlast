'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };

export default function NewHizmetPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_id: '',
    name: '',
    description: '',
    duration_type: 'minutes' as 'no_limit' | 'all_day' | 'all_evening' | 'minutes',
    duration_minutes: 30,
    price: '' as string | number,
    is_active: true,
  });

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from('businesses').select('id, name').eq('owner_id', user.id).order('name');
      setBusinesses((data ?? []) as Business[]);
      if (data?.length) setForm((f) => ({ ...f, business_id: data[0].id }));
      setLoading(false);
    }
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.business_id || !form.name.trim()) {
      setError('İşletme ve hizmet adı zorunludur.');
      return;
    }
    setError(null);
    setSaving(true);
    const supabase = createClient();
    const priceNum = form.price === '' ? null : Number(form.price);
    const isTimed = form.duration_type === 'minutes';
    const duration_minutes = isTimed ? Math.max(1, form.duration_minutes) : 0;
    const duration_display = isTimed ? null : form.duration_type;
    const { error: err } = await supabase.from('services').insert({
      business_id: form.business_id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      duration_minutes,
      duration_display,
      price: priceNum,
      is_active: form.is_active,
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/dashboard/hizmetler');
    router.refresh();
  };

  if (loading) return <p className="text-zinc-500">Yükleniyor...</p>;
  if (businesses.length === 0) {
    return (
      <div>
        <p className="text-zinc-600">Önce bir işletme eklemeniz gerekiyor.</p>
        <Link href="/dashboard/businesses/new" className="mt-2 inline-block text-green-700 hover:underline">İşletme ekle</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/hizmetler" className="text-sm text-zinc-500 hover:text-zinc-700">← Hizmetler</Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Yeni Hizmet Ekle</h1>
        <p className="text-zinc-600 text-sm">Süre (dakika) ve isteğe bağlı fiyat girin.</p>
      </div>
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme *</label>
          <select
            required
            value={form.business_id}
            onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Hizmet adı *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            placeholder="Örn. Saç kesimi"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Süre *</label>
            <select
              value={form.duration_type}
              onChange={(e) => setForm((f) => ({ ...f, duration_type: e.target.value as typeof form.duration_type }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="no_limit">Süre sınırı yok</option>
              <option value="all_day">Tüm gün</option>
              <option value="all_evening">Tüm akşam</option>
              <option value="minutes">Belirli süre (dakika)</option>
            </select>
            {form.duration_type === 'minutes' && (
              <div className="mt-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Math.max(1, Number(e.target.value) || 30) }))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                  placeholder="30"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Fiyat (₺)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value === '' ? '' : e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="Opsiyonel"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="rounded border-zinc-300"
          />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Aktif</label>
        </div>
        <div className="flex gap-2 pt-2">
          <Link href="/dashboard/hizmetler" className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">İptal</Link>
          <button type="submit" disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
