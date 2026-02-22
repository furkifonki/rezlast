import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type UserRow = { id: string; total_points: number; loyalty_level: string | null };
type TxRow = { id: string; points: number; transaction_type: string; description: string | null; created_at: string; businesses: { name: string } | null };

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const email = session?.user?.email ?? '';
  const [user, setUser] = useState<UserRow | null>(null);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !session?.user?.id) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [uRes, txRes] = await Promise.all([
        supabase.from('users').select('id, total_points, loyalty_level').eq('id', session.user.id).single(),
        supabase.from('loyalty_transactions').select('id, points, transaction_type, description, created_at, businesses ( name )').eq('user_id', session.user.id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (uRes.data) setUser(uRes.data as UserRow);
      setTransactions((txRes.data ?? []) as TxRow[]);
      setLoading(false);
    })();
  }, [session?.user?.id]);

  const handleSignOut = () => {
    Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkış', style: 'destructive', onPress: signOut },
    ]);
  };

  const points = user?.total_points ?? 0;
  const level = user?.loyalty_level ?? 'bronze';
  const levelLabel = { bronze: 'Bronz', silver: 'Gümüş', gold: 'Altın', platinum: 'Platin' }[level] ?? level;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Profil</Text>
        {email ? <Text style={styles.email}>{email}</Text> : null}
        {loading ? (
          <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
        ) : (
          <>
            <View style={styles.pointsRow}>
              <Text style={styles.pointsLabel}>Toplam puan</Text>
              <Text style={styles.pointsValue}>{points}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{levelLabel}</Text>
            </View>
          </>
        )}
        <TouchableOpacity style={styles.button} onPress={handleSignOut}>
          <Text style={styles.buttonText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Puan geçmişi</Text>
        {loading ? null : transactions.length === 0 ? (
          <Text style={styles.emptyText}>Henüz puan hareketi yok. Rezervasyon tamamlandıkça puan kazanırsınız.</Text>
        ) : (
          transactions.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txDesc}>{tx.description || (tx.points > 0 ? 'Puan kazanıldı' : 'Puan kullanıldı')}</Text>
                <Text style={styles.txBusiness}>{(tx.businesses as { name: string } | null)?.name ?? '—'}</Text>
              </View>
              <Text style={[styles.txPoints, tx.points >= 0 ? styles.txPointsPlus : styles.txPointsMinus]}>
                {tx.points >= 0 ? '+' : ''}{tx.points}
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24, paddingBottom: 48 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  email: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  loader: { marginVertical: 8 },
  pointsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  pointsLabel: { fontSize: 14, color: '#64748b' },
  pointsValue: { fontSize: 20, fontWeight: '700', color: '#15803d' },
  levelBadge: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 20 },
  levelText: { fontSize: 12, fontWeight: '600', color: '#92400e' },
  button: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  buttonText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#64748b', marginBottom: 8 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  txLeft: { flex: 1 },
  txDesc: { fontSize: 14, color: '#0f172a' },
  txBusiness: { fontSize: 12, color: '#64748b', marginTop: 2 },
  txPoints: { fontSize: 15, fontWeight: '600' },
  txPointsPlus: { color: '#15803d' },
  txPointsMinus: { color: '#dc2626' },
});
