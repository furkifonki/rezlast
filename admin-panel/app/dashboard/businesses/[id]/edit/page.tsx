'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
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

type HourRow = {
  day_of_week: number;
  dayName: string;
  is_closed: boolean;
  open_time: string;
  close_time: string;
  break_start: string;
  break_end: string;
};

type Photo = { id: string; photo_url: string; photo_order: number; is_primary: boolean };
type Closure = { id: string; closure_date: string; reason: string | null };

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const TABS = [
  { id: 'genel', label: 'Genel bilgiler' },
  { id: 'saatler', label: 'Çalışma saatleri' },
  { id: 'fotograflar', label: 'Fotoğraflar' },
  { id: 'kapali', label: 'Kapalı günler' },
] as const;
type TabId = (typeof TABS)[number]['id'];

const defaultHourRow = (day: number): HourRow => ({
  day_of_week: day,
  dayName: DAY_NAMES[day],
  is_closed: day === 0,
  open_time: '09:00',
  close_time: '18:00',
  break_start: '',
  break_end: '',
});

function EditBusinessContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const tabFromUrl = searchParams.get('tab') as TabId | null;
  const [activeTab, setActiveTab] = useState<TabId>(
    tabFromUrl && TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : 'genel'
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Business | null>(null);
  const [hourRows, setHourRows] = useState<HourRow[]>(() => DAY_NAMES.map((_, i) => defaultHourRow(i)));
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const clearFeedback = () => {
    setError(null);
    setSuccessMessage(null);
  };
  const showSuccess = (msg: string) => {
    setError(null);
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };
  const [newClosureDate, setNewClosureDate] = useState('');
  const [newClosureReason, setNewClosureReason] = useState('');

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const [bRes, catRes, hRes, pRes, cRes] = await Promise.all([
        supabase.from('businesses').select('*').eq('id', id).eq('owner_id', user.id).single(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
        supabase.from('business_hours').select('*').eq('business_id', id).order('day_of_week'),
        supabase.from('business_photos').select('id, photo_url, photo_order, is_primary').eq('business_id', id).order('photo_order'),
        supabase.from('business_closures').select('id, closure_date, reason').eq('business_id', id).order('closure_date', { ascending: false }),
      ]);

      if (bRes.error) {
        setError(bRes.error.message);
        setForm(null);
      } else {
        setForm(bRes.data as Business);
      }
      setCategories((catRes.data ?? []) as Category[]);

      const hours = (hRes.data ?? []) as { day_of_week: number; is_closed: boolean; open_time: string | null; close_time: string | null; break_start: string | null; break_end: string | null }[];
      if (hours.length > 0) {
        const map = new Map(hours.map((h) => [h.day_of_week, h]));
        setHourRows(
          DAY_NAMES.map((_, day) => {
            const h = map.get(day);
            if (!h) return defaultHourRow(day);
            const toStr = (t: string | null) => (t ? String(t).slice(0, 5) : '');
            return {
              day_of_week: day,
              dayName: DAY_NAMES[day],
              is_closed: h.is_closed ?? false,
              open_time: toStr(h.open_time) || '09:00',
              close_time: toStr(h.close_time) || '18:00',
              break_start: toStr(h.break_start),
              break_end: toStr(h.break_end),
            };
          })
        );
      }
      setPhotos((pRes.data ?? []) as Photo[]);
      setClosures((cRes.data ?? []) as Closure[]);
      setLoading(false);
    }
    load();
  }, [id]);

  const updateHourRow = (day: number, patch: Partial<HourRow>) => {
    setHourRows((prev) => prev.map((r) => (r.day_of_week === day ? { ...r, ...patch } : r)));
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    clearFeedback();
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
    if (err) setError(err.message);
    else showSuccess('Genel bilgiler kaydedildi.');
  };

  const handleSaveHours = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    for (const row of hourRows) {
      const payload = {
        business_id: id,
        day_of_week: row.day_of_week,
        is_closed: row.is_closed,
        open_time: row.is_closed ? null : (row.open_time || null),
        close_time: row.is_closed ? null : (row.close_time || null),
        break_start: row.break_start || null,
        break_end: row.break_end || null,
      };
      const { error: err } = await supabase.from('business_hours').upsert(payload, {
        onConflict: 'business_id,day_of_week',
      });
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    showSuccess('Çalışma saatleri kaydedildi.');
  };

  const BUSINESS_PHOTOS_BUCKET = 'business-photos';

  const handlePhotoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir resim dosyası seçin (JPEG, PNG, WebP vb.).');
      return;
    }
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const safeName = `${id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage.from(BUSINESS_PHOTOS_BUCKET).upload(safeName, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadErr) {
      setSaving(false);
      setError(uploadErr.message);
      e.target.value = '';
      return;
    }
    const { data: urlData } = supabase.storage.from(BUSINESS_PHOTOS_BUCKET).getPublicUrl(safeName);
    const photoUrl = urlData.publicUrl;

    const maxOrder = photos.length ? Math.max(...photos.map((p) => p.photo_order)) + 1 : 0;
    const { data, error: err } = await supabase
      .from('business_photos')
      .insert({ business_id: id, photo_url: photoUrl, photo_order: maxOrder, is_primary: photos.length === 0 })
      .select('id, photo_url, photo_order, is_primary')
      .single();
    setSaving(false);
    e.target.value = '';
    if (err) {
      setError(err.message);
      return;
    }
    setPhotos((prev) => [...prev, data as Photo]);
    showSuccess('Fotoğraf yüklendi.');
  };

  const setPrimaryPhoto = async (photoId: string) => {
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    await supabase.from('business_photos').update({ is_primary: false }).eq('business_id', id);
    const { error: err } = await supabase.from('business_photos').update({ is_primary: true }).eq('id', photoId);
    setSaving(false);
    if (err) setError(err.message);
    else {
      setPhotos((prev) => prev.map((p) => ({ ...p, is_primary: p.id === photoId })));
      showSuccess('Öne çıkan fotoğraf güncellendi.');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('business_photos').delete().eq('id', photoId);
    setSaving(false);
    if (err) setError(err.message);
    else setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleAddClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClosureDate.trim()) return;
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from('business_closures')
      .insert({ business_id: id, closure_date: newClosureDate.trim(), reason: newClosureReason.trim() || null })
      .select('id, closure_date, reason')
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setClosures((prev) => [data as Closure, ...prev]);
    setNewClosureDate('');
    setNewClosureReason('');
    showSuccess('Kapalı gün eklendi.');
  };

  const handleDeleteClosure = async (closureId: string) => {
    clearFeedback();
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.from('business_closures').delete().eq('id', closureId);
    setSaving(false);
    if (err) setError(err.message);
    else setClosures((prev) => prev.filter((c) => c.id !== closureId));
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
        <Link href={`/dashboard/businesses/${id}`} className="text-sm text-zinc-600 hover:text-zinc-900">← İşletme detayı</Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-2">İşletme Düzenle</h1>
        <p className="text-zinc-600 text-sm mt-1">{form.name}</p>
      </div>

      {/* Sekmeler */}
      <div className="mb-4 border-b border-zinc-200">
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-white border border-b-0 border-zinc-200 text-green-700 -mb-px'
                  : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{successMessage}</div>
      )}

      {/* Genel bilgiler */}
      {activeTab === 'genel' && (
        <form onSubmit={handleSaveGeneral} className="max-w-2xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme adı *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((f) => (f ? { ...f, name: e.target.value } : f))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kategori *</label>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm((f) => (f ? { ...f, category_id: e.target.value } : f))}
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
              onChange={(e) => setForm((f) => (f ? { ...f, address: e.target.value } : f))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Şehir</label>
              <input type="text" value={form.city} onChange={(e) => setForm((f) => (f ? { ...f, city: e.target.value } : f))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">İlçe</label>
              <input type="text" value={form.district ?? ''} onChange={(e) => setForm((f) => (f ? { ...f, district: e.target.value || null } : f))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefon</label>
            <input type="tel" value={form.phone ?? ''} onChange={(e) => setForm((f) => (f ? { ...f, phone: e.target.value || null } : f))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
            <input type="email" value={form.email ?? ''} onChange={(e) => setForm((f) => (f ? { ...f, email: e.target.value || null } : f))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Web sitesi</label>
            <input type="url" value={form.website ?? ''} onChange={(e) => setForm((f) => (f ? { ...f, website: e.target.value || null } : f))} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Açıklama</label>
            <textarea value={form.description ?? ''} onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value || null } : f))} rows={3} className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={(e) => setForm((f) => (f ? { ...f, is_active: e.target.checked } : f))} className="h-4 w-4 rounded border-zinc-300 text-green-600 focus:ring-green-600" />
            <label htmlFor="is_active" className="text-sm text-zinc-700">Aktif</label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <Link href={`/dashboard/businesses/${id}`} className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              İptal
            </Link>
          </div>
        </form>
      )}

      {/* Çalışma saatleri */}
      {activeTab === 'saatler' && (
        <form onSubmit={handleSaveHours} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Gün</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kapalı</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Açılış</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kapanış</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Mola başlangıç</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Mola bitiş</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {hourRows.map((row) => (
                <tr key={row.day_of_week} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-sm font-medium text-zinc-900">{row.dayName}</td>
                  <td className="px-4 py-2">
                    <input type="checkbox" checked={row.is_closed} onChange={(e) => updateHourRow(row.day_of_week, { is_closed: e.target.checked })} className="rounded border-zinc-300" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="time" value={row.open_time} onChange={(e) => updateHourRow(row.day_of_week, { open_time: e.target.value })} disabled={row.is_closed} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="time" value={row.close_time} onChange={(e) => updateHourRow(row.day_of_week, { close_time: e.target.value })} disabled={row.is_closed} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="time" value={row.break_start} onChange={(e) => updateHourRow(row.day_of_week, { break_start: e.target.value })} disabled={row.is_closed} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="time" value={row.break_end} onChange={(e) => updateHourRow(row.day_of_week, { break_end: e.target.value })} disabled={row.is_closed} className="rounded-lg border border-zinc-300 px-2 py-1 text-sm disabled:bg-zinc-100" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 border-t border-zinc-200 bg-zinc-50 px-4 py-3">
            <button type="submit" disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
              {saving ? 'Kaydediliyor...' : 'Çalışma saatlerini kaydet'}
            </button>
          </div>
        </form>
      )}

      {/* Fotoğraflar */}
      {activeTab === 'fotograflar' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="mb-6 flex items-center gap-3">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={saving}
              className="rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            >
              {saving ? 'Yükleniyor...' : 'Bilgisayardan fotoğraf seç'}
            </button>
            <span className="text-sm text-zinc-500">JPEG, PNG veya WebP</span>
          </div>
          {photos.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz fotoğraf yok. &quot;Bilgisayardan fotoğraf seç&quot; ile ekleyin.</p>
          ) : (
            <div className="flex flex-wrap gap-4">
              {photos.map((p) => (
                <div key={p.id} className="relative rounded-lg border border-zinc-200 overflow-hidden">
                  <img src={p.photo_url} alt="" className="h-32 w-40 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {!p.is_primary && (
                      <button type="button" onClick={() => setPrimaryPhoto(p.id)} disabled={saving} className="rounded bg-white px-2 py-1 text-xs font-medium text-zinc-800 hover:bg-zinc-100 disabled:opacity-50">
                        Öne çıkan yap
                      </button>
                    )}
                    {p.is_primary && <span className="rounded bg-green-600 px-2 py-1 text-xs text-white">Öne çıkan</span>}
                    <button type="button" onClick={() => handleDeletePhoto(p.id)} disabled={saving} className="rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50">
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kapalı günler */}
      {activeTab === 'kapali' && (
        <div className="rounded-xl border border-zinc-200 bg-white p-6">
          <form onSubmit={handleAddClosure} className="mb-6 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Tarih</label>
              <input
                type="date"
                value={newClosureDate}
                onChange={(e) => setNewClosureDate(e.target.value)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-zinc-500 mb-1">Sebep (opsiyonel)</label>
              <input
                type="text"
                value={newClosureReason}
                onChange={(e) => setNewClosureReason(e.target.value)}
                placeholder="Örn. Bayram, tadilat"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
            <button type="submit" disabled={saving || !newClosureDate.trim()} className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50">
              Kapalı gün ekle
            </button>
          </form>
          {closures.length === 0 ? (
            <p className="text-sm text-zinc-500">Tanımlı kapalı gün yok.</p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {closures.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-zinc-900">{c.closure_date}</span>
                  <span className="text-sm text-zinc-600">{c.reason ?? '—'}</span>
                  <button type="button" onClick={() => handleDeleteClosure(c.id)} disabled={saving} className="text-sm text-red-600 hover:underline disabled:opacity-50">
                    Sil
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function EditBusinessPage() {
  return (
    <Suspense fallback={<div className="p-6 text-zinc-500">Yükleniyor...</div>}>
      <EditBusinessContent />
    </Suspense>
  );
}
