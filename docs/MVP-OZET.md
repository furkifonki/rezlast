# Rezvio MVP – Uygulamada Neler Var? (Özet)

Bu doküman, **mevcut uygulamada yer alan tüm özelliklerin** detaylı özetidir. Hiçbir özellik atlanmamaya çalışılmıştır.

---

## 1. Genel Mimari

- **Mobil uygulama:** React Native + Expo (TypeScript). Tab tabanlı ana ekran (Keşfet, Favoriler, Rezervasyonlarım, Profil).
- **Admin panel:** Next.js (App Router), Supabase client. Sadece işletme sahipleri kendi işletmelerini ve rezervasyonlarını yönetir.
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS). Tüm veri ve yetkilendirme Supabase üzerinden.

---

## 2. Mobil Uygulama – Ekranlar ve Özellikler

### 2.1 Kimlik Doğrulama (Auth)

- **Login:** E-posta + şifre ile giriş. Supabase Auth.
- **Register:** Ad Soyad (zorunlu), e-posta, şifre. KVKK aydınlatma metni zorunlu kabul. ETK (e-posta/SMS ticari ileti) opsiyonel işaretlenir; kabul edilirse `users` tablosuna `etk_accepted_at`, `email_marketing_consent`, `sms_marketing_consent` yazılır. Kayıt sonrası kısa gecikme + retry ile profil güncellemesi (first_name, last_name, KVKK/ETK) yapılır ki profilde doğru görünsün.
- **Forgot Password:** E-posta ile şifre sıfırlama linki. `EXPO_PUBLIC_APP_URL` ile redirect (reset-password).
- **Reset Password:** (Varsa) şifre sıfırlama ekranı.
- Oturum yoksa Auth stack (Login/Register/Forgot); oturum varsa TabContainer (Keşfet, Favoriler, Rezervasyonlarım, Profil).

### 2.2 Keşfet (Explore)

- **Kategori filtreleri:** Restoranlar, Berberler, Güzellik Salonları vb. (categories tablosu). Yatay scroll chip’ler.
- **Öne Çıkan (sponsored):** `sponsored_listings` ile ödeme durumu “paid” ve tarih aralığında olan işletmeler üstte ayrı blokta; “Öne Çıkan” badge’i. “Tümünü gör” ile modal liste.
- **İşletme listesi:** Kategoriye göre filtrelenir. Her kart: kapak fotoğrafı (business_photos), işletme adı, puan (rating), kategori, adres. Tıklanınca işletme detay.
- **Favori butonu:** Her kartta kalp ikonu (beyaz arka plan, yuvarlak). Tıklanınca `user_favorites` tablosuna ekleme/çıkarma. Giriş yoksa favori işlemi yapılmaz.
- **Pull-to-refresh:** Liste ve öne çıkanlar yenilenir.
- **Boş/hata/loading:** Uygun mesajlar.

### 2.3 Favoriler

- **FavoritesScreen:** Giriş yapılmışsa `user_favorites` + `businesses` join ile favori işletmeler listelenir. Giriş yoksa “Giriş yapın” mesajı. Liste boşsa “Henüz favori işletme eklemediniz.” Karta tıklanınca işletme detay; favoriden çıkarma butonu.

### 2.4 İşletme Detay (BusinessDetailScreen)

- **Üst bilgi:** Fotoğraf galerisi (business_photos; sıralı), işletme adı, kategori, ortalama puan (rating).
- **İçerik:** Adres, şehir/ilçe, açıklama, çalışma saatleri (business_hours; gün bazlı, kapalı/açılış–kapanış). Konum: latitude/longitude varsa InAppMap (react-native-maps) veya “Haritada aç” (Google Maps link); yoksa adresle arama linki.
- **İletişim:** Telefon (arama), e-posta (mailto), web sitesi (Linking).
- **Yorumlar:** reviews tablosundan listeleme. Sıralama: En yeni / En yüksek / En düşük. Ortalama puan ve yorum sayısı. “Yorum yaz” / “Yorumunuzu düzenle”: 1–5 yıldız + metin. Upsert `business_id, user_id` (bir kullanıcı bir işletmeye bir yorum). Yorum sonrası businesses.rating tetikleyici ile güncellenir.
- **Rezervasyon Yap:** Buton ile rezervasyon akışına geçiş (businessId, businessName iletilir).

