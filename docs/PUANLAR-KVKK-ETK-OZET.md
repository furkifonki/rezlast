# Puanlar, KVKK/ETK ve Profil Özeti

## Veritabanı (Supabase)

Mevcut migration’lar yeterli. Sırayla çalıştırın:

1. **create-loyalty-tiers-and-legal.sql**  
   - `loyalty_tiers`, `app_legal_texts` tabloları  
   - `users`: `email_marketing_consent`, `sms_marketing_consent`, `marketing_consent_at`, `kvkk_accepted_at`, `etk_accepted_at`

2. **create-loyalty-reviews-sponsored-tables.sql**  
   - `loyalty_transactions` (puan hareketleri: user_id, business_id, reservation_id, points, transaction_type, description, created_at)

3. **trigger-loyalty-on-reservation-completed.sql**  
   - Rezervasyon tamamlanınca puan ekleme

4. **trigger-loyalty-transactions-update-user-points.sql**  
   - Her `loyalty_transactions` INSERT’te `users.total_points` güncelleme

5. **rls-loyalty-reviews-sponsored.sql**  
   - Kullanıcı kendi `loyalty_transactions` kayıtlarını okuyabilsin

6. **add-users-profile-fields.sql**  
   - `users`: `first_name`, `last_name`, `phone`  
   - "Users can update own profile" policy

`users` tablosunda olması gereken sütunlar:  
`id`, `first_name`, `last_name`, `phone`, `total_points`, `loyalty_level`, `email_marketing_consent`, `sms_marketing_consent`, `marketing_consent_at`, `kvkk_accepted_at`, `etk_accepted_at`.

## Mobil Uygulama

- **Puanlar ekranı:** Özet (toplam puan, mevcut seviye, bir sonraki seviyeye kalan), Puan Hareketleri listesi (Tümü / Kazanılan / Harcanan), boş state, seviye kartları.
- **Profil ana sayfa:** "Merhaba" ve ad soyad altında "Seviye: Gümüş" benzeri badge (yeşil chip).
- **Kayıt:** Ad Soyad zorunlu; kayıt sonrası `users.first_name`, `users.last_name` güncelleniyor.
- **Profil > Hesap:** Ad/Soyad/Telefon alanları (varsayılan değerler profil verisinden). Ad veya soyad boşsa uyarı banner’ı. KVKK bölümü: "KVKK Aydınlatma Metni" linki (LegalText ekranına gider), kabul edildiyse "Kabul edildi" badge’i. ETK bölümü: E-posta/SMS ticari ileti toggle’ları (aç/kapa Supabase’e yazılır), "ETK metnini oku" linki.
- **LegalText stack ekranı:** `LegalText` route’u ile `legalKey: 'kvkk' | 'etk'`; Hesap’taki linkler bu ekrana yönlendirir.

## Seviye (tier) hesaplama

- Client-side: `mobile-app/lib/loyaltyConstants.ts` içinde `TIER_THRESHOLDS` (0 Bronz, 100 Gümüş, 500 Altın, 1500 Platin).  
- `users.loyalty_level` varsa gösterimde o kullanılır; yoksa `total_points` ile bu eşiklerden hesaplanır.
