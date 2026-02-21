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

## Sayfalar

- `/` → Giriş yoksa `/login`, varsa `/dashboard`
- `/login` → Giriş formu
- `/dashboard` → Ana sayfa
- `/dashboard/businesses` → İşletmelerim (placeholder)
- `/dashboard/reservations` → Rezervasyonlar (placeholder)
