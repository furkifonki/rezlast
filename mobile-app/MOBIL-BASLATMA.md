# Mobil uygulama başlatma (Expo Go – fiziksel telefon)

## Neden "Could not connect to the server" alıyorum?

Telefonda açılan adres **`exp://127.0.0.1:8084`** ise bağlantı **asla** çalışmaz.  
**127.0.0.1** telefonda “telefonun kendisi” demektir; bilgisayardaki Metro’ya ulaşamaz.  
Bilgisayarın **yerel ağ IP’si** (örn. 192.168.1.5) kullanılmalı.

---

## Adım adım (fiziksel telefon)

### 1. Bilgisayar ve telefon aynı Wi‑Fi’de olsun

İkisi de aynı ağda olmalı (aynı modem/router).

### 2. Expo’yu LAN modunda başlatın

Terminalde:

```bash
cd mobile-app
npm run start:lan
```

veya:

```bash
cd mobile-app
npx expo start --lan
```

`--lan` sayesinde terminaldeki **QR kod** ve **URL** bilgisayarın IP’si ile gelir (örn. `exp://192.168.1.5:8081`).

### 3. Expo Go’da 127.0.0.1 projesini kapatın

- Expo Go’yu açın.
- **“Go Home”** veya **“Projeler”** ekranına gidin.
- **127.0.0.1** veya **localhost** ile açılmış projeyi **kaldırın / silin** (varsa).
- Bu adresten bir daha açmayın.

### 4. Sadece QR kodu kullanın

- Terminalde Metro çalışırken çıkan **QR kodu** telefonda **Expo Go** ile tarayın.
- Uygulama `exp://192.168.x.x:8081` gibi bir adresle açılacaktır; bu doğru.

Manuel adres girecekseniz terminalde yazan **LAN URL’sini** (örn. `exp://192.168.1.5:8081`) kullanın; **127.0.0.1** yazmayın.

### 5. Hâlâ bağlanmıyorsa

- Bilgisayar firewall’unda **8081** (veya kullandığınız port) kapalı olmasın.
- VPN bilgisayar veya telefonda açıksa **kapatıp** tekrar deneyin.
- `npm run start:lan` ile yeniden başlatıp **tekrar QR kodu** tarayın.

---

## Özet komut (telefon için)

```bash
cd mobile-app
npm run start:lan
```

Ardından Expo Go’da **sadece çıkan QR kodu** tarayın; 127.0.0.1 ile açmayın.

---

## iOS Simulator kullanıyorsanız

- `npx expo start` yeterli.
- Metro açıldıktan sonra terminalde **`i`** tuşuna basın; uygulama simulator’da açılır.
