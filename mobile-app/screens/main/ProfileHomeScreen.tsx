import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSimpleStack } from '../../navigation/SimpleStackContext';
import { ProfileMenuCard } from '../../components/ProfileMenuCard';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../contexts/AuthContext';
import { useUnreadMessages } from '../../contexts/UnreadMessagesContext';
import { getTierFromPoints } from '../../lib/loyaltyConstants';

type ProfileHomeScreenProps = {
  popToRootRef?: React.MutableRefObject<(() => void) | null>;
};

export default function ProfileHomeScreen({ popToRootRef }: ProfileHomeScreenProps) {
  const { navigate, popToTop } = useSimpleStack();
  const { profile, loading } = useUserProfile();
  const { signOut } = useAuth();
  const { unreadCount } = useUnreadMessages();

  useEffect(() => {
    if (!popToRootRef) return;
    popToRootRef.current = () => popToTop();
    return () => {
      popToRootRef.current = null;
    };
  }, [popToRootRef, popToTop]);

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email || 'Profil'
    : 'Profil';
  const tierLabel = profile != null
    ? getTierFromPoints(profile.total_points ?? 0).displayName
    : 'Bronz';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Merhaba,</Text>
        <Text style={styles.name}>{loading ? '...' : displayName}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierBadgeText}>Seviye: {tierLabel}</Text>
        </View>
      </View>

      <ProfileMenuCard
        icon="👤"
        title="Hesap"
        description="Ad soyad, telefon, e-posta, şifre değiştir"
        onPress={() => navigate('ProfileAccount', undefined)}
      />
      <ProfileMenuCard
        icon="⭐"
        title="Puanlar"
        description="Puan bakiyesi, seviyeler, kazanım geçmişi"
        onPress={() => navigate('ProfilePoints', undefined)}
      />
      <ProfileMenuCard
        icon="💬"
        title="Mesajlar"
        description="Restoranlarla sohbet"
        onPress={() => navigate('MessagesList', undefined)}
        showUnreadDot={unreadCount > 0}
      />
      <ProfileMenuCard
        icon="📅"
        title="Rezervasyonlar"
        description="Gelecek ve geçmiş rezervasyonlarınız"
        onPress={() => navigate('ProfileAppointments', undefined)}
      />
      <ProfileMenuCard
        icon="❤️"
        title="Favoriler"
        description="Favori mekanlar"
        onPress={() => navigate('ProfileFavorites', undefined)}
      />
      <ProfileMenuCard
        icon="💳"
        title="Ödeme Yöntemleri"
        description="Kayıtlı kartlar ve ödeme seçenekleri"
        onPress={() => navigate('ProfilePayments', undefined)}
      />
      <ProfileMenuCard
        icon="⚙️"
        title="Ayarlar"
        description="Bildirimler, dil, gizlilik"
        onPress={() => navigate('ProfileSettings', undefined)}
      />

      <ProfileMenuCard
        icon="🚪"
        title="Çıkış Yap"
        description="Hesabınızdan güvenli çıkış"
        onPress={() =>
          Alert.alert('Çıkış', 'Çıkış yapmak istediğinize emin misiniz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Çıkış', style: 'destructive', onPress: signOut },
          ])
        }
        destructive
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  content: { padding: 20, paddingBottom: 52 },
  header: {
    marginBottom: 28,
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 24,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  greeting: { fontSize: 14, color: '#64748b', marginBottom: 6, fontWeight: '500' },
  name: { fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.4 },
  tierBadge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: '#15803d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    shadowColor: '#15803d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  tierBadgeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
