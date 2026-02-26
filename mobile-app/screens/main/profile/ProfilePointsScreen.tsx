import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSimpleStack } from '../../../navigation/SimpleStackContext';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import {
  getTierFromPoints,
  getPointsToNextTier,
} from '../../../lib/loyaltyConstants';

type TxRow = {
  id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  created_at: string;
  businesses: { name: string } | null;
};
type TierRow = { id: string; min_points: number; display_name: string; description: string | null; sort_order: number };

const FILTERS = ['Tümü', 'Kazanılan', 'Harcanan'] as const;
type FilterKey = (typeof FILTERS)[number];

// Bronz: turuncu/kahve, Gümüş: gri, Altın: altın, Platin: mor (bronz asla mor değil)
const tierColor: Record<string, string> = {
  bronze: '#b45309',
  silver: '#64748b',
  gold: '#d97706',
  platinum: '#7c3aed',
};

export default function ProfilePointsScreen() {
  const { goBack } = useSimpleStack();
  const { profile, loading: profileLoading } = useUserProfile();
  const { session } = useAuth();
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [tiers, setTiers] = useState<TierRow[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('Tümü');

  const points = profile?.total_points ?? 0;
  const { id: tierId, displayName: tierDisplayName } = getTierFromPoints(points);
  const levelLabel = tierDisplayName;
  const pointsToNext = getPointsToNextTier(points);
  const [showTiersModal, setShowTiersModal] = useState(false);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setLoadingTx(false);
      return;
    }
    (async () => {
      setLoadingTx(true);
      const [txRes, tiersRes] = await Promise.all([
        supabase
          .from('loyalty_transactions')
          .select('id, points, transaction_type, description, created_at, businesses ( name )')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('loyalty_tiers')
          .select('id, min_points, display_name, description, sort_order')
          .order('sort_order'),
      ]);
      setTransactions((txRes.data ?? []) as TxRow[]);
      setTiers(((tiersRes.data ?? []) as TierRow[]).length > 0 ? (tiersRes.data as TierRow[]) : [
        { id: 'bronze', min_points: 0, display_name: 'Bronz', description: 'Rezervasyonlarınızı tamamladıkça puan kazanırsınız.', sort_order: 1 },
        { id: 'silver', min_points: 100, display_name: 'Gümüş', description: '100+ puan: Gümüş üye avantajları.', sort_order: 2 },
        { id: 'gold', min_points: 500, display_name: 'Altın', description: '500+ puan: Altın üye avantajları.', sort_order: 3 },
        { id: 'platinum', min_points: 1500, display_name: 'Platin', description: '1500+ puan: Platin üye.', sort_order: 4 },
      ]);
      setLoadingTx(false);
    })();
  }, [session?.user?.id]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'Kazanılan') return transactions.filter((t) => t.points > 0);
    if (filter === 'Harcanan') return transactions.filter((t) => t.points < 0);
    return transactions;
  }, [transactions, filter]);

  const formatDate = (s: string) => {
    const d = new Date(s);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puanlar</Text>
      </View>

      {/* Özet */}
      <View style={styles.summaryCard}>
        {profileLoading ? (
          <ActivityIndicator size="small" color="#15803d" />
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Toplam puan</Text>
              <Text style={styles.summaryValue}>{points}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryLabelRow}>
                <Text style={styles.summaryLabel}>Mevcut seviye</Text>
                <TouchableOpacity
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  onPress={() => setShowTiersModal(true)}
                  style={styles.infoButton}
                >
                  <Text style={styles.infoButtonText}>ℹ️ Seviyeler</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.tierBadge, { backgroundColor: tierColor[tierId] ?? '#b45309' }]}>
                <Text style={styles.tierBadgeText}>{levelLabel}</Text>
              </View>
            </View>
            {pointsToNext !== null && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bir sonraki seviyeye kalan</Text>
                <Text style={styles.summaryNext}>{pointsToNext} puan</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Puan Hareketleri */}
      <Text style={styles.sectionTitle}>Puan Hareketleri</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loadingTx ? (
        <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Henüz puan hareketi yok.</Text>
          <Text style={styles.emptyHint}>Rezervasyonlarınız tamamlandıkça puan kazanırsınız.</Text>
        </View>
      ) : (
        <View style={styles.txList}>
          {filteredTransactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txDesc}>
                  {tx.description || (tx.points > 0 ? 'Puan kazanıldı' : 'Puan kullanıldı')}
                </Text>
                <Text style={styles.txMeta}>
                  {formatDate(tx.created_at)}
                  {(tx.businesses as { name?: string } | null)?.name
                    ? ` · ${(tx.businesses as { name: string }).name}`
                    : ''}
                </Text>
              </View>
              <Text style={[styles.txPoints, tx.points >= 0 ? styles.txPlus : styles.txMinus]}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </Text>
            </View>
          ))}
        </View>
      )}

      <Modal visible={showTiersModal} transparent animationType="fade">
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowTiersModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seviyeler</Text>
              <TouchableOpacity onPress={() => setShowTiersModal(false)}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {tiers.map((t) => (
                <View key={t.id} style={[styles.tierCard, { borderLeftColor: tierColor[t.id] ?? '#b45309' }]}>
                  <View style={styles.tierHeader}>
                    <Text style={[styles.tierName, { color: tierColor[t.id] ?? '#b45309' }]}>{t.display_name}</Text>
                    <Text style={styles.tierPoints}>{t.min_points}+ puan</Text>
                  </View>
                  {t.description ? <Text style={styles.tierDesc}>{t.description}</Text> : null}
                </View>
              ))}
              <Text style={styles.footer}>
                Puan kullanım koşulları işletmeye göre değişebilir.
              </Text>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  summaryLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLabel: { fontSize: 14, color: '#64748b' },
  infoButton: { paddingVertical: 4, paddingHorizontal: 8 },
  infoButtonText: { fontSize: 13, color: '#15803d', fontWeight: '500' },
  summaryValue: { fontSize: 22, fontWeight: '700', color: '#15803d' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tierBadgeText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  summaryNext: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
  },
  filterChipActive: { backgroundColor: '#15803d' },
  filterChipText: { fontSize: 14, color: '#64748b', fontWeight: '500' },
  filterChipTextActive: { color: '#fff' },
  loader: { marginVertical: 16 },
  emptyCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  txList: { marginBottom: 24 },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txLeft: { flex: 1 },
  txDesc: { fontSize: 15, fontWeight: '500', color: '#0f172a' },
  txMeta: { fontSize: 12, color: '#64748b', marginTop: 2 },
  txPoints: { fontSize: 16, fontWeight: '700', marginLeft: 12 },
  txPlus: { color: '#15803d' },
  txMinus: { color: '#dc2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  modalClose: { fontSize: 16, fontWeight: '600', color: '#15803d' },
  modalScroll: { padding: 16, maxHeight: 400 },
  tierList: { gap: 12 },
  tierCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tierName: { fontSize: 17, fontWeight: '700' },
  tierPoints: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  tierDesc: { fontSize: 14, color: '#475569', lineHeight: 20 },
  footer: { fontSize: 13, color: '#94a3b8', marginTop: 24, fontStyle: 'italic' },
});
