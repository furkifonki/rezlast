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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  listContent: { padding: 16, paddingBottom: 24 },
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
  cardImageWrap: {
    width: '100%',
    height: 140,
    position: 'relative',
    backgroundColor: '#f1f5f9',
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e2e8f0',
  },
  cardImagePlaceholderText: { fontSize: 40 },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  favIcon: { fontSize: 22 },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardCategory: { fontSize: 13, color: '#15803d', flex: 1 },
  cardAddress: { fontSize: 12, color: '#64748b', marginTop: 2 },
  cardRating: { fontSize: 13, fontWeight: '600', color: '#f59e0b' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '600', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748b' },
  errorText: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#15803d',
  },
  retryButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
