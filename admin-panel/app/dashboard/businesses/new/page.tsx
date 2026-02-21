'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { slugify } from '@/lib/utils';

type Category = { id: string; name: string };

export default function NewBusinessPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    category_id: '',
    address: '',
    city: 'Istanbul',
    district: '',
    phone: '',
    email: '',
    website: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    const supabase = createClient();
    async function loadCategories() {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      setCategories((data ?? []) as Category[]);
      if (data?.length) {
        setForm((f) => (f.category_id ? f : { ...f, category_id: data[0].id }));
      }
    }
    loadCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Oturum bulunamadı. Tekrar giriş yapın.');
      setLoading(false);
      return;
    }

    const slug = slugify(form.name) || 'isletme';
    const { error: err } = await supabase.from('businesses').insert({
      owner_id: user.id,
      name: form.name.trim(),
      slug,
      category_id: form.category_id,
      address: form.address.trim(),
      city: form.city.trim() || 'Istanbul',
      district: form.district.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      description: form.description.trim() || null,
      is_active: form.is_active,
    });

    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/dashboard/businesses');
    router.refresh();
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/businesses"
          className="text-sm text-zinc-600 hover:text-zinc-900"
        >
          ← İşletmelerim
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-2">Yeni İşletme Ekle</h1>
        <p className="text-zinc-600 text-sm mt-1">İşletme bilgilerini doldurun.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme adı *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="Örn: Lezzet Restoran"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Kategori *</label>
          <select
            required
            value={form.category_id}
            onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
          >
            <option value="">Seçin</option>
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
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="Sokak, bina no, mahalle"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Şehir</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              placeholder="Istanbul"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">İlçe</label>
            <input
              type="text"
              value={form.district}
              onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              placeholder="Kadıköy"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Telefon</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="+90 555 123 45 67"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="info@isletme.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Web sitesi</label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            placeholder="İşletme hakkında kısa bilgi"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_active"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600"
          />
          <label htmlFor="is_active" className="text-sm text-zinc-700">Aktif (liste ve rezervasyonda görünsün)</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
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
