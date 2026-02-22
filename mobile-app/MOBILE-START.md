# Mobil uygulamayı başlatma

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
