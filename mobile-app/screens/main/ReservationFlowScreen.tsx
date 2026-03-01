import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/NotificationContext';
import { validateReservationTime, isSlotDisabled } from '../../lib/reservationTimeValidation';
import { t } from '../../lib/i18n';
import { notifyOwner } from '../../lib/notifyApi';

type Service = { id: string; name: string; duration_minutes: number; duration_display: string | null; price: number | null };

type HourRow = { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean };
type ClosureRow = { closure_date: string };

const SLOT_INTERVAL_MIN = 30;
const FALLBACK_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

function getDurationLabel(s: Service): string {
  if (s.duration_minutes != null && s.duration_minutes > 0) return `${s.duration_minutes} dk`;
  switch (s.duration_display) {
    case 'all_day': return 'Gün boyu';
    case 'all_evening': return 'Tüm akşam';
    case 'no_limit': return 'Süre sınırı yok';
    default: return s.duration_minutes === 0 ? 'Süre yok' : `${s.duration_minutes ?? 0} dk`;
  }
}

function timeToMinutes(t: string | null): number {
  if (!t) return 0;
  const s = String(t).slice(0, 5);
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Props = {
  businessId: string;
  businessName?: string;
  onBack: () => void;
  onDone: () => void;
};

export default function ReservationFlowScreen({ businessId, businessName, onBack, onDone }: Props) {
  const { session } = useAuth();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [availableSlotsForDate, setAvailableSlotsForDate] = useState<string[] | null>(null);
  const [loadingSlotsForDate, setLoadingSlotsForDate] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const guestCountOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);

  const effectiveDuration = useMemo(() => {
    const s = serviceId ? services.find((se) => se.id === serviceId) : null;
    return s?.duration_minutes && s.duration_minutes > 0 ? s.duration_minutes : 120;
  }, [serviceId, services]);

  const availableDates = useMemo(() => {
    const out: { date: string; label: string; dayOfWeek: number }[] = [];
    const closureSet = new Set(closures.map((c) => c.closure_date));
    const hourByDay = new Map(hours.map((h) => [h.day_of_week, h]));
    const today = new Date();
    const hasHours = hours.length > 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      if (closureSet.has(dateStr)) continue;
      if (hasHours) {
        const h = hourByDay.get(dayOfWeek);
        if (h?.is_closed) continue;
      }
      const dayLabel = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
      out.push({ date: dateStr, label: dayLabel, dayOfWeek });
    }
    return out;
  }, [hours, closures]);

  const availableTimes = useMemo(() => {
    if (!reservationDate) return [];
    const d = new Date(reservationDate + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const hourRow = hours.find((h) => h.day_of_week === dayOfWeek);
    if (!hourRow || hourRow.is_closed) {
      return FALLBACK_TIMES;
    }
    const openMin = timeToMinutes(hourRow.open_time);
    const closeMin = timeToMinutes(hourRow.close_time);
    if (openMin >= closeMin) return FALLBACK_TIMES;
    const slots: string[] = [];
    for (let m = openMin; m + effectiveDuration <= closeMin; m += SLOT_INTERVAL_MIN) {
      slots.push(minutesToTime(m));
    }
    return slots.length > 0 ? slots : FALLBACK_TIMES;
  }, [reservationDate, hours, effectiveDuration]);

  useEffect(() => {
    if (!supabase || !businessId) return;
    (async () => {
      setLoadingServices(true);
      setLoadingSlots(true);
      const [sRes, hRes, cRes] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, duration_display, price').eq('business_id', businessId).eq('is_active', true).order('name'),
        supabase.from('business_hours').select('day_of_week, open_time, close_time, is_closed').eq('business_id', businessId).order('day_of_week'),
        supabase.from('business_closures').select('closure_date').eq('business_id', businessId).gte('closure_date', new Date().toISOString().slice(0, 10)).order('closure_date'),
      ]);
      setServices((sRes.data ?? []) as Service[]);
      setHours((hRes.data ?? []) as HourRow[]);
      setClosures((cRes.data ?? []) as ClosureRow[]);
      if ((sRes.data?.length ?? 0) === 1) {
        const s = sRes.data![0] as Service;
        setServiceId(s.id);
      }
      setLoadingServices(false);
      setLoadingSlots(false);
    })();
  }, [businessId]);

  useEffect(() => {
    if (availableDates.length > 0 && !reservationDate) {
      setReservationDate(availableDates[0].date);
    }
  }, [availableDates, reservationDate]);

  useEffect(() => {
    if (!reservationDate) {
      if (reservationTime) setReservationTime('');
      setAvailableSlotsForDate(null);
      return;
    }
    let cancelled = false;
    setLoadingSlotsForDate(true);
    setAvailableSlotsForDate(null);
    (async () => {
      try {
        const { data: rows } = await supabase.rpc('get_available_slots_for_date', {
          p_business_id: businessId,
          p_date: reservationDate,
          p_duration_minutes: effectiveDuration,
        });
        if (cancelled) return;
        const slots = (rows ?? []).map((r: { slot_time: string }) => {
          const t = r?.slot_time ?? '';
          return t.length >= 5 ? t.slice(0, 5) : t;
        });
        setAvailableSlotsForDate(slots);
      } catch {
        if (!cancelled) setAvailableSlotsForDate([]);
      } finally {
        if (!cancelled) setLoadingSlotsForDate(false);
      }
    })();
    return () => { cancelled = true; };
  }, [businessId, reservationDate, effectiveDuration]);

  useEffect(() => {
    if (!reservationDate) return;
    const times = availableSlotsForDate !== null && availableSlotsForDate.length > 0
      ? availableSlotsForDate
      : availableTimes;
    if (times.length > 0) {
      const validTimes = times.filter((t) => !isSlotDisabled(reservationDate, t));
      const preferred = validTimes.length > 0 ? validTimes[0] : times[0];
      if (typeof preferred === 'string' && preferred && (!reservationTime || !times.includes(reservationTime) || isSlotDisabled(reservationDate, reservationTime))) {
        setReservationTime(preferred);
      }
    } else if (availableSlotsForDate?.length === 0) {
      setReservationTime('');
    }
  }, [availableTimes, reservationDate, availableSlotsForDate]);

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      toast.error('Giriş yapmanız gerekiyor.');
      return;
    }
    if (!reservationDate || !reservationTime) {
      toast.error(t('reservation.date_time_required'));
      return;
    }
    const timeValidation = validateReservationTime(reservationDate, reservationTime);
    if (!timeValidation.valid) {
      toast.error(timeValidation.error);
      return;
    }
    setError(null);
    setSaving(true);
    const startStr = `${reservationDate}T${(reservationTime ?? '').slice(0, 5)}:00`;
    const startDate = new Date(startStr);
    const endDate = new Date(startDate.getTime() + effectiveDuration * 60 * 1000);
    const { data: inserted, error: err } = await supabase
      .from('reservations')
      .insert({
        business_id: businessId,
        user_id: session.user.id,
        reservation_date: reservationDate,
        reservation_time: (reservationTime ?? '').slice(0, 5),
        duration_minutes: effectiveDuration,
        party_size: partySize,
        service_id: serviceId || null,
        special_requests: specialRequests.trim() || null,
        status: 'pending',
        reservation_start: startDate.toISOString(),
        reservation_end: endDate.toISOString(),
        table_count_used: 1,
      })
      .select('id')
      .single();
    setSaving(false);
    if (err) {
      setError(err.message);
      toast.error(err.message);
      return;
    }
    if (inserted?.id && session?.access_token) {
      notifyOwner(businessId, inserted.id, session.access_token).catch(() => {});
    }
    toast.success('Rezervasyonunuz restorana onaya gönderildi. En kısa sürede bilgilendirileceksiniz.', 'Başarılı');
    onDone();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rezervasyon</Text>
          {businessName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{businessName}</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + 56 + 16 + Math.max(insets.bottom, 12) }]}
          showsVerticalScrollIndicator={false}
        >
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Hizmet (opsiyonel)</Text>
          {loadingServices ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : (
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, serviceId === null && styles.chipActive]} onPress={() => setServiceId(null)}>
                <Text style={[styles.chipText, serviceId === null && styles.chipTextActive]}>Belirtmeyeyim</Text>
              </TouchableOpacity>
              {services.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, serviceId === s.id && styles.chipActive]}
                  onPress={() => setServiceId(s.id)}
                >
                  <Text style={[styles.chipText, serviceId === s.id && styles.chipTextActive]} numberOfLines={1}>
                    {s.name} ({getDurationLabel(s)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Tarih *</Text>
          {loadingSlots ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : availableDates.length === 0 ? (
            <>
              <Text style={styles.hint}>Bu işletme için müsait gün tanımlı değil veya çalışma saatleri eksik.</Text>
              <Text style={[styles.hint, { marginTop: 4 }]}>Bu işletme için şu an uygun gün veya saat tanımlı değil.</Text>
            </>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {availableDates.map(({ date, label }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, reservationDate === date && styles.chipActive]}
                  onPress={() => setReservationDate(date)}
                >
                  <Text style={[styles.dateChipText, reservationDate === date && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Saat *</Text>
          {reservationDate && loadingSlotsForDate ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : reservationDate && availableSlotsForDate !== null && availableSlotsForDate.length === 0 && availableTimes.length === 0 ? (
            <Text style={styles.noSlotsMessage}>Bu günde uygunluk bulunamadı.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={[styles.chipRowScroll, styles.timeSlotRow]}>
              {(availableSlotsForDate && availableSlotsForDate.length > 0 ? availableSlotsForDate : availableTimes).map((t) => {
                const disabled = isSlotDisabled(reservationDate, t);
                const isSelected = reservationTime === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timeChip,
                      isSelected && styles.timeChipActive,
                      disabled && styles.dateChipDisabled,
                    ]}
                    onPress={() => !disabled && setReservationTime(t)}
                    disabled={disabled}
                    activeOpacity={disabled ? 1 : 0.7}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        isSelected && styles.timeChipTextActive,
                        disabled && styles.dateChipTextDisabled,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.label}>Kişi sayısı</Text>
          <View style={styles.chipRow}>
            {guestCountOptions.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.chip, partySize === n && styles.chipActive]}
                onPress={() => setPartySize(n)}
              >
                <Text style={[styles.chipText, partySize === n && styles.chipTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!showNoteInput && !specialRequests.trim() ? (
            <TouchableOpacity style={styles.noteToggleInline} onPress={() => setShowNoteInput(true)}>
              <Text style={styles.noteToggleInlineText}>+ Not ekle</Text>
            </TouchableOpacity>
          ) : showNoteInput ? (
            <>
              <Text style={styles.label}>Not (işletmeye iletilecek)</Text>
              <TextInput
                style={styles.specialInput}
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="İsteğe bağlı not..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
              <View style={styles.noteActionsRow}>
                {!specialRequests.trim() ? (
                  <TouchableOpacity onPress={() => setShowNoteInput(false)}>
                    <Text style={styles.noteToggleHide}>Gizle</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.noteSaveButton}
                    onPress={() => {
                      setShowNoteInput(false);
                      toast.success('Notunuz kaydedildi.');
                    }}
                  >
                    <Text style={styles.noteSaveButtonText}>Kaydet</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View style={styles.noteSavedBlock}>
              <Text style={styles.label}>Not (işletmeye iletilecek)</Text>
              <View style={styles.noteSavedContent}>
                <Text style={styles.noteSavedText} numberOfLines={4}>{specialRequests.trim()}</Text>
                <TouchableOpacity onPress={() => setShowNoteInput(true)} style={styles.noteEditLink}>
                  <Text style={styles.noteEditLinkText}>Düzenle</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
        <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (saving || !reservationDate || !reservationTime) && styles.submitDisabled,
            ]}
            onPress={handleSubmit}
            disabled={saving || !reservationDate || !reservationTime}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Rezervasyonu oluştur</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnIcon: { fontSize: 22, color: '#15803d', fontWeight: '600' },
  headerCenter: { flex: 1, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', flex: 1 },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 16, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#15803d' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  dateScroll: { marginHorizontal: -20, paddingHorizontal: 20, marginTop: 4 },
  chipRowScroll: { flexDirection: 'row', paddingBottom: 4 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, minWidth: 80, alignItems: 'center' },
  dateChipText: { fontSize: 14, color: '#64748b' },
  dateChipDisabled: { backgroundColor: '#e2e8f0', opacity: 0.8 },
  dateChipTextDisabled: { color: '#94a3b8' },
  timeSlotRow: { gap: 10, paddingVertical: 4 },
  timeChip: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    marginRight: 10,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeChipActive: { backgroundColor: '#15803d', borderColor: '#0f766e' },
  timeChipText: { fontSize: 15, fontWeight: '600', color: '#475569' },
  timeChipTextActive: { color: '#fff' },
  hint: { fontSize: 13, color: '#64748b', marginTop: 4 },
  noSlotsError: { fontSize: 14, color: '#dc2626', marginTop: 4, fontWeight: '500' },
  loader: { marginVertical: 8 },
  submitButton: { backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 8 },
  noSlotsMessage: { fontSize: 14, color: '#64748b', marginVertical: 8, fontStyle: 'italic' },
  noteToggleButton: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', alignSelf: 'flex-start' },
  noteToggleInline: { marginTop: 12, alignSelf: 'flex-start' },
  noteToggleInlineText: { fontSize: 15, color: '#15803d', fontWeight: '500' },
  noteToggleText: { fontSize: 15, color: '#15803d', fontWeight: '500' },
  noteToggleHide: { fontSize: 13, color: '#64748b', marginTop: 6 },
  noteActionsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  noteSaveButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#15803d' },
  noteSaveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  noteSavedBlock: { marginTop: 4 },
  noteSavedContent: {
    marginTop: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteSavedText: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  noteEditLink: { marginTop: 8, alignSelf: 'flex-start' },
  noteEditLinkText: { fontSize: 14, color: '#15803d', fontWeight: '500' },
  specialInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
