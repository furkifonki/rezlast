# 🚀 Projeye Başlama Rehberi

Bu dosya, projeye sıfırdan başlamak için adım adım talimatlar içerir.

## ⚡ Hızlı Başlangıç (5 Adım)

### Adım 1: Supabase Projesi Oluştur (10 dakika)

1. **Supabase'e Git:**
   - [supabase.com](https://supabase.com) → Sign Up / Login
   - "New Project" butonuna tıkla

2. **Proje Ayarları:**
   - **Name:** `rezervasyon-platformu`
   - **Database Password:** Güçlü bir şifre seç (kaydet!)
   - **Region:** `West Europe` (İstanbul'a yakın)
   - **Pricing Plan:** Free tier ile başla

3. **Proje Oluştur:**
   - "Create new project" butonuna tıkla
   - 2-3 dakika bekle (veritabanı hazırlanıyor)

4. **API Keys'i Al:**
   - Sol menüden "Settings" → "API"
   - Şunları kopyala ve kaydet:
     - `Project URL` (örn: `https://xxxxx.supabase.co`)
     - `anon public` key
     - `service_role` key (gizli tut!)

   **Bu key'leri ne yapacaksın?**  
   Bu değerleri **mobil uygulama** ve **admin panel** projelerinde kullanacaksın; Supabase'e bağlanmak için gerekli. Henüz projeleri oluşturmadıysan bir yere (not defteri, .env örneği) kaydet. Projeleri kurduğunda:
   - **Mobil app:** `mobile-app/.env` dosyasına yazacaksın (Adım 3’te).
   - **Admin panel:** `admin-panel/.env.local` dosyasına yazacaksın (Adım 4’te).  
   Örnek:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
   ```
   Key'leri **Git'e commit etme** (`.env` dosyaları `.gitignore`'da olmalı).

### Adım 2: Veritabanı Şemasını Oluştur (15 dakika)

1. **SQL Editor'a Git:**
   - Sol menüden "SQL Editor" → "New query"

2. **Tabloları Oluştur:**
   - `docs/database-schema.md` dosyasını aç
   - SQL script'leri sırayla çalıştır:
   
   **Önce temel tablolar:**
   ```sql
   -- 1. Users tablosu
   -- 2. Roles tablosu
   -- 3. Categories tablosu
   -- 4. Businesses tablosu
   ```
   
   **Sonra diğer tablolar:**
   - Branches, Business Hours, Services, Tables, vb.
   
   **Not:** Her script'i tek tek çalıştır, hata varsa düzelt.

3. **RLS Politikalarını Uygula:**
   - `docs/security-rbac.md` dosyasındaki RLS politikalarını çalıştır
   - Örnek: `ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;`

4. **Storage Bucket Oluştur:**
   - **Storage bucket ne demek?** Supabase’te dosya (fotoğraf, belge vb.) saklamak için kullandığın “klasör”lere bucket denir. İşletme fotoğraflarını burada tutacağız; admin panelden veya uygulamadan yüklenen görseller bu bucket’a gidecek.
   - **Nasıl oluşturulur?**
     - Supabase sol menü → **Storage**
     - **"New bucket"** (Yeni bucket) butonuna tıkla
     - **Name:** `business-photos`
     - **Public bucket:** ✅ işaretle (listelemek için herkese açık link gerekir)
     - **Create bucket** ile kaydet
   - İstersen şimdilik atlayıp, ilk fotoğraf yükleme özelliğini yazarken de oluşturabilirsin.

### Adım 3: Mobil Uygulamayı Kur (20 dakika)

```bash
# Terminal'de proje klasörüne git
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması"

# Expo projesi oluştur
npx create-expo-app@latest mobile-app --template blank-typescript

# Klasöre gir
cd mobile-app

# Gerekli paketleri yükle
npm install @supabase/supabase-js
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install @react-native-async-storage/async-storage
npm install zustand
npm install react-native-paper
npm install react-native-maps
npm install expo-location

# Environment dosyası oluştur
echo "EXPO_PUBLIC_SUPABASE_URL=your-supabase-url" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env

# .env dosyasını düzenle (gerçek değerleri yapıştır)
```

**İlk Dosyaları Oluştur:**

1. **Supabase Client:**
   ```typescript
   // mobile-app/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
   const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

2. **App.tsx'i Güncelle:**
   ```typescript
   // Basit bir test ekranı
   import { View, Text, Button } from 'react-native';
   import { supabase } from './lib/supabase';
   
   export default function App() {
     const testConnection = async () => {
       const { data, error } = await supabase.from('categories').select('*');
       console.log('Data:', data, 'Error:', error);
     };
     
     return (
       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
         <Text>Rezervasyon App</Text>
         <Button title="Test Connection" onPress={testConnection} />
       </View>
     );
   }
   ```

3. **Çalıştır:**
   ```bash
   npx expo start
   ```
   - QR kodu telefonunla tara (Expo Go app gerekli)
   - Veya `i` (iOS simulator) / `a` (Android emulator)

   **Telefonda "Could not connect to the server" hatası alıyorsan:** Telefon `127.0.0.1` ile bilgisayara ulaşamaz.
   - **Tunnel:** `npx expo start --tunnel` (projede `@expo/ngrok` yerel kurulu olmalı; global kurulum hatası alırsan `npm install @expo/ngrok --save-dev` yap.)
   - **LAN (aynı Wi‑Fi):** Bilgisayar ve telefon aynı Wi‑Fi’deyse `npx expo start --lan` çalıştır; terminalde çıkan `exp://192.168.x.x:8081` adresini Expo Go’da “Enter URL manually” ile gir.

### Adım 4: Admin Panel'i Kur (20 dakika)

```bash
# Yeni terminal aç (mobil app çalışırken)

# Admin panel klasörüne git
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması"

# Next.js projesi oluştur
npx create-next-app@latest admin-panel --typescript --tailwind --app --no-src-dir

# Klasöre gir
cd admin-panel

# Gerekli paketleri yükle
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
npm install zustand
npm install react-hook-form zod
npm install shadcn-ui
npm install recharts

# Environment dosyası oluştur
echo "NEXT_PUBLIC_SUPABASE_URL=your-supabase-url" > .env.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key" >> .env.local
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" >> .env.local

# .env.local dosyasını düzenle (gerçek değerleri yapıştır)
```

**İlk Dosyaları Oluştur:**

1. **Supabase Client:**
   ```typescript
   // admin-panel/lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```

2. **Login Sayfası:**
   ```typescript
   // admin-panel/app/login/page.tsx
   'use client';
   
   import { useState } from 'react';
   import { supabase } from '@/lib/supabase';
   import { useRouter } from 'next/navigation';
   
   export default function LoginPage() {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');
     const router = useRouter();
     
     const handleLogin = async (e: React.FormEvent) => {
       e.preventDefault();
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password,
       });
       
       if (data.user) {
         router.push('/dashboard');
       } else {
         alert('Login failed: ' + error?.message);
       }
     };
     
     return (
       <div className="min-h-screen flex items-center justify-center">
         <form onSubmit={handleLogin} className="space-y-4">
           <input
             type="email"
             placeholder="Email"
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             className="border p-2"
           />
           <input
             type="password"
             placeholder="Password"
             value={password}
             onChange={(e) => setPassword(e.target.value)}
             className="border p-2"
           />
           <button type="submit" className="bg-green-600 text-white p-2">
             Login
           </button>
         </form>
       </div>
     );
   }
   ```

3. **Çalıştır:**
   ```bash
   npm run dev
   ```
   - Tarayıcıda: [http://localhost:3000](http://localhost:3000)

### Adım 5: İlk Test (10 dakika)

1. **Kullanıcı Oluştur:**
   - Supabase Dashboard → "Authentication" → "Users"
   - "Add user" → Email/Password ile oluştur
   - Veya mobil app'te kayıt ol

2. **İşletme Ekle (Manuel):**
   - Supabase Dashboard → "Table Editor" → "businesses"
   - "Insert row" → Örnek işletme ekle:
     ```json
     {
       "name": "Test Restoran",
       "category_id": "kategori-uuid",
       "address": "Kadıköy, İstanbul",
       "owner_id": "user-uuid",
       "is_active": true
     }
     ```

3. **Test Et:**
   - Mobil app'te işletmeleri listele
   - Admin panel'de login ol
   - Bağlantıları kontrol et

## ✅ Kontrol Listesi

- [ ] Supabase projesi oluşturuldu
- [ ] Veritabanı şeması uygulandı
- [ ] RLS politikaları aktif
- [ ] Storage bucket oluşturuldu
- [ ] Mobil app kuruldu ve çalışıyor
- [ ] Admin panel kuruldu ve çalışıyor
- [ ] Environment variables ayarlandı
- [ ] İlk kullanıcı oluşturuldu
- [ ] İlk işletme eklendi
- [ ] Bağlantı test edildi

## 🐛 Sorun Giderme

### "Cannot connect to Supabase"
- ✅ Environment variables doğru mu kontrol et
- ✅ Supabase URL ve key'leri kontrol et
- ✅ Internet bağlantısını kontrol et

### "RLS policy violation"
- ✅ `docs/security-rbac.md` dosyasındaki politikaları uygula
- ✅ Kullanıcı rolünü kontrol et

### "Table does not exist"
- ✅ SQL script'leri sırayla çalıştırdın mı?
- ✅ Tablo isimlerini kontrol et (case-sensitive)

### Expo Go'da hata
- ✅ `npx expo start --clear` ile cache'i temizle
- ✅ Node modules'ı sil ve `npm install` tekrar yap

## 📚 Sonraki Adımlar

1. **MVP Sprint Planını Takip Et:**
   - `docs/mvp-sprint-plan.md` dosyasını aç
   - Sprint 1'den başla

2. **Ekranları Oluştur:**
   - `docs/mobile-flow.md` → Mobil ekranlar
   - `docs/admin-flow.md` → Admin ekranlar

3. **API'leri Implement Et:**
   - `docs/api-design.md` → Endpoint'leri oluştur

4. **Tasarımı Uygula:**
   - Starbucks benzeri yeşil renk paleti
   - Minimal, premium görünüm

## 💡 İpuçları

- **Her adımı test et:** Bir şey çalışmazsa bir sonraki adıma geçme
- **Git kullan:** Her önemli adımda commit yap
- **Dokümantasyonu oku:** Her dosyada detaylı bilgi var
- **Hata mesajlarını oku:** Çoğu zaman çözüm orada

## 🆘 Yardım

- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)
- **Expo Docs:** [docs.expo.dev](https://docs.expo.dev)
- **Next.js Docs:** [nextjs.org/docs](https://nextjs.org/docs)

---

**Hazırsın! 🚀 İlk adımdan başla ve adım adım ilerle.**