### 2.5 Rezervasyon Akışı (ReservationFlowScreen)

- **Hizmet (opsiyonel):** İşletmenin services listesi; “Belirtmeyeyim” veya tek hizmet seçimi. Süre: duration_minutes / duration_display (Gün boyu, Tüm akşam vb.) etkili süreyi belirler.
- **Tarih:** availableDates: business_hours + business_closures ile kapalı günler elenir; 14 gün ileriye kadar seçilebilir. Chip’ler: Bugün, Yarın, diğerleri kısa tarih.
- **Saat:** Önce `get_available_slots_for_date` RPC çağrılır (seçilen gün için müsait saatler). İşletmede masa yoksa çalışma saatlerine göre tüm 30 dk slotları döner; masa varsa sadece en az bir müsait masası olan saatler. RPC boş dönse bile client-side business_hours’tan hesaplanan availableTimes varsa saat listesi gösterilir (güzellik salonu vb.). “Bu günde uygunluk bulunamadı” yalnızca hem RPC hem client saat listesi boşsa gösterilir.
- **Uygunluk kontrol et:** Buton ile masa listesi yüklenir. Tüm masalar `tables` tablosundan; `get_available_tables` RPC ile seçilen tarih/saat/süre için müsait olanlar hesaplanır; dolu olanlar “Meşgul” işaretlenir.
- **Masa / Alan:** Liste veya Harita (varsayılan harita). table_type’a göre alan etiketleri (İç Mekân, Teras, VIP, Deniz Kenarı vb.) ve renkler. “İşletme belirlesin” seçeneği. Konumu olmayan masalar ayrı chip satırında.
- **Kişi sayısı:** 1–6 (veya max masa kapasitesine kadar). Kapasite aşımı uyarısı.
- **Özel istekler:** Metin alanı (opsiyonel).
- **Rezervasyon yap:** reservations tablosuna INSERT (business_id, user_id, reservation_date, reservation_time, duration_minutes, party_size, service_id, table_id, special_requests, status: pending). Başarıda alert ve ana akışa dönüş.

### 2.6 Rezervasyonlarım (ReservationsScreen)

- **Liste:** Kullanıcının rezervasyonları (reservations.user_id). Tarih/saat, işletme adı, kişi sayısı, durum (Beklemede, Onaylandı, İptal, Tamamlandı, Gelmedi). Açılmadan önce `close_my_past_reservations` RPC çağrılır (geçmiş pending/confirmed rezervasyonlar completed yapılır).
- **Detay:** ReservationDetailScreen. Rezervasyon bilgisi, özel istekler. Not güncelleme (special_requests). Ödeme yöntemi (payment_method_id) ve tutar (amount) varsa gösterilir. İptal butonu (status → cancelled).

### 2.7 Profil (ProfileScreen)

- **Profil bilgileri:** Ad, soyad, telefon (zorunlu alanlar). E-posta salt okunur. Kaydet ile users güncellenir.
- **Puan:** total_points, loyalty_level (Bronz, Gümüş, Altın, Platin). “Puanlarımı nasıl kullanırım?” → PointsInfoScreen (loyalty_tiers açıklamaları).
- **Puan geçmişi:** loyalty_transactions son 20 kayıt; işletme adı, puan (+/-), açıklama, tarih.
- **KVKK:** “KVKK metnini oku” → LegalTextScreen (app_legal_texts). Kabul edilmişse yeşil “Kabul edildi” badge.
- **ETK:** E-posta/SMS ticari ileti izinleri. Toggle’lar; değişince users.email_marketing_consent, sms_marketing_consent (ve gerekirse etk_accepted_at) güncellenir. ETK metni LegalTextScreen’de okunup kabul edilebilir.
- **Hizmetler:** “Rezvio ile neler yapabilirsiniz?” bilgi ekranı (HizmetlerScreen).
- **Çıkış yap:** signOut.

### 2.8 Yardımcı / Alt Ekranlar

