import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  ScrollView,
} from 'react-native';
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  businesses: Business | Business[] | null;
};

const today = new Date().toISOString().slice(0, 10);

function getBusinessFromSponsored(item: SponsoredItem): Business | null {
  const b = item.businesses;
  if (!b) return null;
  return Array.isArray(b) ? b[0] ?? null : b;
}

type ExploreScreenProps = {
  popToRootRef?: React.MutableRefObject<(() => void) | null>;
};

export default function ExploreScreen({ popToRootRef }: ExploreScreenProps) {
  const { navigate, popToTop } = useSimpleStack();
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sponsored, setSponsored] = useState<SponsoredItem[]>([]);
  const [sponsoredError, setSponsoredError] = useState<string | null>(null);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!popToRootRef) return;
    popToRootRef.current = () => {
      popToTop();
      setShowAllFeatured(false);
    };
    return () => {
      popToRootRef.current = null;
    };
  }, [popToRootRef, popToTop]);

  const loadFavorites = useCallback(async () => {
    if (!supabase || !session?.user?.id) {
      setFavorites(new Set());
      return;
    }
    const { data, error: err } = await supabase
      .from('user_favorites')
      .select('business_id')
      .eq('user_id', session.user.id);
    if (err) {
      setFavorites(new Set());
      return;
    }
    const ids = (data ?? []).map((r: { business_id: string }) => r.business_id).filter(Boolean);
    setFavorites(new Set(ids));
  }, [session?.user?.id]);

  const toggleFavorite = useCallback(async (businessId: string) => {
    if (!session?.user?.id) return;
    if (!supabase) return;
    const isFav = favorites.has(businessId);
    if (isFav) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', session.user.id)
        .eq('business_id', businessId);
      setFavorites((prev) => {
        const next = new Set(prev);
        next.delete(businessId);
        return next;
      });
    } else {
      await supabase
        .from('user_favorites')
        .insert({ user_id: session.user.id, business_id: businessId });
      setFavorites((prev) => new Set([...prev, businessId]));
    }
  }, [favorites, session?.user?.id]);

  const loadSponsored = useCallback(async () => {
    if (!supabase) return;
    setSponsoredError(null);
    const { data, error: err } = await supabase
      .from('sponsored_listings')
      .select('id, business_id, priority, businesses ( id, name, address, city, district, description, rating, categories ( name ) )')
      .eq('payment_status', 'paid')
      .lte('start_date', today)
      .gte('end_date', today)
      .order('priority', { ascending: false });
    if (err) {
      setSponsoredError(err.message);
      setSponsored([]);
      return;
    }
    setSponsored((data ?? []) as SponsoredItem[]);
  }, []);

  const loadCategories = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .order('sort_order');
    setCategories((data ?? []) as Category[]);
  };

  // Filtreler: Kategori (Restoran, Berber, Güzellik) business.category_id ile eşleşir.
  // Admin paneldeki "hizmetler" (services) işletme bazlıdır; rezervasyon ekranında o işletmenin hizmetleri gösterilir.
  const loadBusinesses = useCallback(async () => {
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
      .order('rating', { ascending: false })
      .order('name');
    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId);
    }
    const { data, err } = await query;
    if (err) {
      setError(err.message);
      setBusinesses([]);
      setPhotoMap({});
    } else {
      const list = (data ?? []) as Business[];
      setBusinesses(list);
      const ids = list.map((b) => b.id).filter(Boolean);
      if (ids.length > 0 && supabase) {
        const { data: photoRows } = await supabase
          .from('business_photos')
          .select('business_id, photo_url, is_primary, photo_order')
          .in('business_id', ids)
          .order('is_primary', { ascending: false })
          .order('photo_order');
        const map: Record<string, string> = {};
        (photoRows ?? []).forEach((row: { business_id: string; photo_url: string }) => {
          if (!map[row.business_id]) map[row.business_id] = row.photo_url;
        });
        setPhotoMap(map);
      } else {
        setPhotoMap({});
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [selectedCategoryId]);

  useEffect(() => {
    loadCategories();
    loadSponsored();
    loadFavorites();
  }, [loadSponsored, loadFavorites]);

  useEffect(() => {
    setLoading(true);
    loadBusinesses();
  }, [loadBusinesses]);

  const sponsoredBusinessIds = new Set(sponsored.map((s) => s.business_id).filter(Boolean));
  const sponsoredBusinesses = sponsored
    .map(getBusinessFromSponsored)
    .filter((b): b is Business => b != null);

  const onRefresh = () => {
    setRefreshing(true);
    loadSponsored();
    loadBusinesses();
  };

  const renderBusinessCard = (item: Business, isFeatured?: boolean, cardWidth?: number) => {
    const photoUrl = photoMap[item.id];
    const isFav = favorites.has(item.id);
    const rating = item.rating != null && Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : null;
    const categoryName = (item.categories as { name: string } | null)?.name ?? '—';
    return (
      <TouchableOpacity
        style={[styles.card, isFeatured && styles.cardFeatured, cardWidth ? { width: cardWidth } : undefined]}
        onPress={() => navigate('BusinessDetail', { businessId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardImageWrap}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={styles.cardImage} resizeMode="cover" />
          ) : (
            <View style={styles.cardImagePlaceholder}>
              <Text style={styles.cardImagePlaceholderText}>📷</Text>
            </View>
          )}
          {isFeatured ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Öne Çıkan</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.favButton}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorite(item.id);
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.favIcon}>{isFav ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {rating ? (
              <Text style={styles.cardRating}>★ {rating}</Text>
            ) : null}
            <Text style={styles.cardCategory} numberOfLines={1}>{categoryName}</Text>
          </View>
          {item.address ? (
            <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {sponsoredBusinesses.length > 0 ? (
        <View style={styles.featuredBlock}>
          <View style={styles.featuredHeader}>
            <Text style={styles.featuredTitle}>Öne Çıkan</Text>
            <TouchableOpacity onPress={() => setShowAllFeatured(true)}>
              <Text style={styles.tumunuGor}>Tümünü gör</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={sponsoredBusinesses}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredScroll}
            renderItem={({ item }) => (
              <View style={styles.featuredCardWrap}>
                {renderBusinessCard(item, true, 220)}
              </View>
            )}
          />
        </View>
      ) : sponsoredError ? (
        <View style={styles.featuredErrorWrap}>
          <Text style={styles.featuredErrorText}>Öne çıkanlar yüklenemedi</Text>
        </View>
      ) : null}
      <View style={styles.filterSection}>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => navigate('ExploreMap')}
          activeOpacity={0.8}
        >
          <Text style={styles.mapButtonIcon}>🗺️</Text>
          <Text style={styles.mapButtonText}>Harita görünümü</Text>
        </TouchableOpacity>
        <Text style={styles.filterLabel}>Kategori</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterScrollView}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedCategoryId === null && styles.filterChipActive]}
            onPress={() => setSelectedCategoryId(null)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, selectedCategoryId === null && styles.filterChipTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.filterChip, selectedCategoryId === c.id && styles.filterChipActive]}
              onPress={() => setSelectedCategoryId(c.id)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterChipText, selectedCategoryId === c.id && styles.filterChipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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

      <Modal visible={showAllFeatured} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Öne Çıkan İşletmeler</Text>
              <TouchableOpacity onPress={() => setShowAllFeatured(false)}>
                <Text style={styles.modalClose}>Kapat</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={sponsoredBusinesses}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.modalList}
              renderItem={({ item }) => (
                <View style={styles.modalCardWrap}>
                  {renderBusinessCard(item, true)}
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterSection: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingLeft: 16,
    paddingRight: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  mapButtonIcon: { fontSize: 18, marginRight: 8 },
  mapButtonText: { fontSize: 14, fontWeight: '600', color: '#15803d' },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingLeft: 4,
  },
  filterScrollView: { marginHorizontal: -16 },
  filterScroll: {
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 16,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  filterChipActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
    shadowColor: '#15803d',
    shadowOpacity: 0.2,
  },
  filterChipText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  filterChipTextActive: {
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
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  tumunuGor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
  },
  featuredErrorWrap: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
  },
  featuredErrorText: {
    fontSize: 12,
    color: '#b91c1c',
  },
  featuredCardWrap: {
    width: 220,
    marginRight: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
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
  cardImageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  cardImagePlaceholderText: {
    fontSize: 40,
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#15803d',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    minWidth: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favIcon: {
    fontSize: 22,
  },
  cardBody: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 13,
    color: '#15803d',
    flex: 1,
  },
  cardAddress: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cardRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '600',
  },
  modalList: {
    padding: 16,
    paddingBottom: 32,
  },
  modalCardWrap: {
    marginBottom: 12,
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
