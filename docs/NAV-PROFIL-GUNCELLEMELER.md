# iOS Swipe Back + Profil Dashboard Güncellemeleri

## İSTEK 1 — iOS Swipe Back (Soldan Sağa Kaydırma ile Geri)

### Yapılan Değişiklikler

- **Navigator:** `@react-navigation/native-stack` kullanıldı. Sebep: iOS’ta interactive pop gesture native stack ile gelir; JS tabanlı `createStackNavigator` ile aynı hissi vermez. Expo managed workflow ile uyumlu, ek native modül gerekmez.
- **RootNavigator:** Giriş sonrası artık `MainStack` (Native Stack) render ediliyor; ilk ekran `Main` (TabContainer), üzerine `BusinessDetail` ve `ReservationFlow` push ediliyor.
- **MainStack.tsx:** `gestureEnabled: true`, iOS için `fullScreenGestureEnabled: true`. `ReservationFlow` için `gestureEnabled: false` (kritik form / ödeme ekranı).
- **ExploreScreen / FavoritesScreen:** İşletme detay ve rezervasyon akışı artık `navigation.navigate('BusinessDetail', …)` / `navigation.navigate('ReservationFlow', …)` ile stack’e push ediliyor; geri dönüş hem ok hem soldan sağa swipe ile çalışıyor.

### Dosya Özeti

| Dosya | Değişiklik |
|-------|------------|
| `package.json` | `@react-navigation/native-stack` eklendi. |
| `navigation/types.ts` | Yeni: `RootStackParamList`, stack route tipleri. |
| `navigation/MainStack.tsx` | Yeni: Native Stack, Main + BusinessDetail + ReservationFlow (+ profil ekranları). |
| `navigation/RootNavigator.tsx` | `TabContainer` yerine `MainStack` render. |
| `navigation/MainStack.tsx` (ReservationFlow) | `gestureEnabled: false`. |
| `screens/main/ExploreScreen.tsx` | `useNavigation`, `navigate('BusinessDetail'/'ReservationFlow')`, state ile detay/rezervasyon render kaldırıldı. |
| `screens/main/FavoritesScreen.tsx` | Aynı şekilde stack navigation. |

### iOS / Android Davranış

- **iOS:** Soldan sağa swipe = geri (native interactive pop). `ReservationFlow` ekranında swipe geri kapalı.
- **Android:** Donanım/ekran geri tuşu ve (varsa) stack header geri butonu; swipe geri davranışı cihaza/versiyona göre değişir.

### Belirli Ekranda Swipe Geri Kapatma

Stack screen options’da `gestureEnabled: false` verin:

```tsx
<Stack.Screen
  name="ReservationFlow"
  component={ReservationFlowWrapper}
  options={{ gestureEnabled: false }}
/>
```

---

## İSTEK 2 — Profil Sayfası UI/UX (Sekmeli / Kartlı Menü)

### Dosya / Dizin Yapısı

```
mobile-app/
  components/
    ProfileMenuCard.tsx      # Kart: ikon + başlık + açıklama
  hooks/
    useUserProfile.ts        # Supabase users + session, refetch
  screens/
    main/
      ProfileHomeScreen.tsx  # Dashboard: kart listesi
      profile/
        ProfileAccountScreen.tsx   # Hesap form + çıkış
        ProfilePointsScreen.tsx   # Puanlar (PointsInfoScreen)
        ProfileAppointmentsScreen.tsx
        ProfileFavoritesScreen.tsx
        ProfilePaymentsScreen.tsx
        ProfileSettingsScreen.tsx
  navigation/
    types.ts                 # RootStackParamList + Profile* route’ları
    MainStack.tsx            # Profile* ekranları register
    TabContainer.tsx         # Profile sekmesi → ProfileHomeScreen
```

### Route’lar (MainStack)

- `ProfileAccount`, `ProfilePoints`, `ProfileAppointments`, `ProfileFavorites`, `ProfilePayments`, `ProfileSettings` stack’e eklendi. Profil sekmesinde açılan dashboard’dan bu ekranlara `navigation.navigate('ProfileAccount')` vb. ile gidiliyor.

### Veri

- `useUserProfile()`: `users` tablosundan `id, first_name, last_name, phone, total_points, loyalty_level, email_marketing_consent, sms_marketing_consent` + session email. Supabase’den çekilecek şekilde; mock değil.

### UI/UX İyileştirmeleri — 5 Kısa Öneri

1. **Kart vurgusu:** Aktif/odaklanan kartta hafif scale veya gölge artışı (press feedback) ile dokunma hissini güçlendirin.
2. **Skeleton / loading:** Profil verisi yüklenirken kart alanlarında skeleton gösterin; boş ekran yerine yapıyı önceden gösterin.
3. **Çıkış butonu:** Destructive renk (kırmızı) + ikon tutarlı; çıkış kartını listenin en altında, biraz daha boşlukla ayırın (zaten uygulandı).
4. **Erişilebilirlik:** Kartlara `accessibilityLabel` ve `accessibilityHint` ekleyin; büyük dokunma alanı koruyun.
5. **Pull-to-refresh:** Profil dashboard’da (ProfileHomeScreen) aşağı çekince `useUserProfile().refetch()` tetikleyin; puan ve hesap bilgisi güncel kalsın.
