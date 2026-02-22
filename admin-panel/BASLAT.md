# Admin Panel Nasıl Başlatılır?

## Adımlar

1. **Terminal açın** (VS Code içinde Terminal → New Terminal veya Mac’te Terminal uygulaması).

2. **Admin panel klasörüne girin:**
   ```bash
   cd "/Users/furkanaydemir/Documents/Furkan/Rezervasyon Uygulaması/admin-panel"
   ```

3. **Sunucuyu başlatın:**
   ```bash
   npm run dev
   ```

4. **Terminalde şuna benzer bir satır göreceksiniz:**
   ```
   ▲ Next.js 16.x.x
   - Local:    http://localhost:3000
   ```
   (Port 3000 doluysa 3001 veya 3002 yazabilir; terminalde yazan adresi kullanın.)

5. **Tarayıcıda bu adresi açın:**  
   Terminalde yazan **Local** adresini kopyalayıp tarayıcıya yapıştırın (örn. `http://localhost:3000`).

6. **Puan İşlemleri sayfası:**  
   Giriş yaptıktan sonra sol menüden **Puan İşlemleri**’ne tıklayın veya doğrudan şu adresi açın:  
   `http://localhost:3000/dashboard/loyalty`  
   (Port farklıysa, `localhost:XXXX` kısmını terminalde yazan porta göre değiştirin.)

---

**Önemli:** `npm run dev` çalışırken **terminal penceresini kapatmayın**. Kapatırsanız sunucu durur ve "Bu siteye ulaşılamıyor" hatası alırsınız. Durdurmak için terminalde `Ctrl+C` yapın.
