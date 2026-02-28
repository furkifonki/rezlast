import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../hooks/useFavorites';

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

type FavoritesScreenProps = {
  popToRootRef?: React.MutableRefObject<(() => void) | null>;
};

export default function FavoritesScreen({ popToRootRef }: FavoritesScreenProps) {
  const { navigate, popToTop } = useSimpleStack();
  const { session } = useAuth();
  const { list, photoMap, loading, error, refetch, removeFavorite } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!popToRootRef) return;
    popToRootRef.current = () => popToTop();
    return () => {
      popToRootRef.current = null;
    };
  }, [popToRootRef, popToTop]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (!session) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>❤️</Text>
        <Text style={styles.title}>Favorilerim</Text>
        <Text style={styles.subtitle}>Giriş yapın, favori işletmeleriniz burada listelenecek.</Text>
      </View>
    );
  }

  if (loading && list.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Tekrar dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (list.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyEmoji}>🤍</Text>
        <Text style={styles.title}>Favorilerim</Text>
        <Text style={styles.subtitle}>Henüz favori işletme eklemediniz.</Text>
        <Text style={styles.hint}>Keşfet sekmesinden işletme kartındaki kalbe basarak ekleyebilirsiniz.</Text>
      </View>
    );
  }

  const businesses = list.map((r) => r.businesses).filter((b): b is Business => b != null);

  return (
    <View style={styles.container}>
      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#15803d']} />
        }
        renderItem={({ item }) => {
          const photoUrl = photoMap[item.id];
          const rating = item.rating != null && Number(item.rating) > 0 ? Number(item.rating).toFixed(1) : null;
          const categoryName = (item.categories as { name: string } | null)?.name ?? '—';
          return (
            <TouchableOpacity
              style={styles.card}
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
                <TouchableOpacity
                  style={styles.favButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    removeFavorite(item.id);
                  }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.favIcon}>❤️</Text>
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
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  listContent: { padding: 16, paddingBottom: 28 },
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
  cardImageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#e2e8f0',
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#cbd5e1',
  },
  cardImagePlaceholderText: { fontSize: 44 },
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
  favIcon: { fontSize: 24 },
  cardBody: { padding: 14 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 6, letterSpacing: -0.2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  cardCategory: { fontSize: 13, color: '#15803d', fontWeight: '600', flex: 1 },
  cardAddress: { fontSize: 13, color: '#64748b', marginTop: 4 },
  cardRating: { fontSize: 14, fontWeight: '700', color: '#f59e0b' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginBottom: 10, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 10, lineHeight: 22 },
  hint: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  loadingText: { marginTop: 16, fontSize: 15, color: '#64748b', fontWeight: '500' },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center', marginBottom: 20, fontWeight: '500' },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#15803d',
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  retryButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
