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
type SponsoredItem = {
  id: string;
  business_id: string;
  priority: number;
  businesses: Business | null;
};

const today = new Date().toISOString().slice(0, 10);

export default function ExploreScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sponsored, setSponsored] = useState<SponsoredItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [reservationBusinessId, setReservationBusinessId] = useState<string | null>(null);
  const [reservationBusinessName, setReservationBusinessName] = useState<string>('');

  const loadSponsored = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('sponsored_listings')
      .select('id, business_id, priority, businesses ( id, name, address, city, district, description, rating, categories ( name ) )')
      .eq('payment_status', 'paid')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('priority', { ascending: false });
    setSponsored((data ?? []) as SponsoredItem[]);
  };

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
    loadSponsored();
  }, []);

  useEffect(() => {
    setLoading(true);
    loadBusinesses();
  }, [selectedCategoryId]);

  const sponsoredBusinessIds = new Set(sponsored.map((s) => s.business_id).filter(Boolean));

  const onRefresh = () => {
    setRefreshing(true);
    loadSponsored();
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

  const renderBusinessCard = (item: Business, isFeatured?: boolean) => (
    <TouchableOpacity
      style={[styles.card, isFeatured && styles.cardFeatured]}
      onPress={() => setSelectedBusinessId(item.id)}
      activeOpacity={0.7}
    >
      {isFeatured ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Öne Çıkan</Text>
        </View>
      ) : null}
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
  );

  return (
    <View style={styles.container}>
      {sponsored.length > 0 ? (
        <View style={styles.featuredBlock}>
          <Text style={styles.featuredTitle}>Öne Çıkan</Text>
          <FlatList
            horizontal
            data={sponsored}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            renderItem={({ item }) => {
              const b = item.businesses;
              if (!b) return null;
              return (
                <View style={styles.featuredCardWrap}>
                  {renderBusinessCard(b, true)}
                </View>
              );
            }}
          />
        </View>
      ) : null}
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
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyEmoji}>🏪</Text>
              <Text style={styles.emptyTitle}>Bu kategoride işletme yok</Text>
              <Text style={styles.emptyText}>Farklı bir kategori seçin veya &quot;Tümü&quot;ne tıklayın.</Text>
            </View>
          }
          renderItem={({ item }) => renderBusinessCard(item, sponsoredBusinessIds.has(item.id))}
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
  featuredBlock: {
    backgroundColor: '#f0fdf4',
    borderBottomWidth: 1,
    borderBottomColor: '#bbf7d0',
    paddingVertical: 12,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#15803d',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 12,
  },
  featuredCardWrap: {
    width: 220,
    marginRight: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardFeatured: {
    borderColor: '#15803d',
    borderWidth: 1.5,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
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
  emptyBlock: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
