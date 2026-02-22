import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import BusinessDetailScreen from './BusinessDetailScreen';
import ReservationFlowScreen from './ReservationFlowScreen';

type Category = { id: string; name: string; slug: string };
type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  description: string | null;
  rating: number | null;
  categories: { name: string } | null;
};

export default function ExploreScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [reservationBusinessId, setReservationBusinessId] = useState<string | null>(null);
  const [reservationBusinessName, setReservationBusinessName] = useState<string>('');

  const loadCategories = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order');
    setCategories((data ?? []) as Category[]);
  };

  const loadBusinesses = async () => {
    if (!supabase) {
      setError('Bağlantı yok');
      setLoading(false);
      return;
    }
    setError(null);
    let query = supabase
      .from('businesses')
      .select('id, name, address, city, district, description, rating, categories ( name )')
      .eq('is_active', true)
      .order('name');
    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId);
    }
    const { data, err } = await query;
    if (err) {
      setError(err.message);
      setBusinesses([]);
    } else {
      setBusinesses((data ?? []) as Business[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBusinesses();
  }, [selectedCategoryId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBusinesses();
  };

  if (reservationBusinessId) {
    return (
      <ReservationFlowScreen
        businessId={reservationBusinessId}
        businessName={reservationBusinessName}
        onBack={() => {
          setReservationBusinessId(null);
          setReservationBusinessName('');
        }}
        onDone={() => {
          setReservationBusinessId(null);
          setReservationBusinessName('');
        }}
      />
    );
  }

  if (selectedBusinessId) {
    return (
      <BusinessDetailScreen
        businessId={selectedBusinessId}
        onBack={() => setSelectedBusinessId(null)}
        onReservationPress={(id, name) => {
          setReservationBusinessId(id);
          setReservationBusinessName(name);
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.categoryRow}>
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategoryId === null && styles.categoryChipActive]}
          onPress={() => setSelectedCategoryId(null)}
        >
          <Text style={[styles.categoryChipText, selectedCategoryId === null && styles.categoryChipTextActive]}>
            Tümü
          </Text>
        </TouchableOpacity>
        {categories.map((c) => (
          <TouchableOpacity
            key={c.id}
            style={[styles.categoryChip, selectedCategoryId === c.id && styles.categoryChipActive]}
            onPress={() => setSelectedCategoryId(c.id)}
          >
            <Text style={[styles.categoryChipText, selectedCategoryId === c.id && styles.categoryChipTextActive]}>
              {c.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hint}>RLS: Mobil için aktif işletmeleri görmek üzere policy eklenmiş olmalı.</Text>
        </View>
      ) : loading && businesses.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Bu kategoride işletme yok.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => setSelectedBusinessId(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardCategory}>
                {(item.categories as { name: string } | null)?.name ?? '—'}
              </Text>
              {item.address ? (
                <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
              ) : null}
              {item.rating != null && Number(item.rating) > 0 ? (
                <Text style={styles.cardRating}>★ {Number(item.rating).toFixed(1)}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  categoryChipActive: {
    backgroundColor: '#15803d',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  categoryChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardCategory: {
    fontSize: 13,
    color: '#15803d',
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
  },
  cardRating: {
    fontSize: 13,
    color: '#f59e0b',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
  },
});
