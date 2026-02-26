'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type ReservationDetail = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  special_requests: string | null;
  businesses: { name: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};
const STATUS_COLOR: Record<string, string> = {
  pending: '#f59e0b',
  confirmed: '#15803d',
  cancelled: '#64748b',
  completed: '#0ea5e9',
  no_show: '#dc2626',
};

export default function ReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { session } = useAuth();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !id) return;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from('reservations')
        .select('id, reservation_date, reservation_time, party_size, status, special_requests, businesses ( name )')
        .eq('id', id)
        .eq('user_id', session.user.id)
        .single();
      if (err) {
        setError(err.message);
        setReservation(null);
      } else {
        const r = data as Record<string, unknown>;
        const b = r.businesses;
        const business = Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : (b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null);
        setReservation({ ...r, businesses: business } as unknown as ReservationDetail);
      }
      setLoading(false);
    })();
  }, [id, session?.user?.id]);

  const canCancel = reservation && (reservation.status === 'pending' || reservation.status === 'confirmed');

  const handleCancel = async () => {
    if (!supabase || !id || !canCancel) return;
    if (!typeof window || !window.confirm('Bu rezervasyonu iptal etmek istediğinize emin misiniz?')) return;
    setCancelling(true);
    const { error: err } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id).eq('user_id', session!.user!.id);
    setCancelling(false);
    if (err) setError(err.message);
    else router.push('/app/reservations');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-[#15803d] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#64748b] mt-3">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="p-4">
        <p className="text-sm text-[#dc2626]">{error ?? 'Rezervasyon bulunamadı.'}</p>
        <Link href="/app/reservations" className="block mt-4 text-[#15803d] font-semibold">← Rezervasyonlarım</Link>
      </div>
    );
  }

  const businessName = (reservation.businesses as { name: string } | null)?.name ?? '—';

  return (
    <div className="pb-6 md:pb-8">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e8f0] bg-white md:rounded-t-xl md:border md:border-b-0">
        <Link href="/app/reservations" className="text-[#15803d] font-medium hover:underline">← Rezervasyonlarım</Link>
      </div>
      <div className="p-4 md:p-6 space-y-4 md:max-w-2xl md:mx-auto md:bg-white md:rounded-b-xl md:border md:border-t-0 md:border-[#e2e8f0]">
        <div className="bg-white rounded-2xl p-5 border border-[#e2e8f0]">
          <div className="flex justify-between items-start mb-3">
            <h1 className="text-lg font-bold text-[#0f172a]">{businessName}</h1>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-xl"
              style={{ backgroundColor: `${STATUS_COLOR[reservation.status] ?? '#64748b'}20`, color: STATUS_COLOR[reservation.status] ?? '#64748b' }}
            >
              {STATUS_LABELS[reservation.status] ?? reservation.status}
            </span>
          </div>
          <p className="text-sm text-[#64748b]">{reservation.reservation_date} · {String(reservation.reservation_time).slice(0, 5)}</p>
          <p className="text-sm text-[#64748b]">{reservation.party_size} kişi</p>
          {reservation.special_requests && (
            <p className="text-sm text-[#64748b] mt-2 italic">{reservation.special_requests}</p>
          )}
        </div>
        {canCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancelling}
            className="w-full bg-white border border-[#e2e8f0] text-[#dc2626] font-semibold py-3.5 rounded-xl disabled:opacity-70"
          >
            {cancelling ? 'İptal ediliyor...' : 'Rezervasyonu iptal et'}
          </button>
        )}
      </div>
    </div>
  );
}
