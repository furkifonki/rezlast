# App push bildirimleri – Adım adım kurulum

Bu rehber, uygulama push bildirimlerinin (rezervasyon oluşturuldu, onaylandı, yeni mesaj) çalışması için **Supabase**, **Expo**, **Admin panel** ve **mobil / işletme uygulamalarında** yapmanız gereken tüm kontrolleri ve eklemeleri adım adım anlatır.

---

## Genel akış (özet)

1. **Supabase:** `push_tokens` ve `app_notifications` tabloları + RLS ile hazır olacak.
2. **Expo:** Proje ID’si ve push izinleri ile cihazdan **Expo Push Token** alınacak.
3. **Uygulama:** Bu token, giriş yapan kullanıcı için Supabase `push_tokens` tablosuna kaydedilecek.
4. **Admin panel:** Service role ile bu token’ları okuyup **Expo Push API**’ye istek atacak; aynı anda `app_notifications` tablosuna kayıt ekleyecek.
5. **Ortam değişkenleri:** Her ortamda doğru URL ve anahtarlar tanımlı olacak.

---

## Adım 1 – Supabase: Tablolar ve RLS

### 1.1 Hangi migration’lar gerekli?

Push ve bildirim merkezi için iki migration dosyası kullanılıyor:

| Dosya | Açıklama |
|-------|----------|
| `docs/migrations/create-push-tokens.sql` | Kullanıcı başına Expo push token kaydı |
| `docs/migrations/create-app-notifications.sql` | Bildirim merkezi (uygulama içi liste + push ile birlikte kayıt) |

**Bağımlılık:** `push_tokens` tablosu `users(id)` referans eder. `app_notifications` tablosu `reservations(id)` ve `conversations(id)` referans eder. Önce temel tablolar (users, reservations, conversations) mevcut olmalı.

### 1.2 Supabase Dashboard’da yapılacaklar

1. **Supabase** projenize girin → **SQL Editor**.
2. Sırayla şu dosyaların içeriğini kopyalayıp **Run** ile çalıştırın:
   - `docs/migrations/create-push-tokens.sql`
   - `docs/migrations/create-app-notifications.sql`
3. **Table Editor**’dan kontrol edin:
   - `push_tokens`: `user_id`, `expo_push_token`, `platform`, `updated_at` sütunları var mı?
   - `app_notifications`: `user_id`, `type`, `title`, `body`, `data_reservation_id`, `data_conversation_id`, `read_at`, `created_at` var mı?

### 1.3 RLS özeti (kontrol için)

- **push_tokens**
  - Kullanıcı kendi satırında **ALL** (SELECT, INSERT, UPDATE, DELETE): `auth.uid() = user_id`.
  - İşletme sahipleri (`businesses.owner_id = auth.uid()`) **SELECT** ile tüm token’ları okuyabilir (admin panel “toplu bildirim” için; otomatik push API’leri ise **service role** ile okur).
- **app_notifications**
  - Kullanıcı kendi satırlarında **SELECT** ve **UPDATE** (sadece `read_at` güncellemesi).
  - **INSERT** kullanıcıya kapalı (`WITH CHECK (false)`); sadece service role veya backend API insert atar.

Bu policy’ler ilgili migration dosyalarında tanımlı; ekstra Supabase ayarı gerekmez.

---

## Adım 2 – Expo (Proje ID ve push token)

### 2.1 EAS Project ID

Push token almak için **Expo project ID** gerekir.

- **Mobil uygulama** (`mobile-app`): `app.json` içinde zaten tanımlı:
  - `expo.extra.eas.projectId` (örn. `"1cbdfc90-09ac-455f-bcc0-05019cb5e5"`).
- Yeni bir Expo projesi kullanıyorsanız:
  - `npx eas init` veya EAS dashboard’dan proje oluşturup `projectId`’yi `app.json` → `expo.extra.eas.projectId` olarak ekleyin.
- Kod tarafında token şu şekilde alınıyor: `Constants.expoConfig?.extra?.eas?.projectId` (bkz. `mobile-app/lib/pushNotifications.ts`).

### 2.2 app.json / app.config.js

- `expo.plugins` içinde **`expo-notifications`** olmalı (mobil uygulamada mevcut).
- iOS için `expo.ios` (bundleIdentifier vb.) ve Android için `expo.android` yapılandırılmış olmalı (build alabilmek için).

### 2.3 iOS / Android push credentials (fiziksel cihaz / TestFlight / Play Store)

- **iOS:** Apple Developer hesabında App ID için **Push Notifications** capability açık olmalı. EAS Build kullanıyorsanız, ilk build’de EAS’ın oluşturduğu key/certificate kullanılır; gerekirse EAS dashboard’dan credentials’ı kontrol edin.
- **Android:** FCM (Firebase) kullanımı Expo tarafından yönetilir; EAS Build ile genelde ekstra bir şey yapmanız gerekmez.

