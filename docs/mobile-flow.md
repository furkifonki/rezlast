# Mobil Uygulama Ekran Akış Diyagramı

## Genel Navigasyon Yapısı

```
Bottom Tab Navigation:
├── Keşfet (Discover)
├── Rezervasyonlarım (My Reservations)
├── Harita (Map)
└── Profil (Profile)
```

## 1. Onboarding & Authentication Flow

```
Splash Screen
    ↓
[İlk Açılış?]
    ├─ Yes → Onboarding Screens (3 sayfa)
    └─ No → [Token var mı?]
                ├─ Yes → Ana Ekran
                └─ No → Login Screen
                            ↓
                    [Kayıt var mı?]
                        ├─ Yes → Login
                        └─ No → Register
                                    ↓
                            Email Verification
                                    ↓
                            Ana Ekran
```

### Ekranlar:
- **Splash Screen:** Logo, yükleme animasyonu
- **Onboarding:** 3 sayfa (özellikler, kullanım, başla)
- **Login:** Email/Password, "Şifremi Unuttum", "Kayıt Ol"
- **Register:** Email, Password, Full Name, Phone
- **Email Verification:** Doğrulama kodu gönderme

---

## 2. Keşfet (Discover) Flow

```
Keşfet Tab
    ↓
Category Tabs (Horizontal Scroll)
├── Restoranlar (Active in MVP)
├── Berberler (Active in MVP)
├── Güzellik Salonları (Active in MVP)
├── Tenis Kortları (Future)
├── Halı Sahalar (Future)
└── Futbol Sahaları (Future)
    ↓
Business List Screen
    ├── Search Bar
    ├── Filters (Rating, Distance, Sponsored)
    └── Business Cards
        ↓
    [Card Tıklama]
        ↓
Business Detail Screen
    ├── Photo Gallery (Swipeable)
    ├── Basic Info (Name, Rating, Address)
    ├── Description
    ├── Working Hours
    ├── Map View (Location)
    ├── Reviews Section
    ├── Services/Tables (Category specific)
    └── "Rezervasyon Yap" Button
        ↓
Reservation Flow
```

### Business List Screen Özellikleri:
- **Sponsored Badge:** Ücretli reklam işletmeleri üstte, "Featured" badge
- **Sort Options:** Distance, Rating, Popularity
- **Filter Options:** Min Rating, Max Distance, Price Range
- **Pull to Refresh:** Liste yenileme
- **Infinite Scroll:** Sayfalama

### Business Detail Screen Özellikleri:
- **Hero Image:** Büyük fotoğraf, swipeable gallery
- **Quick Info:** Rating, Distance, Category
- **Action Buttons:** Call, Directions, Share
- **Tabs:** Overview, Reviews, Photos
- **Availability Widget:** Hızlı müsaitlik kontrolü

---

## 3. Rezervasyon Akışı (Reservation Flow)

### 3.1 Restoran Rezervasyonu

```
Business Detail Screen
    ↓
"Rezervasyon Yap" Button
    ↓
Restaurant Reservation Screen
    ├── Date Picker (Calendar)
    ├── Time Slots (Available times)
    ├── Party Size Selector
    ├── Table Selection
    │   └── Floor Plan View
    │       ├── Available Tables (Green)
    │       ├── Reserved Tables (Red)
    │       └── Selected Table (Blue)
    ├── Duration Selector (1-4 hours)
    ├── Special Requests (Optional)
    └── "Rezervasyonu Onayla" Button
        ↓
Reservation Confirmation Screen
    ├── Reservation Summary
    ├── Loyalty Points Preview
    └── "Onayla" Button
        ↓
Reservation Success Screen
    ├── Confirmation Details
    ├── QR Code (Optional)
    ├── Add to Calendar
    └── "Ana Sayfaya Dön" Button
```

### 3.2 Berber/Güzellik Rezervasyonu

```
Business Detail Screen
    ↓
"Rezervasyon Yap" Button
    ↓
Service Reservation Screen
    ├── Service Selection
    │   └── Service Cards
    │       ├── Name
    │       ├── Duration (30 dk, 90 dk)
    │       └── Price
    ├── Date Picker
    ├── Time Slots (Service duration'a göre)
    │   └── Available slots highlighted
    ├── Special Requests (Optional)
    └── "Rezervasyonu Onayla" Button
        ↓
[Same as Restaurant Flow]
```

