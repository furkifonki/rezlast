# Quick Start Guide

## Hızlı Başlangıç

Bu dokümantasyon, rezervasyon platformu projesine hızlı bir başlangıç yapmak için gerekli adımları içerir.

## Ön Gereksinimler

### Geliştirme Ortamı
- **Node.js:** v18+ 
- **npm/yarn:** Package manager
- **Git:** Version control
- **Expo CLI:** `npm install -g expo-cli`
- **Supabase Account:** [supabase.com](https://supabase.com)

### Geliştirme Araçları
- **VS Code** (önerilen) veya başka bir IDE
- **PostgreSQL Client** (pgAdmin, DBeaver) - opsiyonel
- **Postman/Insomnia** - API test için

## Proje Yapısı

```
rezervasyon-platformu/
├── README.md
├── docs/
│   ├── architecture.md
│   ├── backend-selection.md
│   ├── database-schema.md
│   ├── security-rbac.md
│   ├── api-design.md
│   ├── mobile-flow.md
│   ├── admin-flow.md
│   ├── sponsored-ranking.md
│   ├── mvp-sprint-plan.md
│   ├── roadmap.md
│   └── quick-start.md
├── mobile-app/          # React Native + Expo
├── admin-panel/         # Next.js
└── backend/             # Supabase (SQL migrations, Edge Functions)
```

## Adım 1: Supabase Kurulumu

1. **Supabase Projesi Oluştur**
   - [supabase.com](https://supabase.com) üzerinden yeni proje oluştur
   - Proje adı: `rezervasyon-platformu`
   - Region: `West Europe` (İstanbul'a yakın)

2. **Veritabanı Şeması**
   - `docs/database-schema.md` dosyasındaki SQL script'leri çalıştır
   - Supabase SQL Editor'da sırayla:
     - Users tablosu
     - Roles tablosu
     - Categories tablosu
     - Businesses tablosu
     - ... (tüm tablolar)

3. **Row Level Security (RLS)**
   - `docs/security-rbac.md` dosyasındaki RLS politikalarını uygula

4. **Environment Variables**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Adım 2: Mobil Uygulama Kurulumu

```bash
# Proje oluştur
npx create-expo-app mobile-app --template

# Dependencies yükle
cd mobile-app
npm install @supabase/supabase-js @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-maps react-native-paper
npm install zustand react-query

# Expo Go ile test
npx expo start
```

### Mobil App Yapılandırması

1. **Supabase Client**
   ```typescript
   // lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

2. **Navigation Setup**
   - Bottom tab navigation (Keşfet, Rezervasyonlarım, Harita, Profil)
   - Stack navigation (detay sayfaları)

## Adım 3: Admin Panel Kurulumu

```bash
# Next.js projesi oluştur
npx create-next-app@latest admin-panel --typescript --tailwind --app

# Dependencies yükle
cd admin-panel
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zustand react-query
npm install shadcn-ui recharts
npm install react-hook-form zod
```

### Admin Panel Yapılandırması

1. **Supabase Client**
   ```typescript
   // lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```

2. **Middleware (Auth)**
   ```typescript
   // middleware.ts
   import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
   import { NextResponse } from 'next/server';
   
   export async function middleware(req: NextRequest) {
     const res = NextResponse.next();
     const supabase = createMiddlewareClient({ req, res });
     const { data: { session } } = await supabase.auth.getSession();
     
     if (!session && req.nextUrl.pathname.startsWith('/admin')) {
       return NextResponse.redirect(new URL('/login', req.url));
     }
     
     return res;
   }
   ```

## Adım 4: İlk Test

### 1. Kullanıcı Kaydı
- Mobil app'te kayıt ol
- Email doğrulama
- Login

### 2. İşletme Ekleme
- Admin panel'de login
- İşletme ekle
- Fotoğraf yükle
- Çalışma saatleri ayarla

### 3. Rezervasyon
- Mobil app'te işletme bul
- Rezervasyon yap
- Admin panel'de görüntüle

## Geliştirme Workflow

### 1. Feature Development
```bash
# Yeni feature branch
git checkout -b feature/reservation-flow

# Değişiklikler
# ...

# Commit & Push
git add .
git commit -m "feat: add reservation flow"
git push origin feature/reservation-flow
```

### 2. Database Migrations
- Supabase SQL Editor'da migration script'leri çalıştır
- Veya Supabase CLI kullan:
  ```bash
  supabase db push
  ```

### 3. Testing
- Mobil: Expo Go ile test
- Admin: Local development server
- API: Postman/Insomnia ile test

## Yaygın Sorunlar ve Çözümler

### 1. RLS Policy Hatası
**Sorun:** "Row Level Security policy violation"  
**Çözüm:** `docs/security-rbac.md` dosyasındaki politikaları kontrol et

### 2. CORS Hatası
**Sorun:** "CORS policy blocked"  
**Çözüm:** Supabase dashboard'da CORS ayarlarını kontrol et

### 3. Token Expired
**Sorun:** "JWT expired"  
**Çözüm:** Token refresh mekanizmasını implement et

### 4. Image Upload Hatası
**Sorun:** "Storage bucket not found"  
**Çözüm:** Supabase Storage'da bucket oluştur ve policy ayarla

## Sonraki Adımlar

1. **MVP Sprint Planı:** `docs/mvp-sprint-plan.md` dosyasını takip et
2. **API Endpoints:** `docs/api-design.md` dosyasına göre implement et
3. **UI/UX:** `docs/mobile-flow.md` ve `docs/admin-flow.md` dosyalarına göre ekranları oluştur
4. **Testing:** Her feature için test yaz

## Yardımcı Kaynaklar

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Expo Docs:** [docs.expo.dev](https://docs.expo.dev)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)
- **React Navigation:** [reactnavigation.org](https://reactnavigation.org)

## İletişim ve Destek

- **GitHub Issues:** Bug report ve feature request
- **Documentation:** `docs/` klasörü
- **Team Chat:** Slack/Discord (kurulum sonrası)

---

**Not:** Bu quick start guide, temel kurulum için yeterlidir. Detaylı bilgi için ilgili dokümantasyon dosyalarına bakınız.
