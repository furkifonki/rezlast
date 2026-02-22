# Admin'de Eklenen Fotoğraflar Uygulamada Görünmüyorsa

Admin panelde işletme fotoğraflarını eklemiş olmanıza rağmen mobil uygulamada (Keşfet listesi veya işletme detayında) görünmüyorsa aşağıdakileri kontrol edin.

## 1. Tablo RLS politikası (en sık neden)

Mobil uygulama, giriş yapmamış veya işletme sahibi olmayan kullanıcı olarak `business_photos` tablosunu okuyor. Bu satırların görünmesi için **herkesin aktif işletmelere ait fotoğrafları okuyabildiği** bir RLS politikası gerekir.

**Yapmanız gereken:** Supabase Dashboard → **SQL Editor** → yeni sorgu açın ve şu dosyanın içeriğini yapıştırıp **Run** edin:

- **Dosya:** `docs/migrations/rls-business-photos-public-read.sql`

İçeriği kısaca:

```sql
DROP POLICY IF EXISTS "Anyone can view photos of active businesses" ON business_photos;

CREATE POLICY "Anyone can view photos of active businesses"
  ON business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.is_active = true
    )
  );
```

Bu policy’yi ekledikten sonra uygulamayı yenileyip (veya sayfayı yenileyip) tekrar deneyin; liste ve detayda fotoğraflar gelmelidir.

## 2. Storage bucket’ın public olması

Fotoğraf dosyaları **Supabase Storage** içinde `business-photos` bucket’ında tutuluyor. Admin panel yükleme sırasında `getPublicUrl()` ile üretilen URL’nin tarayıcı/uygulama tarafından açılabilmesi için bucket’ın **public** olması gerekir.

**Kontrol:** Supabase Dashboard → **Storage** → `business-photos` bucket’ına tıklayın.

- **Public bucket** açık (✅) olmalı.  
- Kapalıysa: bucket ayarlarından “Make bucket public” / “Public bucket” seçeneğini açın.

Bucket public değilse, `photo_url` ile dönen adresler 403 verebilir; bu durumda uygulama satırları okusa bile resimler yüklenmez.

## 3. Storage okuma politikası

Bucket public olsa bile, **Storage RLS** ile `storage.objects` tablosunda SELECT politikası tanımlı olmalı.

**Dosya:** `docs/migrations/storage-business-photos-bucket.sql`  
İçinde şu policy olmalı (yoksa SQL Editor’da çalıştırın):

```sql
CREATE POLICY "Public read business-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-photos');
```

## Özet kontrol listesi

| Adım | Nerede | Ne yapılacak |
|------|--------|----------------|
| 1 | SQL Editor | `rls-business-photos-public-read.sql` çalıştır (business_photos SELECT policy) |
| 2 | Storage → business-photos | Bucket **Public** olsun |
| 3 | SQL Editor | `storage-business-photos-bucket.sql` içindeki “Public read business-photos” policy’si tanımlı olsun |

Bunlar tamamsa admin panelde eklediğiniz fotoğraflar hem Keşfet hem işletme detayında görünür.
