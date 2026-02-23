# Rezvio – Logo ve yasal migration

## Logo

- **Mobil uygulama:** Uygulama ikonu `mobile-app/assets/icon.png` olarak kullanılıyor. Rezvio logosunu bu dosyayla değiştirdiyseniz build’de yansır. İsterseniz aynı logoyu `splash-icon.png`, `adaptive-icon.png`, `favicon.png` için de kullanabilirsiniz.
- **Admin panel:** Sidebar’da logo `admin-panel/public/logo.png` dosyasından yüklenir. Logo bu yolu kullanacak şekilde `public/logo.png` olarak konuldu.

## Veritabanı (Supabase)

Aşağıdaki migration’ı **Supabase SQL Editor**’da çalıştırın:

- **`docs/migrations/create-loyalty-tiers-and-legal.sql`**

Bu dosya:

1. **loyalty_tiers** tablosunu oluşturur (Bronz, Gümüş, Altın, Platin seviye açıklamaları).
2. **app_legal_texts** tablosunu oluşturur ve **KVKK** ile **ETK** metinlerini ekler.
3. **users** tablosuna şu sütunları ekler:  
   `email_marketing_consent`, `sms_marketing_consent`, `marketing_consent_at`, `kvkk_accepted_at`, `etk_accepted_at`.
4. Gerekli RLS policy’lerini tanımlar.

Migration çalıştırıldıktan sonra mobil uygulamada profil sayfasındaki puan bilgisi, Hizmetler, iletişim tercihleri ve KVKK/ETK ekranları veritabanıyla uyumlu çalışır.