### 3.3 Saat Bloklu Rezervasyon (Tenis/Halı Saha - Future)

```
Business Detail Screen
    ↓
"Rezervasyon Yap" Button
    ↓
Slot Reservation Screen
    ├── Date Picker
    ├── Available Time Blocks
    │   └── Block Cards
    │       ├── Time (14:00 - 15:00)
    │       ├── Price (Dynamic pricing)
    │       └── Availability Status
    ├── Duration Selection (1-3 hours)
    └── "Rezervasyonu Onayla" Button
        ↓
[Same as Restaurant Flow]
```

---

## 4. Rezervasyonlarım (My Reservations) Flow

```
My Reservations Tab
    ↓
Reservations List Screen
    ├── Tabs: [Yaklaşanlar | Geçmiş]
    ├── Upcoming Reservations
    │   └── Reservation Cards
    │       ├── Business Info
    │       ├── Date & Time
    │       ├── Status Badge
    │       └── Actions (Cancel, View Details)
    └── Past Reservations
        └── Reservation Cards
            ├── Business Info
            ├── Date & Time
            ├── Status (Completed, Cancelled)
            └── Actions (Review, Rebook)
    ↓
[Card Tıklama]
    ↓
Reservation Detail Screen
    ├── Business Info Card
    ├── Reservation Details
    │   ├── Date & Time
    │   ├── Party Size / Service
    │   ├── Table Number (Restaurant)
    │   └── Special Requests
    ├── Status Section
    ├── Actions
    │   ├── Cancel Reservation
    │   ├── Contact Business
    │   ├── Get Directions
    │   └── Write Review (if completed)
    └── QR Code (if confirmed)
```

### Reservation Status:
- **Pending:** Beklemede (sarı)
- **Confirmed:** Onaylandı (yeşil)
- **Cancelled:** İptal edildi (kırmızı)
- **Completed:** Tamamlandı (gri)
- **No Show:** Gelmedi (kırmızı)

---

## 5. Harita (Map) Flow

```
Map Tab
    ↓
Map Screen
    ├── Map View (Google Maps / Mapbox)
    ├── User Location (Blue dot)
    ├── Business Markers
    │   ├── Category Icons
    │   ├── Sponsored (Star icon)
    │   └── Info Window on tap
    ├── Category Filter (Top bar)
    ├── Search Bar
    └── List Toggle Button
        ↓
    [Marker Tıklama]
        ↓
    Business Info Window
        ├── Photo
        ├── Name & Rating
        ├── Distance
        └── "Detayları Gör" Button
            ↓
    Business Detail Screen
```

### Map Features:
- **Cluster Markers:** Yakın işletmeler gruplanır
- **Heatmap:** Yoğun bölgeler (ileriki faz)
- **Route Planning:** Directions entegrasyonu
- **Radius Filter:** Belirli mesafe içindeki işletmeler

---

## 6. Profil (Profile) Flow

```
Profile Tab
    ↓
Profile Screen
    ├── User Info Card
    │   ├── Avatar
    │   ├── Name
    │   ├── Email
    │   └── Phone
    ├── Loyalty Section
    │   ├── Level Badge (Bronze/Silver/Gold/Platinum)
    │   ├── Points Display
    │   ├── Progress Bar (Next level)
    │   └── "Puan Geçmişi" Button
    ├── Statistics
    │   ├── Total Reservations
    │   ├── Favorite Businesses
    │   └── Reviews Written
    ├── Menu Items
    │   ├── Favorilerim
    │   ├── Bildirimler
    │   ├── Ayarlar
    │   ├── Yardım & Destek
    │   ├── Hakkında
    │   └── Çıkış Yap
    ↓
[Menu Item Tıklama]
    ↓
[Respective Screen]
```

### Profile Sub-screens:

#### Loyalty Points History
```
Points History Screen
    ├── Total Points Display
    ├── Current Level
    ├── Transactions List
    │   └── Transaction Cards
    │       ├── Points (+/-)
    │       ├── Description
    │       ├── Business Name
    │       └── Date
    └── Level Benefits Info
```

