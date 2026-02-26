# Rezvio – Güvenlik Önlemleri ve Öneriler

Bu doküman, ürünü hacklenmeye karşı korumak ve güvenilir kılmak için **mevcut önlemler** ile **yapılması gerekenler** ve **olası güvenlik açıkları**nı özetler.

---

## 1. Mevcut Güvenlik Önlemleri

### 1.1 Kimlik Doğrulama ve Yetkilendirme

- **Supabase Auth:** Giriş/kayıt/şifre sıfırlama Supabase Auth ile yapılıyor; şifreler Supabase tarafında güvenli saklanıyor.
- **JWT ve oturum:** Mobil ve admin panel Supabase client ile oturum yönetiyor; token yenileme (autoRefreshToken) açık.
- **Admin panel erişimi:** `/dashboard` ve altı middleware ile korunuyor; oturum yoksa `/login`’e yönlendiriliyor. Login/Register/Forgot/Reset sayfalarına giriş yapmış kullanıcı tekrar erişemiyor.

### 1.2 Row Level Security (RLS)

Tüm kritik tablolarda RLS açık; veri erişimi **auth.uid()** ve **işletme sahipliği** ile kısıtlanıyor:

| Tablo / Konu | Kural (özet) |
|--------------|--------------|
| **users** | Kullanıcı sadece kendi satırını okuyup güncelleyebilir. |
| **businesses** | Aktif işletmeler herkese okunabilir (Keşfet). Güncelleme/silme/ekleme sadece owner (owner_id = auth.uid()). |
| **reservations** | INSERT: sadece auth.uid() = user_id. SELECT: kullanıcı kendi rezervasyonları; işletme sahibi kendi işletmesinin rezervasyonları. UPDATE: kullanıcı kendi, işletme sahibi kendi işletmesinin. |
| **loyalty_transactions** | SELECT: kendi kayıtları. INSERT: sadece kendi işletmesi için (owner_id = auth.uid()). |
| **reviews** | Gizli olmayan yorumlar herkese okunabilir. INSERT: auth.uid() = user_id. UPDATE/DELETE: kendi yorumu veya işletme sahibi kendi işletmesinin yorumları. |
| **user_favorites** | Sadece kendi favorileri (user_id = auth.uid()). |
| **sponsored_listings, loyalty_rules, business_hours, business_photos, business_closures, services, tables** | Okuma: public (aktif işletme) veya owner. Yazma: sadece ilgili işletmenin owner’ı. |
| **Storage (business-photos)** | Okuma: herkese. INSERT/DELETE: sadece kendi işletme klasörü (path = business_id/...). |

Böylece bir kullanıcı veya saldırgan, başka kullanıcının rezervasyonunu, puanını veya işletme verisini doğrudan okuyup değiştiremez (IDOR riski RLS ile azaltılmış durumda).

### 1.3 RPC / SECURITY DEFINER Fonksiyonlar

- **get_available_tables / get_available_slots_for_date:** Anon + authenticated çağırabilir; sadece müsait masa/saat bilgisi döner, hassas veri yok.
- **get_business_customers_with_points:** Sadece **authenticated** ve fonksiyon içinde **business owner kontrolü** var (`owner_id = auth.uid()`). Başka işletmenin müşteri listesi döndürülmez.
- **close_my_past_reservations:** Kullanıcının kendi rezervasyonlarını günceller (trigger/session tarafında kullanıcıya bağlı).
- **close_past_reservations_for_owner:** İşletme sahibinin kendi işletmesinin rezervasyonlarını günceller.

Tüm SECURITY DEFINER fonksiyonlarında yetki kontrolü (owner_id veya user_id) yapılıyor; kör güven yok.

### 1.4 Veri ve Arayüz

- **SQL enjeksiyonu:** Veritabanı erişimi Supabase client (parametreli sorgular) ve RPC ile; ham SQL string birleştirmesi yok. Risk düşük.
- **XSS:** React/React Native varsayılan olarak çıktıyı escape ediyor; `dangerouslySetInnerHTML` kullanılmıyor. Yorum ve metin alanları doğrudan HTML’e enjekte edilmiyor.
- **Şifre:** Kayıtta en az 6 karakter kontrolü var (Supabase’in varsayılanı da 6).

### 1.5 Hassas Veri

- **Anon key:** Mobil ve admin panelde kullanılan Supabase **anon** key, tasarım gereği istemcide (public) olabilir; asıl koruma RLS ve Auth ile sağlanıyor. **Service role key** hiçbir zaman istemciye verilmemeli; sadece sunucu/Edge Function’da kullanılmalı.
- **.env / .env.local:** Proje `.gitignore`’da `.env`, `.env.local`, `.env*.local` var. Bu dosyaların repoya commit edilmemesi gerekir.

---

## 2. Olası Güvenlik Açıkları ve Riskler

### 2.1 Ortam Değişkenleri ve Anahtarlar

- **Risk:** `.env` veya `.env.local` yanlışlıkla commit edilirse Supabase URL ve anon key (ve varsa service role key) sızar.
- **Önlem:** `.env` ve `.env.local` asla commit edilmemeli. Sadece `.env.example` (gerçek değerler olmadan) commit edilmeli. Eğer bu dosyalar bir kez repoya girmişse: **tüm anahtarlar Supabase Dashboard’dan yenilenmeli** (anon key rotate, service role key rotate) ve repo geçmişinden hassas dosyalar kaldırılmalı (git filter-branch veya BFG).

