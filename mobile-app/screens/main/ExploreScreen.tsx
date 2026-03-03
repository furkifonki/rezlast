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
  TextInput,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';
import { filterOfficialCities, getDistrictsByCity } from '../../constants/turkeyCities';
import * as Location from 'expo-location';

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
  latitude: number | null;
  longitude: number | null;
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
  const { favoritesSet: favorites, toggleFavorite, refetch: refetchFavorites } = useFavorites();
  const [showAllFeatured, setShowAllFeatured] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const activeFilterCount =
    (selectedCategoryId ? 1 : 0) +
    (selectedCity ? 1 : 0) +
    (selectedDistrict ? 1 : 0) +
    (radiusKm != null && radiusKm > 0 ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0;

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

  const loadSponsored = useCallback(async () => {
    if (!supabase) return;
    setSponsoredError(null);
    const { data, error: err } = await supabase
      .from('sponsored_listings')
      .select('id, business_id, priority, businesses ( id, name, address, city, district, description, rating, categories ( name ), latitude, longitude )')
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
    const { data: bizData } = await supabase
      .from('businesses')
      .select('category_id')
      .eq('is_active', true);
    const ids = [...new Set((bizData ?? []).map((r: { category_id: string }) => r.category_id).filter(Boolean))];
    if (ids.length === 0) {
      setCategories([]);
      return;
    }
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('is_active', true)
      .in('id', ids)
      .order('sort_order');
    setCategories((data ?? []) as Category[]);
  };

  // Filtreler: Arama, kategori, şehir, ilçe, mesafe (km)
  const loadBusinesses = useCallback(async () => {
    if (!supabase) {
      setError('Bağlantı yok');
      setLoading(false);
      return;
    }
    setError(null);
    let query = supabase
      .from('businesses')
      .select('id, name, address, city, district, description, rating, categories ( name ), latitude, longitude')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .order('name');
    if (selectedCategoryId) {
      query = query.eq('category_id', selectedCategoryId);
    }
    if (selectedCity) {
      const isIstanbulKagithane = selectedCity === 'İstanbul' && selectedDistrict === 'Kağıthane';
      if (!isIstanbulKagithane) {
        query = query.eq('city', selectedCity);
      }
    }
    if (selectedDistrict) {
      if (selectedCity === 'İstanbul' && selectedDistrict === 'Kağıthane') {
        query = query.or('and(city.eq.İstanbul,district.eq.Kağıthane),city.eq.Kağıthane');
      } else {
        query = query.eq('district', selectedDistrict);
      }
    }
    const { data, err } = await query;
    if (err) {
      setError(err.message);
      setBusinesses([]);
      setPhotoMap({});
    } else {
      let list = (data ?? []) as Business[];
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        list = list.filter(
          (b) =>
            (b.name && b.name.toLowerCase().includes(q)) ||
            (b.city && b.city.toLowerCase().includes(q)) ||
            (b.district && b.district.toLowerCase().includes(q)) ||
            (b.address && b.address.toLowerCase().includes(q))
        );
      }
      if (radiusKm != null && radiusKm > 0 && userLocation) {
        const R = 6371;
        list = list.filter((b) => {
          if (b.latitude == null || b.longitude == null) return false;
          const dLat = (b.latitude - userLocation.lat) * Math.PI / 180;
          const dLon = (b.longitude - userLocation.lon) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(userLocation.lat * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c <= radiusKm;
        });
      }
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
  }, [selectedCategoryId, selectedCity, selectedDistrict, searchQuery, radiusKm, userLocation]);

  useEffect(() => {
    loadCategories();
    loadSponsored();
  }, [loadSponsored]);

  useEffect(() => {
    let cancelled = false;
    if (!supabase) return;
    supabase
      .from('businesses')
      .select('city')
      .eq('is_active', true)
      .not('city', 'is', null)
      .then(({ data }) => {
        if (cancelled) return;
        const raw = (data ?? []).map((r: { city: string }) => r.city).filter(Boolean);
        setCities(filterOfficialCities(raw));
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedCity || !supabase) {
      setDistricts([]);
      return;
    }
    let cancelled = false;
    const officialDistricts = getDistrictsByCity(selectedCity);
    supabase
      .from('businesses')
      .select('district')
      .eq('is_active', true)
      .eq('city', selectedCity)
      .not('district', 'is', null)
      .then(({ data }) => {
        if (cancelled) return;
        const fromDb = (data ?? []).map((r: { district: string }) => r.district).filter(Boolean);
        const merged = new Set<string>([...officialDistricts, ...fromDb]);
        setDistricts(Array.from(merged).sort((a, b) => a.localeCompare(b, 'tr')));
      });
    return () => { cancelled = true; };
  }, [selectedCity]);

  useEffect(() => {
    if (radiusKm != null && radiusKm > 0 && !userLocation) {
      (async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setRadiusKm(null);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      })();
    }
  }, [radiusKm]);

  useEffect(() => {
    setSelectedDistrict(null);
  }, [selectedCity]);

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
    refetchFavorites();
  };

  const clearFilters = () => {
    setSelectedCategoryId(null);
    setSelectedCity(null);
    setSelectedDistrict(null);
    setRadiusKm(null);
  };

  const applyFiltersAndClose = () => {
    loadBusinesses();
    setFiltersSheetOpen(false);
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
      <View style={styles.mainContent}>
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
      <View style={styles.searchAndFilterBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="İşletme, şehir veya ilçe ara..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <View style={styles.filterRow}>
          <Pressable
            style={({ pressed }) => [styles.filterPill, hasActiveFilters && styles.filterPillActive, pressed && styles.filterPillPressed]}
            onPress={() => setFiltersSheetOpen(true)}
          >
            <Text style={[styles.filterPillText, hasActiveFilters && styles.filterPillTextActive]}>Filtrele</Text>
            {hasActiveFilters ? (
              <View style={styles.filterPillBadge}>
                <Text style={styles.filterPillBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
          <TouchableOpacity
            style={styles.mapPill}
            onPress={() => navigate('ExploreMap', undefined)}
            activeOpacity={0.8}
          >
            <Text style={styles.mapPillIcon}>🗺</Text>
            <Text style={styles.mapPillText}>Harita</Text>
          </TouchableOpacity>
        </View>
        {hasActiveFilters ? (
          <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters} activeOpacity={0.7}>
            <Text style={styles.clearFiltersText}>Filtreleri temizle</Text>
          </TouchableOpacity>
        ) : null}
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
              <Text style={styles.emptyTitle}>Sonuç bulunamadı</Text>
              <Text style={styles.emptyText}>Arama veya filtreleri değiştirmeyi deneyin.</Text>
            </View>
          }
          renderItem={({ item }) => renderBusinessCard(item, sponsoredBusinessIds.has(item.id))}
        />
      )}

      </View>

      {/* Filtreler bottom sheet */}
      <Modal visible={filtersSheetOpen} transparent animationType="slide">
        <Pressable style={styles.filterSheetOverlay} onPress={() => setFiltersSheetOpen(false)}>
          <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 24 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.filterSheetHandle} />
            <View style={styles.filterSheetHeader}>
              <Text style={styles.filterSheetTitle}>Filtreler</Text>
              <TouchableOpacity onPress={clearFilters} hitSlop={12}>
                <Text style={styles.filterSheetClear}>Temizle</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterSheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterSheetLabel}>Kategori</Text>
              <View style={styles.filterSheetChipRow}>
                <TouchableOpacity style={[styles.filterSheetChip, selectedCategoryId === null && styles.filterSheetChipActive]} onPress={() => setSelectedCategoryId(null)} activeOpacity={0.8}>
                  <Text style={[styles.filterSheetChipText, selectedCategoryId === null && styles.filterSheetChipTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {categories.map((c) => (
                  <TouchableOpacity key={c.id} style={[styles.filterSheetChip, selectedCategoryId === c.id && styles.filterSheetChipActive]} onPress={() => setSelectedCategoryId(c.id)} activeOpacity={0.8}>
                    <Text style={[styles.filterSheetChipText, selectedCategoryId === c.id && styles.filterSheetChipTextActive]}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.filterSheetLabel}>Şehir</Text>
              <View style={styles.filterSheetChipRow}>
                <TouchableOpacity style={[styles.filterSheetChip, selectedCity === null && styles.filterSheetChipActive]} onPress={() => setSelectedCity(null)} activeOpacity={0.8}>
                  <Text style={[styles.filterSheetChipText, selectedCity === null && styles.filterSheetChipTextActive]}>Tümü</Text>
                </TouchableOpacity>
                {cities.map((c) => (
                  <TouchableOpacity key={c} style={[styles.filterSheetChip, selectedCity === c && styles.filterSheetChipActive]} onPress={() => setSelectedCity(c)} activeOpacity={0.8}>
                    <Text style={[styles.filterSheetChipText, selectedCity === c && styles.filterSheetChipTextActive]} numberOfLines={1}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {selectedCity ? (
                <>
                  <Text style={styles.filterSheetLabel}>İlçe</Text>
                  <View style={styles.filterSheetChipRow}>
                    <TouchableOpacity style={[styles.filterSheetChip, selectedDistrict === null && styles.filterSheetChipActive]} onPress={() => setSelectedDistrict(null)} activeOpacity={0.8}>
                      <Text style={[styles.filterSheetChipText, selectedDistrict === null && styles.filterSheetChipTextActive]}>Tümü</Text>
                    </TouchableOpacity>
                    {districts.map((d) => (
                      <TouchableOpacity key={d} style={[styles.filterSheetChip, selectedDistrict === d && styles.filterSheetChipActive]} onPress={() => setSelectedDistrict(d)} activeOpacity={0.8}>
                        <Text style={[styles.filterSheetChipText, selectedDistrict === d && styles.filterSheetChipTextActive]} numberOfLines={1}>{d}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}
              <Text style={styles.filterSheetLabel}>Mesafe</Text>
              <View style={styles.filterSheetChipRow}>
                {[null, 5, 10, 25, 50].map((km) => (
                  <TouchableOpacity key={km ?? 'all'} style={[styles.filterSheetChip, radiusKm === km && styles.filterSheetChipActive]} onPress={() => setRadiusKm(km)} activeOpacity={0.8}>
                    <Text style={[styles.filterSheetChipText, radiusKm === km && styles.filterSheetChipTextActive]}>{km == null ? 'Kapalı' : `${km} km`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity style={styles.filterSheetApply} onPress={applyFiltersAndClose} activeOpacity={0.85}>
              <Text style={styles.filterSheetApplyText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

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
    backgroundColor: '#f1f5f9',
  },
  mainContent: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  searchAndFilterBar: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
    borderWidth: 0,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterPillActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#15803d',
  },
  filterPillPressed: { opacity: 0.85 },
  filterPillText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  filterPillTextActive: {
    color: '#15803d',
  },
  filterPillBadge: {
    backgroundColor: '#15803d',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  filterPillBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  mapPillIcon: { fontSize: 18, marginRight: 8 },
  mapPillText: { fontSize: 15, fontWeight: '600', color: '#15803d' },
  clearFiltersBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  clearFiltersText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
  },
  filterSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
  },
  filterSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  filterSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  filterSheetClear: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  filterSheetScroll: {
    maxHeight: 340,
    paddingHorizontal: 20,
  },
  filterSheetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterSheetChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  filterSheetChip: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterSheetChipActive: {
    backgroundColor: '#15803d',
    borderColor: '#15803d',
  },
  filterSheetChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  filterSheetChipTextActive: {
    color: '#fff',
  },
  filterSheetApply: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#15803d',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterSheetApplyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  featuredBlock: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    paddingHorizontal: 16,
    letterSpacing: -0.3,
  },
  featuredScroll: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 14,
  },
  featuredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  tumunuGor: {
    fontSize: 14,
    fontWeight: '700',
    color: '#15803d',
  },
  featuredErrorWrap: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    borderRadius: 12,
  },
  featuredErrorText: {
    fontSize: 13,
    color: '#b91c1c',
    fontWeight: '500',
  },
  featuredCardWrap: {
    width: 220,
    marginRight: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardFeatured: {
    borderWidth: 2,
    borderColor: '#15803d',
  },
  cardImageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#e2e8f0',
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
    backgroundColor: '#cbd5e1',
  },
  cardImagePlaceholderText: {
    fontSize: 44,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#15803d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  favButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 22,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  favIcon: {
    fontSize: 24,
  },
  cardBody: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  cardCategory: {
    fontSize: 13,
    color: '#15803d',
    fontWeight: '600',
    flex: 1,
  },
  cardAddress: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  },
  cardRating: {
    fontSize: 14,
    fontWeight: '700',
    color: '#f59e0b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  modalClose: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '700',
  },
  modalList: {
    padding: 16,
    paddingBottom: 36,
  },
  modalCardWrap: {
    marginBottom: 14,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#64748b',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 15,
    color: '#dc2626',
    textAlign: 'center',
    fontWeight: '500',
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  emptyBlock: {
    paddingVertical: 56,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});
