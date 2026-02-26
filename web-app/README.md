# Rezvio Web (Mobil Web / Masaüstü)

Mobil uygulama ile **aynı yapı ve tasarım** kullanılarak oluşturulmuş web sürümü. Hem mobil tarayıcıda hem masaüstünde çalışır.

## Özellikler

- **Giriş / Kayıt / Şifremi unuttum** – Mobil ile aynı Supabase Auth
- **Keşfet** – Öne çıkanlar, kategori filtresi, işletme kartları, favori (kalp)
- **Favoriler** – Favori işletmeler listesi
- **Rezervasyonlarım** – Geçmiş ve gelecek rezervasyonlar, detay ve iptal
- **Profil** – Ad, soyad, telefon, puan özeti, puan geçmişi, çıkış
- **İşletme detay** – Adres, çalışma saatleri, harita linki, iletişim, Rezervasyon Yap
- **Rezervasyon akışı** – Tarih, saat (DB uygunluk), masa (opsiyonel), kişi sayısı, özel istek

## Kurulum

1. Bağımlılıklar yüklü (proje `create-next-app` ile oluşturuldu).
2. `.env.local` oluşturup mobil uygulamadaki Supabase bilgilerini **web için** ekleyin:

```bash
cp .env.example .env.local
```

`.env.local` içeriği:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

(Mobildeki `EXPO_PUBLIC_*` yerine `NEXT_PUBLIC_*` kullanılır; aynı Supabase projesi kullanılabilir.)

3. Çalıştırma:

```bash
npm run dev
```

Tarayıcıda `http://localhost:3000` açılır. Giriş yoksa `/login`, giriş varsa `/app` (Keşfet) gösterilir.

## Proje yapısı

- `app/` – Next.js App Router
  - `(auth)/` – login, register, forgot-password
  - `(app)/` – giriş sonrası: Keşfet, Favoriler, Rezervasyonlarım, Profil; alt sayfalar business/[id], reserve/[businessId], reservation/[id]
- `contexts/AuthContext.tsx` – Oturum ve signIn/signUp/signOut
- `lib/supabase.ts` – Supabase client (tarayıcı)

Tasarım renkleri ve bileşen stilleri mobil uygulama ile uyumlu tutuldu (`#15803d` vurgu, `#f8fafc` arka plan, `#e2e8f0` çerçeve vb.).
