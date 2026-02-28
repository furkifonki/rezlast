# TestFlight’a Gönderme (Rezvio iOS)

## Hızlı adımlar

### 1. Yeni build al (sürüm 2.0.0)

```bash
cd mobile-app
eas build --platform ios --profile production
```

- Build tamamlanınca EAS konsolda link verir (örn. `https://expo.dev/accounts/.../builds/...`).
- Build’in **Finished** olmasını bekle (genelde 10–25 dk).

### 2. Build’i TestFlight’a gönder

Build bittikten **hemen sonra** (yeni build’i seçerek):

```bash
cd mobile-app
eas submit --platform ios --latest --profile production
```

- `--latest`: En son **başarılı** production build’i kullanır.
- Belirli bir build’i göndermek için:  
  `eas submit --platform ios --id <BUILD_ID> --profile production`  
  (Build ID: EAS dashboard veya `eas build:list` çıktısından.)

### 3. Apple tarafında “İşleniyor” süresi

- Submit bittikten sonra build, App Store Connect’te **“İşleniyor” (Processing)** görünür.
- Bu aşama **tamamen Apple** tarafında; genelde **5–30 dakika**, bazen 1 saate kadar sürebilir.
- Süre EAS veya sizin sunucunuzla ilgili değildir; beklemek gerekir.

**Kontrol:**

1. [App Store Connect](https://appstoreconnect.apple.com) → Uygulamanız → **TestFlight** sekmesi.
2. **iOS Builds** bölümünde build’i görünce “İşleniyor” bitene kadar bekleyin.
3. “İşleniyor” bittikten sonra build’i TestFlight’a ekleyip testçilere açabilirsiniz.

---

## Sürüm bilgisi

- **Uygulama sürümü:** `app.json` → `expo.version` (şu an **2.0.0**).
- **iOS build numarası:** `app.json` → `expo.ios.buildNumber` (2.0.0 için **1**).
- Sonraki yayınlarda:
  - Sadece küçük düzeltme: `version` → `2.0.1`, `buildNumber` → `2`.
  - Büyük güncelleme: `version` → `2.1.0` veya `3.0.0`, `buildNumber` → `1` (veya artırılmış).

`eas.json` içinde `autoIncrement: true` varsa EAS, build numarasını otomatik artırabilir; buna dikkat edin.

---

## Sık karşılaşılanlar

| Durum | Ne yapmalı |
|--------|-------------|
| Build uzun sürüyor | EAS sunucusu yoğun olabilir; bekleyin veya [status.expo.dev](https://status.expo.dev) kontrol edin. |
| Submit sonrası TestFlight’ta görünmüyor | App Store Connect → TestFlight → iOS Builds’te “İşleniyor” bitene kadar bekleyin. |
| “No builds found” | Önce `eas build --platform ios --profile production` ile build alın, bittikten sonra `eas submit --latest`. |
| Farklı bir build’i göndermek | `eas build:list` ile ID’yi alın, `eas submit --id <BUILD_ID> --platform ios --profile production` kullanın. |

---

## Özet komutlar (2.0.0 için)

```bash
cd mobile-app
eas build --platform ios --profile production
# Build bittikten sonra:
eas submit --platform ios --latest --profile production
```

Ardından App Store Connect → TestFlight’ta işlemin bitmesini bekleyin.