Bu adımlar push’ların cihaza ulaşması için gerekli; yalnızca Supabase/API kurulumu için zorunlu değil, ancak “bildirim gelmiyor” diyorsanız credentials’ı kontrol edin.

---

## Adım 3 – Admin panel (Next.js) ortam değişkenleri ve API’ler

### 3.1 .env.local (veya hosting ortam değişkenleri)

Admin panel kökünde (örn. `admin-panel/.env.local`) şunlar olmalı:

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL’i (örn. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Evet | Supabase **service_role** key (Settings → API → service_role). Push token’ları okumak ve `app_notifications` insert için kullanılır. |

- **Önemli:** `SUPABASE_SERVICE_ROLE_KEY` asla istemci tarafına gönderilmemeli; sadece sunucu (API route’ları) kullanmalı.
- Örnek için `admin-panel/.env.local.example` dosyasına bakabilirsiniz.

### 3.2 Kullanılan API route’ları

Admin panelde push ve bildirim için kullanılan endpoint’ler:

| Endpoint | Ne zaman çağrılır | Body | Auth |
|----------|------------------|------|------|
| `POST /api/push-notify-owner` | Müşteri rezervasyon oluşturduğunda | `{ business_id, reservation_id? }` | Bearer (müşteri Supabase token) |
| `POST /api/push-notify-customer` | İşletme rezervasyonu onayladığında | `{ reservation_id }` | Bearer (işletme Supabase token) |
| `POST /api/push-notify-message` | Mesaj gönderildiğinde (mobil veya işletme) | `{ conversation_id, sender_type: "user" \| "restaurant" }` | Bearer (gönderen Supabase token) |

Bu API’ler:

- İstekte gelen **Bearer token** ile kullanıcıyı doğrular.
- **Service role** client ile `push_tokens` tablosundan ilgili kullanıcı(lar)ın `expo_push_token` değerlerini okur.
- **Expo Push API**’ye (`https://exp.host/--/api/v2/push/send`) istek atar.
- **Service role** ile `app_notifications` tablosuna yeni satır insert eder.

Ekstra bir “token API’si” yok; token’lar doğrudan mobil/işletme uygulaması tarafından Supabase `push_tokens` tablosuna yazılıyor (Adım 4).

---

## Adım 4 – Mobil uygulama (son kullanıcı)

### 4.1 Ortam değişkenleri (.env veya app config)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL’i |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase anon key |
| `EXPO_PUBLIC_ADMIN_API_URL` | Otomatik push için | Admin panel base URL’i (örn. `https://your-admin.vercel.app`), **sonda / olmadan** |

`EXPO_PUBLIC_ADMIN_API_URL` yoksa uygulama yine çalışır; sadece “rezervasyon oluşturuldu” / “yeni mesaj” tetiklemesi için admin panel API’leri çağrılmaz, dolayısıyla otomatik push ve `app_notifications` kaydı yapılmaz.

### 4.2 Push token kaydı (zaten mevcut)

- **Giriş sonrası:** `MainStack` içinde, giriş yapan kullanıcı için `registerForPushNotificationsAsync()` çağrılıyor; dönen Expo push token `savePushTokenToSupabase(userId, token)` ile Supabase `push_tokens` tablosuna **upsert** ediliyor (`user_id` ile tekil).
- **İzin:** `expo-notifications` ile izin isteniyor; izin verilmezse token `null` döner ve kayıt yapılmaz.
- **Proje ID:** `pushNotifications.ts` içinde `Constants.expoConfig?.extra?.eas?.projectId` kullanılıyor; bu değerin `app.json`’da dolu olduğundan emin olun (Adım 2).

Bu adım projede var; ekstra kod eklemeniz gerekmez, sadece ortam değişkenleri ve Supabase migration’larının uygulanmış olması yeterli.

---

## Adım 5 – İşletme uygulaması (admin-app, Expo)

### 5.1 Ortam değişkenleri

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `EXPO_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL’i |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase anon key |
| `EXPO_PUBLIC_ADMIN_API_URL` | Otomatik push için | Admin panel base URL’i (sonda / olmadan) |

“Rezervasyon onaylandı” ve “yeni mesaj” bildirimlerini tetikleyen API çağrıları bu URL’e gider.

### 5.2 Push token’ın işletme uygulamasında da kaydedilmesi

“Rezervasyon oluşturuldu” bildirimi **işletme sahibine** (admin panel / işletme uygulaması kullanıcısına) gidecek. Bu kullanıcı yalnızca **admin-app** (Expo) ile giriş yapıyorsa, push’un gelmesi için admin-app’in de:

- Expo push izni alması,
- Dönen Expo push token’ı aynı `push_tokens` tablosuna, **giriş yapan kullanıcının `user_id`’si** ile kaydetmesi

gerekir. **Projede bu akış eklendi:** admin-app’te `expo-notifications` ve `expo-device` paketleri, `lib/pushNotifications.ts` ve AppNavigator’da giriş sonrası push izni + token kaydı mevcut. Admin-app’i TestFlight’ta açtığınızda push izni isteyecek; izin verilmezse işletme sahibi “yeni rezervasyon” push’u almaz.

---

## Adım 5b – Web uygulaması (müşteri rezervasyonu)

Müşteri **web-app** üzerinden rezervasyon oluşturduğunda da işletme sahibine push gitmesi için admin panel API’si çağrılır. `web-app/app/app/reserve/[businessId]/page.tsx` içinde rezervasyon insert’ten sonra `NEXT_PUBLIC_ADMIN_PANEL_URL` ile `POST /api/push-notify-owner` çağrılıyor. Web’de bu env tanımlı değilse web’den yapılan rezervasyonlarda push tetiklenmez.

---

## Adım 6 – Kontrol listesi (özet)

Aşağıdakileri tek tek kontrol edin:

- [ ] **Supabase:** `create-push-tokens.sql` ve `create-app-notifications.sql` çalıştırıldı; tablolar ve RLS policy’leri mevcut.
- [ ] **Supabase:** Service role key’i biliyorsunuz ve sadece sunucu tarafında kullanıyorsunuz.
- [ ] **Admin panel:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` tanımlı.
- [ ] **Mobil uygulama:** `EXPO_PUBLIC_SUPABASE_*` ve (otomatik push için) `EXPO_PUBLIC_ADMIN_API_URL` tanımlı; `app.json`’da `expo.extra.eas.projectId` ve `expo-notifications` plugin’i var.
- [ ] **İşletme uygulaması (admin-app):** `EXPO_PUBLIC_SUPABASE_*` tanımlı; **push izni ve token kaydı** (Adım 5.2) projede eklendi — giriş sonrası izin istenir, token `push_tokens`’a yazılır. `expo-notifications` plugin’i ve `expo.extra.eas.projectId` (app.json) mevcut.
- [ ] **Web uygulaması:** Müşteri web’den rezervasyon yaptığında push tetiklenmesi için `NEXT_PUBLIC_ADMIN_PANEL_URL` tanımlı (opsiyonel; yoksa sadece mobil rezervasyonda push gider).
- [ ] **Cihaz:** Mobil uygulama **ve** (işletme sahibi için) admin-app gerçek cihazda en az bir kez açılıp push izni verildi; giriş sonrası `push_tokens` tablosunda ilgili `user_id` için satır var.
- [ ] **iOS/Android:** TestFlight / Play Store veya development build ile push credentials (capability / FCM) ayarlı; gerekirse EAS credentials’ı kontrol ettiniz.

---

## Sorun giderme (kısa)

| Sorun | Kontrol |
|-------|--------|
| **Admin-app push izni hiç sorulmadı** | Admin-app’te `expo-notifications` kurulu ve `app.json`’da `plugins: ["expo-notifications"]` var mı? Giriş yaptıktan sonra `AppNavigator` içinde `registerForPushNotificationsAsync()` çağrılıyor; yeni bir build (TestFlight/development) alıp cihazda açın, izin dialog’u çıkmalı. |
| **Yeni rezervasyon push’u gelmiyor** | 1) İşletme sahibi **admin-app** kullanıyorsa: Admin-app’te push izni verildi mi? Supabase `push_tokens` tablosunda `owner_id` (işletme sahibi user_id) için `expo_push_token` dolu mu? 2) Müşteri **mobil** uygulamadan rezervasyon yaptıysa: Mobil uygulamada `EXPO_PUBLIC_ADMIN_API_URL` tanımlı mı? 3) Müşteri **web**’den rezervasyon yaptıysa: Web’de `NEXT_PUBLIC_ADMIN_PANEL_URL` tanımlı mı? 4) Tetikleyici ayarlarında “Rezervasyon bildirimleri” kapatılmış olabilir; admin panel / admin-app → Bildirim gönder → Tetikleyici → “Rezervasyon bildirimleri” işaretli olsun. |
| Push hiç gelmiyor | Cihazda push izni verildi mi? `push_tokens`’ta bu kullanıcı için `expo_push_token` dolu mu? |
| Sadece bazı bildirimler gelmiyor | Hangi olay? Rezervasyon oluşturma → yukarıdaki “Yeni rezervasyon push’u gelmiyor” maddesi. Rezervasyon onayı → admin panel API’nin çağrıldığından emin olun. Mesaj → “Mesaj bildirimleri” tetikleyici ayarında açık mı? |
| “Sunucu yapılandırması eksik” | Admin panelde `SUPABASE_SERVICE_ROLE_KEY` tanımlı mı? |
| Bildirim merkezinde kayıt yok | Aynı API’ler `app_notifications` insert de yapıyor; service role key ve RLS’in insert’e izin verdiğini kontrol edin. |

Bu adımlar tamamlandığında, rezervasyon oluşturuldu / onaylandı / mesaj geldi akışlarında hem **app push** hem de **bildirim merkezi** kayıtları çalışır.
