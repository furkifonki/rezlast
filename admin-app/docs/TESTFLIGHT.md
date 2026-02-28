# TestFlight’a Gönderme (Rezvio Admin)

**Rezvio Admin**, müşteri uygulaması **Rezvio**’dan tamamen ayrı bir uygulamadır. Aynı Apple Developer / App Store Connect hesabını kullanırsınız; App Store Connect’te **yeni bir uygulama** olarak tanımlanır (karışıklık olmasın).

## Önemli farklar

| | Rezvio (müşteri) | Rezvio Admin |
|---|------------------|---------------|
| **Klasör** | `mobile-app` | `admin-app` |
| **Bundle ID (iOS)** | `com.rezervio.app` | `com.rezervio.admin` |
| **Uygulama adı** | Rezvio | Rezvio Admin |
| **App Store Connect** | Ayrı uygulama kaydı | Ayrı uygulama kaydı |

---

## 1. İlk kez: EAS projesi ve App Store Connect

### 1.1 EAS projesini bağla

```bash
cd admin-app
eas init
```

- “Create a new project” seçin (Rezvio Admin için **yeni** bir EAS projesi).
- İşlem bitince `app.json` içine `extra.eas.projectId` eklenir.

### 1.2 App Store Connect’te yeni uygulama

1. [App Store Connect](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**.
2. **Platform:** iOS.
3. **Name:** Rezvio Admin.
4. **Bundle ID:** `com.rezervio.admin` (Xcode/Developer hesabında bu bundle ID’yi oluşturmuş olmalısınız).
5. **SKU:** örn. `rezvio-admin`.

Bunu sadece ilk kez yaparsınız. Sonraki build’lerde aynı uygulama kaydına gidecektir.

---

## 2. iOS build al

```bash
cd admin-app
eas build --platform ios --profile production
```

- Build tamamlanınca EAS konsolda link verir.
- **Finished** olana kadar bekleyin (yaklaşık 10–25 dk).

---

## 3. Build’i TestFlight’a gönder

Build **Finished** olduktan sonra:

```bash
cd admin-app
eas submit --platform ios --latest --profile production
```

- `--latest`: En son başarılı production build kullanılır.
- Belirli build için:  
  `eas submit --platform ios --id <BUILD_ID> --profile production`  
  (Build ID: EAS dashboard veya `eas build:list`.)

---

## 4. Apple tarafında “İşleniyor”

- Submit sonrası build, App Store Connect’te **TestFlight** → **iOS Builds** altında **“İşleniyor” (Processing)** görünür.
- Bu süre tamamen Apple tarafındadır; genelde 5–30 dk, bazen 1 saate kadar sürebilir.
- İşleniyor bittikten sonra build’i TestFlight’ta testçilere açabilirsiniz.

---

## Sürüm bilgisi

- **Uygulama adı:** Rezvio Admin (`app.json` → `expo.name`).
- **Sürüm:** `app.json` → `expo.version` (şu an **1.0.0**).
- **iOS build numarası:** `app.json` → `expo.ios.buildNumber` (şu an **1**).
- `eas.json` içinde `autoIncrement: true` ile EAS build numarasını otomatik artırabilir.

---

## Özet komutlar (Rezvio Admin)

```bash
cd admin-app

# İlk kez (EAS projesi yoksa):
eas init

# Build + TestFlight
eas build --platform ios --profile production
# Build bittikten sonra:
eas submit --platform ios --latest --profile production
```

Ardından App Store Connect → **Rezvio Admin** uygulaması → TestFlight’ta işlemin bitmesini bekleyin.
