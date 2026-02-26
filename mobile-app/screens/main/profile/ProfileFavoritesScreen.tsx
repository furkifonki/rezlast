import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useSimpleStack } from '../../../navigation/SimpleStackContext';

export default function ProfileFavoritesScreen() {
  const { goBack } = useSimpleStack();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favoriler</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.placeholder}>Favori mekanlarınız ana sayfadaki Favoriler sekmesinde listelenir.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { marginRight: 12 },
  backText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#0f172a' },
  scroll: { flex: 1 },
  content: { padding: 20 },
  placeholder: { fontSize: 14, color: '#64748b' },
});
