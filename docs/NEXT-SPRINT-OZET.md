# Sıradaki Sprint – Özet ve Öneriler

**Son durum:** Sprint 4 (Loyalty, Yorumlar, Sponsorlu) ve sonrasında birçok özellik tamamlandı; paralel olarak uygunluk, ETK, puan/müşteri listesi, güzellik salonu gibi iyileştirmeler yapıldı. Sprint planından biraz sapma var ama temel MVP akışları çalışır durumda.

---

## Şu Ana Kadar Tamamlananlar (Özet)

### Sprint 1–3
- Auth (kayıt, giriş, KVKK/ETK)
- İşletme CRUD, çalışma saatleri, kapanış günleri
- Rezervasyon akışı (tarih/saat, masa/harita, hizmet, kişi sayısı)
- Uygunluk: `get_available_tables`, `get_available_slots_for_date` (masa yoksa tüm slotlar; client fallback)
- Rezervasyonlarım, admin rezervasyon yönetimi, masa planı, hizmetler

### Sprint 4 + Ek İyileştirmeler
- **Loyalty:** Puan kazanma (rezervasyon tamamlandı), profil puanı, puan geçmişi, admin manuel puan ekleme/çıkarma, müşteri bakiyesi (sadece henüz geçmemiş rezervasyonu olanlar)
- **Yorumlar:** Admin reviews sayfası (listeleme vb.)
- **Sponsorlu:** Öne çıkan işletmeler (Keşfet + admin)
- **Profil:** Ad/soyad zorunlu, ETK izinleri, KVKK/ETK metinleri
- **Deploy:** Web (Vercel) + TestFlight dokümantasyonu
- **Diğer:** Favori butonu vurgusu, güzellik salonu uygunluk (client fallback), çoklu rezervasyon (aynı gün farklı işletme) dokümantasyonu

---

## Next Sprint İçin Önerilen Başlıklar

Planla uyumlu ve değer katacak işler; öncelik sırasına göre kısaca:

### 1. Analytics Dashboard (Admin)
- **Hedef:** İşletme sahibi rezervasyon ve doluluk verisini görsün.
- **İçerik:** Günlük/haftalık/aylık rezervasyon sayısı, basit doluluk oranı, (opsiyonel) saat bazlı yoğunluk grafiği.
- **Not:** `docs/SPRINT-SCOPE.md` ve MVP planında var; henüz tam yok.

### 2. Yorumlar – Mobil Taraf
- **Hedef:** Kullanıcı işletme detayda yorumları görsün, rezervasyon sonrası yorum yazabilsin.
- **İçerik:** İşletme detayda yorum listesi + ortalama puan; “Yorum yaz” (rating + metin), sadece tamamlanmış rezervasyonu olan kullanıcı yazabilsin.
- **Not:** Backend/reviews tablosu ve admin tarafı büyük ölçüde hazır; eksik olan mobil UI ve akış.

### 3. Bildirimler (Temel)
- **Hedef:** Rezervasyon onay/iptal vb. için kullanıcıya bilgi gitsin.
- **İçerik:** E-posta (Supabase Auth / SMTP) veya push (Expo); “Rezervasyonunuz onaylandı” / “İptal edildi” gibi tetikleyiciler.
- **Not:** MVP planında vardı; şu an tam yok.

### 4. Test & Polish
- **Hedef:** MVP’yi daha stabil ve anlaşılır hale getirmek.
- **İçerik:** Kritik akışlar için E2E veya manuel test senaryoları, bilinen bug’ların kapatılması, form validasyonu, boş/loading state’ler, küçük UI/UX düzenlemeleri.

### 5. Alan / Masa Yönetimi İyileştirmesi
- **Hedef:** Sadece “masa” değil, alan tipi (Teras, VIP, Bar vb.) ve (opsiyonel) floor plan hissi.
- **İçerik:** Mevcut `table_type` kullanımının netleştirilmesi; admin’de alan tipi seçimi; mobilde alan tipine göre filtreleme/gösterim.
- **Not:** `SPRINT-SCOPE.md` içinde “Masa & Alan Yönetimi” olarak geçiyor.

### 6. Dokümantasyon ve Operasyon
- **Hedef:** Yeni geliştirici veya iş ortağı projeye hızlı girsin.
- **İçerik:** README güncellemesi, migration listesi (hangi SQL hangi sırada), ortam değişkenleri, Supabase redirect URL’leri, kısa “release checklist”.

---

## Önerilen Sprint Hedefi (Tek Cümle)

**“Analytics dashboard + mobil yorum akışı + test/polish”**  
veya  
**“Bildirimler (e-posta) + mobil yorumlar + analytics”**  
şeklinde 2–3 ana başlık seçip 2 haftalık sprint hedefi yapılabilir.

---

## Referans Dosyalar

- `docs/mvp-sprint-plan.md` – 8 haftalık MVP planı
- `docs/SPRINT-4-KICKOFF.md` – Sprint 4 görev listesi
- `docs/SPRINT-SCOPE.md` – Loyalty, reviews, sponsored, analytics, polish kapsamı

Bu dosya sprint öncesi/sırasında güncellenebilir; tamamlanan maddeler işaretlenebilir.