#### Favorites
```
Favorites Screen
    ├── Business Cards (Grid/List)
    └── Empty State (if no favorites)
```

#### Settings
```
Settings Screen
    ├── Account Settings
    │   ├── Edit Profile
    │   ├── Change Password
    │   └── Email Preferences
    ├── Notification Settings
    │   ├── Push Notifications
    │   ├── Email Notifications
    │   └── SMS Notifications
    ├── App Settings
    │   ├── Language
    │   ├── Theme (Dark/Light)
    │   └── Location Services
    └── Privacy
        ├── Privacy Policy
        └── Terms of Service
```

---

## 7. Bildirimler (Notifications) Flow

```
Notification Icon (Header)
    ↓
Notifications Screen
    ├── Notification List
    │   └── Notification Cards
    │       ├── Icon (Type-based)
    │       ├── Title
    │       ├── Message
    │       ├── Time
    │       └── Unread Badge
    └── Empty State
    ↓
[Notification Tıklama]
    ↓
[Deep Link to Relevant Screen]
    ├── Reservation Detail (if reservation-related)
    ├── Business Detail (if business-related)
    └── Profile (if account-related)
```

### Notification Types:
- **Reservation Confirmed:** Rezervasyon onaylandı
- **Reservation Reminder:** Rezervasyon hatırlatması (24 saat önce)
- **Reservation Cancelled:** Rezervasyon iptal edildi
- **Points Earned:** Puan kazandınız
- **Level Up:** Seviye atladınız
- **Promotion:** Kampanya bildirimi

---

## 8. Arama ve Filtreleme

```
Search Flow:
    ↓
Search Screen
    ├── Search Bar (Auto-focus)
    ├── Recent Searches
    ├── Popular Searches
    └── Search Results
        ├── Businesses
        ├── Categories
        └── Suggestions
    ↓
[Result Tıklama]
    ↓
Business Detail Screen
```

```
Filter Flow:
    ↓
Filter Modal
    ├── Category Filter
    ├── Rating Filter (Slider)
    ├── Distance Filter (Slider)
    ├── Price Range (Restaurant)
    ├── Features (WiFi, Parking, etc.)
    └── "Filtrele" Button
        ↓
Filtered Business List
```

---

## 9. Yorum ve Puan Verme

```
Reservation Detail (Completed)
    ↓
"Yorum Yap" Button
    ↓
Review Screen
    ├── Business Info
    ├── Star Rating (1-5)
    ├── Comment Text Area
    ├── Photo Upload (Optional)
    └── "Gönder" Button
        ↓
Review Success
    └── "Tamam" Button
```

---

## 10. Loyalty ve Gamification

### Loyalty Levels:
- **Bronze:** 0-100 puan
- **Silver:** 101-500 puan
- **Gold:** 501-1000 puan
- **Platinum:** 1000+ puan

### Gamification Elements:
- **Badges:** Rozetler (ilk rezervasyon, 10 rezervasyon, vb.)
- **Achievements:** Başarımlar
- **Streaks:** Günlük rezervasyon serisi
- **Challenges:** Haftalık/aylık hedefler

---

## Ekran Özeti

### Ana Ekranlar (5):
1. Keşfet (Discover)
2. Rezervasyonlarım (My Reservations)
3. Harita (Map)
4. Profil (Profile)
5. Bildirimler (Notifications)

### Alt Ekranlar (~20):
- Onboarding, Login, Register
- Business List, Business Detail
- Reservation Flow (Restaurant, Service, Slot)
- Reservation Detail, Review
- Profile Settings, Loyalty History
- Search, Filter, Map Detail
- Notifications List

---

## Navigasyon Pattern

- **Bottom Tabs:** Ana navigasyon
- **Stack Navigation:** Detay sayfaları
- **Modal:** Rezervasyon, Filtre
- **Drawer:** Profil menüsü (opsiyonel)

## UI/UX Özellikleri

- **Pull to Refresh:** Liste ekranları
- **Skeleton Loading:** İçerik yüklenirken
- **Empty States:** Boş durumlar için mesajlar
- **Error States:** Hata durumları için retry
- **Offline Support:** Offline mod (ileriki faz)
- **Dark Mode:** Karanlık tema desteği
