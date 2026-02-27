import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
  Linking,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// react-native-maps native modülü Expo Go'da yok; sadece development build'de yükle (RNMapsAirModule hatasını önler)
const isExpoGo = Constants.appOwnership === 'expo';
let MapView: typeof import('react-native-maps').default | null = null;
let Marker: React.ComponentType<import('react-native-maps').MarkerProps> | null = null;
if (!isExpoGo) {
  try {
    const RNMaps = require('react-native-maps');
    MapView = RNMaps.default;
    Marker = RNMaps.Marker;
  } catch {
    // native modül yoksa (Expo Go vb.) MapView/Marker null kalır
  }
}
import { useSimpleStack } from '../../navigation/SimpleStackContext';

type BusinessMap = {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  categories: { name: string } | null;
};

const ISTANBUL_REGION = {
  latitude: 41.0082,
  longitude: 28.9784,
  latitudeDelta: 0.35,
  longitudeDelta: 0.35,
};

type Props = {
  onBack: () => void;
};

export default function ExploreMapScreen({ onBack }: Props) {
  const { navigate } = useSimpleStack();
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState<BusinessMap[]>([]);
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Bağlantı yok');
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: err } = await supabase
      .from('businesses')
      .select('id, name, address, rating, latitude, longitude, categories ( name )')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('rating', { ascending: false })
      .order('name');

    if (err) {
      setError(err.message);
      setBusinesses([]);
      setLoading(false);
      return;
    }

    const list = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) ?? null,
      rating: row.rating != null ? Number(row.rating) : null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      categories: row.categories as { name: string } | null,
    }));
    setBusinesses(list);

    if (list.length > 0) {
      const ids = list.map((b: BusinessMap) => b.id);
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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = selectedId ? businesses.find((b) => b.id === selectedId) : null;
  const categoryName = (selected?.categories as { name: string } | null)?.name ?? 'İşletme';
  const ratingStr = selected?.rating != null && selected.rating > 0
    ? selected.rating.toFixed(1).replace('.', ',')
    : '—';

  const openInMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url);
  };

  if (loading && businesses.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Harita görünümü</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Harita görünümü</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (isExpoGo || !MapView || !Marker) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Harita görünümü</Text>
        </View>
        <View style={styles.expoGoHint}>
          <Text style={styles.expoGoHintText}>
            {isExpoGo
              ? 'Harita tam sürümde kullanılabilir. Konumu olan işletmeler aşağıda listeleniyor.'
              : 'Harita bu ortamda kullanılamıyor. Konumu olan işletmeler aşağıda listeleniyor.'}
          </Text>
        </View>
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.listCard}
              onPress={() => navigate('BusinessDetail', { businessId: item.id })}
              activeOpacity={0.7}
            >
              <View style={styles.listCardBody}>
                <Text style={styles.listCardName}>{item.name}</Text>
                <View style={styles.listCardMeta}>
                  {item.rating != null && item.rating > 0 && (
                    <Text style={styles.listCardRating}>★ {item.rating.toFixed(1)}</Text>
                  )}
                  <Text style={styles.listCardCategory}>
                    {(item.categories as { name: string } | null)?.name ?? '—'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.listCardMapBtn}
                onPress={() => openInMaps(item.latitude, item.longitude)}
              >
                <Text style={styles.listCardMapBtnText}>Haritada aç</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Konumu tanımlı işletme yok</Text>
              <Text style={styles.emptyHint}>İşletmelerin konum bilgileri eklendiğinde haritada görünecektir.</Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Harita görünümü</Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={ISTANBUL_REGION}
        mapType="standard"
        showsUserLocation={false}
      >
        {businesses.map((b) => {
          const isSelected = selectedId === b.id;
          const rating = b.rating != null && b.rating > 0 ? b.rating.toFixed(1) : '—';
          return (
            <Marker
              key={b.id}
              coordinate={{ latitude: b.latitude, longitude: b.longitude }}
              onPress={() => setSelectedId(b.id)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.markerWrap,
                  isSelected ? styles.markerWrapSelected : null,
                ]}
              >
                <Text style={[styles.markerStar, isSelected ? styles.markerStarSelected : null]}>
                  ★
                </Text>
                <Text style={[styles.markerRating, isSelected ? styles.markerRatingSelected : null]}>
                  {rating}
                </Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {selected && (
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.cardInner}>
            {photoMap[selected.id] ? (
              <Image
                source={{ uri: photoMap[selected.id] }}
                style={styles.cardImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.cardImagePlaceholder}>
                <Text style={styles.cardImagePlaceholderText}>📷</Text>
              </View>
            )}
            <View style={styles.cardBody}>
              <Text style={styles.cardName} numberOfLines={1}>{selected.name}</Text>
              <Text style={styles.cardMeta}>
                ★ {ratingStr} • {categoryName}
              </Text>
              <TouchableOpacity
                style={styles.cardButton}
                onPress={() => navigate('BusinessDetail', { businessId: selected.id })}
                activeOpacity={0.7}
              >
                <Text style={styles.cardButtonText}>Detay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: { fontSize: 22, color: '#15803d', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  map: {
    flex: 1,
    width: '100%',
  },
  markerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    gap: 4,
  },
  markerWrapSelected: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  markerStar: { fontSize: 14, color: '#f59e0b' },
  markerStarSelected: { color: '#fbbf24' },
  markerRating: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  markerRatingSelected: { color: '#fff' },
  card: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  cardInner: { flexDirection: 'row', alignItems: 'center' },
  cardImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
  },
  cardImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: { fontSize: 28 },
  cardBody: { flex: 1, marginLeft: 12 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardMeta: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  cardButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  cardButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', textAlign: 'center' },
  expoGoHint: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fef3c7',
  },
  expoGoHintText: { fontSize: 13, color: '#92400e' },
  listContent: { padding: 16, paddingBottom: 32 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listCardBody: { flex: 1, minWidth: 0 },
  listCardName: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  listCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  listCardRating: { fontSize: 13, color: '#f59e0b', fontWeight: '600' },
  listCardCategory: { fontSize: 13, color: '#64748b' },
  listCardMapBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#15803d',
    marginLeft: 12,
  },
  listCardMapBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  emptyText: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  emptyHint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 24 },
});
