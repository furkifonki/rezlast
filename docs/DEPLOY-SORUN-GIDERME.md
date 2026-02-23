# Deploy Sorun Giderme

---

## Web (Admin Panel) deploy

Admin panel **Next.js**; önerilen platform **Vercel**. Tam adımlar: `docs/DEPLOY.md`.

### 1. Proje GitHub’da mı?

Vercel, projeyi GitHub/GitLab/Bitbucket üzerinden alır. Repo yoksa:

```bash
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması"
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/KULLANICI_ADI/REPO_ADI.git
git push -u origin main
```

### 2. Vercel’de Root Directory = `admin-panel`

- [vercel.com/new](https://vercel.com/new) → **Import** ile repoyu seçin.
- **Root Directory** alanına mutlaka **`admin-panel`** yazın (veya "Edit" ile açıp `admin-panel` seçin). Kök dizin proje kökü değil, sadece Next.js uygulamasının olduğu klasör olmalı.
- **Framework Preset:** Next.js (otomatik seçilir).

### 3. Environment variables

Vercel → Projeniz → **Settings** → **Environment Variables**:

| Değişken | Zorunlu | Açıklama |
|----------|--------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Evet | Supabase proje URL (örn. `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Evet | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | İsteğe bağlı | Admin işlemleri için |

Eksikse build yine çalışır ama uygulama Supabase’e bağlanamaz veya giriş çalışmaz.

### 4. Build hatası alıyorsanız

Yerelde deneyin:

```bash
cd admin-panel
npm run build
```

Yerelde build başarılı, Vercel’de başarısızsa:

- **"Cannot find module" / "Module not found"** → Root Directory’nin `admin-panel` olduğundan emin olun.
- **"Environment variable X is missing"** → Vercel’de env değişkenlerini ekleyin; Production, Preview, Development için işaretleyin.
- **Node version** → Vercel genelde uygun Node sürümünü seçer. Gerekirse `admin-panel/package.json` içine `"engines": { "node": ">=20" }` ekleyebilirsiniz.

### 5. Supabase redirect URL

Deploy sonrası canlı adres (örn. `https://xxx.vercel.app`) çıkar. Supabase’de:

- **Authentication** → **URL Configuration**
- **Site URL:** canlı admin URL’iniz
- **Redirect URLs:** `https://xxx.vercel.app`, `https://xxx.vercel.app/**` ekleyin

Aksi halde giriş/kayıt sonrası yönlendirme hata verir.

---

## Mobil (TestFlight) deploy

### "An Expo user account is required to proceed"

EAS build için önce Expo’ya giriş gerekir:

```bash
cd mobile-app
npx eas-cli login
```

Ardından: `eas build --platform ios --profile production`

### CI / otomatik deploy (opsiyonel)

`EXPO_TOKEN` ile: expo.dev → Account → Access Tokens; token’ı env’e ekleyin.

### Diğer sık hatalar (mobil)

| Hata | Çözüm |
|------|--------|
| **Bundle ID uyuşmazlığı** | `app.json` → `ios.bundleIdentifier` ile Apple’daki App ID aynı olmalı. |
| **App-Specific Password** | [appleid.apple.com](https://appleid.apple.com) → App-Specific Passwords ile şifre oluşturup EAS’e verin. |

TestFlight adımları: `docs/TESTFLIGHT-YAYIN.md`
