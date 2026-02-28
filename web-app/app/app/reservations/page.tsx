'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RESERVATION_STATUS_LABELS, getReservationStatusStyle } from '@/lib/statusColors';

type Reservation = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  special_requests: string | null;
  businesses: { name: string } | null;
};

const TZ = 'Europe/Istanbul';
function isUpcoming(reservation_date: string, reservation_time: string): boolean {
  try {
    const d = new Date();
    const todayIstanbul = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    const nowTimeIstanbul = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    const resDate = reservation_date.slice(0, 10);
    const resTime = String(reservation_time).slice(0, 5);
    if (resDate > todayIstanbul) return true;
    if (resDate < todayIstanbul) return false;
    return resTime >= nowTimeIstanbul;
  } catch {
    return reservation_date >= new Date().toISOString().slice(0, 10);
  }
}

export default function ReservationsPage() {
  const { session } = useAuth();
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  type TabKey = 'upcoming' | 'past';
  const [tab, setTab] = useState<TabKey>('upcoming');

  const { upcoming, past } = useMemo(() => {
    const up: Reservation[] = [];
    const pa: Reservation[] = [];
    for (const r of list) {
      if (isUpcoming(r.reservation_date, r.reservation_time)) up.push(r);
      else pa.push(r);
    }
    return { upcoming: up, past: pa };
  }, [list]);

  const displayedList = tab === 'upcoming' ? upcoming : past;

  const load = async () => {
    if (!supabase || !session?.user?.id) {
      setList([]);
      setLoading(false);
      return;
    }
    setError(null);
    await supabase.rpc('close_my_past_reservations');
    const { data, error: fetchErr } = await supabase
      .from('reservations')
      .select('id, reservation_date, reservation_time, party_size, status, special_requests, businesses ( name )')
      .eq('user_id', session.user.id)
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: false });
    if (fetchErr) {
      setError(fetchErr.message);
      setList([]);
    } else setList((data ?? []) as unknown as Reservation[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [session?.user?.id]);

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <p className="text-sm text-[#64748b]">Giriş yapın, rezervasyonlarınız burada listelenecek.</p>
      </div>
    );
  }

  if (loading && list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6">
        <p className="text-sm text-[#dc2626] text-center mb-4">{error}</p>
        <button type="button" onClick={() => { setLoading(true); load(); }} className="px-4 py-2 bg-[#15803d] text-white rounded-xl font-semibold text-sm">
          Tekrar dene
        </button>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 md:py-16 md:rounded-xl md:bg-white md:border md:border-[#e2e8f0]">
        <h2 className="text-xl font-semibold text-[#0f172a] mb-2">Rezervasyonlarım</h2>
        <p className="text-sm text-[#64748b] text-center mb-2">Henüz rezervasyonunuz yok.</p>
        <p className="text-xs text-[#94a3b8] text-center mb-4">Keşfet sekmesinden bir işletme seçip &quot;Rezervasyon Yap&quot; ile ekleyebilirsiniz.</p>
        <Link href="/app" className="text-[#15803d] font-semibold">Keşfet&apos;e git</Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-0 space-y-3 md:max-w-3xl md:space-y-4">
      <div className="flex gap-2 border-b border-[#e2e8f0] pb-3">
        <button
          type="button"
          onClick={() => setTab('upcoming')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${tab === 'upcoming' ? 'bg-[#15803d] text-white' : 'bg-[#e2e8f0] text-[#64748b]'}`}
        >
          Gelecek {upcoming.length > 0 && `(${upcoming.length})`}
        </button>
        <button
          type="button"
          onClick={() => setTab('past')}
          className={`px-4 py-2.5 rounded-xl text-sm font-semibold ${tab === 'past' ? 'bg-[#15803d] text-white' : 'bg-[#e2e8f0] text-[#64748b]'}`}
        >
          Geçmiş {past.length > 0 && `(${past.length})`}
        </button>
      </div>
      {displayedList.length === 0 ? (
        <p className="text-sm text-[#64748b] py-8 text-center">
          {tab === 'upcoming' ? 'Gelecek rezervasyonunuz yok.' : 'Geçmiş rezervasyonunuz yok.'}
        </p>
      ) : (
      <>
      {displayedList.map((item) => (
        <Link
          key={item.id}
          href={`/app/reservation/${item.id}`}
          className="block bg-white rounded-xl p-4 border border-[#e2e8f0] hover:shadow-md hover:border-[#cbd5e1] transition-all"
        >
          <div className="flex justify-between items-start mb-1.5">
            <h3 className="font-semibold text-[#0f172a] flex-1">
              {(item.businesses as { name: string } | null)?.name ?? '—'}
            </h3>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: getReservationStatusStyle(item.status).bg, color: getReservationStatusStyle(item.status).text }}
            >
              {RESERVATION_STATUS_LABELS[item.status] ?? item.status}
            </span>
          </div>
          <p className="text-sm text-[#64748b]">{item.reservation_date} · {String(item.reservation_time).slice(0, 5)}</p>
          <p className="text-xs text-[#94a3b8]">{item.party_size} kişi</p>
          {item.special_requests && (
            <p className="text-xs text-[#64748b] italic mt-2 line-clamp-2">{item.special_requests}</p>
          )}
        </Link>
      ))}
      </>
      )}
    </div>
  );
}
