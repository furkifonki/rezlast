import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
  Modal,
} from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

// Harita sadece development build'de yüklensin; Expo Go'da native modül yok.
const isExpoGo = Constants.appOwnership === 'expo';
const InAppMap = isExpoGo ? null : require('./InAppMap').default;

type Business = {
  id: string;
  name: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  rating: number | null;
  categories: { name: string } | null;
  latitude: number | null;
  longitude: number | null;
};
type Photo = { id: string; photo_url: string; photo_order: number; is_primary: boolean };
type Hour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

type Review = { id: string; user_id: string; rating: number; comment: string | null; created_at: string };

type Props = {
  businessId: string;
  onBack: () => void;
  onReservationPress?: (businessId: string, businessName: string) => void;
  onReviewsPress?: (businessId: string, businessName: string) => void;
};

export default function BusinessDetailScreen({ businessId, onBack, onReservationPress, onReviewsPress }: Props) {
  const { session } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    if (!supabase || !businessId) return;
    const { data } = await supabase.from('reviews').select('id').eq('business_id', businessId);
    setReviews((data ?? []) as Review[]);
  };

  useEffect(() => {
    if (!supabase || !businessId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      const [bRes, pRes, hRes] = await Promise.all([
        supabase
          .from('businesses')
          .select('id, name, address, city, district, phone, email, website, description, rating, categories ( name ), latitude, longitude')
          .eq('id', businessId)
          .eq('is_active', true)
          .single(),
        supabase
          .from('business_photos')
          .select('id, photo_url, photo_order, is_primary')
          .eq('business_id', businessId)
          .order('photo_order'),
        supabase
          .from('business_hours')
          .select('day_of_week, open_time, close_time, is_closed')
          .eq('business_id', businessId)
          .order('day_of_week'),
      ]);
      if (bRes.error) {
        setError('Bu işletme şu anda hizmet veremiyor. Lütfen başka bir işletme seçin.');
        setBusiness(null);
      } else {
        setBusiness(bRes.data as Business);
      }
      setPhotos((pRes.data ?? []) as Photo[]);
      setHours((hRes.data ?? []) as Hour[]);
      setLoading(false);
    })();
  }, [businessId]);

  useEffect(() => {
    if (businessId) loadReviews();
  }, [businessId]);

  const formatTime = (t: string | null) => {
    if (!t) return '—';
    const s = String(t);
    return s.length >= 5 ? s.slice(0, 5) : s;
  };

  const openPhone = () => {
    if (business?.phone) Linking.openURL(`tel:${business.phone}`);
  };
  const openEmail = () => {
    if (business?.email) Linking.openURL(`mailto:${business.email}`);
  };
  const openWebsite = () => {
    if (business?.website) Linking.openURL(business.website.startsWith('http') ? business.website : `https://${business.website}`);
  };

  const onReservation = () => {
    if (onReservationPress && business) {
      onReservationPress(business.id, business.name);
    } else {
      Alert.alert('Rezervasyon', 'Rezervasyon ekranına geçilemiyor.', [{ text: 'Tamam' }]);
    }
  };

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
        <Text style={styles.errorTitle}>Bu işletme uygun değil</Text>
        <Text style={styles.errorText}>{error ?? 'Bu işletme şu anda hizmet veremiyor. Lütfen başka bir işletme seçin.'}</Text>
        <TouchableOpacity style={styles.backButtonRound} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButtonRound} activeOpacity={0.7}>
          <Text style={styles.backButtonIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerBackLabel}>Keşfet'e dön</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {primaryPhoto?.photo_url ? (
          <Image source={{ uri: primaryPhoto.photo_url }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <View style={styles.body}>
          <Text style={styles.title}>{business.name}</Text>
          {photos.length > 0 ? (
            <>
              <Text style={styles.label}>Fotoğraflar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoGallery} contentContainerStyle={styles.photoGalleryContent}>
                {photos.map((p, idx) => (
                  <TouchableOpacity key={p.id} onPress={() => setGalleryIndex(idx)} activeOpacity={1}>
                    <Image source={{ uri: p.photo_url }} style={styles.photoThumb} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : null}
          {galleryIndex !== null && photos[galleryIndex] ? (
            <Modal visible transparent animationType="fade">
              <View style={styles.galleryOverlay}>
                <TouchableOpacity style={styles.galleryClose} onPress={() => setGalleryIndex(null)}>
                  <Text style={styles.galleryCloseText}>✕ Kapat</Text>
                </TouchableOpacity>
                <Image source={{ uri: photos[galleryIndex].photo_url }} style={styles.galleryImage} resizeMode="contain" />
                {photos.length > 1 ? (
                  <View style={styles.galleryNav}>
                    <TouchableOpacity
                      style={styles.galleryNavBtn}
                      onPress={() => setGalleryIndex(galleryIndex === 0 ? photos.length - 1 : galleryIndex - 1)}
                    >
                      <Text style={styles.galleryNavText}>←</Text>
                    </TouchableOpacity>
                    <Text style={styles.galleryCounter}>{galleryIndex + 1} / {photos.length}</Text>
                    <TouchableOpacity
                      style={styles.galleryNavBtn}
                      onPress={() => setGalleryIndex(galleryIndex === photos.length - 1 ? 0 : galleryIndex + 1)}
                    >
                      <Text style={styles.galleryNavText}>→</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            </Modal>
          ) : null}
          <Text style={styles.category}>
            {(business.categories as { name: string } | null)?.name ?? '—'}
          </Text>
          {business.rating != null && Number(business.rating) > 0 ? (
            <Text style={styles.rating}>★ {Number(business.rating).toFixed(1)}</Text>
          ) : null}
          {business.address ? (
            <>
              <Text style={styles.label}>Adres</Text>
              <Text style={styles.value}>{business.address}</Text>
              {(business.district || business.city) ? (
                <Text style={styles.value}>{[business.district, business.city].filter(Boolean).join(', ')}</Text>
              ) : null}
            </>
          ) : null}
          {business.description ? (
            <>
              <Text style={styles.label}>Hakkında</Text>
              <Text style={styles.value}>{business.description}</Text>
            </>
          ) : null}
          <Text style={styles.label}>Çalışma saatleri</Text>
          {hours.length === 0 ? (
            <Text style={styles.value}>Belirtilmemiş</Text>
          ) : (
            hours.map((h) => (
              <View key={h.day_of_week} style={styles.hourRow}>
                <Text style={styles.hourDay}>{DAY_NAMES[h.day_of_week]}</Text>
                <Text style={styles.hourTime}>
                  {h.is_closed ? 'Kapalı' : `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`}
                </Text>
              </View>
            ))
          )}
          <>
            <Text style={styles.label}>Konum / Harita</Text>
            {business.latitude != null && business.longitude != null && Number(business.latitude) && Number(business.longitude) ? (
              InAppMap ? (
                <InAppMap
                  latitude={Number(business.latitude)}
                  longitude={Number(business.longitude)}
                  name={business.name}
                />
              ) : (
                <TouchableOpacity
                  style={styles.mapLink}
                  onPress={() => {
                    const lat = Number(business.latitude);
                    const lng = Number(business.longitude);
                    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
                  }}
                >
                  <Text style={styles.mapLinkText}>📍 Haritada aç</Text>
                </TouchableOpacity>
              )
            ) : business.address ? (
              <TouchableOpacity
                style={styles.mapLink}
                onPress={() => {
                  const q = encodeURIComponent([business.address, business.district, business.city].filter(Boolean).join(', '));
                  Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
                }}
              >
                <Text style={styles.mapLinkText}>📍 Adres üzerinden haritada aç</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.mapPlaceholder}>Konum belirtilmemiş</Text>
            )}
          </>
          {(business.phone || business.email || business.website) ? (
            <>
              <Text style={styles.label}>İletişim</Text>
              <View style={styles.contactRow}>
                {business.phone ? (
                  <TouchableOpacity onPress={openPhone}>
                    <Text style={styles.link}>📞 {business.phone}</Text>
                  </TouchableOpacity>
                ) : null}
                {business.email ? (
                  <TouchableOpacity onPress={openEmail}>
                    <Text style={styles.link}>✉️ {business.email}</Text>
                  </TouchableOpacity>
                ) : null}
                {business.website ? (
                  <TouchableOpacity onPress={openWebsite}>
                    <Text style={styles.link}>🌐 Web</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </>
          ) : null}
          {/* Yorumlar: özet + Yorumlara git */}
          <Text style={styles.label}>Yorumlar</Text>
          {business.rating != null && Number(business.rating) > 0 ? (
            <Text style={styles.rating}>★ {Number(business.rating).toFixed(1)} · {reviews.length} yorum</Text>
          ) : (
            <Text style={styles.value}>{reviews.length === 0 ? 'Henüz yorum yok.' : `${reviews.length} yorum`}</Text>
          )}
          {onReviewsPress ? (
            <TouchableOpacity
              style={styles.reviewsLinkButton}
              onPress={() => onReviewsPress(business.id, business.name)}
              activeOpacity={0.7}
            >
              <Text style={styles.reviewsLinkButtonText}>Yorumlara git</Text>
              <Text style={styles.reviewsLinkArrow}>→</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
      <View style={styles.stickyReserveWrap}>
        <TouchableOpacity style={styles.reserveButton} onPress={onReservation} activeOpacity={0.9}>
          <Text style={styles.reserveButtonText}>Rezervasyon Yap</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButtonRound: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonIcon: {
    fontSize: 22,
    color: '#15803d',
    fontWeight: '600',
  },
  headerBackLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#15803d',
  },
  backButton: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#15803d',
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  body: {
    padding: 16,
  },
  photoGallery: {
    marginHorizontal: -16,
    marginTop: 8,
  },
  photoGalleryContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    flexDirection: 'row',
  },
  photoThumb: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  category: {
    fontSize: 14,
    color: '#15803d',
    marginBottom: 4,
  },
  rating: {
    fontSize: 14,
    color: '#f59e0b',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 15,
    color: '#0f172a',
    marginBottom: 4,
  },
  hourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  hourDay: {
    fontSize: 14,
    color: '#0f172a',
  },
  hourTime: {
    fontSize: 14,
    color: '#64748b',
  },
  mapLink: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapLinkText: {
    fontSize: 15,
    color: '#15803d',
    fontWeight: '600',
  },
  mapPlaceholder: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  contactRow: {
    gap: 8,
  },
  link: {
    fontSize: 15,
    color: '#15803d',
    marginBottom: 4,
  },
  reviewSortRow: { flexDirection: 'row', gap: 8, marginTop: 8, marginBottom: 12 },
  sortChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  sortChipActive: { backgroundColor: '#15803d' },
  sortChipText: { fontSize: 13, color: '#64748b' },
  sortChipTextActive: { color: '#fff', fontWeight: '600' },
  reviewList: { marginTop: 4 },
  reviewCard: { paddingVertical: 12, paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewStars: { fontSize: 14, color: '#f59e0b' },
  reviewDate: { fontSize: 12, color: '#94a3b8' },
  reviewCardComment: { fontSize: 14, color: '#0f172a', lineHeight: 20 },
  reviewYou: { fontSize: 11, color: '#15803d', marginTop: 4, fontWeight: '600' },
  moreReviews: { fontSize: 13, color: '#64748b', marginTop: 8 },
  writeReviewButton: { marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  writeReviewButtonText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  loginToReview: { marginTop: 12, fontSize: 14, color: '#64748b' },
  reviewsLinkButton: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewsLinkButtonText: { fontSize: 15, color: '#15803d', fontWeight: '600' },
  reviewsLinkArrow: { fontSize: 18, color: '#15803d', fontWeight: '600' },
  stickyReserveWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  starButton: { padding: 4 },
  starIcon: { fontSize: 32, color: '#f59e0b' },
  reviewInput: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, fontSize: 15, color: '#0f172a', minHeight: 80, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontSize: 15, color: '#64748b', fontWeight: '600' },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#15803d', alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  modalSubmitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  galleryClose: { position: 'absolute', top: 48, right: 16, zIndex: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  galleryCloseText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  galleryImage: { width: '100%', height: '80%' },
  galleryNav: { position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24 },
  galleryNavBtn: { padding: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 24 },
  galleryNavText: { fontSize: 24, color: '#fff', fontWeight: '700' },
  galleryCounter: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  reserveButton: {
    marginTop: 0,
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reserveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
