import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type PaymentMethod = { id: string; name: string };
type ReservationDetail = {
  id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  special_requests: string | null;
  payment_method_id: string | null;
  businesses: { name: string } | null;
  payment_methods: PaymentMethod | null;
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

type Props = {
  reservationId: string;
  onBack: () => void;
  onUpdated: () => void;
};

export default function ReservationDetailScreen({ reservationId, onBack, onUpdated }: Props) {
  const { session } = useAuth();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [hasPaymentColumn, setHasPaymentColumn] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id || !reservationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const baseSelect = 'id, reservation_date, reservation_time, party_size, status, special_requests, businesses ( name )';
        const res = await supabase
          .from('reservations')
          .select(`${baseSelect}, payment_method_id, payment_methods ( id, name )`)
          .eq('id', reservationId)
          .eq('user_id', session.user.id)
          .single();
        if (cancelled) return;
        if (res.error) {
          const fallback = await supabase
            .from('reservations')
            .select(baseSelect)
            .eq('id', reservationId)
            .eq('user_id', session.user.id)
            .single();
          if (cancelled) return;
          if (fallback.error) {
            setError(fallback.error.message);
            setReservation(null);
          } else {
            const r = fallback.data as Record<string, unknown>;
            const b = r.businesses;
            const business = Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : (b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null);
            setReservation({ ...r, businesses: business, payment_method_id: null, payment_methods: null } as ReservationDetail);
            setNote((r.special_requests as string) ?? '');
            setHasPaymentColumn(false);
          }
        } else {
          const r = res.data as Record<string, unknown>;
          const b = r.businesses;
          const business = Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : (b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null);
          const pm = r.payment_methods;
          const paymentMethod = Array.isArray(pm) && pm.length > 0 ? (pm[0] as PaymentMethod) : (pm && typeof pm === 'object' && 'name' in pm ? (pm as PaymentMethod) : null);
          setReservation({ ...r, businesses: business, payment_methods: paymentMethod } as ReservationDetail);
          setNote((r.special_requests as string) ?? '');
          setPaymentMethodId((r.payment_method_id as string) ?? '');
          setHasPaymentColumn(true);
        }
        const pmRes = await supabase.from('payment_methods').select('id, name').order('sort_order').order('name');
        if (!cancelled && !pmRes.error) setPaymentMethods((pmRes.data ?? []) as PaymentMethod[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Yüklenemedi');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reservationId, session?.user?.id]);

  const canEdit = reservation && (reservation.status === 'pending' || reservation.status === 'confirmed');

  const handleSave = async () => {
    if (!supabase || !reservationId || !reservation) return;
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      special_requests: note.trim() || null,
      updated_at: new Date().toISOString(),
    };
    if (hasPaymentColumn) payload.payment_method_id = paymentMethodId || null;
    const { error: err } = await supabase.from('reservations').update(payload).eq('id', reservationId).eq('user_id', session?.user?.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setReservation((prev) => prev ? { ...prev, special_requests: note.trim() || null, payment_method_id: paymentMethodId || null } : null);
    onUpdated();
  };

  const handleCancelReservation = () => {
    Alert.alert(
      'Rezervasyonu iptal et',
      'Bu rezervasyonu iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal et',
          style: 'destructive',
          onPress: async () => {
            if (!supabase || !reservationId || !session?.user?.id) return;
            setCancelling(true);
            const { error: err } = await supabase
              .from('reservations')
              .update({ status: 'cancelled', updated_at: new Date().toISOString() })
              .eq('id', reservationId)
              .eq('user_id', session.user.id);
            setCancelling(false);
            if (err) {
              setError(err.message);
              return;
            }
            onUpdated();
            onBack();
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error || !reservation) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Rezervasyon bulunamadı.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onBack}>
          <Text style={styles.retryButtonText}>← Listeye dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const businessName = (reservation.businesses as { name: string } | null)?.name ?? '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>← Rezervasyonlarım</Text>
      </TouchableOpacity>

      <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[reservation.status] ?? '#64748b'}20` }]}>
        <Text style={[styles.statusText, { color: STATUS_COLOR[reservation.status] ?? '#64748b' }]}>
          {STATUS_LABELS[reservation.status] ?? reservation.status}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{businessName}</Text>
        <Text style={styles.cardDate}>
          {reservation.reservation_date} · {String(reservation.reservation_time).slice(0, 5)}
        </Text>
        <Text style={styles.cardMeta}>
          {reservation.party_size} kişi
        </Text>
        {hasPaymentColumn && (reservation.payment_methods as PaymentMethod | null)?.name && (
          <Text style={styles.cardMeta}>Ödeme: {(reservation.payment_methods as PaymentMethod).name}</Text>
        )}
      </View>

      {canEdit && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Not / Özel istek</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="İşletmeye iletmek istediğiniz not..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />
          {hasPaymentColumn && paymentMethods.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Ödeme yöntemi (önceden belirtin)</Text>
              <View style={styles.paymentRow}>
                {paymentMethods.map((pm) => (
                  <TouchableOpacity
                    key={pm.id}
                    style={[styles.chip, paymentMethodId === pm.id && styles.chipActive]}
                    onPress={() => setPaymentMethodId(pm.id)}
                  >
                    <Text style={[styles.chipText, paymentMethodId === pm.id && styles.chipTextActive]}>{pm.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {canEdit && (
        <TouchableOpacity
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          onPress={handleCancelReservation}
          disabled={cancelling}
        >
          <Text style={styles.cancelButtonText}>{cancelling ? 'İptal ediliyor...' : 'Rezervasyonu iptal et'}</Text>
        </TouchableOpacity>
      )}

      {!canEdit && reservation.special_requests ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Not</Text>
          <Text style={styles.noteStatic}>{reservation.special_requests}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  backRow: { marginBottom: 12 },
  backText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginBottom: 16 },
  statusText: { fontSize: 14, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  cardDate: { fontSize: 15, color: '#64748b', marginBottom: 4 },
  cardMeta: { fontSize: 14, color: '#94a3b8' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteStatic: { fontSize: 15, color: '#64748b' },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#15803d' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelButton: { backgroundColor: '#fff', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#dc2626', marginTop: 8 },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#dc2626' },
  buttonDisabled: { opacity: 0.6 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: '#15803d' },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
