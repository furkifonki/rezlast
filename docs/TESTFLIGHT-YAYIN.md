# TestFlight ile iOS Yayınlama Rehberi

Apple Developer üyeliğiniz var. Uygulamayı TestFlight’a almak için aşağıdaki adımları izleyin.

---

## 1. Ön hazırlık

### 1.1 Bundle ID (Uygulama kimliği)

- `mobile-app/app.json` içinde `ios.bundleIdentifier` tanımlı: **`com.rezervasyonuygulamasi.app`**
- İsterseniz kendi domain’inize göre değiştirin (örn. `com.sirketadi.rezervasyon`). Değiştirirseniz aşağıda App ID’yi de aynı isimle oluşturmalısınız.

### 1.2 EAS CLI

Proje kökünde (veya `mobile-app` içinde):

```bash
npm install -g eas-cli
eas login
```

Expo hesabınızla giriş yapın (yoksa expo.dev üzerinden ücretsiz oluşturun).

### 1.3 Projeyi EAS’e bağlama

`mobile-app` klasöründe:

```bash
cd mobile-app
eas build:configure
```

Zaten `eas.json` varsa bu adım sadece kontrol için. Proje Expo’ya bağlı değilse `eas init` ile bağlayın.

---

## 2. Apple Developer tarafı

### 2.1 App ID oluşturma

1. [developer.apple.com](https://developer.apple.com) → **Account** → **Certificates, Identifiers & Profiles**
2. **Identifiers** → **+** → **App IDs** → **App**
3. **Description:** Örn. "Rezervasyon Uygulaması"
4. **Bundle ID:** **Explicit** seçin, `com.rezervasyonuygulamasi.app` yazın (veya `app.json`’daki ile birebir aynı)
5. Gerekli capability’leri işleyin (Push, Sign in with Apple vb. kullanacaksanız)
6. **Register**

### 2.2 EAS’e Apple hesabını bağlama

`mobile-app` içinde:

```bash
eas credentials
```

- **iOS** seçin
- "Set up a new Apple distribution certificate" / "Log in to your Apple account" benzeri seçenekle Apple ID’nizi (Developer hesabı) ve gerekirse App-Specific Password girin. EAS, sertifika ve provisioning’i kendisi yönetir.

İlk kez yapıyorsanız:

```bash
eas build --platform ios --profile production
```

komutunda EAS sizden Apple girişi isteyebilir; orada da bağlayabilirsiniz.

---

## 3. iOS build (production)

`mobile-app` klasöründe:

```bash
cd mobile-app
eas build --platform ios --profile production
```

- Expo’da proje seçin / oluşturun
- Apple ID ile giriş istenirse Developer hesabınızı kullanın
- Build kuyruğa alınır; tamamlanması 10–25 dakika sürebilir
- Bittiğinde **Build details** sayfasında `.ipa` indirme linki çıkar

---

## 4. TestFlight’a gönderme

### 4.1 App Store Connect’te uygulama kaydı

1. [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → **My Apps** → **+** → **New App**
2. **Platform:** iOS  
3. **Name:** Uygulama adı (örn. "Rezervasyon")
4. **Primary Language:** Türkçe (veya tercih ettiğiniz dil)
5. **Bundle ID:** Açılır listeden **`com.rezervasyonuygulamasi.app`** seçin (yoksa 2.1’de oluşturduğunuz Bundle ID’yi ekleyin)
6. **SKU:** Benzersiz bir kod (örn. `rezervasyon-ios-001`)
7. **Create**

### 4.2 Build’i TestFlight’a yükleme

**Yöntem A – EAS Submit (önerilen):**

Build bittikten sonra:

```bash
eas submit --platform ios --latest --profile production
```

- **Latest** son production build’i kullanır
- Apple ID / App-Specific Password istenirse Developer hesabı bilgilerinizi girin
- Uygulama seçin (App Store Connect’te oluşturduğunuz)
- Yükleme tamamlanınca App Store Connect’te **TestFlight** sekmesinde build “Processing” görünür; 5–15 dakika sonra “Ready to Submit” / test için hazır olur.

**Yöntem B – Manuel (Transporter):**

1. [Build details](https://expo.dev) sayfasından `.ipa` dosyasını indirin
2. Mac’e **Transporter** uygulamasını yükleyin (App Store’dan)
3. Transporter’da `.ipa` dosyasını sürükleyip yükleyin; Apple ID ile giriş yapın
4. Aynı şekilde TestFlight’ta işlenir

---

## 5. TestFlight’ta test

1. **App Store Connect** → Uygulamanız → **TestFlight** sekmesi
2. Build işlendikten sonra **Internal Testing** veya **External Testing** bölümünde build’i seçin
3. **Internal Testing:** Aynı ekibeki kullanıcılar (App Store Connect kullanıcıları) e-posta ile davet alır
4. **External Testing:** Test grubu oluşturup Beta App Review’a gönderin; onay sonrası davetliler TestFlight uygulamasından indirir

Test cihazında:

- App Store’dan **TestFlight** uygulamasını yükleyin
- Davet e-postasındaki linke tıklayın veya TestFlight içinde daveti kabul edin
- Uygulama TestFlight listesinde görünür; **Install** ile kurun

---

## Özet komutlar (mobile-app içinde)

```bash
# 1. EAS giriş
eas login

# 2. iOS production build
eas build --platform ios --profile production

# 3. Build bittikten sonra TestFlight’a gönder
eas submit --platform ios --latest --profile production
```

---

## Sık karşılaşılan noktalar

- **Bundle ID uyuşmazlığı:** `app.json`’daki `ios.bundleIdentifier` ile Apple’da oluşturduğunuz App ID birebir aynı olmalı.
- **App-Specific Password:** İki adımlı doğrulama açıksa EAS/Transporter için [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords ile şifre oluşturun.
- **İkon / splash:** `app.json`’da `icon` ve `splash` yolları doğru olmalı; eksikse build uyarı verebilir veya varsayılan kullanılır.
- **Sürüm / build numarası:** `eas.json`’da `production.autoIncrement: true` var; her production build’de build numarası otomatik artar.

Bu rehberi takip ederek uygulamanızı TestFlight’ta yayınlayabilirsiniz. Belirli bir adımda hata alırsanız hata çıktısı veya ekran görüntüsü paylaşırsanız bir sonraki adımı birlikte netleştirebiliriz.