- **LegalTextScreen:** app_legal_texts’ten key (kvkk / etk) ile metin gösterir. Opsiyonel “Kabul ediyorum” ile users’a kvkk_accepted_at veya etk_accepted_at yazılır.
- **PointsInfoScreen:** loyalty_tiers listesi (Bronz, Gümüş, Altın, Platin); min_points ve açıklamalar.
- **HizmetlerScreen:** Rezervasyon, Favoriler, Puan, Profil hakkında kısa bilgi metinleri.
- **InAppMap:** react-native-maps ile işletme konumu (Expo Go’da native modül yok; fallback olarak harita linki).

### 2.9 Navigasyon ve UI

- **TabContainer:** Header’da logo (icon.png) ve sekme başlığı. Alt tab bar: Keşfet, Favoriler, Rezervasyonlarım, Profil. Aynı sekmeye tekrar basınca ilgili ekran “root”a döner.
- **AuthContainer / AuthStack:** Login, Register, ForgotPassword (ve varsa ResetPassword) stack.

---

## 3. Admin Panel – Sayfalar ve Özellikler

### 3.1 Giriş ve Genel

- **Login:** E-posta + şifre. Supabase Auth. Başarıda /dashboard.
- **Register:** (Varsa) işletme sahibi kaydı.
- **Forgot Password / Reset Password:** Şifre sıfırlama akışı.
- **Dashboard layout:** Sol sidebar (Rezvio logo, menü, Çıkış Yap). Menü: Ana Sayfa, İşletmelerim, Rezervasyonlar, Gelir, Yorumlar, Öne Çıkan, Hizmetler, Puan İşlemleri, Masa Planı.

### 3.2 Ana Sayfa (Dashboard)

- **Özet sayılar:** İşletme sayısı, toplam rezervasyon, beklemedeki rezervasyon, bugünkü rezervasyon.
- **Son rezervasyonlar:** Son 5 rezervasyon (tarih, saat, işletme, müşteri adı, durum).
- **Grafikler:** Son 7 gün / 4 hafta seçimi. Rezervasyon sayısı (günlük, completed vs diğer); gelir (reservations.amount) günlük toplam. Tooltip’ler.

### 3.3 İşletmelerim

- **Liste:** Sadece owner_id = auth.uid() işletmeler. İşletme adı, (varsa) diğer bilgiler. Yeni işletme, düzenle, detay linkleri.
- **Yeni işletme:** Ad, slug, kategori, adres, şehir, ilçe, telefon, e-posta, web, açıklama, konum (lat/lng). owner_id = auth.uid().
- **İşletme düzenle:** Aynı alanlar. Fotoğraf ekleme (business_photos; Supabase Storage), sıra, birincil fotoğraf. Çalışma saatleri (business_hours) ve kapalı günler (business_closures) ayrı sayfada veya aynı formda.
- **İşletme detay:** Özet bilgi, çalışma saatleri, fotoğraflar, kapalı tarihler. Alt sayfalar: Düzenle, Çalışma Saatleri.
- **Çalışma saatleri:** business_hours; gün bazlı açılış/kapanış, mola, kapalı işareti. Upsert business_id + day_of_week.
- **Kapalı günler:** business_closures; closure_date, reason. Liste + yeni ekleme.

### 3.4 Rezervasyonlar

- **Liste:** İşletme sahibinin işletmelerine ait rezervasyonlar. Filtre: durum (pending, confirmed, cancelled, completed, no_show), tarih aralığı. Sayfa açılmadan `close_past_reservations_for_owner` RPC ile geçmiş rezervasyonlar completed yapılır.
- **Rezervasyon detay:** Tarih, saat, süre, kişi sayısı, müşteri adı/telefon/e-posta, özel istekler, durum. Durum güncelleme: Onayla (confirmed), Tamamla (completed), İptal (cancelled), Gelmedi (no_show). Gelir alanları: amount, payment_method_id (payment_methods tablosu); kaydetme. Ödeme yöntemi listesi payment_methods’tan.
- **Yeni rezervasyon (manuel):** İşletme, tarih, saat, süre tipi (no_limit, all_day, all_evening, dakika), kişi sayısı, masa (opsiyonel), hizmet (opsiyonel), müşteri adı/telefon/e-posta, özel istekler. Masa ve hizmet listesi seçilen işletmeye göre. INSERT’te user_id olarak giriş yapan admin (owner) kullanılır; müşteri bilgileri customer_name, customer_phone, customer_email alanlarında saklanır.

