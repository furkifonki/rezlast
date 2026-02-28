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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
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
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);

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
            const savedNote = (r.special_requests as string) ?? '';
            setNote(savedNote);
            setShowNoteInput(!!savedNote.trim());
            setHasPaymentColumn(false);
            setDetailsCollapsed(!!savedNote.trim());
          }
        } else {
          const r = res.data as Record<string, unknown>;
          const b = r.businesses;
          const business = Array.isArray(b) && b.length > 0 ? (b[0] as { name: string }) : (b && typeof b === 'object' && 'name' in b ? (b as { name: string }) : null);
          const pm = r.payment_methods;
          const paymentMethod = Array.isArray(pm) && pm.length > 0 ? (pm[0] as PaymentMethod) : (pm && typeof pm === 'object' && 'name' in pm ? (pm as PaymentMethod) : null);
          setReservation({ ...r, businesses: business, payment_methods: paymentMethod } as ReservationDetail);
          const savedNote = (r.special_requests as string) ?? '';
          setNote(savedNote);
          setShowNoteInput(!!savedNote.trim());
          const savedPmId = (r.payment_method_id as string) ?? '';
          setPaymentMethodId(savedPmId);
          setHasPaymentColumn(true);
          const hasSavedDetails = !!savedNote.trim() || !!savedPmId;
          setDetailsCollapsed(hasSavedDetails);
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
    setDetailsCollapsed(true);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
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
          {detailsCollapsed ? (
            <View style={styles.detailsSummary}>
              {(note.trim() || (hasPaymentColumn && paymentMethods.length > 0)) ? (
                <>
                  {note.trim() ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Not</Text>
                      <Text style={styles.summaryValue} numberOfLines={3}>{note.trim()}</Text>
                    </View>
                  ) : null}
                  {hasPaymentColumn && paymentMethods.length > 0 && paymentMethodId ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Ödeme</Text>
                      <Text style={styles.summaryValue}>
                        {paymentMethods.find((pm) => pm.id === paymentMethodId)?.name ?? '—'}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.summaryEmpty}>Not veya ödeme yöntemi eklenmedi.</Text>
              )}
              <TouchableOpacity onPress={() => setDetailsCollapsed(false)} style={styles.summaryEditLink}>
                <Text style={styles.summaryEditLinkText}>Düzenle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
            </>
          )}
        </View>
      )}

      {canEdit && (
        <TouchableOpacity
          style={[styles.cancelButton, cancelling && styles.buttonDisabled]}
          onPress={handleCancelReservation}
          disabled={cancelling}
          activeOpacity={0.8}
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

        <View style={styles.stickySpacer} />
      </ScrollView>

      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {canEdit ? (
          <>
            <TouchableOpacity
              style={[styles.actionCard, styles.actionCardPrimary, messageLoading && styles.buttonDisabled]}
              onPress={handleMessagePress}
              disabled={!canMessage || messageLoading}
              activeOpacity={0.8}
            >
              <View style={styles.actionCardIconWrap}>
                <Text style={styles.actionCardIcon}>💬</Text>
              </View>
              <Text style={styles.actionCardLabel}>Restoranla mesajlaş</Text>
              <Text style={styles.actionCardArrow}>›</Text>
            </TouchableOpacity>
            {!canMessage && <Text style={styles.messageHint}>Bu rezervasyon için mesajlaşma kapalı.</Text>}
          </>
        ) : canMessage ? (
          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPrimary, messageLoading && styles.buttonDisabled]}
            onPress={handleMessagePress}
            disabled={messageLoading}
            activeOpacity={0.8}
          >
            <View style={styles.actionCardIconWrap}>
              <Text style={styles.actionCardIcon}>💬</Text>
            </View>
            <Text style={styles.actionCardLabel}>Restoranla mesajlaş</Text>
            <Text style={styles.actionCardArrow}>›</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={[styles.actionCard, styles.actionCardDisabled]}>
              <View style={styles.actionCardIconWrapDisabled}>
                <Text style={styles.actionCardIcon}>💬</Text>
              </View>
              <Text style={styles.actionCardLabelDisabled}>Restoranla mesajlaş</Text>
              <Text style={styles.actionCardArrowDisabled}>›</Text>
            </View>
            <Text style={styles.messageHint}>Bu rezervasyon için mesajlaşma kapalı.</Text>
          </>
        )}
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 12 },
  stickySpacer: { height: 100 },
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backBtnRound: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnIcon: { fontSize: 22, color: '#15803d', fontWeight: '700' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 24 },
  statusText: { fontSize: 13, fontWeight: '700' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardTitle: { fontSize: 19, fontWeight: '800', color: '#0f172a', marginBottom: 8, letterSpacing: -0.2 },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  cardDate: { fontSize: 16, color: '#475569', fontWeight: '600' },
  cardMeta: { fontSize: 15, color: '#64748b' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#64748b', marginBottom: 10 },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: '#0f172a',
    minHeight: 96,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
  },
  noteToggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  noteToggleLabel: { fontSize: 15, color: '#64748b', fontWeight: '500' },
  noteToggleLink: { fontSize: 16, color: '#15803d', fontWeight: '700' },
  noteHideRow: { marginTop: 12 },
  noteHideText: { fontSize: 15, color: '#64748b' },
  noteStatic: { fontSize: 16, color: '#475569', lineHeight: 24 },
  detailsSummary: { paddingVertical: 4 },
  summaryRow: { marginBottom: 10 },
  summaryLabel: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' },
  summaryValue: { fontSize: 15, color: '#0f172a', lineHeight: 22 },
  summaryEmpty: { fontSize: 15, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 },
  summaryEditLink: { marginTop: 12, alignSelf: 'flex-start' },
  summaryEditLinkText: { fontSize: 15, color: '#15803d', fontWeight: '700' },
  paymentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 28, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#15803d', shadowColor: '#15803d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  chipText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
  saveButton: {
    backgroundColor: '#15803d',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  cancelButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#dc2626' },
  actionCardWrapper: { marginBottom: 14 },
  actionCard: {
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardPrimary: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  actionCardDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.9,
  },
  actionCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionCardIconWrapDisabled: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionCardIcon: { fontSize: 24 },
  actionCardLabel: { flex: 1, fontSize: 17, fontWeight: '700', color: '#0f172a' },
  actionCardArrow: { fontSize: 28, color: '#15803d', fontWeight: '300' },
  actionCardLabelDisabled: { flex: 1, fontSize: 17, fontWeight: '600', color: '#94a3b8' },
  actionCardArrowDisabled: { fontSize: 28, color: '#cbd5e1' },
  messageHint: { fontSize: 14, color: '#64748b', marginTop: 12, paddingHorizontal: 4 },
  buttonDisabled: { opacity: 0.6 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#64748b', fontWeight: '500' },
  errorText: { fontSize: 16, color: '#dc2626', marginBottom: 16, fontWeight: '500' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 12, letterSpacing: -0.3 },
  modalMessage: { fontSize: 16, color: '#64748b', marginBottom: 24, lineHeight: 24 },
  modalActions: { flexDirection: 'row', gap: 14 },
  modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  modalConfirmBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, backgroundColor: '#dc2626', alignItems: 'center', shadowColor: '#dc2626', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  modalConfirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
