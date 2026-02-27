'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Service = { id: string; name: string; duration_minutes: number; duration_display: string | null };
type TableRow = { id: string; table_number: string; capacity: number };

const SLOT_INTERVAL_MIN = 30;
const FALLBACK_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

function getNextDays(count: number): { date: string; label: string }[] {
  const out: { date: string; label: string }[] = [];
  const days = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    const dayName = days[d.getDay()];
    const dayNum = d.getDate();
    const month = d.getMonth() + 1;
    out.push({ date, label: `${dayName} ${dayNum}.${month}` });
  }
  return out;
}

export default function ReservePage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;
  const { session } = useAuth();
  const [businessName, setBusinessName] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<string[] | null>(null);
  const [loadingSlotsForDate, setLoadingSlotsForDate] = useState(false);
  const [availableTables, setAvailableTables] = useState<TableRow[]>([]);
  const [businessHasTables, setBusinessHasTables] = useState<boolean | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const availableDates = getNextDays(14);

  const hasTablesForSlot = availableTables.length > 0;
  const mustSelectTable = businessHasTables === true && (hasTablesForSlot ? !tableId : true);
  const noTablesForSlot = businessHasTables === true && reservationDate && reservationTime && !loadingTables && availableTables.length === 0 && tableId === null;

  useEffect(() => {
    if (!supabase || !businessId) return;
    supabase.from('businesses').select('name').eq('id', businessId).single().then(({ data }) => {
      if (data) setBusinessName((data as { name: string }).name);
    });
    supabase.from('services').select('id, name, duration_minutes, duration_display').eq('business_id', businessId).eq('is_active', true).order('name').then(({ data }) => {
      setServices((data ?? []) as unknown as Service[]);
    });
    supabase.from('tables').select('id').eq('business_id', businessId).eq('is_active', true).limit(1).then(({ data }) => {
      setBusinessHasTables((data?.length ?? 0) > 0);
    });
  }, [businessId]);

  const loadSlotsForDate = useCallback(async () => {
    if (!supabase || !reservationDate) return;
    setLoadingSlotsForDate(true);
    const { data } = await supabase.rpc('get_available_slots_for_date', {
      p_business_id: businessId,
      p_date: reservationDate,
    });
    setAvailableSlotsForDate((data ?? []) as string[]);
    setLoadingSlotsForDate(false);
  }, [businessId, reservationDate]);

  useEffect(() => {
    if (!reservationDate) {
      setAvailableSlotsForDate(null);
      setReservationTime('');
      return;
    }
    loadSlotsForDate();
  }, [reservationDate, loadSlotsForDate]);

  const loadTables = useCallback(async () => {
    if (!supabase || !reservationDate || !reservationTime) return;
    setLoadingTables(true);
    const timeParam = reservationTime.length === 5 ? `${reservationTime}:00` : reservationTime;
    const { data: availableRows } = await supabase.rpc('get_available_tables', {
      p_business_id: businessId,
      p_date: reservationDate,
      p_time: timeParam,
      p_duration_minutes: 30,
    });
    const list = (availableRows ?? []) as unknown as TableRow[];
    setAvailableTables(list);
    setTableId(list.length > 0 ? list[0].id : null);
    setLoadingTables(false);
  }, [businessId, reservationDate, reservationTime]);

  useEffect(() => {
    if (!reservationDate || !reservationTime) {
      setAvailableTables([]);
      setTableId(null);
      return;
    }
    loadTables();
  }, [reservationDate, reservationTime, loadTables]);

  const slots = (availableSlotsForDate && availableSlotsForDate.length > 0) ? availableSlotsForDate : FALLBACK_TIMES;
  const noSlots = reservationDate && availableSlotsForDate !== null && availableSlotsForDate.length === 0;
  const maxGuestCapacity = availableTables.length > 0 ? Math.max(6, ...availableTables.map((t) => t.capacity)) : 6;
  const guestCountOptions = Array.from({ length: maxGuestCapacity }, (_, i) => i + 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) {
      setError('Giriş yapmanız gerekiyor.');
      return;
    }
    if (!supabase) {
      setError('Bağlantı yapılandırması eksik. Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.');
      return;
    }
    if (!reservationDate || !reservationTime) {
      setError('Tarih ve saat seçin.');
      return;
    }
    if (mustSelectTable) {
      setError('Bu işletme için lütfen bir masa seçin. Bu saat için uygun masa yoksa başka bir saat deneyin.');
      return;
    }
    if (businessHasTables === true && !hasTablesForSlot && reservationDate && reservationTime) {
      setError('Bu tarih ve saat için uygun masa bulunamadı. Lütfen başka bir saat seçin.');
      return;
    }
    setError(null);
    setSuccessMessage(null);
    setSaving(true);
    const { error: err } = await supabase.from('reservations').insert({
      business_id: businessId,
      user_id: session.user.id,
      reservation_date: reservationDate,
      reservation_time: reservationTime.slice(0, 5),
      duration_minutes: 30,
      party_size: partySize,
      service_id: serviceId || null,
      table_id: tableId || null,
      special_requests: specialRequests.trim() || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) {
      const msg = err.message.includes('masa seçimi zorunludur')
        ? 'Bu işletme için masa seçimi zorunludur. Lütfen tarih ve saat seçtikten sonra listeden bir masa seçin.'
        : err.message.includes('network') || err.message.includes('fetch')
          ? 'İnternet bağlantınızı kontrol edin.'
          : err.message.includes('JWT') || err.message.includes('unauthorized')
            ? 'Oturumunuz sonlanmış. Lütfen tekrar giriş yapın.'
            : err.message;
      setError(msg);
      return;
    }
    setSuccessMessage('Rezervasyonunuz restorana onaya gönderildi. En kısa sürede bilgilendirileceksiniz.');
    setTimeout(() => router.push('/app/reservations'), 2200);
  };

  if (!session) {
    return (
      <div className="p-4">
        <p className="text-sm text-[#64748b]">Rezervasyon yapmak için giriş yapın.</p>
        <Link href="/login" className="text-[#15803d] font-semibold mt-2 inline-block">Giriş yap</Link>
      </div>
    );
  }

  return (
    <div className="pb-6 md:pb-8">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e2e8f0] bg-white md:rounded-t-xl md:border">
        <Link href={`/app/business/${businessId}`} className="text-[#15803d] font-medium hover:underline">← Geri</Link>
        <span className="text-[#64748b] truncate flex-1">{businessName || 'Rezervasyon'}</span>
      </div>
      <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-5 md:max-w-2xl md:mx-auto md:bg-white md:rounded-b-xl md:border md:border-t-0 md:border-[#e2e8f0]">
        {successMessage && (
          <div className="rounded-xl bg-[#f0fdf4] border border-[#22c55e] px-4 py-3 text-[#166534] text-sm font-medium">
            {successMessage}
          </div>
        )}
        {error && <p className="text-sm text-[#dc2626]">{error}</p>}

        <div>
          <p className="text-xs font-semibold text-[#64748b] mb-2">Hizmet (opsiyonel)</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setServiceId(null)}
              className={serviceId === null ? 'px-4 py-2 rounded-full text-sm font-medium bg-green-700 text-white' : 'px-4 py-2 rounded-full text-sm font-medium bg-slate-50 text-slate-500 border border-slate-200'}
            >
              Belirtmeyeyim
            </button>
            {services.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setServiceId(s.id)}
                className={serviceId === s.id ? 'px-4 py-2 rounded-full text-sm font-medium truncate max-w-[200px] bg-green-700 text-white' : 'px-4 py-2 rounded-full text-sm font-medium truncate max-w-[200px] bg-slate-50 text-slate-500 border border-slate-200'}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#64748b] mb-2">Tarih *</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {availableDates.map(({ date, label }) => (
              <button
                key={date}
                type="button"
                onClick={() => setReservationDate(date)}
                className={reservationDate === date ? 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-green-700 text-white' : 'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-slate-50 text-slate-500 border border-slate-200'}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#64748b] mb-2">Saat *</p>
          {reservationDate && loadingSlotsForDate ? (
            <p className="text-sm text-[#64748b]">Yükleniyor...</p>
          ) : noSlots ? (
            <p className="text-sm text-[#64748b]">Bu günde uygunluk bulunamadı.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReservationTime(t)}
                  className={
                    reservationTime === t
                      ? 'px-5 py-3 rounded-xl text-sm font-semibold bg-[#15803d] text-white border-2 border-[#0f766e] shadow-sm'
                      : 'px-5 py-3 rounded-xl text-sm font-semibold bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200 hover:border-slate-300'
                  }
                >
                  {t.slice(0, 5)}
                </button>
              ))}
            </div>
          )}
        </div>

        {availableTables.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[#64748b] mb-2">Masa *</p>
            <select
              value={tableId ?? ''}
              onChange={(e) => setTableId(e.target.value || null)}
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[#0f172a]"
            >
              <option value="">İşletme belirlesin</option>
              {availableTables.map((t) => (
                <option key={t.id} value={t.id}>Masa {t.table_number} ({t.capacity} kişi)</option>
              ))}
            </select>
          </div>
        )}

        {noTablesForSlot && (
          <p className="text-sm text-[#dc2626]">Bu tarih ve saat için uygun masa bulunamadı. Lütfen başka bir saat seçin.</p>
        )}

        <div>
          <p className="text-xs font-semibold text-[#64748b] mb-2">Kişi sayısı</p>
          <div className="flex flex-wrap gap-2">
            {guestCountOptions.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPartySize(n)}
                className={partySize === n ? 'w-10 h-10 rounded-xl text-sm font-medium flex items-center justify-center bg-green-700 text-white' : 'w-10 h-10 rounded-xl text-sm font-medium flex items-center justify-center bg-slate-50 text-slate-500 border border-slate-200'}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {!showNoteInput && !specialRequests.trim() ? (
          <button
            type="button"
            onClick={() => setShowNoteInput(true)}
            className="text-[#15803d] font-medium text-sm py-2 px-3 rounded-lg border border-[#e2e8f0] bg-white hover:bg-[#f0fdf4]"
          >
            Not ekle
          </button>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-[#64748b] mb-1.5">Not (işletmeye iletilecek)</label>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              placeholder="İsteğe bağlı not..."
              rows={2}
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-[#0f172a] resize-none focus:outline-none focus:ring-2 focus:ring-[#15803d]"
            />
            {!specialRequests.trim() && (
              <button type="button" onClick={() => setShowNoteInput(false)} className="text-sm text-[#64748b] mt-1 hover:underline">
                Gizle
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={Boolean(
            saving ||
            !reservationDate ||
            !reservationTime ||
            noSlots ||
            mustSelectTable ||
            noTablesForSlot ||
            (businessHasTables === true && loadingTables) ||
            (businessHasTables === null && !!reservationDate && !!reservationTime)
          )}
          className="w-full bg-[#15803d] text-white font-semibold py-3.5 rounded-xl disabled:opacity-50"
        >
          {saving ? 'Gönderiliyor...' : 'Rezervasyon yap'}
        </button>
      </form>
    </div>
  );
}
