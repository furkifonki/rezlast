'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

type Reservation = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  customer_name: string | null;
  businesses: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

export default function DashboardPage() {
  const [businessCount, setBusinessCount] = useState<number>(0);
  const [reservationCount, setReservationCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b) => b.id);
      if (businessIds.length === 0) {
        setBusinessCount(0);
        setReservationCount(0);
        setPendingCount(0);
        setTodayCount(0);
        setRecentReservations([]);
        setLoading(false);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      const [businessesRes, reservationsRes, pendingRes, todayRes, recentRes] = await Promise.all([
        supabase.from('businesses').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('status', 'pending'),
        supabase.from('reservations').select('id', { count: 'exact', head: true }).in('business_id', businessIds).eq('reservation_date', today),
        supabase
          .from('reservations')
          .select('id, reservation_date, reservation_time, party_size, status, customer_name, businesses ( name )')
          .in('business_id', businessIds)
          .order('reservation_date', { ascending: false })
          .order('reservation_time', { ascending: false })
          .limit(5),
      ]);

      setBusinessCount(businessesRes.count ?? 0);
      setReservationCount(reservationsRes.count ?? 0);
      setPendingCount(pendingRes.count ?? 0);
      setTodayCount(todayRes.count ?? 0);
      setRecentReservations((recentRes.data ?? []) as Reservation[]);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Dashboard</h1>
        <p className="text-zinc-500">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-2">Dashboard</h1>
      <p className="text-zinc-600 mb-6">
        Hoş geldiniz. İşletmelerinizi ve rezervasyonları sol menüden yönetebilirsiniz.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">İşletmeler</h2>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{businessCount}</p>
          <Link href="/dashboard/businesses" className="mt-2 inline-block text-sm text-green-700 hover:underline">
            İşletmeleri yönet →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Toplam Rezervasyon</h2>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{reservationCount}</p>
          <Link href="/dashboard/reservations" className="mt-2 inline-block text-sm text-green-700 hover:underline">
            Tümünü gör →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Bekleyen Onay</h2>
          <p className="text-2xl font-semibold text-amber-600 mt-1">{pendingCount}</p>
          <Link
            href="/dashboard/reservations?status=pending"
            className="mt-2 inline-block text-sm text-green-700 hover:underline"
          >
            Onayla →
          </Link>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-medium text-zinc-500">Bugünkü Rezervasyon</h2>
          <p className="text-2xl font-semibold text-zinc-900 mt-1">{todayCount}</p>
          <Link href="/dashboard/reservations" className="mt-2 inline-block text-sm text-green-700 hover:underline">
            Görüntüle →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
          <h2 className="font-medium text-zinc-900">Son Rezervasyonlar</h2>
          <Link href="/dashboard/reservations" className="text-sm text-green-700 hover:underline">
            Tümü →
          </Link>
        </div>
        {recentReservations.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-sm">
            Henüz rezervasyon yok.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Tarih / Saat</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">İşletme</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Müşteri</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Kişi</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-zinc-500">Durum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {recentReservations.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2 text-sm text-zinc-900">
                    {r.reservation_date} · {String(r.reservation_time).slice(0, 5)}
                  </td>
                  <td className="px-4 py-2 text-sm text-zinc-600">
                    {(r.businesses as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-sm text-zinc-600">{r.customer_name ?? '—'}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600">{r.party_size}</td>
                  <td className="px-4 py-2 text-sm text-zinc-600">{STATUS_LABELS[r.status] ?? r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