### 2.2 Brute Force ve Rate Limiting

- **Risk:** Giriş veya kayıt ekranında sınırsız deneme ile şifre kırma veya hesap kilitleme saldırıları.
- **Önlem:** Supabase Auth tarafında rate limit ayarları (varsa) kontrol edilmeli. Uzun vadede giriş denemelerini sınırlayan bir rate limit (ör. IP veya e-posta bazlı) backend/Edge Function veya Supabase ayarları ile eklenebilir.

### 2.3 Şifre Politikası

- **Risk:** Zayıf şifreler (sadece 6 karakter) kolay tahmin edilebilir.
- **Önlem:** En az 8 karakter, büyük/küçük harf, rakam ve (isteğe bağlı) özel karakter zorunluluğu hem mobil hem Supabase Auth ayarlarında düşünülmeli. Supabase Dashboard → Authentication → Settings içinde “Password requirements” güçlendirilebilir.

### 2.4 İki Faktörlü Doğrulama (2FA)

- **Risk:** Şifre çalınsa tek faktörle tam erişim.
- **Önlem:** Supabase Auth 2FA/MFA destekliyor. Özellikle admin (işletme sahibi) hesapları için 2FA açılması önerilir (Supabase ayarları ve uygulama tarafında MFA akışı).

### 2.5 Hassas Veri Sızıntısı

- **Risk:** Hata mesajlarında veya loglarda kullanıcı e-postası, token veya dahili ID’lerin çıkması.
- **Önlem:** Production’da genel hata mesajları kullanıcıya gösterilmeli; detaylı stack trace veya token loglanmamalı. Supabase hata mesajları mümkün olduğunca generic tutulabilir.

### 2.6 Storage ve Yükleme

- **Risk:** İşletme fotoğrafı yüklemede dosya tipi/s boyutu sınırı yoksa kötü niyetli dosya veya çok büyük dosya yükleme.
- **Önlem:** Storage’da (Supabase veya uygulama tarafında) sadece izin verilen MIME tipleri (image/jpeg, image/png vb.) ve makul bir dosya boyutu limiti (ör. 5 MB) uygulanmalı. Gerekirse virus/malware taraması (üçüncü parti servis) eklenebilir.

### 2.7 API / RPC Kötüye Kullanımı

- **Risk:** get_available_slots_for_date veya get_available_tables çok sık çağrılarak DDoS veya kaynak tüketimi.
- **Önlem:** Supabase tarafında rate limit (proje ayarları) kullanılabilir. Kritik RPC’ler için istek başına limit (ör. dakikada 60 istek) düşünülebilir.

### 2.8 Mobil Uygulama Dağıtımı

- **Risk:** APK/IPA reverse engineering ile anon key veya mantık çıkarılabilir.
- **Önlem:** Anon key zaten “public” sayılır; asıl koruma RLS. Yine de hassas iş mantığı mümkünse sunucu/Edge Function’da tutulmalı. Mobil tarafta obfuscation (ProGuard/R8, React Native için ilgili araçlar) kullanılabilir.

---

## 3. Yapılacaklar Listesi (Öncelik Sırasıyla)

1. **.env doğrulama:** Repoda `.env`, `.env.local` veya içinde gerçek key olan dosya olmadığını kontrol et. Varsa hemen kaldır ve **Supabase’de anon (ve service_role) key’i rotate et**.
2. **Şifre politikası:** En az 8 karakter (ve isteğe bağlı karmaşıklık) uygula; Supabase Auth ayarlarını buna göre güncelle.
3. **Rate limiting:** Supabase proje ayarlarında Auth ve API rate limit’leri aç/kontrol et. Gerekirse kritik RPC’ler için ek limit düşün.
4. **Storage güvenliği:** business-photos için dosya tipi ve boyut limiti (Supabase Storage policy veya uygulama tarafında) ekle.
5. **2FA:** Özellikle admin hesapları için Supabase MFA’yı aç; gerekirse mobil/admin panelde MFA akışı ekle.
6. **Hata mesajları:** Production’da kullanıcıya verilen hata mesajlarında hassas bilgi (token, ID, e-posta) olmamasını sağla.
7. **Düzenli güncellemeler:** Supabase client, Next.js, Expo ve diğer bağımlılıkları güvenlik yamaları için güncel tut.
8. **Log ve izleme:** Supabase Dashboard ve (varsa) kendi loglarında şüpheli erişim veya çok sayıda başarısız girişi izle.

---

## 4. Özet

- **Mevcut durum:** RLS, Auth, middleware ve SECURITY DEFINER kontrolleri sayesinde veri erişimi ve yetkilendirme sağlam. SQL enjeksiyonu ve XSS riski düşük.
- **Kritik noktalar:** .env’in repoda olmaması ve key rotate; güçlü şifre politikası; rate limiting; storage kısıtları; 2FA (özellikle admin).
- **Sürekli iyileştirme:** Bağımlılık güncellemeleri, log izleme ve gerektiğinde penetration test veya güvenlik denetimi yapılması ürünü hacklenmeye karşı daha güvenilir kılar.

Bu doküman, mevcut koda ve migration’lara göre hazırlanmıştır. Yeni özellik veya tablo eklendikçe RLS ve yetki kuralları gözden geçirilmelidir.
