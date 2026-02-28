'use client';

import { useEffect, useState, useMemo } from 'react';
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

type ChartPeriod = '7d' | '4w';

export default function DashboardPage() {
  const [businessCount, setBusinessCount] = useState<number>(0);
  const [reservationCount, setReservationCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [todayCount, setTodayCount] = useState<number>(0);
  const [recentReservations, setRecentReservations] = useState<Reservation[]>([]);
  const [allReservationsForChart, setAllReservationsForChart] = useState<{ reservation_date: string; status: string }[]>([]);
  const [revenueRows, setRevenueRows] = useState<{ reservation_date: string; amount: number }[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('7d');
  const [loading, setLoading] = useState(true);
  const [revenueTooltip, setRevenueTooltip] = useState<{ label: string; value: string } | null>(null);
  const [reservationTooltip, setReservationTooltip] = useState<{ label: string; total: number; completed: number } | null>(null);
  const [messagesUnread, setMessagesUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }
        const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
        const businessIds = (myBusinesses ?? []).map((b) => b.id);
        if (businessIds.length === 0) {
          setBusinessCount(0);
          setReservationCount(0);
          setPendingCount(0);
          setTodayCount(0);
          setMessagesUnread(0);
          setRecentReservations([]);
          setAllReservationsForChart([]);
          setRevenueRows([]);
          setLoading(false);
          return;
        }
        const today = new Date().toISOString().slice(0, 10);
        const start4w = new Date();
        start4w.setDate(start4w.getDate() - 27);
        const [businessesRes, reservationsRes, pendingRes, todayRes, recentRes, chartRes, convRes] = await Promise.all([
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
          supabase
            .from('reservations')
            .select('reservation_date, status')
            .in('business_id', businessIds)
            .gte('reservation_date', start4w.toISOString().slice(0, 10))
            .lte('reservation_date', today),
          supabase.from('conversations').select('id').in('restaurant_id', businessIds),
        ]);
        if (cancelled) return;
        const convIds = (convRes.data ?? []).map((c: { id: string }) => c.id);
        if (convIds.length > 0) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .eq('sender_type', 'user')
            .is('read_at_restaurant', null);
          if (!cancelled) setMessagesUnread(count ?? 0);
        } else if (!cancelled) setMessagesUnread(0);
        setBusinessCount(businessesRes.count ?? 0);
        setReservationCount(reservationsRes.count ?? 0);
        setPendingCount(pendingRes.count ?? 0);
        setTodayCount(todayRes.count ?? 0);
        const recentRaw = (recentRes.data ?? []) as Array<Record<string, unknown>>;
        const recentNormalized: Reservation[] = recentRaw.map((row) => {
          const b = row.businesses;
          const businessesNorm: { name: string } | null =
            Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
          return { ...row, businesses: businessesNorm } as Reservation;
        });
        setRecentReservations(recentNormalized);
        setAllReservationsForChart((chartRes.data ?? []) as { reservation_date: string; status: string }[]);
        try {
          const revRes = await supabase
            .from('reservations')
            .select('reservation_date, amount')
            .in('business_id', businessIds)
            .gte('reservation_date', start4w.toISOString().slice(0, 10))
            .lte('reservation_date', today)
            .not('amount', 'is', null);
          if (!cancelled && !revRes.error) {
            setRevenueRows((revRes.data ?? []) as { reservation_date: string; amount: number }[]);
          } else {
            setRevenueRows([]);
          }
        } catch {
          if (!cancelled) setRevenueRows([]);
        }
      } catch {
        if (!cancelled) setRevenueRows([]);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const chartData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (chartPeriod === '7d') {
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      const byDate: Record<string, { total: number; completed: number }> = {};
      days.forEach((d) => { byDate[d] = { total: 0, completed: 0 }; });
      allReservationsForChart.forEach((r) => {
        if (!byDate[r.reservation_date]) return;
        byDate[r.reservation_date].total += 1;
        if (r.status === 'completed') byDate[r.reservation_date].completed += 1;
      });
      return days.map((d) => ({ label: d.slice(8, 10) + '/' + d.slice(5, 7), date: d, ...byDate[d] }));
    }
    const byWeek: { total: number; completed: number; label: string }[] = [];
    for (let w = 0; w < 4; w++) {
      byWeek.push({ total: 0, completed: 0, label: `Hafta ${w + 1}` });
    }
    allReservationsForChart.forEach((r) => {
      const d = new Date(r.reservation_date);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(diffDays / 7));
      const idx = 3 - weekIndex;
      if (idx >= 0 && idx < 4) {
        byWeek[idx].total += 1;
        if (r.status === 'completed') byWeek[idx].completed += 1;
      }
    });
    return byWeek;
  }, [allReservationsForChart, chartPeriod]);

  const periodTotal = useMemo(() => {
    const arr = chartData as { total?: number }[];
    return arr.reduce((s, x) => s + (x.total ?? 0), 0);
  }, [chartData]);
  const periodCompleted = useMemo(() => {
    const arr = chartData as { completed?: number }[];
    return arr.reduce((s, x) => s + (x.completed ?? 0), 0);
  }, [chartData]);
  const occupancyPercent = periodTotal > 0 ? Math.round((periodCompleted / periodTotal) * 100) : 0;

  const revenueChartData = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (chartPeriod === '7d') {
      const days: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().slice(0, 10));
      }
      const byDate: Record<string, number> = {};
      days.forEach((d) => { byDate[d] = 0; });
      revenueRows.forEach((r) => {
        if (byDate[r.reservation_date] != null) {
          byDate[r.reservation_date] += Number(r.amount) || 0;
        }
      });
      return days.map((d) => ({ label: d.slice(8, 10) + '/' + d.slice(5, 7), date: d, total: byDate[d] }));
    }
    const byWeek: { label: string; total: number }[] = [];
    for (let w = 0; w < 4; w++) byWeek.push({ label: `Hafta ${w + 1}`, total: 0 });
    revenueRows.forEach((r) => {
      const d = new Date(r.reservation_date);
      const todayObj = new Date(today);
      const diffDays = Math.floor((todayObj.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.min(3, Math.floor(diffDays / 7));
      const idx = 3 - weekIndex;
      if (idx >= 0 && idx < 4) byWeek[idx].total += Number(r.amount) || 0;
    });
    return byWeek;
  }, [revenueRows, chartPeriod]);

  const totalRevenue = useMemo(() => {
    return revenueChartData.reduce((s, x) => s + ((x as { total?: number }).total ?? 0), 0);
  }, [revenueChartData]);

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

      {(messagesUnread > 0 || pendingCount > 0 || todayCount > 0) && (
        <div className="flex flex-wrap gap-3 mb-6 p-3 rounded-xl bg-white border border-zinc-200">
          {messagesUnread > 0 && (
            <Link
              href="/dashboard/messages"
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 text-blue-800 px-4 py-2 text-sm font-semibold hover:bg-blue-200"
            >
              💬 {messagesUnread} okunmamış mesaj
            </Link>
          )}
          {pendingCount > 0 && (
            <Link
              href="/dashboard/reservations?status=pending"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-800 px-4 py-2 text-sm font-semibold hover:bg-amber-200"
            >
              ⏳ {pendingCount} bekleyen onay
            </Link>
          )}
          {todayCount > 0 && (
            <Link
              href="/dashboard/reservations"
              className="inline-flex items-center gap-1.5 rounded-full bg-green-100 text-green-800 px-4 py-2 text-sm font-semibold hover:bg-green-200"
            >
              📅 Bugün {todayCount} rezervasyon
            </Link>
          )}
        </div>
      )}

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

      {/* Gelir grafiği (para) */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-zinc-900">Gelir (₺)</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Dönem:</span>
            <button
              type="button"
              onClick={() => setChartPeriod('7d')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartPeriod === '7d' ? 'bg-green-700 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Son 7 gün
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('4w')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartPeriod === '4w' ? 'bg-green-700 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Son 4 hafta
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 text-sm">
            <span className="text-zinc-600">Seçili dönemde toplam gelir: </span>
            <strong className="text-green-700">
              {totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
            </strong>
          </div>
          <div className="flex items-end gap-2 h-40 relative">
            {revenueChartData.map((item, i) => {
              const max = Math.max(0.01, ...revenueChartData.map((x) => (x as { total?: number }).total ?? 0));
              const val = (item as { total?: number }).total ?? 0;
              const h = max > 0 ? Math.round((val / max) * 120) : 0;
              const label = (item as { label: string }).label;
              const isHovered = revenueTooltip?.label === label;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 relative"
                  onMouseEnter={() => setRevenueTooltip({ label, value: `${val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺` })}
                  onMouseLeave={() => setRevenueTooltip(null)}
                >
                  <div className="w-full bg-zinc-100 rounded-t flex flex-col justify-end" style={{ height: 120 }}>
                    <div className="w-full bg-green-600 rounded-t transition-all" style={{ height: h }} />
                  </div>
                  {isHovered && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 px-2 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-medium whitespace-nowrap shadow-lg">
                      {label}: {revenueTooltip?.value}
                    </div>
                  )}
                  <span className="text-xs text-zinc-500 truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Rezervasyon detayından ücret girerek gelir kaydı oluşturabilirsiniz. <Link href="/dashboard/gelir" className="text-green-700 hover:underline">Gelir sayfası →</Link>
          </p>
        </div>
      </div>

      {/* Analytics: grafik + doluluk */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-zinc-900">Rezervasyon analitiği</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Dönem:</span>
            <button
              type="button"
              onClick={() => setChartPeriod('7d')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartPeriod === '7d' ? 'bg-green-700 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Son 7 gün
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('4w')}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${chartPeriod === '4w' ? 'bg-green-700 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}
            >
              Son 4 hafta
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-sm">
            <span className="text-zinc-600">Seçili dönemde toplam: <strong className="text-zinc-900">{periodTotal}</strong> rezervasyon</span>
            <span className="text-zinc-600">Tamamlanan: <strong className="text-zinc-900">{periodCompleted}</strong></span>
            <span className="text-zinc-600">Doluluk (tamamlanan/toplam): <strong className="text-green-700">{occupancyPercent}%</strong></span>
          </div>
          <div className="flex items-end gap-2 h-40 relative">
            {chartData.map((item, i) => {
              const max = Math.max(1, ...(chartData as { total: number }[]).map((x) => x.total));
              const total = (item as { total: number }).total;
              const completed = (item as { completed?: number }).completed ?? 0;
              const h = max > 0 ? Math.round((total / max) * 120) : 0;
              const label = (item as { label: string }).label;
              const isHovered = reservationTooltip?.label === label;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 relative"
                  onMouseEnter={() => setReservationTooltip({ label, total, completed })}
                  onMouseLeave={() => setReservationTooltip(null)}
                >
                  <div className="w-full bg-zinc-100 rounded-t flex flex-col justify-end" style={{ height: 120 }}>
                    <div className="w-full bg-green-600 rounded-t transition-all" style={{ height: h }} />
                  </div>
                  {isHovered && reservationTooltip && (
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-10 px-2 py-1.5 rounded-lg bg-zinc-800 text-white text-xs font-medium whitespace-nowrap shadow-lg">
                      <div>{label}</div>
                      <div>Toplam: {reservationTooltip.total} rezervasyon</div>
                      <div>Tamamlanan: {reservationTooltip.completed}</div>
                    </div>
                  )}
                  <span className="text-xs text-zinc-500 truncate w-full text-center">{label}</span>
                </div>
              );
            })}
          </div>
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