### 3.5 Gelir

- **Gelir listesi:** Rezervasyonlardan amount ve payment_method_id dolu olanlar. Tarih aralığı filtresi. Ödeme yöntemine göre gruplama/özet (sayfa içeriğine göre).
- **Ödeme yöntemleri:** payment_methods tablosu; yeni ödeme yöntemi ekleme (Nakit, Kredi Kartı vb.).

### 3.6 Yorumlar

- **Liste:** İşletme sahibinin işletmelerine ait reviews. Filtre: işletme, gizli/tümü/görünen. Yorum, puan, tarih, is_hidden.
- **Gizle/Göster:** is_hidden toggle. Güncellenince businesses.rating tetikleyici (trigger) ile işletme ortalaması yeniden hesaplanır.

### 3.7 Öne Çıkan (Sponsorlu)

- **Liste:** sponsored_listings; işletme, başlangıç/bitiş tarihi, öncelik, ödeme durumu.
- **Yeni / Düzenle:** İşletme seçimi, start_date, end_date, priority. payment_status (pending, paid vb.) alanı varsa gösterilir.

### 3.8 Hizmetler

- **Liste:** İşletme bazlı services. İşletme seçimi, hizmet adı, süre, fiyat, aktif/pasif.
- **Yeni / Düzenle:** name, description, duration_minutes, duration_display (no_limit, all_day, all_evening vb.), price, is_active. Hizmet bazlı puan kuralı: service_loyalty_rules (tamamlanan rezervasyonda verilecek puan).

### 3.9 Puan İşlemleri (Loyalty)

- **Nasıl kullanılır kutusu:** Müşteri seç, bakiye gör; pozitif puan ekleme, negatif puan düşme (indirimde kullanım) açıklaması.
- **Müşteri listesi:** `get_business_customers_with_points` RPC. Sadece **henüz geçmemiş** (pending/confirmed ve tarih+saat > now()) rezervasyonu olan müşteriler listelenir; tamamlanan veya geçmiş rezervasyondan sonra müşteri listeden düşer. Her müşteri için user_id, customer_name, customer_email, total_points.
- **Puan ekleme/düşme:** İşletme + müşteri seçimi, puan (pozitif/negatif), açıklama. loyalty_transactions INSERT (manual_add / manual_deduct). Trigger ile users.total_points güncellenir.

### 3.10 Masa Planı

- **Masalar listesi:** tables; işletme seçimi, masa no, kapasite, kat, table_type (indoor, outdoor, vip, terrace, seaside, bar), is_active. Yeni masa, düzenle, (varsa) sil.
- **Masa planı (floor plan):** tables/plan. İşletme seçimi. Canvas üzerinde masalar; position_x, position_y sürükle-bırak ile güncellenir. Alan tipleri renklerle gösterilir.
- **Yeni masa / düzenle:** table_number, capacity, floor_number, position_x, position_y, table_type, is_active.

---

## 4. Veritabanı ve Backend

### 4.1 Temel Tablolar (Kullanılanlar)

