# Otomatik push için senin yapman gerekenler

Rezervasyon oluşturuldu / onaylandı / iptal / mesaj bildirimlerinin çalışması için aşağıdakileri **bir kez** yapman yeterli.

**Önemli:** Push API’leri **admin-panel** (Next.js) projesinde; bu proje Vercel’e deploy edilir. Hem **mobil (müşteri)** hem **işletme (admin) Expo uygulaması** bu API’leri tetiklemek için o sunucuyu çağırır. Yani her iki uygulamanın .env’inde de **aynı backend adresi** (Vercel’deki admin-panel URL’i) olacak — bu “işletme uygulamasının URL’i” değil, **API’nin çalıştığı sunucunun URL’i**.

---

## 1. Supabase

- **SQL Editor**’da sırayla çalıştır:
  1. `docs/migrations/create-push-tokens.sql`
  2. `docs/migrations/create-app-notifications.sql`
  3. `docs/migrations/add-app-notifications-cancelled-type.sql` (iptal bildirimi için)

---

## 2. Admin panel (.env)

`admin-panel/.env.local` (veya hosting’te Environment Variables) içinde:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Settings → API → service_role)

---

## 3. Mobil uygulama (.env)

`mobile-app` kökünde `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **`EXPO_PUBLIC_ADMIN_API_URL`** = Push API’lerinin çalıştığı adres. Bu **admin-panel (Next.js)** projesinin deploy edildiği URL’dir (örn. Vercel: `https://xxx.vercel.app`). Sonda `/` olmasın.

---

## 4. İşletme uygulaması (.env)

`admin-app` kökünde `.env`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **`EXPO_PUBLIC_ADMIN_API_URL`** = Aynı adres: **admin-panel (Next.js)** deploy URL’i (örn. Vercel). İşletme uygulaması da push tetiklemek için bu API’yi çağırıyor; kendi uygulama URL’i değil.

---

## 5. İşletme uygulamasında push token (opsiyonel)

“Rezervasyon oluşturuldu” bildirimi **işletme sahibine** gidecek. İşletme sahibi sadece **işletme (admin) uygulamasını** kullanıyorsa, o uygulamanın da cihazdan push izni alıp token’ı Supabase `push_tokens` tablosuna yazması gerekir. Şu an sadece **mobil (müşteri) uygulaması** token kaydediyor. İşletme uygulamasına da aynı mantığı (giriş sonrası `registerForPushNotificationsAsync` + `push_tokens` upsert) eklersen, işletme sahibi admin-app’te de push alır.

---

## Özet

| Ne | Nerede |
|----|--------|
| 3 SQL dosyasını çalıştır | Supabase SQL Editor |
| 3 env değişkeni | admin-panel (Next.js) |
| 3 env değişkeni (**backend URL** = Vercel’deki admin-panel) | mobile-app |
| 3 env değişkeni (**backend URL** = aynı Vercel adresi) | admin-app |
| İsteğe bağlı: token kaydı | admin-app (işletme sahibi sadece bu uygulamayı kullanıyorsa) |

Bunlar tamamsa otomatik push’lar (oluşturuldu → işletme, onaylandı/iptal → müşteri, mesaj → her iki taraf) çalışır.
