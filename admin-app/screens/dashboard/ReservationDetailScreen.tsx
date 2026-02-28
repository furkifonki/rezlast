import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'ReservationDetail'>;

type PaymentMethod = { id: string; name: string };

const STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

const DURATION_DISPLAY_LABELS: Record<string, string> = {
  no_limit: 'Süre sınırı yok',
  all_day: 'Tüm gün',
  all_evening: 'Tüm akşam',
};

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
  confirmed_at: string | null;
  cancelled_at: string | null;
  businesses: { name: string } | null;
  payment_methods: PaymentMethod | null;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ReservationDetailScreen({ route }: Props) {
  const { reservationId } = route.params;
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethodIdInput, setPaymentMethodIdInput] = useState('');
  const [savingRevenue, setSavingRevenue] = useState(false);
  const [revenueMessage, setRevenueMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [revenueSectionAvailable, setRevenueSectionAvailable] = useState(true);

  const loadReservation = React.useCallback(async () => {
    if (!supabase) return;
    const resSelect = 'id, business_id, reservation_date, reservation_time, duration_minutes, duration_display, party_size, status, customer_name, customer_phone, customer_email, special_requests, created_at, confirmed_at, cancelled_at, businesses ( name )';
    const resSelectWithRevenue = `${resSelect}, amount, payment_method_id, payment_methods ( id, name )`;
    let res = await supabase.from('reservations').select(resSelectWithRevenue).eq('id', reservationId).single();
    if (res.error && (res.error.message.includes('payment_methods') || res.error.message.includes('amount'))) {
      setRevenueSectionAvailable(false);
      res = await supabase.from('reservations').select(resSelect).eq('id', reservationId).single();
    }
    if (res.error) {
      setError(res.error.message);
      setReservation(null);
      return;
    }
    const data = res.data as Record<string, unknown>;
    const b = data.businesses;
    const pm = data.payment_methods;
    const businessesNorm = Array.isArray(b) && b.length ? (b[0] as { name: string }) : b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null;
    const pmNorm = Array.isArray(pm) && pm.length ? (pm[0] as PaymentMethod) : pm && typeof pm === 'object' && 'name' in pm ? (pm as PaymentMethod) : null;
    const obj: ReservationDetail = {
      ...data,
      businesses: businessesNorm,
      payment_methods: pmNorm,
      amount: data.amount ?? null,
      payment_method_id: data.payment_method_id ?? null,
    } as ReservationDetail;
    setReservation(obj);
    setAmountInput(obj.amount != null ? String(obj.amount) : '');
    setPaymentMethodIdInput(obj.payment_method_id ?? '');
  }, [reservationId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
      const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
      if (businessIds.length === 0) { setLoading(false); return; }
      const { data, error: err } = await supabase.from('reservations').select('id').eq('id', reservationId).in('business_id', businessIds).single();
      if (cancelled) return;
      if (err || !data) { setError(err?.message ?? 'Rezervasyon bulunamadı.'); setLoading(false); return; }
      const pmRes = await supabase.from('payment_methods').select('id, name').order('sort_order').order('name');
      if (!cancelled) setPaymentMethods((pmRes.data ?? []) as PaymentMethod[]);
      await loadReservation();
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reservationId, loadReservation]);

  const updateStatus = async (status: string) => {
    if (!reservation || !supabase) return;
    setActionLoading(true);
    const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'confirmed') payload.confirmed_at = new Date().toISOString();
    if (status === 'cancelled') payload.cancelled_at = new Date().toISOString();
    const { error: err } = await supabase.from('reservations').update(payload).eq('id', reservationId);
    setActionLoading(false);
    if (err) setError(err.message);
    else setReservation((prev) => prev ? { ...prev, status, confirmed_at: status === 'confirmed' ? (payload.confirmed_at as string) : prev.confirmed_at, cancelled_at: status === 'cancelled' ? (payload.cancelled_at as string) : prev.cancelled_at } : null);
  };

  const saveRevenue = async () => {
    if (!reservation || !supabase) return;
    setRevenueMessage(null);
    setSavingRevenue(true);
    const amountVal = amountInput.trim() === '' ? null : parseFloat(amountInput.replace(',', '.'));
    const payload = {
      amount: amountVal != null && !Number.isNaN(amountVal) ? amountVal : null,
      payment_method_id: paymentMethodIdInput === '' ? null : paymentMethodIdInput,
      updated_at: new Date().toISOString(),
    };
    const { error: err } = await supabase.from('reservations').update(payload).eq('id', reservationId);
    setSavingRevenue(false);
    if (err) setRevenueMessage({ type: 'error', text: err.message });
    else {
      setReservation((prev) => prev ? { ...prev, amount: payload.amount, payment_method_id: payload.payment_method_id } : null);
      setRevenueMessage({ type: 'success', text: 'Gelir bilgisi kaydedildi.' });
      setTimeout(() => setRevenueMessage(null), 4000);
    }
  };

  const handleStatusAction = (status: string) => {
    if (status === 'confirmed' && reservation?.status === 'completed') {
      Alert.alert('Onaylandıya geri al', 'Bu rezervasyonu tekrar "Onaylandı" durumuna almak istediğinize emin misiniz?', [
        { text: 'İptal', style: 'cancel' },
        { text: 'Evet', onPress: () => updateStatus('confirmed') },
      ]);
    } else {
      updateStatus(status);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
    );
  }

  if (error || !reservation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Rezervasyon bulunamadı.'}</Text>
      </View>
    );
  }

  const bizName = (reservation.businesses as { name: string } | null)?.name ?? '—';
  const durationLabel = reservation.duration_minutes === 0
    ? (reservation.duration_display && DURATION_DISPLAY_LABELS[reservation.duration_display]) ?? 'Süre sınırı yok'
    : `${reservation.duration_minutes} dk`;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Durum</Text>
        <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{STATUS_LABELS[reservation.status] ?? reservation.status}</Text></View>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>İşletme</Text>
        <Text style={styles.value}>{bizName}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Tarih / Saat</Text>
        <Text style={styles.value}>{reservation.reservation_date} · {String(reservation.reservation_time).slice(0, 5)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Süre · Kişi</Text>
        <Text style={styles.value}>{durationLabel} · {reservation.party_size} kişi</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Müşteri</Text>
        <Text style={styles.value}>{reservation.customer_name ?? '—'}</Text>
        {reservation.customer_phone ? <Text style={styles.valueSmall}>{reservation.customer_phone}</Text> : null}
        {reservation.customer_email ? <Text style={styles.valueSmall}>{reservation.customer_email}</Text> : null}
      </View>
      {reservation.special_requests ? (
        <View style={styles.card}>
          <Text style={styles.label}>Özel istek</Text>
          <Text style={styles.value}>{reservation.special_requests}</Text>
        </View>
      ) : null}

      {revenueSectionAvailable && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Gelir bilgisi</Text>
          {revenueMessage ? (
            <View style={[styles.revenueMsg, revenueMessage.type === 'success' ? styles.revenueMsgSuccess : styles.revenueMsgError]}>
              <Text style={revenueMessage.type === 'success' ? styles.revenueMsgTextSuccess : styles.revenueMsgTextError}>{revenueMessage.text}</Text>
            </View>
          ) : null}
          <View style={styles.revenueRow}>
            <TextInput style={styles.amountInput} value={amountInput} onChangeText={setAmountInput} placeholder="Tutar (₺)" placeholderTextColor="#a1a1aa" keyboardType="decimal-pad" />
            <View style={styles.pickerWrap}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !paymentMethodIdInput && styles.chipActive]} onPress={() => setPaymentMethodIdInput('')}><Text style={[styles.chipText, !paymentMethodIdInput && styles.chipTextActive]}>Yok</Text></TouchableOpacity>
                  {paymentMethods.map((pm) => (
                    <TouchableOpacity key={pm.id} style={[styles.chip, paymentMethodIdInput === pm.id && styles.chipActive]} onPress={() => setPaymentMethodIdInput(pm.id)}><Text style={[styles.chipText, paymentMethodIdInput === pm.id && styles.chipTextActive]}>{pm.name}</Text></TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
          <TouchableOpacity style={styles.saveRevenueBtn} onPress={saveRevenue} disabled={savingRevenue}>
            <Text style={styles.saveRevenueBtnText}>{savingRevenue ? 'Kaydediliyor...' : 'Gelir kaydet'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>İşlemler</Text>
        <View style={styles.actionsRow}>
          {reservation.status === 'pending' && (
            <>
              <TouchableOpacity style={styles.btnConfirm} onPress={() => updateStatus('confirmed')} disabled={actionLoading}><Text style={styles.btnConfirmText}>Onayla</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => updateStatus('cancelled')} disabled={actionLoading}><Text style={styles.btnCancelText}>İptal</Text></TouchableOpacity>
            </>
          )}
          {reservation.status === 'confirmed' && (
            <>
              <TouchableOpacity style={styles.btnComplete} onPress={() => updateStatus('completed')} disabled={actionLoading}><Text style={styles.btnCompleteText}>Tamamlandı</Text></TouchableOpacity>
              <TouchableOpacity style={styles.btnCancel} onPress={() => updateStatus('cancelled')} disabled={actionLoading}><Text style={styles.btnCancelText}>İptal</Text></TouchableOpacity>
            </>
          )}
          {reservation.status === 'completed' && (
            <TouchableOpacity style={styles.btnRevert} onPress={() => handleStatusAction('confirmed')} disabled={actionLoading}><Text style={styles.btnRevertText}>Onaylandıya geri al</Text></TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Zaman çizelgesi</Text>
        <Text style={styles.valueSmall}>Oluşturuldu: {formatDateTime(reservation.created_at)}</Text>
        {reservation.confirmed_at ? <Text style={styles.valueSmall}>Onaylandı: {formatDateTime(reservation.confirmed_at)}</Text> : null}
        {reservation.cancelled_at ? <Text style={styles.valueSmall}>İptal: {formatDateTime(reservation.cancelled_at)}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  errorText: { fontSize: 14, color: '#b91c1c', textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 4, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 8, textTransform: 'uppercase' },
  value: { fontSize: 15, color: '#18181b' },
  valueSmall: { fontSize: 13, color: '#71717a', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 13, fontWeight: '600', color: '#166534' },
  revenueMsg: { padding: 10, borderRadius: 8, marginBottom: 8 },
  revenueMsgSuccess: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac' },
  revenueMsgError: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  revenueMsgTextSuccess: { fontSize: 13, color: '#166534' },
  revenueMsgTextError: { fontSize: 13, color: '#b91c1c' },
  revenueRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  amountInput: { backgroundColor: '#f4f4f5', borderRadius: 10, padding: 12, fontSize: 16, color: '#18181b', minWidth: 100 },
  pickerWrap: { flex: 1 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7' },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 13, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveRevenueBtn: { marginTop: 12, backgroundColor: '#15803d', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveRevenueBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  btnConfirm: { backgroundColor: '#15803d', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnConfirmText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnCancel: { borderWidth: 1, borderColor: '#f87171', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnCancelText: { fontSize: 14, fontWeight: '600', color: '#b91c1c' },
  btnComplete: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnCompleteText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  btnRevert: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fcd34d', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  btnRevertText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
});
