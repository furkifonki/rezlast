# Mobil uygulamayı başlatma

## Hızlı başlatma (önce bunu deneyin)

1. **Terminali açın** ve şunu yazın:
   ```bash
   cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/mobile-app"
   npm run start:lan
   ```
2. Birkaç saniye sonra **"Waiting on http://localhost:8083"** ve bir **QR kodu** görmelisiniz.
3. **Telefonda:** Expo Go uygulamasını açın, QR kodu tarayın. **Bilgisayarda:** Aynı terminalde `a` (Android emülatör) veya `i` (iOS simülatör) tuşuna basın.

**macOS’ta çift tıklama:** `mobile-app` klasöründeki **`baslat-mobil.command`** dosyasına çift tıklayın (ilk seferde Terminal’in açılmasına izin verin).

Varsayılan port artık **8083**; 8081 meşgul olsa bile sunucu başlar.

---

## ConfigError: "The expected package.json path ... does not exist"

Expo **mutlaka `mobile-app` klasörü içinden** çalıştırılmalı. Proje kökünde (Rezervasyon Uygulaması) değil.

**Doğru yöntem:**

1. Terminali açın ve **önce** `mobile-app` klasörüne girin:
   ```bash
   cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/mobile-app"
   ```
2. Sonra Expo'yu başlatın:
   ```bash
   npm start
   ```
   veya ağ üzerinden (telefonda test için):
   ```bash
   npm run start:lan
   ```

**Proje kökünden başlatmak isterseniz** (yine `mobile-app` çalışır):
```bash
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması"
npm run mobile
```
veya `npm start` (kök package.json’daki `start` script’i mobil uygulamayı açar).

---

## "Port 8081 is running" / "Skipping dev server" hatası

Expo başka bir pencerede çalışıyorsa veya 8081 meşgulse: `npm run start:port` veya `npm run start:lan:port` (port 8083) kullanın.

---

## "Cannot determine Expo SDK version / expo is not installed" hatası

Aşağıdakileri **sırayla** uygulayın (terminali her seferinde `mobile-app` klasöründe açın).

### 1. Doğru klasöre girin
```bash
cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/mobile-app"
```

### 2. Expo’yu açıkça kurun
```bash
npm install expo@54.0.33 --save
npm install
```

### 3. `npx expo` yerine `npm run` ile başlatın
```bash
npm run start:lan
```
Böylece projedeki yerel Expo kullanılır; global veya yanlış sürüm devreye girmez.

### 4. Hata sürerse önbelleği temizleyin
```bash
npm run start:lan:clear
```

### 5. Port 8081 meşgulse
Başka bir pencerede Expo/React Native çalışıyorsa kapatın veya farklı port kullanın:
```bash
npx expo start --lan --port 8082
```

### 6. Hiçbiri işe yaramazsa: temiz kurulum
Terminalde `mobile-app` içindeyken:
```bash
rm -rf node_modules package-lock.json
npm install
npm run start:lan
```
(`rm -rf` bazı sistemlerde “Operation not permitted” verebilir; o zaman node_modules’ü manuel silip tekrar `npm install` deneyin.)

---

## Admin’de eklenen fotoğraflar uygulamada görünmüyorsa

Bunun en sık nedeni Supabase’de `business_photos` tablosu için “herkes okuyabilsin” RLS politikasının ekli olmamasıdır. Adım adım çözüm için:

- **[docs/PHOTOS-IN-APP.md](../docs/PHOTOS-IN-APP.md)** — Bu rehberi takip edin (RLS + Storage public bucket).
