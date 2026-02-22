# Loyalty (Puan) Sistemi – Mantık ve Test

## Nasıl Çalışır?

1. **Puan kazanımı:** Bir rezervasyon **tamamlandığında** (Admin panelde durum **Tamamlandı** yapıldığında) kullanıcıya otomatik puan eklenir.
2. **Miktar (öncelik sırası):**
   - Rezervasyonda **hizmet** seçilmişse → **Hizmet bazlı kural** (`service_loyalty_rules`): Admin panelde **Hizmetler → [Hizmet] Düzenle** içindeki “Tamamlanan randevuda verilecek puan” alanı.
   - Yoksa işletme bazlı **loyalty_rules** (varsa).
   - Hiçbiri yoksa **varsayılan 10 puan**.
3. **Kayıt:** `loyalty_transactions` tablosuna satır eklenir; `users.total_points` tetikleyici ile güncellenir.
4. **Manuel puan:** Admin panel **Puan İşlemleri** ile müşteriye puan eklenebilir veya düşülebilir (sadece kendi işletmenizin rezervasyon yapan müşterileri).

## Veritabanı

- **users:** `total_points`, `loyalty_level`.
- **loyalty_transactions:** Tüm hareketler (earned, manual_add, manual_deduct).
- **service_loyalty_rules:** Hizmet bazlı puan (her hizmet için tamamlanan randevuda verilecek puan; sadece işletme sahibi kendi hizmetleri için düzenler).
- **loyalty_rules:** İşletme bazlı kural (opsiyonel; hizmet kuralı yoksa kullanılır).

## Nasıl Test Edilir?

1. **Migration’ların uygulu olduğundan emin olun (Supabase SQL Editor):**
   - `create-loyalty-reviews-sponsored-tables.sql` (loyalty_transactions, loyalty_rules)
   - `reservations` tablosunda `loyalty_points_earned` sütunu yoksa:  
     `ALTER TABLE reservations ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0;`
   - `rls-reservations-admin-update.sql` (Admin’in rezervasyon durumunu güncelleyebilmesi ve **Tamamlandı** seçebilmesi için)
   - `create-service-loyalty-rules.sql` (hizmet bazlı puan tablosu)
   - `rls-service-loyalty-rules.sql`
   - `rls-loyalty-reviews-sponsored.sql`
   - `trigger-loyalty-on-reservation-completed.sql` (önce hizmet, sonra işletme kuralı, yoksa 10 puan)
   - `trigger-loyalty-transactions-update-user-points.sql` (her puan hareketinde `users.total_points` güncellenir; manuel ekleme/düşme dahil)

2. **Rezervasyon oluşturun:** Mobil uygulamadan bir işletmede rezervasyon yapın (giriş yapmış kullanıcı ile).

3. **Rezervasyonu tamamlayın:** Admin panel → **Rezervasyonlar** → ilgili rezervasyona tıklayın → **Onaylandı** ise **Tamamlandı** butonuna basın (liste sayfasında da “Tamamlandı” butonu vardır).

4. **Puanları kontrol edin:**
   - Mobil uygulama → Profil: “Toplam puan” ve “Puan geçmişi” güncellenmiş olmalı.
   - Supabase → `users` tablosunda ilgili kullanıcının `total_points` değeri artmış olmalı.
   - `loyalty_transactions` tablosunda yeni bir “earned” kaydı görünmeli.

## Hizmet Bazlı Puan (Önerilen)

Admin panel → **Hizmetler** → bir hizmete tıklayıp **Düzenle** → **Tamamlanan randevuda verilecek puan** alanına değer girin (örn. 15) → Kaydet. O hizmet için yapılan ve “Tamamlandı” işaretlenen randevularda müşteriye bu puan verilir. Sadece kendi işletmenizin hizmetleri için bu alan düzenlenebilir.

## İşletme Bazlı Puan (Hizmet kuralı yoksa)

Hizmet bazlı kural yoksa, işletme geneli için `loyalty_rules` kullanılır (Supabase’den veya ileride admin UI’dan eklenebilir). Varsayılan 10 puan hiçbiri yoksa uygulanır.

## Manuel Puan Ekleme / Düşme

Admin panel → **Puan İşlemleri** → İşletme seçin → Rezervasyon yapmış bir müşteri seçin → Puan (pozitif = ekleme, negatif = düşme) ve isteğe bağlı açıklama girin → Uygula. Toplam puan otomatik güncellenir; müşteri mobil uygulamada Profil’de görür.

## Keşfet Filtreleri (Kategori vs Hizmet)

Ana sayfadaki filtreler (**Tümü**, **Restoran**, **Berber**, **Güzellik**) **kategori** (`categories` / `businesses.category_id`) ile çalışır; doğru işletmeleri getirir. Admin panelde tanımlanan **hizmetler** (`services`) işletme bazlıdır: Rezervasyon ekranında her işletmenin kendi hizmetleri (örn. Saç Kesimi, Sakal) listelenir. Yani kategori filtresi liste sonucunu, hizmetler ise seçilen işletmenin rezervasyon seçeneklerini belirler.

---

## Özet

| Adım | Ne yapılır |
|------|-------------|
| Rezervasyon | Kullanıcı mobilde rezervasyon yapar |
| Admin | Rezervasyon detayında veya listede “Tamamlandı” butonuna basar |
| RLS | `rls-reservations-admin-update.sql` ile işletme sahibi rezervasyonu güncelleyebilir |
| Trigger | `trg_reservation_completed_loyalty` (hizmet / işletme kuralı veya 10 puan) + `trg_loyalty_transaction_insert_user` (users.total_points) |
| Sonuç | Puan `loyalty_transactions`’a yazılır, `users.total_points` güncellenir |
| Mobil | Profil ekranında puan ve geçmiş görünür |
