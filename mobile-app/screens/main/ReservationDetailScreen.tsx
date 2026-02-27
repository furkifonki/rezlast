import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/NotificationContext';
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { getOrCreateConversation } from '../../lib/messaging';

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
  const { navigate } = useSimpleStack();
  const toast = useToast();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [messageLoading, setMessageLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [hasPaymentColumn, setHasPaymentColumn] = useState(false);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);

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
            setShowNoteInput(!!((r.special_requests as string) ?? '').trim());
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
          setShowNoteInput(!!((r.special_requests as string) ?? '').trim());
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
  const canMessage = canEdit;

  const handleMessagePress = async () => {
    if (!reservationId || !canMessage || messageLoading) return;
    setMessageLoading(true);
    try {
      const conversationId = await getOrCreateConversation(reservationId);
      const businessName = (reservation?.businesses as { name: string } | null)?.name ?? undefined;
      navigate('Chat', { conversationId, businessName, messagingDisabled: false });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Sohbet açılamadı.');
    } finally {
      setMessageLoading(false);
    }
  };

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
    toast.success('Notunuz kaydedildi.', 'Kaydedildi');
  };

  const handleCancelReservation = () => {
    setCancelModalVisible(true);
  };

  const confirmCancelReservation = async () => {
    setCancelModalVisible(false);
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
        <TouchableOpacity style={styles.backBtnRound} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const businessName = (reservation.businesses as { name: string } | null)?.name ?? '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backBtnRound} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Rezervasyon detayı</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLOR[reservation.status] ?? '#64748b'}20` }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[reservation.status] ?? '#64748b' }]}>
              {STATUS_LABELS[reservation.status] ?? reservation.status}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{businessName}</Text>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardDate}>
            {reservation.reservation_date} · {String(reservation.reservation_time).slice(0, 5)}
          </Text>
          <Text style={styles.cardMeta}>{reservation.party_size} kişi</Text>
        </View>
        {hasPaymentColumn && (reservation.payment_methods as PaymentMethod | null)?.name && (
          <Text style={styles.cardMeta}>Ödeme: {(reservation.payment_methods as PaymentMethod).name}</Text>
        )}
      </View>

      {canEdit && (
        <View style={styles.card}>
          {!showNoteInput && !note.trim() ? (
            <TouchableOpacity style={styles.noteToggleRow} onPress={() => setShowNoteInput(true)}>
              <Text style={styles.noteToggleLabel}>Not (işletmeye iletilecek)</Text>
              <Text style={styles.noteToggleLink}>+ Not ekle</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.sectionLabel}>Not (işletmeye iletilecek)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="İşletmeye iletmek istediğiniz not..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
              {!note.trim() && (
                <TouchableOpacity onPress={() => setShowNoteInput(false)} style={styles.noteHideRow}>
                  <Text style={styles.noteHideText}>Gizle</Text>
                </TouchableOpacity>
              )}
            </>
          )}
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

      {canEdit && (
        <View style={styles.card}>
          <TouchableOpacity
            style={[styles.linkRow, messageLoading && styles.buttonDisabled]}
            onPress={handleMessagePress}
            disabled={!canMessage || messageLoading}
          >
            <Text style={styles.linkRowText}>Restoranla Mesajlaş</Text>
            <Text style={styles.linkRowArrow}>→</Text>
          </TouchableOpacity>
          {!canMessage && (
            <Text style={styles.messageHint}>Bu rezervasyon için mesajlaşma kapalı.</Text>
          )}
        </View>
      )}

      {!canEdit && (
        <View style={styles.card}>
          {canMessage ? (
            <TouchableOpacity
              style={[styles.linkRow, messageLoading && styles.buttonDisabled]}
              onPress={handleMessagePress}
              disabled={messageLoading}
            >
              <Text style={styles.linkRowText}>Restoranla Mesajlaş</Text>
              <Text style={styles.linkRowArrow}>→</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.linkRowDisabled} disabled>
                <Text style={styles.linkRowTextDisabled}>Restoranla Mesajlaş</Text>
                <Text style={styles.linkRowArrowDisabled}>→</Text>
              </TouchableOpacity>
              <Text style={styles.messageHint}>Bu rezervasyon için mesajlaşma kapalı.</Text>
            </>
          )}
        </View>
      )}

      {!canEdit && reservation.special_requests ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Not</Text>
          <Text style={styles.noteStatic}>{reservation.special_requests}</Text>
        </View>
      ) : null}

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCancelModalVisible(false)}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Rezervasyonu iptal et</Text>
            <Text style={styles.modalMessage}>Bu rezervasyonu iptal etmek istediğinize emin misiniz?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setCancelModalVisible(false)}>
                <Text style={styles.modalCancelText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmCancelReservation} disabled={cancelling}>
                <Text style={styles.modalConfirmText}>{cancelling ? 'İptal ediliyor...' : 'İptal et'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 32 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  backBtnRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  backBtnIcon: { fontSize: 20, color: '#15803d', fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  cardDate: { fontSize: 15, color: '#475569', fontWeight: '500' },
  cardMeta: { fontSize: 14, color: '#64748b' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#64748b', marginBottom: 8 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#0f172a',
    minHeight: 88,
    textAlignVertical: 'top',
    backgroundColor: '#fafafa',
  },
  noteToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  noteToggleLabel: { fontSize: 14, color: '#64748b' },
  noteToggleLink: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  noteHideRow: { marginTop: 10 },
  noteHideText: { fontSize: 14, color: '#64748b' },
  noteStatic: { fontSize: 15, color: '#475569', lineHeight: 22 },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#15803d' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  saveButton: { backgroundColor: '#15803d', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  cancelButton: { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#fecaca', marginTop: 10 },
  cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 },
  linkRowText: { fontSize: 16, color: '#0f172a', fontWeight: '600' },
  linkRowArrow: { fontSize: 20, color: '#15803d', fontWeight: '600' },
  linkRowDisabled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4, opacity: 0.6 },
  linkRowTextDisabled: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  linkRowArrowDisabled: { fontSize: 20, color: '#94a3b8' },
  messageHint: { fontSize: 13, color: '#64748b', marginTop: 8, paddingHorizontal: 4 },
  buttonDisabled: { opacity: 0.6 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  modalMessage: { fontSize: 15, color: '#64748b', marginBottom: 20, lineHeight: 22 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: '#475569' },
  modalConfirmBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc2626', alignItems: 'center' },
  modalConfirmText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
