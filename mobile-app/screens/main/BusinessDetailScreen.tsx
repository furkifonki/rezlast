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
} from 'react-native';
import { supabase } from '../../lib/supabase';

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
};
type Photo = { id: string; photo_url: string; photo_order: number; is_primary: boolean };
type Hour = {
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
};

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

type Props = {
  businessId: string;
  onBack: () => void;
  onReservationPress?: (businessId: string, businessName: string) => void;
};

export default function BusinessDetailScreen({ businessId, onBack, onReservationPress }: Props) {
  const [business, setBusiness] = useState<Business | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [hours, setHours] = useState<Hour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          .select('id, name, address, city, district, phone, email, website, description, rating, categories ( name )')
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
        setError(bRes.error.message);
        setBusiness(null);
      } else {
        setBusiness(bRes.data as Business);
      }
      setPhotos((pRes.data ?? []) as Photo[]);
      setHours((hRes.data ?? []) as Hour[]);
      setLoading(false);
    })();
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
        <Text style={styles.errorText}>{error ?? 'İşletme bulunamadı.'}</Text>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const primaryPhoto = photos.find((p) => p.is_primary) ?? photos[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Geri</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {primaryPhoto?.photo_url ? (
          <Image source={{ uri: primaryPhoto.photo_url }} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <View style={styles.body}>
          <Text style={styles.title}>{business.name}</Text>
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
          <TouchableOpacity style={styles.reserveButton} onPress={onReservation}>
            <Text style={styles.reserveButtonText}>Rezervasyon Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
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
    paddingBottom: 32,
  },
  heroImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e2e8f0',
  },
  body: {
    padding: 16,
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
  contactRow: {
    gap: 8,
  },
  link: {
    fontSize: 15,
    color: '#15803d',
    marginBottom: 4,
  },
  reserveButton: {
    marginTop: 24,
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
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
});
