import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';

type Tier = { id: string; min_points: number; display_name: string; description: string | null; sort_order: number };

type Props = {
  onBack: () => void;
};

export default function PointsInfoScreen({ onBack }: Props) {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('loyalty_tiers')
        .select('id, min_points, display_name, description, sort_order')
        .order('sort_order');
      const list = (data ?? []) as Tier[];
      if (list.length > 0) {
        setTiers(list);
      } else {
        setTiers([
          { id: 'bronze', min_points: 0, display_name: 'Bronz', description: 'Rezervasyonlarınızı tamamladıkça puan kazanırsınız. Puanlarınızı işletmelerde indirim veya özel avantajlar için kullanabilirsiniz.', sort_order: 1 },
          { id: 'silver', min_points: 100, display_name: 'Gümüş', description: '100+ puan: Gümüş üye avantajları. İşletmelerin belirlediği indirimlerden yararlanın.', sort_order: 2 },
          { id: 'gold', min_points: 500, display_name: 'Altın', description: '500+ puan: Altın üye avantajları. Öncelikli rezervasyon ve ekstra indirimler.', sort_order: 3 },
          { id: 'platinum', min_points: 1500, display_name: 'Platin', description: '1500+ puan: Platin üye. En yüksek avantajlar ve özel kampanyalara erişim.', sort_order: 4 },
        ]);
      }
      setLoading(false);
    })();
  }, []);

  const tierColor: Record<string, string> = {
    bronze: '#b45309',
    silver: '#64748b',
    gold: '#d97706',
    platinum: '#7c3aed',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Puanlarımı Nasıl Kullanırım?</Text>
      </View>

      <Text style={styles.intro}>
        Rezvio’da rezervasyonlarınızı tamamladıkça puan kazanırsınız. Topladığınız puanlara göre seviye atlarsınız ve işletmelerin sunduğu indirim veya avantajlardan yararlanabilirsiniz.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
      ) : (
        <View style={styles.tierList}>
          {tiers.map((t) => (
            <View key={t.id} style={[styles.tierCard, { borderLeftColor: tierColor[t.id] ?? '#15803d' }]}>
              <View style={styles.tierHeader}>
                <Text style={[styles.tierName, { color: tierColor[t.id] ?? '#15803d' }]}>{t.display_name}</Text>
                <Text style={styles.tierPoints}>{t.min_points}+ puan</Text>
              </View>
              {t.description ? (
                <Text style={styles.tierDesc}>{t.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footer}>
        Puan kullanım koşulları işletmeye göre değişebilir. Detay için işletme ile iletişime geçebilirsiniz.
      </Text>
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
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#0f172a' },
  intro: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 24 },
  loader: { marginVertical: 24 },
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
