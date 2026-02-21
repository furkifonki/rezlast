'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type Category = { id: string; name: string };
type Business = {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  is_active: boolean;
};

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      if (!id) return;
      setLoading(true);
      setError(null);

      const [businessRes, categoriesRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', id).single(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
      ]);

      if (businessRes.error) {
        setError(businessRes.error.message);
        setForm(null);
      } else {
        setForm(businessRes.data as Business);
      }
      setCategories((categoriesRes.data ?? []) as Category[]);
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
      .from('businesses')
      .update({
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim() || 'Istanbul',
        district: form.district?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        website: form.website?.trim() || null,
        description: form.description?.trim() || null,
        is_active: form.is_active,
        category_id: form.category_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', form.id);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/dashboard/businesses');
    router.refresh();
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">İşletme düzenleniyor</h1>
        <p className="text-zinc-500 mt-2">Yükleniyor...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div>
        <Link href="/dashboard/businesses" className="text-sm text-zinc-600 hover:underline">← İşletmelerim</Link>
        <p className="mt-4 text-red-600">{error ?? 'İşletme bulunamadı.'}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/businesses" className="text-sm text-zinc-600 hover:text-zinc-900">← İşletmelerim</Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-2">İşletme Düzenle</h1>
        <p className="text-zinc-600 text-sm mt-1">{form.name}</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme adı *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => f ? { ...f, name: e.target.value } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Kategori *</label>
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm((f) => f ? { ...f, category_id: e.target.value } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Adres *</label>
          <input
            type="text"
            required
            value={form.address}
            onChange={(e) => setForm((f) => f ? { ...f, address: e.target.value } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Şehir</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => f ? { ...f, city: e.target.value } : f)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">İlçe</label>
            <input
              type="text"
              value={form.district ?? ''}
              onChange={(e) => setForm((f) => f ? { ...f, district: e.target.value || null } : f)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Telefon</label>
          <input
            type="tel"
            value={form.phone ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, phone: e.target.value || null } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
          <input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, email: e.target.value || null } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Web sitesi</label>
          <input
            type="url"
            value={form.website ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, website: e.target.value || null } : f)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm((f) => f ? { ...f, description: e.target.value || null } : f)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm((f) => f ? { ...f, is_active: e.target.checked } : f)}
            className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
          />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Aktif</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <Link
            href="/dashboard/businesses"
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            İptal
          </Link>
        </div>
      </form>
    </div>
  );
}
