'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';

type Reservation = {
  id: string;
  business_id: string;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  party_size: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  special_requests: string | null;
  created_at: string;
  businesses: { name: string } | null;
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

function ReservationsContent() {
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get('status');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>(statusFromUrl && ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(statusFromUrl) ? statusFromUrl : 'all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (statusFromUrl && ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(statusFromUrl)) {
      setFilterStatus(statusFromUrl);
    }
  }, [statusFromUrl]);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setReservations([]);
        setLoading(false);
        return;
      }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b) => b.id);
      if (businessIds.length === 0) {
        setReservations([]);
        setLoading(false);
        return;
      }
      let query = supabase
        .from('reservations')
        .select(`
          id,
          business_id,
          reservation_date,
          reservation_time,
          duration_minutes,
          party_size,
          status,
          customer_name,
          customer_phone,
          customer_email,
          special_requests,
          created_at,
          businesses ( name )
        `)
        .in('business_id', businessIds)
        .order('reservation_date', { ascending: false })
        .order('reservation_time', { ascending: false });

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
      if (filterDateFrom) {
        query = query.gte('reservation_date', filterDateFrom);
      }
      if (filterDateTo) {
        query = query.lte('reservation_date', filterDateTo);
      }

      const { data, error: err } = await query;
      if (err) {
        setError(err.message);
        setReservations([]);
      } else {
        const rows = (data ?? []) as Array<Record<string, unknown>>;
        const normalized: Reservation[] = rows.map((row) => {
          const b = row.businesses;
          const businessesNorm: { name: string } | null =
            Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          return { ...row, businesses: businessesNorm } as Reservation;
        });
        setReservations(normalized);
      }
      setLoading(false);
    }
    load();
  }, [filterStatus, filterDateFrom, filterDateTo]);

  const updateStatus = async (id: string, status: string) => {
    setActionLoading(id);
    const supabase = createClient();
    const payload: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'confirmed') payload.confirmed_at = new Date().toISOString();
    if (status === 'cancelled') payload.cancelled_at = new Date().toISOString();

    const { error: err } = await supabase.from('reservations').update(payload).eq('id', id);
    setActionLoading(null);
    if (err) {
      setError(err.message);
      return;
    }
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 mb-1">Rezervasyonlar</h1>
          <p className="text-zinc-600 text-sm">
            İşletmelerinize gelen rezervasyonları listeleyebilir, onaylayabilir veya iptal edebilirsiniz.
          </p>
        </div>
        <Link
          href="/dashboard/reservations/new"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
        >
          Yeni Rezervasyon Ekle
        </Link>
      </div>

      {/* Filtreler */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4">
        <label className="text-sm font-medium text-zinc-700">Durum:</label>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900"
        >
          <option value="all">Tümü</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <label className="text-sm font-medium text-zinc-700 ml-2">Tarih:</label>
        <input
          type="date"
          value={filterDateFrom}
          onChange={(e) => setFilterDateFrom(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
        <span className="text-zinc-400">–</span>
        <input
          type="date"
          value={filterDateTo}
          onChange={(e) => setFilterDateTo(e.target.value)}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-zinc-500">Yükleniyor...</p>
      ) : reservations.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center text-zinc-500">
          Bu filtreye uyan rezervasyon yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Tarih / Saat</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">İşletme</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Müşteri</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Kişi</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-zinc-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {reservations.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 text-sm">
                    <Link href={`/dashboard/reservations/${r.id}`} className="text-green-700 hover:underline font-medium">
                      {r.reservation_date} · {String(r.reservation_time).slice(0, 5)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {(r.businesses as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">
                    {r.customer_name || r.customer_phone || r.customer_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-600">{r.party_size}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[r.status] ?? 'bg-zinc-100 text-zinc-600'}`}
                    >
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/reservations/${r.id}`}
                      className="mr-2 text-sm text-zinc-600 hover:underline"
                    >
                      Görüntüle
                    </Link>
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updateStatus(r.id, 'confirmed')}
                          disabled={actionLoading === r.id}
                          className="mr-2 text-sm font-medium text-green-700 hover:underline disabled:opacity-50"
                        >
                          {actionLoading === r.id ? '...' : 'Onayla'}
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'cancelled')}
                          disabled={actionLoading === r.id}
                          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                        >
                          İptal
                        </button>
                      </>
                    )}
                    {r.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => updateStatus(r.id, 'completed')}
                          disabled={actionLoading === r.id}
                          className="mr-2 text-sm font-medium text-blue-700 hover:underline disabled:opacity-50"
                        >
                          Tamamlandı
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, 'cancelled')}
                          disabled={actionLoading === r.id}
                          className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                        >
                          İptal
                        </button>
                      </>
                    )}
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

export default function ReservationsPage() {
  return (
    <Suspense fallback={<div className="p-6"><p className="text-zinc-500">Yükleniyor...</p></div>}>
      <ReservationsContent />
    </Suspense>
  );
}
