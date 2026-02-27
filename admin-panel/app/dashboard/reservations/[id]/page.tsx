'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type PaymentMethod = { id: string; name: string };
type ReservationDetail = {
  id: string;
  business_id: string;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  duration_display?: string | null;
  party_size: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  special_requests: string | null;
  amount: number | null;
  payment_method_id: string | null;
  created_at: string;
  updated_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  businesses: { name: string } | null;
  payment_methods: PaymentMethod | null;
};

const DURATION_DISPLAY_LABELS: Record<string, string> = {
  no_limit: 'Süre sınırı yok',
  all_day: 'Tüm gün',
  all_evening: 'Tüm akşam',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-zinc-100 text-zinc-600',
  completed: 'bg-blue-100 text-blue-800',
  no_show: 'bg-red-100 text-red-800',
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export default function ReservationDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethodIdInput, setPaymentMethodIdInput] = useState<string>('');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueMessage, setRevenueMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revenueSectionAvailable, setRevenueSectionAvailable] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const resSelect = `
          id, business_id, reservation_date, reservation_time, duration_minutes, duration_display,
          party_size, status, customer_name, customer_phone, customer_email, special_requests,
          created_at, updated_at, confirmed_at, cancelled_at, businesses ( name )
        `;
        const resSelectWithRevenue = `${resSelect}, amount, payment_method_id, payment_methods ( id, name )`;
        let resData: Record<string, unknown> | null = null;
        let resErr: { message: string } | null = null;
        const res = await supabase.from('reservations').select(resSelectWithRevenue).eq('id', id).single();
        resData = res.data as Record<string, unknown> | null;
        resErr = res.error;
        if (resErr && (resErr.message.includes('payment_methods') || resErr.message.includes('amount'))) {
          setRevenueSectionAvailable(false);
          const retry = await supabase.from('reservations').select(resSelect).eq('id', id).single();
          resData = retry.data as Record<string, unknown> | null;
          resErr = retry.error;
        } else if (!resErr) {
          setRevenueSectionAvailable(true);
        }
        let pmData: PaymentMethod[] = [];
        const pmRes = await supabase.from('payment_methods').select('id, name').order('sort_order').order('name');
        if (!pmRes.error) pmData = (pmRes.data ?? []) as PaymentMethod[];
        if (cancelled) return;
        setPaymentMethods(pmData);
        if (resErr) {
          setError(resErr.message);
          setReservation(null);
        } else if (resData) {
          const b = resData.businesses;
          const businessesNorm: { name: string } | null =
            Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          const pm = resData.payment_methods;
          const pmNorm: PaymentMethod | null =
            Array.isArray(pm) && pm.length > 0 ? (pm[0] as PaymentMethod) : pm && typeof pm === 'object' && 'name' in pm ? (pm as PaymentMethod) : null;
          const resObj = { ...resData, businesses: businessesNorm, payment_methods: pmNorm, amount: resData.amount ?? null, payment_method_id: resData.payment_method_id ?? null } as ReservationDetail;
          setReservation(resObj);
          setAmountInput(resObj.amount != null ? String(resObj.amount) : '');
          setPaymentMethodIdInput(resObj.payment_method_id ?? '');
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Veri yüklenemedi.');
          setReservation(null);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const updateStatus = async (status: string) => {
    if (!reservation) return;
    setActionLoading(true);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'confirmed') payload.confirmed_at = new Date().toISOString();
    if (status === 'cancelled') payload.cancelled_at = new Date().toISOString();

    const { error: err } = await supabase.from('reservations').update(payload).eq('id', id);
    setActionLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setReservation((prev) =>
      prev
        ? {
            ...prev,
            status,
            confirmed_at: status === 'confirmed' ? (payload.confirmed_at as string) : prev.confirmed_at,
            cancelled_at: status === 'cancelled' ? (payload.cancelled_at as string) : prev.cancelled_at,
          }
        : null
    );
  };

  const saveRevenue = async () => {
    if (!reservation) return;
    setRevenueMessage(null);
    setSavingRevenue(true);
    const supabase = createClient();
    const amountVal = amountInput.trim() === '' ? null : parseFloat(amountInput.replace(',', '.'));
    const paymentMethodIdVal = paymentMethodIdInput === '' ? null : paymentMethodIdInput;
    const payload: { amount: number | null; payment_method_id: string | null; updated_at: string } = {
      amount: amountVal != null && !Number.isNaN(amountVal) ? amountVal : null,
      payment_method_id: paymentMethodIdVal,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase.from('reservations').update(payload).eq('id', id);
    setSavingRevenue(false);
    if (err) {
      setRevenueMessage({ type: 'error', text: err.message });
      return;
    }
    setReservation((prev) =>
      prev ? { ...prev, amount: payload.amount, payment_method_id: payload.payment_method_id } : null
    );
    setRevenueMessage({ type: 'success', text: 'Gelir bilgisi kaydedildi.' });
    setTimeout(() => setRevenueMessage(null), 4000);
  };

  if (loading) {
    return (
      <div>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div>
        <p className="text-red-600">{error ?? 'Rezervasyon bulunamadı.'}</p>
        <Link href="/dashboard/reservations" className="mt-2 inline-block text-green-700 hover:underline">
          ← Rezervasyonlara dön
        </Link>
      </div>
    );
  }

  const businessName = (reservation.businesses as { name: string } | null)?.name ?? '—';

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/reservations" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Rezervasyonlar
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900 mt-1">Rezervasyon Detayı</h1>
        </div>
        <span
          className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASS[reservation.status] ?? 'bg-zinc-100 text-zinc-600'}`}
        >
          {STATUS_LABELS[reservation.status] ?? reservation.status}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Müşteri bilgisi */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Müşteri Bilgisi</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">Ad Soyad</dt>
              <dd className="font-medium text-zinc-900">{reservation.customer_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Telefon</dt>
              <dd className="text-zinc-900">{reservation.customer_phone ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">E-posta</dt>
              <dd className="text-zinc-900">{reservation.customer_email ?? '—'}</dd>
            </div>
          </dl>
        </div>

        {/* Rezervasyon detayı */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Rezervasyon Detayı</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-zinc-500">İşletme</dt>
              <dd className="font-medium text-zinc-900">{businessName}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Tarih & Saat</dt>
              <dd className="text-zinc-900">
                {reservation.reservation_date} · {String(reservation.reservation_time).slice(0, 5)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Süre</dt>
              <dd className="text-zinc-900">
                {reservation.duration_minutes === 0
                  ? (reservation.duration_display && DURATION_DISPLAY_LABELS[reservation.duration_display]) ?? 'Süre sınırı yok'
                  : `${reservation.duration_minutes} dk`}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Kişi sayısı</dt>
              <dd className="text-zinc-900">{reservation.party_size}</dd>
            </div>
            {reservation.special_requests && (
              <div>
                <dt className="text-zinc-500">Özel istekler</dt>
                <dd className="text-zinc-900">{reservation.special_requests}</dd>
              </div>
            )}
          </dl>

          {/* Gelir bilgisi (opsiyonel) - migration sonrası görünür */}
          {revenueSectionAvailable && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <h3 className="text-sm font-semibold text-zinc-700 mb-2">Gelir bilgisi</h3>
            {revenueMessage && (
              <div
                className={`mb-2 rounded-lg border px-3 py-2 text-sm ${revenueMessage.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700'}`}
              >
                {revenueMessage.type === 'success' ? '✓ ' : '✗ '}{revenueMessage.text}
              </div>
            )}
            <p className="text-xs text-zinc-500 mb-2">Ücret ve ödeme yöntemi opsiyoneldir; gelir tablosunda listelenir.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Ücret (₺)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm w-28"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1">Ödeme yöntemi</label>
                <select
                  value={paymentMethodIdInput}
                  onChange={(e) => setPaymentMethodIdInput(e.target.value)}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm min-w-[140px]"
                >
                  <option value="">Seçin</option>
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>{pm.name}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={saveRevenue}
                disabled={savingRevenue}
                className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
              >
                {savingRevenue ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
          )}

          {/* Aksiyonlar */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
            {reservation.status === 'pending' && (
              <>
                <button
                  onClick={() => updateStatus('confirmed')}
                  disabled={actionLoading}
                  className="rounded-lg bg-green-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  Onayla
                </button>
                <button
                  onClick={() => updateStatus('cancelled')}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  İptal
                </button>
              </>
            )}
            {reservation.status === 'confirmed' && (
              <>
                <button
                  onClick={() => updateStatus('completed')}
                  disabled={actionLoading}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Tamamlandı
                </button>
                <button
                  onClick={() => updateStatus('cancelled')}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  İptal
                </button>
              </>
            )}
            {reservation.status === 'completed' && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.confirm('Bu rezervasyonu tekrar "Onaylandı" durumuna almak istediğinize emin misiniz?')) {
                    updateStatus('confirmed');
                  }
                }}
                disabled={actionLoading}
                className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                Onaylandıya geri al
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Zaman çizelgesi */}
      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase text-zinc-500 mb-3">Zaman Çizelgesi</h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <span className="text-zinc-400">Oluşturuldu</span>
            <span className="text-zinc-900">{formatDateTime(reservation.created_at)}</span>
          </li>
          {reservation.confirmed_at && (
            <li className="flex items-center gap-3">
              <span className="text-green-600">Onaylandı</span>
              <span className="text-zinc-900">{formatDateTime(reservation.confirmed_at)}</span>
            </li>
          )}
          {reservation.cancelled_at && (
            <li className="flex items-center gap-3">
              <span className="text-red-600">İptal</span>
              <span className="text-zinc-900">{formatDateTime(reservation.cancelled_at)}</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
