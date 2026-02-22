'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

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
  created_at: string;
  updated_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  businesses: { name: string } | null;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('reservations')
        .select(`
          id,
          business_id,
          reservation_date,
          reservation_time,
          duration_minutes,
          duration_display,
          party_size,
          status,
          customer_name,
          customer_phone,
          customer_email,
          special_requests,
          created_at,
          updated_at,
          confirmed_at,
          cancelled_at,
          businesses ( name )
        `)
        .eq('id', id)
        .single();
      if (err) {
        setError(err.message);
        setReservation(null);
      } else {
        const raw = data as Record<string, unknown>;
        const b = raw?.businesses;
        const businessesNorm: { name: string } | null =
          Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
        setReservation({ ...raw, businesses: businessesNorm } as ReservationDetail);
      }
      setLoading(false);
    }
    load();
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
              <button
                onClick={() => updateStatus('cancelled')}
                disabled={actionLoading}
                className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                İptal
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
