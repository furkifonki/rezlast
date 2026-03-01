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
  amount: number | null;
  payment_method_id: string | null;
  created_at: string;
  businesses: { name: string } | null;
  payment_methods: { id: string; name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  approved: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
  rejected: 'Reddedildi',
};

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-green-100 text-green-800',
  approved: 'bg-green-100 text-green-800',
  cancelled: 'bg-zinc-100 text-zinc-600',
  completed: 'bg-blue-100 text-blue-800',
  no_show: 'bg-red-100 text-red-800',
  rejected: 'bg-red-100 text-red-800',
};

function ReservationsContent() {
  const searchParams = useSearchParams();
  const statusFromUrl = searchParams.get('status');
  const tabFromUrl = searchParams.get('tab');
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type TabKey = 'pending' | 'active' | 'past' | 'cancelled';
  const [tab, setTab] = useState<TabKey>(
    (['pending', 'active', 'past', 'cancelled'] as const).includes(tabFromUrl as TabKey) ? (tabFromUrl as TabKey) : 'pending'
  );
  const [filterStatus, setFilterStatus] = useState<string>(statusFromUrl && ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(statusFromUrl) ? statusFromUrl : 'all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRevenueColumns, setShowRevenueColumns] = useState(true);

  useEffect(() => {
    if (statusFromUrl && ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(statusFromUrl)) {
      setFilterStatus(statusFromUrl);
    }
  }, [statusFromUrl]);

  useEffect(() => {
    if (tab === 'pending') setFilterStatus('pending');
    else if (tab === 'active') setFilterStatus('confirmed');
    else if (tab === 'past') setFilterStatus('all');
    else setFilterStatus('all');
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (!cancelled) setReservations([]);
          setLoading(false);
          return;
        }
        const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
        const businessIds = (myBusinesses ?? []).map((b) => b.id);
        if (businessIds.length === 0) {
          if (!cancelled) setReservations([]);
          setLoading(false);
          return;
        }
        await supabase.rpc('close_past_reservations_for_owner');
        if (cancelled) return;
        const baseSelect = `
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
        `;
        const fullSelect = `${baseSelect}, amount, payment_method_id, payment_methods ( id, name )`;
        let query = supabase
          .from('reservations')
          .select(fullSelect)
          .in('business_id', businessIds)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false });
        if (tab === 'pending') query = query.eq('status', 'pending');
        else if (tab === 'active') query = query.eq('status', 'confirmed');
        else if (tab === 'past') query = query.eq('status', 'completed');
        else if (tab === 'cancelled') query = query.in('status', ['cancelled', 'no_show']);
        if (filterStatus !== 'all') query = query.eq('status', filterStatus);
        if (filterDateFrom) query = query.gte('reservation_date', filterDateFrom);
        if (filterDateTo) query = query.lte('reservation_date', filterDateTo);
        const { data, error: err } = await query;
        if (cancelled) return;
        if (err) {
          setShowRevenueColumns(false);
          let queryFallback = supabase
            .from('reservations')
            .select(baseSelect)
            .in('business_id', businessIds)
            .order('reservation_date', { ascending: false })
            .order('reservation_time', { ascending: false });
          if (filterStatus !== 'all') queryFallback = queryFallback.eq('status', filterStatus);
          if (tab === 'pending') queryFallback = queryFallback.eq('status', 'pending');
          else if (tab === 'active') queryFallback = queryFallback.eq('status', 'confirmed');
          else if (tab === 'past') queryFallback = queryFallback.eq('status', 'completed');
          else if (tab === 'cancelled') queryFallback = queryFallback.in('status', ['cancelled', 'no_show']);
          if (filterDateFrom) queryFallback = queryFallback.gte('reservation_date', filterDateFrom);
          if (filterDateTo) queryFallback = queryFallback.lte('reservation_date', filterDateTo);
          const res2 = await queryFallback;
          if (cancelled) return;
          if (res2.error) {
            setError(res2.error.message);
            setReservations([]);
          } else {
            const rows = (res2.data ?? []) as Array<Record<string, unknown>>;
            const normalized: Reservation[] = rows.map((row) => {
              const b = row.businesses;
              const businessesNorm: { name: string } | null =
                Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
              return { ...row, businesses: businessesNorm, amount: null, payment_method_id: null, payment_methods: null } as Reservation;
            });
            setReservations(normalized);
          }
        } else {
          setShowRevenueColumns(true);
          const rows = (data ?? []) as Array<Record<string, unknown>>;
          const normalized: Reservation[] = rows.map((row) => {
            const b = row.businesses;
            const businessesNorm: { name: string } | null =
              Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
            const pm = row.payment_methods;
            const pmNorm: { id: string; name: string } | null =
              Array.isArray(pm) && pm.length > 0 ? (pm[0] as { id: string; name: string }) : pm && typeof pm === 'object' && 'name' in pm ? (pm as { id: string; name: string }) : null;
            return { ...row, businesses: businessesNorm, payment_methods: pmNorm } as Reservation;
          });
          setReservations(normalized);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Veri yüklenemedi.');
          setReservations([]);
        }
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [tab, filterStatus, filterDateFrom, filterDateTo]);

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

      {/* Sekmeler */}
      <div className="mb-4 flex gap-1 border-b border-zinc-200">
        {(['pending', 'active', 'past', 'cancelled'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 -mb-px ${
              tab === t
                ? 'border-green-600 text-green-700 bg-white'
                : 'border-transparent text-zinc-600 hover:text-zinc-900'
            }`}
          >
            {t === 'pending' ? 'Beklemede' : t === 'active' ? 'Aktif' : t === 'past' ? 'Geçmiş' : 'İptal'}
          </button>
        ))}
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
          {tab === 'pending' && <option value="pending">Beklemede</option>}
          {tab === 'active' && <option value="confirmed">Onaylandı</option>}
          {tab === 'past' && <option value="completed">Tamamlandı</option>}
          {tab === 'cancelled' && (
            <>
              <option value="cancelled">İptal</option>
              <option value="no_show">Gelmedi</option>
            </>
          )}
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
                {showRevenueColumns && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Ücret</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-zinc-500">Ödeme</th>
                  </>
                )}
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
                  {showRevenueColumns && (
                    <>
                      <td className="px-4 py-3 text-sm text-zinc-600 font-medium">
                        {r.amount != null ? Number(r.amount).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺' : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-600">
                        {(r.payment_methods as { name: string } | null)?.name ?? '—'}
                      </td>
                    </>
                  )}
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
                    {r.status === 'completed' && (
                      <button
                        onClick={() => window.confirm('Bu rezervasyonu tekrar "Onaylandı" durumuna almak istediğinize emin misiniz?') && updateStatus(r.id, 'confirmed')}
                        disabled={actionLoading === r.id}
                        className="text-sm font-medium text-amber-700 hover:underline disabled:opacity-50"
                      >
                        Onaylandıya geri al
                      </button>
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
