# RezApp – Sprint Scope (Loyalty, Yorumlar, Sponsorlu, Analytics, Polish)

**Mimari:** React Native + Expo (mobil), Supabase backend, rol bazlı yetkilendirme korunacak.

---

## 1. Loyalty Sistemi

- Rezervasyon **tamamlandıktan** sonra kullanıcıya puan kazanımı.
- Puan hesaplama: örn. harcanan tutara göre %X veya sabit puan/rezervasyon.
- **Profil ekranı (mobil):**
  - Toplam puan gösterimi.
  - Puan geçmişi (hangi rezervasyondan kaç puan).
- **Admin panel:** Puan yönetimi (manuel ekleme/çıkarma).

**Veri:** `users.total_points`, `loyalty_transactions`, `loyalty_rules` (opsiyonel), `reservations.loyalty_points_earned`.

---

## 2. Yorum & Puanlama Sistemi

**Mobil:**
- Rezervasyon sonrası yorum yazabilme.
- 1–5 yıldız puan.
- İşletme detay sayfasında: ortalama puan, yorum listesi.
- Filtreleme: en yeni, en yüksek, en düşük.

**Admin:**
- İşletmeye gelen yorumları listeleme.
- Yorum silme / gizleme.
- Ortalama puan hesaplama (businesses.rating, total_reviews güncelleme).

**Veri:** `reviews` (business_id, user_id, reservation_id?, rating 1–5, comment).

---

## 3. Sponsorlu İşletmeler

**Keşfet (mobil):**
- En üstte sponsorlu işletmeler için ayrı blok.
- "Öne Çıkan" badge’i.

**Admin:**
- Sponsorlu işletme seçimi.
- Tarih aralığı belirleme (start_date, end_date).
- Öncelik sırası (priority).

**Veri:** `sponsored_listings` (business_id, category_id?, start_date, end_date, priority, payment_status).

---

## 4. Admin Analytics (Basit Dashboard)

- Günlük / Haftalık / Aylık rezervasyon sayısı.
- İşletme doluluk oranı.
- En çok rezervasyon alan işletmeler.
- Saat bazlı yoğunluk grafiği.
- Görsel olarak anlaşılır, basit dashboard.

---

## 5. Polish & Stabilizasyon

- Profil ekranı UX iyileştirmesi.
- Performans optimizasyonu, bug fix.
- Form validation iyileştirmeleri.
- Loading state & empty state tasarımları.

---

## 6. UI/UX İyileştirmeler

### Restoran Listeleme (Keşfet / Liste)
- Büyük kapak görseli.
- Ortalama puan badge’i.
- Kategori tag’leri.
- Fiyat segmenti (₺₺ / ₺₺₺).
- "Bugün Müsait" etiketi.
- Sticky filtre bar (Fiyat, Puan, Mesafe).

### Restoran Ürün Detay
- Galeri: carousel + full screen preview.
- Yorum bölümü (review component).
- Ortalama puan & yıldız görseli.
- Kullanıcı yorumları.
- Masa tipleri / oturma düzeni görünümü.
- Mini harita (interaktif).
- "Rezervasyon Yap" CTA belirgin.

### Keşfet Sayfası
- Kategori kartları.
- Sponsorlu blok.
- Trend işletmeler.
- "Sana Özel" alanı (ileride AI).
- Scroll animasyonlu kart tasarımı.
- Minimal, modern, marketplace hissi.

---

## 7. Masa & Alan Yönetimi

- Sadece masa değil: **alan tipleri** (Masa, Deniz Kenarı, Teras, VIP, Bar, Localara Özel).
- Admin: görsel floor plan editörü, alan sürükle-bırak, kapasite.
- Rezervasyonda kullanıcı alan seçebilmeli.
- Mobilde seçilebilir alan listesi.

**Not:** Mevcut `tables` tablosunda `table_type` (indoor, outdoor, vip) var; alan tipi genişletmesi bu yapı üzerine inşa edilebilir veya ayrı `areas` tablosu eklenebilir.

---

## Öncelik Sırası (Uygulama)

1. **Backend/şema:** loyalty_transactions, reviews, sponsored_listings tabloları + RLS.
2. **Loyalty:** Rezervasyon completed → puan ekleme; profil ekranında puan + geçmiş.
3. **Yorumlar:** reviews API, işletme detayda listeleme + yorum yazma; admin listeleme/silme.
4. **Sponsorlu:** Keşfet’te sponsorlu blok + badge; admin CRUD.
5. **Analytics:** Admin dashboard (rezervasyon sayıları, doluluk, grafik).
6. **UI/UX:** Liste/detay/keşfet modernizasyonu, galeri, empty/loading states.
7. **Alan yönetimi:** Alan tipleri ve floor plan genişletmesi (masa + alan).

---

## Oluşturulan Migration Dosyaları (Bu Sprint)

| Dosya | Açıklama |
|-------|----------|
| `create-loyalty-reviews-sponsored-tables.sql` | loyalty_transactions, reviews, sponsored_listings, loyalty_rules tabloları |
| `rls-loyalty-reviews-sponsored.sql` | Bu tablolar için RLS politikaları |
| `rls-users-own-read.sql` | users: kullanıcı kendi satırını okuyabilsin (profil) |
| `trigger-loyalty-on-reservation-completed.sql` | Rezervasyon completed → puan ekleme + users.total_points güncelleme |
| `trigger-reviews-update-business-rating.sql` | Yorum eklenince/güncellenince businesses.rating ve total_reviews güncelleme |

---

## Beklenti

- Production-ready, modüler mimari.
- Reusable component yapısı.
- Clean UI (Airbnb / OpenTable kalitesinde).
- Ölçeklenebilir SaaS mantığı.
- Rol bazlı yetkilendirme korunmalı.

Bu sprint sonrası: kullanıcı bağlılığı (loyalty), sosyal kanıt (yorumlar), monetizasyon (sponsorlu), veri görünürlüğü (analytics) ve UX kalitesi belirgin şekilde artmış olacak.
