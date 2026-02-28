# Admin Panel

İşletme sahipleri için rezervasyon yönetim paneli.

## Kurulum

1. **Environment:** `mobile-app` ile aynı Supabase projesini kullan. `admin-panel/.env.local` oluştur:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<mobil app .env'deki EXPO_PUBLIC_SUPABASE_URL>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<mobil app .env'deki EXPO_PUBLIC_SUPABASE_ANON_KEY>
   ```

2. **Çalıştır:**
   ```bash
   npm run dev
   ```
   Tarayıcıda: [http://localhost:3000](http://localhost:3000)

3. **Giriş:** Supabase Dashboard → Authentication → Users üzerinden bir kullanıcı oluştur (veya mobil app ile kayıt ol), sonra bu panelde aynı email/şifre ile giriş yap.

## Canlıya alma (Vercel / production)

Panel canlıda **"Supabase yok"** veya **"Supabase yapılandırması eksik"** hatası veriyorsa:

1. Hosting sağlayıcınızda (Vercel → Project → Settings → Environment Variables) şu değişkenleri ekleyin:
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase proje URL’iniz (örn. `https://xxx.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon/public key (Supabase Dashboard → Project Settings → API)

2. Değerleri **local** ile aynı Supabase projesinden alın; böylece panel ve admin uygulaması aynı veritabanını kullanır.

3. Değişkenleri ekledikten sonra projeyi yeniden deploy edin.

## Sayfalar

- `/` → Giriş yoksa `/login`, varsa `/dashboard`
- `/login` → Giriş formu
- `/dashboard` → Ana sayfa
- `/dashboard/businesses` → İşletmelerim (placeholder)
- `/dashboard/reservations` → Rezervasyonlar (placeholder)
