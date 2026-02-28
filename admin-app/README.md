# Rezvio Admin (Mobil)

Web admin panelinin aynı işlevselliğe sahip mobil uygulaması. Aynı Supabase ve veritabanını kullanır.

## Kurulum

1. Bağımlılıkları yükleyin:
   ```bash
   cd admin-app
   npm install
   ```

2. Ortam değişkenlerini ayarlayın:
   - `.env.example` dosyasını `.env` olarak kopyalayın.
   - `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerini admin-panel veya mobile-app ile aynı Supabase projesinden alın.

3. Assets (ikon ve splash):
   - `app.json` içinde `./assets/icon.png` ve `./assets/splash-icon.png` kullanılır.
   - Bu dosyaları `mobile-app/assets` klasöründen kopyalayabilir veya kendi ikonlarınızı ekleyebilirsiniz.
   - Eksikse Expo varsayılan ikonla çalışır; production build için ikon gerekir.

4. Çalıştırma:
   ```bash
   npx expo start --port 8084
   ```
   iOS simülatör: `i` | Android: `a`

## Özellikler

- **Giriş / Kayıt / Şifremi unuttum:** Supabase Auth (web panel ile aynı hesaplar).
- **Ana Sayfa:** İşletme sayısı, rezervasyon istatistikleri, son rezervasyonlar.
- **İşletmelerim:** Listeleme ve detay (düzenleme web panelinde).
- **Rezervasyonlar:** Aktif / Geçmiş / İptal sekmeleri, detay görüntüleme.
- **Mesajlar:** Konuşma listesi ve okunmamış sayısı.
- **Gelir:** Tarih aralığına göre gelir listesi ve toplam.
- **Yorumlar:** İşletme yorumları listesi.
- **Öne Çıkan / Hizmetler / Masa Planı:** Listeleme (CRUD web panelinde).
- **Puan İşlemleri:** Bilgi; işlem web panelinde.
- **Bildirim gönder:** Push bildirimi (başlık + mesaj), Expo push API ile tüm cihazlara.

## Teknik

- Expo SDK 54, React Navigation (Drawer + Stack).
- Supabase JS client + AsyncStorage ile oturum.
- Web panel ile aynı dil (Türkçe) ve aynı renk/buton stilleri (yeşil vurgu, zinc gri).
