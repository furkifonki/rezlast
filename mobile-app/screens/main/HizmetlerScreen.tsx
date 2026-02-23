import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

type Props = {
  onBack: () => void;
};

export default function HizmetlerScreen({ onBack }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hizmetler</Text>
      </View>

      <Text style={styles.intro}>Rezvio ile neler yapabilirsiniz?</Text>

      <View style={styles.item}>
        <Text style={styles.itemTitle}>Rezervasyon</Text>
        <Text style={styles.itemDesc}>İşletmeleri keşfedin, tarih ve saat seçin, masa veya hizmet seçerek rezervasyon yapın.</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.itemTitle}>Favoriler</Text>
        <Text style={styles.itemDesc}>Beğendiğiniz işletmeleri favorilere ekleyin, tek tıkla rezervasyon açın.</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.itemTitle}>Puan ve avantajlar</Text>
        <Text style={styles.itemDesc}>Tamamlanan rezervasyonlarda puan kazanın; Bronz, Gümüş, Altın ve Platin seviyeleriyle işletmelerde avantajlardan yararlanın.</Text>
      </View>
      <View style={styles.item}>
        <Text style={styles.itemTitle}>Profil ve iletişim</Text>
        <Text style={styles.itemDesc}>Ad, soyad ve telefon bilgilerinizi güncelleyin; e-posta ve SMS tercihlerinizi yönetin.</Text>
      </View>
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
  intro: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 24 },
  item: { marginBottom: 20 },
  itemTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  itemDesc: { fontSize: 14, color: '#64748b', lineHeight: 20 },
});
