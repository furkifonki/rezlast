# Sprint 4: Loyalty, Yorumlar ve Sponsorlu Sıralama

**Süre:** 2 hafta  
**Önceki sprint:** Sprint 3 (Rezervasyon) tamamlandı ✅

---

## Hedefler

- Loyalty puan sistemi (kazanma + gösterim)
- Yorum ve puan verme (mobil + admin)
- Sponsorlu sıralama (öne çıkan işletmeler)
- Temel analytics dashboard (admin)
- Profil ekranı iyileştirmeleri (mobil)
- MVP polish ve test

---

## Öncelikli Görev Listesi

### 1. Backend / Veritabanı

- [ ] **Loyalty:** `loyalty_transactions` tablosu ve RLS; puan kazanma kuralları (rezervasyon tamamlandı = X puan).
- [ ] **Reviews:** `reviews` tablosu (user_id, business_id, reservation_id, rating, comment, created_at) + RLS.
- [ ] **Sponsored:** `businesses` içinde `is_sponsored` / `sponsored_until` veya ayrı tablo; sıralama sorgusunda öncelik.
- [ ] **Analytics:** Rezervasyon sayıları, doluluk, basit raporlar için SQL/view veya RPC.

### 2. Mobil App

- [ ] **Profil:** Loyalty puanı gösterimi, puan geçmişi (isteğe bağlı).
- [ ] **Rezervasyon sonrası:** Tamamlanan rezervasyonda “Puan kazandınız” + “Yorum yaz”.
- [ ] **Yorum ekranı:** İşletme detayda yorumlar listesi; “Yorum yaz” formu (rating + metin).
- [ ] **Keşfet:** Sponsorlu işletmeler “Öne çıkan” bölümü veya listede üstte.

### 3. Admin Panel

- [ ] **Analytics dashboard:** Rezervasyon istatistikleri (günlük/haftalık), doluluk oranı, grafik (basit).
- [ ] **Yorumlar:** İşletme bazlı yorum listesi, onay/red (isteğe bağlı).
- [ ] **Sponsorlu sıralama:** İşletmeyi “Öne çıkan” yapma (süre seçimi), listede işaret.

### 4. Test & Polish

- [ ] Rezervasyon → tamamlandı → puan + yorum akışı E2E test.
- [ ] Bug fix ve küçük UI/UX iyileştirmeleri.

---

## Önerilen İlk Adımlar (Sprint başı)

1. **Şema:** `reviews` ve loyalty için tablolar + RLS migration’ları yazmak.
2. **Mobil profil:** Mevcut Profil sekmesinde kullanıcı puanı (users.total_points veya loyalty toplamı) göstermek.
3. **Rezervasyon durumu:** Admin’de “confirmed” → “completed” yapıldığında puan ekleme (trigger veya app logic).
4. **Yorum API:** İşletme detayda yorumları çekmek; “Yorum yaz” ile INSERT.

Bu dosya sprint boyunca güncellenebilir; tamamlanan maddeler [x] ile işaretlenir.