- **users:** id (auth ile aynı), email, first_name, last_name, phone, role, loyalty_level, total_points, kvkk_accepted_at, etk_accepted_at, email_marketing_consent, sms_marketing_consent, marketing_consent_at, auth_user_id. Trigger: auth.users INSERT’te public.users satırı oluşturulur.
- **businesses:** owner_id, name, slug, category_id, address, city, district, latitude, longitude, phone, email, website, description, is_active, rating, total_reviews.
- **categories:** name, slug, is_active, sort_order (Restoranlar, Berberler, Güzellik Salonları vb.).
- **business_hours:** business_id, day_of_week (0–6), open_time, close_time, is_closed, break_start, break_end.
- **business_closures:** business_id, closure_date, reason.
- **business_photos:** business_id, photo_url, photo_order, is_primary. Storage bucket (business-photos) ile entegre.
- **services:** business_id, name, description, duration_minutes, duration_display, price, is_active.
- **tables:** business_id, table_number, capacity, floor_number, position_x, position_y, table_type, is_active.
- **reservations:** business_id, user_id, reservation_date, reservation_time, duration_minutes, duration_display, end_time, party_size, status, table_id, service_id, special_requests, customer_name, customer_phone, customer_email, loyalty_points_earned, amount, payment_method_id, confirmed_at, cancelled_at. Bir kullanıcı aynı gün/aynı saatte farklı işletmelerde birden fazla rezervasyon yapabilir (UNIQUE kısıtı yok).
- **loyalty_transactions:** user_id, business_id, reservation_id, points, transaction_type (earned, manual_add, manual_deduct), description.
- **loyalty_tiers:** id (bronze, silver, gold, platinum), min_points, display_name, description, sort_order.
- **service_loyalty_rules:** service_id, points, is_active (hizmet tamamlandığında verilecek puan).
- **reviews:** business_id, user_id, reservation_id (opsiyonel), rating (1–5), comment, is_hidden. UNIQUE(business_id, user_id) veya (business_id, user_id, reservation_id) kullanımına göre tek yorum/yeniden yazım.
- **sponsored_listings:** business_id, category_id, start_date, end_date, priority, payment_status.
- **user_favorites:** user_id, business_id. UNIQUE(user_id, business_id).
- **app_legal_texts:** key (kvkk, etk), title, body.
- **payment_methods:** name, sort_order. reservations.amount ve payment_method_id ile gelir takibi.

### 4.2 RPC / Fonksiyonlar

- **get_available_tables:** Verilen business_id, date, time, duration_minutes için rezervasyonu olmayan (pending/confirmed çakışmayan) masaları döner. duration_minutes=0 rezervasyon o masayı o gün tamamen bloke eder.
- **get_available_slots_for_date:** Seçilen gün için müsait saatleri (30 dk) döner. İşletmede masa yoksa çalışma saatlerine göre tüm slotlar; masa varsa sadece get_available_tables’ın döndüğü saatler.
- **get_business_customers_with_points:** İşletme sahibi için, sadece pending/confirmed ve tarih+saat > now() olan rezervasyonu bulunan müşterileri ve total_points’i döner. RLS: sadece o işletmenin owner’ı çağırabilir.
- **close_my_past_reservations:** Kullanıcının kendi geçmiş (tarih+saat < now()) pending/confirmed rezervasyonlarını completed yapar.
- **close_past_reservations_for_owner:** İşletme sahibinin işletmelerine ait geçmiş pending/confirmed rezervasyonları completed yapar.

### 4.3 Trigger’lar

- **on_auth_user_created:** auth.users INSERT → public.users INSERT (id, email, auth_user_id, role).
- **on_reservation_completed_loyalty:** reservations status → completed olduğunda puan ekleme; service_loyalty_rules veya loyalty_rules veya varsayılan 10 puan; loyalty_transactions INSERT.
- **trg_loyalty_transaction_insert_user:** loyalty_transactions INSERT → users.total_points güncelleme (toplam puan).
- **trigger_reviews_update_business_rating:** reviews INSERT/UPDATE/DELETE veya is_hidden değişince businesses.rating ve total_reviews güncellenir.

### 4.4 RLS (Özet)

- **users:** Kendi satırını okuyabilir; kendi profilini güncelleyebilir.
- **businesses:** Aktif işletmeler herkese açık okuma; sahibi kendi işletmelerini yönetir.
- **reservations:** Kullanıcı kendi rezervasyonlarını okur/günceller (iptal, not, ödeme bilgisi); işletme sahibi kendi işletmesinin rezervasyonlarını okur/günceller (durum, gelir).
- **tables, services, business_hours, business_photos, business_closures:** İlgili okuma/yazma politikaları (public read veya owner only).
- **loyalty_transactions:** Kullanıcı kendi kayıtlarını okur; işletme sahibi kendi işletmesi için INSERT (manuel puan).
- **reviews:** Okuma public veya işletme sahibi; yazma authenticated (mobil upsert); admin gizleme.
- **sponsored_listings, user_favorites, app_legal_texts, payment_methods:** İlgili SELECT/INSERT/UPDATE politikaları.

