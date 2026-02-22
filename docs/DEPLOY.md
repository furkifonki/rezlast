# Deploy Rehberi: Website (Admin Panel) + TestFlight (Mobil App)

Bu dokümanda **admin panelini** canlıya almak ve **mobil uygulamayı TestFlight** ile test etmek için gereken adımlar özetlenir.

---

## 1. Website (Admin Panel) deploy

Admin panel **Next.js** ile yazıldığı için en pratik seçenek **Vercel**’dir (ücretsiz katman yeterli olabilir).

### Gereksinimler

- GitHub / GitLab / Bitbucket hesabı (proje repo’da olmalı)
- Vercel hesabı: [vercel.com](https://vercel.com) → Sign up (GitHub ile giriş yapabilirsiniz)

### Adımlar

1. **Projeyi Git’e atın** (henüz yoksa):
   ```bash
   cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması"
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
   git push -u origin main
   ```

2. **Vercel’e giriş yapın** → [vercel.com/new](https://vercel.com/new)

3. **Import Project** ile repoyu seçin.  
   **Root Directory** olarak **`admin-panel`** klasörünü seçin (tüm proje değil, sadece Next.js uygulaması).

4. **Environment Variables** ekleyin (Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL` = Supabase proje URL’iniz
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Supabase anon key
   - (Opsiyonel) `SUPABASE_SERVICE_ROLE_KEY` = Service role key (admin işlemleri için)

5. **Deploy**’a tıklayın. Build bittikten sonra site `https://xxx.vercel.app` adresinde yayında olur.

### Alternatif: Netlify

- Netlify’da “Add new site → Import project” ile repoyu seçin.
- Base directory: `admin-panel`
- Build command: `npm run build`
- Publish directory: `admin-panel/.next` değil; Netlify Next.js’i otomatik tanır, “Next.js” runtime seçin.
- Aynı env değişkenlerini Netlify → Site settings → Environment variables içinde tanımlayın.

### Önemli

- `.env.local` dosyasını **repo’ya eklemeyin** (gizli bilgi). Sadece Vercel/Netlify üzerinde Environment Variables kullanın.
- Supabase’de **Authentication → URL Configuration** içinde “Site URL” ve “Redirect URLs” kısmına canlı admin URL’inizi ekleyin (örn. `https://xxx.vercel.app`).

---

## 2. Mobil uygulamayı TestFlight’a göndermek

TestFlight ile **iOS** cihazlarda beta test yapılır. **Expo (EAS)** kullanarak build alıp Apple’a yükleyebilirsiniz.

### Gereksinimler

| Gereksinim | Açıklama |
|------------|----------|
| **Apple Developer Program** | [developer.apple.com](https://developer.apple.com) — yıllık **99 USD**. TestFlight için zorunlu. |
| **Expo (EAS) hesabı** | [expo.dev](https://expo.dev) — ücretsiz. Build için gerekli. |
| **Mac** | iOS build’i EAS sunucuda alınır; lokal Mac zorunlu değil. |

### 2.1 Apple Developer hesabı

1. [developer.apple.com/programs/enroll](https://developer.apple.com/programs/enroll) → Enroll.
2. Apple ID ile giriş, ödeme bilgisi, sözleşme onayı.
3. Onay birkaç gün sürebilir.

### 2.2 EAS CLI ve giriş

```bash
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/mobile-app"
npm install -g eas-cli
eas login
```

(Expo hesabı yoksa [expo.dev](https://expo.dev) üzerinden oluşturun.)

### 2.3 EAS projesi ve ilk yapılandırma

```bash
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/mobile-app"
eas build:configure
```

Bu komut `eas.json` oluşturur/günceller. Sorulursa **iOS** seçin.

### 2.4 Ortam değişkenleri (Supabase)

Build’in doğru Supabase’e bağlanması için:

- **expo.dev** → Projenizi seçin → **Project settings** → **Environment variables**
- `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` ekleyin (production için).

Veya yerel `.env` dosyanızı kullanarak:  
`eas build --platform ios --profile production --env-file .env`

### 2.5 iOS build (TestFlight’a yüklenecek)

```bash
eas build --platform ios --profile production
```

(İlk seferde Apple Developer hesabı ve App Store Connect’te uygulama bağlantısı için birkaç soru sorulur; ekrandaki yönlendirmeleri takip edin.)

Build EAS sunucuda tamamlanır. Bittiğinde **.ipa** dosyası hazır olur.

### 2.6 TestFlight’a otomatik gönderme (EAS Submit)

Build bittikten sonra:

```bash
eas submit --platform ios --profile production
```

Komut en son **production** iOS build’i alıp App Store Connect’e yükler. Birkaç dakika sonra **App Store Connect → TestFlight** sekmesinde build görünür; buradan test kullanıcıları ekleyebilirsiniz.

### 2.7 App Store Connect’te uygulama

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**.
2. Platform: iOS, isim, dil, bundle ID (EAS ilk build’de sormuş olabilir; aynı bundle ID kullanılmalı).
3. **TestFlight** sekmesi → build yüklendikten sonra build seçilir, “Provide Export Compliance” vb. bilgiler doldurulur.
4. **Internal Testing** veya **External Testing** grubu oluşturup e-posta ile davet gönderilir; davetliler TestFlight uygulamasından indirip test eder.

### Özet komutlar (TestFlight akışı)

```bash
cd mobile-app
eas login
eas build:configure          # ilk kez
eas build --platform ios --profile production
# Build bitince:
eas submit --platform ios --profile production
```

### Faydalı linkler

- **EAS Build:** [docs.expo.dev/build/introduction](https://docs.expo.dev/build/introduction/)
- **EAS Submit (TestFlight):** [docs.expo.dev/submit/ios](https://docs.expo.dev/submit/ios/)
- **Apple Developer:** [developer.apple.com](https://developer.apple.com)
- **App Store Connect:** [appstoreconnect.apple.com](https://appstoreconnect.apple.com)

---

## 3. Kısa kontrol listesi

**Website (admin panel)**  
- [ ] Repo GitHub/GitLab’da  
- [ ] Vercel’de proje import, root = `admin-panel`  
- [ ] `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (ve gerekirse `SUPABASE_SERVICE_ROLE_KEY`) tanımlı  
- [ ] Supabase’de redirect URL’lere canlı admin adresi eklendi  

**TestFlight (mobil app)**  
- [ ] Apple Developer Program üyeliği (99 USD/yıl)  
- [ ] Expo hesabı + `eas login`  
- [ ] `eas build:configure` + `eas build --platform ios --profile production`  
- [ ] `eas submit --platform ios --profile production`  
- [ ] App Store Connect’te uygulama + TestFlight’ta testçi daveti  

Bu rehberi takip ederek hem website’i deploy edebilir hem de mobil uygulamayı TestFlight üzerinden test edebilirsiniz.
