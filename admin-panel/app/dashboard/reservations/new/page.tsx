'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Business = { id: string; name: string };
type Table = { id: string; table_number: string; capacity: number };
type Service = { id: string; name: string };

export default function NewReservationPage() {
  const router = useRouter();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_id: '',
    reservation_date: '',
    reservation_time: '12:00',
    duration_type: 'no_limit' as 'no_limit' | 'all_day' | 'all_evening' | 'minutes',
    duration_minutes: 30,
    party_size: 2,
    table_id: '',
    service_id: '',
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    special_requests: '',
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

  useEffect(() => {
    if (!form.business_id) {
      setTables([]);
      setServices([]);
      setForm((f) => ({ ...f, table_id: '', service_id: '' }));
      return;
    }
    const supabase = createClient();
    (async () => {
      const [tRes, sRes] = await Promise.all([
        supabase.from('tables').select('id, table_number, capacity').eq('business_id', form.business_id).eq('is_active', true).order('table_number'),
        supabase.from('services').select('id, name').eq('business_id', form.business_id).eq('is_active', true).order('name'),
      ]);
      setTables((tRes.data ?? []) as Table[]);
      setServices((sRes.data ?? []) as Service[]);
      setForm((f) => ({ ...f, table_id: '', service_id: '' }));
    })();
  }, [form.business_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.business_id || !form.reservation_date || !form.reservation_time) {
      setError('İşletme, tarih ve saat zorunludur.');
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      setSaving(false);
      return;
    }
    const isTimed = form.duration_type === 'minutes';
    const duration_minutes = isTimed ? Math.max(1, Number(form.duration_minutes)) : 0;
    const duration_display = isTimed ? null : form.duration_type;
    const { error: err } = await supabase.from('reservations').insert({
      business_id: form.business_id,
      user_id: user.id,
      reservation_date: form.reservation_date,
      reservation_time: form.reservation_time,
      duration_minutes,
      duration_display,
      party_size: form.party_size,
      table_id: form.table_id.trim() || null,
      service_id: form.service_id.trim() || null,
      customer_name: form.customer_name.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      customer_email: form.customer_email.trim() || null,
      special_requests: form.special_requests.trim() || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push('/dashboard/reservations');
    router.refresh();
  };

  if (loading) {
    return (
      <div>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div>
        <p className="text-zinc-600">Önce bir işletme eklemeniz gerekiyor.</p>
        <Link href="/dashboard/businesses/new" className="mt-2 inline-block text-green-700 hover:underline">
          İşletme ekle →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard/reservations" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Rezervasyonlar
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Yeni Rezervasyon Ekle</h1>
        <p className="text-zinc-600 text-sm">
          Telefon veya yerinde gelen rezervasyonu buradan ekleyebilirsiniz. Test için de kullanabilirsiniz.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">İşletme *</label>
          <select
            required
            value={form.business_id}
            onChange={(e) => setForm((f) => ({ ...f, business_id: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Masa</label>
            <select
              value={form.table_id}
              onChange={(e) => setForm((f) => ({ ...f, table_id: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">Seçin (opsiyonel)</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>Masa {t.table_number} (kapasite: {t.capacity})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Hizmet</label>
            <select
              value={form.service_id}
              onChange={(e) => setForm((f) => ({ ...f, service_id: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            >
              <option value="">Seçin (opsiyonel)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Tarih *</label>
            <input
              type="date"
              required
              value={form.reservation_date}
              onChange={(e) => setForm((f) => ({ ...f, reservation_date: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Saat *</label>
            <input
              type="time"
              required
              value={form.reservation_time}
              onChange={(e) => setForm((f) => ({ ...f, reservation_time: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Süre</label>
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
                  step={5}
                  value={form.duration_minutes}
                  onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Math.max(1, Number(e.target.value) || 30) }))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
                  placeholder="30"
                />
                <p className="mt-1 text-xs text-zinc-500">Örn. berber 30 dk, tedavi 45 dk.</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Kişi sayısı</label>
            <input
              type="number"
              min={1}
              value={form.party_size}
              onChange={(e) => setForm((f) => ({ ...f, party_size: Number(e.target.value) || 1 }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Müşteri adı</label>
          <input
            type="text"
            value={form.customer_name}
            onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            placeholder="Örn. Ahmet Yılmaz"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={form.customer_phone}
              onChange={(e) => setForm((f) => ({ ...f, customer_phone: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="05XX XXX XX XX"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">E-posta</label>
            <input
              type="email"
              value={form.customer_email}
              onChange={(e) => setForm((f) => ({ ...f, customer_email: e.target.value }))}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
              placeholder="musteri@email.com"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 mb-1">Özel istekler</label>
          <textarea
            value={form.special_requests}
            onChange={(e) => setForm((f) => ({ ...f, special_requests: e.target.value }))}
            rows={2}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900"
            placeholder="Opsiyonel"
          />
        </div>
        <div className="flex gap-2 pt-2">
          <Link
            href="/dashboard/reservations"
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            İptal
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? 'Kaydediliyor...' : 'Rezervasyon Ekle'}
          </button>
        </div>
      </form>
    </div>
  );
}