### 4.5 Migration Dosyaları (Sıra / Amaç)

- trigger-public-users-on-auth-signup.sql – Auth sonrası users satırı.
- backfill-public-users-from-auth.sql – Mevcut auth kullanıcıları için users.
- add-users-profile-fields.sql – first_name, last_name, phone.
- create-loyalty-tiers-and-legal.sql – loyalty_tiers, app_legal_texts, users’a ETK/KVKK sütunları.
- create-loyalty-reviews-sponsored-tables.sql – loyalty_transactions, reviews, sponsored_listings, loyalty_rules.
- create-user-favorites-rls.sql – user_favorites tablosu ve RLS.
- create-service-loyalty-rules.sql – service_loyalty_rules, rezervasyon tamamlandığında puan.
- trigger-loyalty-on-reservation-completed.sql – Rezervasyon completed → puan.
- trigger-loyalty-transactions-update-user-points.sql – loyalty_transactions → total_points.
- trigger-reviews-update-business-rating.sql – reviews → businesses.rating.
- add-reservations-duration-display.sql – duration_display.
- add-reservations-revenue-payment-method.sql – amount, payment_method_id, payment_methods tablosu.
- fn-get-available-tables.sql – Müsait masalar RPC.
- fn-get-available-slots-for-date.sql – Müsait saatler RPC (masa yoksa tüm slotlar).
- fn-get-business-customers-with-points.sql – Müşteri listesi + puan (sadece henüz geçmemiş rezervasyonu olanlar).
- fn-close-past-reservations.sql – close_my_past_reservations, close_past_reservations_for_owner.
- rls-* – Çeşitli tablolar için RLS politikaları.
- storage-business-photos-bucket.sql – Fotoğraf bucket.
- reservations-allow-multiple-per-user-per-day.sql – Dokümantasyon: aynı gün farklı işletmede çoklu rezervasyon serbest.

---

## 5. Deploy ve Dokümantasyon

- **Web (admin panel):** Vercel. Root directory: admin-panel. Ortam değişkenleri: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (ve isteğe bağlı SUPABASE_SERVICE_ROLE_KEY). Supabase Auth redirect URL’lerine canlı admin URL eklenir.
- **Mobil (TestFlight):** Expo EAS. eas build (iOS production), eas submit. app.json: bundleIdentifier, icon, splash. TESTFLIGHT-YAYIN.md ve DEPLOY.md’de adımlar.
- **DEPLOY-SORUN-GIDERME.md:** Web deploy (root directory, env, Supabase redirect) ve mobil (eas login, Bundle ID, App-Specific Password) sık hatalar.
- **Diğer dokümanlar:** database-schema.md, api-design.md, LOYALTY.md, REZVIO-LOGO-VE-YASAL.md, SUPABASE-EMAIL.md, mvp-sprint-plan.md, SPRINT-4-KICKOFF.md, SPRINT-SCOPE.md, NEXT-SPRINT-OZET.md.

---

## 6. Eksik / Planlanan (MVP Kapsamı Dışı)

- **Bildirimler:** notifications tablosu şemada var; push veya e-posta bildirimi (rezervasyon onay/iptal vb.) uygulama tarafında tetiklenmiyor.
- **Branches:** Çoklu şube yapısı şemada var; admin/mobilde şube seçimi ve filtreleme yok.
- **availability_slots:** Saat bazlı slot tablosu şemada var; restoran/berber akışı şu an tables + business_hours ile; slot bazlı ayrı akış yok.
- **subscriptions / subscription_plans:** SaaS abonelik tabloları şemada; kullanılmıyor.
- **campaigns:** Kampanya/kupon tabloları; kullanılmıyor.
- **payments:** Ayrı ödeme işlemleri tablosu; rezervasyon amount/payment_method ile gelir takibi yapılıyor.

---

Bu doküman, mevcut kod ve migration’lara göre hazırlanmıştır. Yeni özellik veya migration eklendikçe güncellenmelidir.
