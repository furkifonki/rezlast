import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'BusinessDetail'>;

type Business = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  phone: string | null;
  is_active: boolean;
  categories: { name: string } | null;
};

export default function BusinessDetailScreen({ route, navigation }: Props) {
  const { businessId } = route.params;
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data: { user } } = await supabase?.auth.getUser() ?? { data: { user: null } };
      if (!user || !supabase) { setLoading(false); return; }
      const { data, error: err } = await supabase
        .from('businesses')
        .select('id, name, address, city, district, phone, is_active, categories ( name )')
        .eq('id', businessId)
        .eq('owner_id', user.id)
        .single();
      if (cancelled) return;
      if (err) { setError(err.message); setBusiness(null); }
      else setBusiness(data as Business);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [businessId]);

  React.useEffect(() => {
    navigation.setOptions({ title: business?.name ?? 'İşletme' });
  }, [business?.name, navigation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error || !business) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'İşletme bulunamadı.'}</Text>
      </View>
    );
  }

  const catName = (business.categories as { name: string } | null)?.name ?? '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.label}>Kategori</Text>
        <Text style={styles.value}>{catName}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Adres</Text>
        <Text style={styles.value}>{[business.district, business.city].filter(Boolean).join(', ') || business.address || '—'}</Text>
      </View>
      {business.phone ? (
        <View style={styles.card}>
          <Text style={styles.label}>Telefon</Text>
          <Text style={styles.value}>{business.phone}</Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.label}>Durum</Text>
        <Text style={styles.value}>{business.is_active ? 'Aktif' : 'Pasif'}</Text>
      </View>
      <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditBusiness', { businessId: business.id })}>
        <Text style={styles.editBtnText}>Düzenle</Text>
      </TouchableOpacity>
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
  value: { fontSize: 15, color: '#18181b' },
  hint: { fontSize: 13, color: '#71717a', marginTop: 16, fontStyle: 'italic' },
  editBtn: { backgroundColor: '#15803d', borderRadius: 12, padding: 16, marginTop: 8, alignItems: 'center' },
  editBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
