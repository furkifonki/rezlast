# Haritada İşletme Konumlarının Görünmesi

## Neden görünmüyor?

Uygulamadaki **harita** sadece veritabanında **latitude** ve **longitude** dolu olan işletmeleri gösterir. Sadece **adres** (address, city, district) dolu olup koordinat boş olan işletmeler haritada listelenmez.

## Çözüm: Adresleri koordinata çevirme (geocoding)

Tüm adresleri otomatik koordinata çevirip `businesses` tablosunu güncelleyen bir script var.

### 1. Service Role Key al

- Supabase Dashboard → Projen → **Project Settings** → **API**
- **service_role** (secret) anahtarını kopyala. Bu anahtar RLS’i aşar; güvenli tut.

### 2. Script’i çalıştır

Proje kökünde (Rezervasyon Uygulaması klasöründe):

```bash
SUPABASE_URL=https://XXXX.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... node scripts/geocode-businesses.mjs
```

- `SUPABASE_URL`: Supabase proje URL’in (Dashboard → Settings → API → Project URL)
- `SUPABASE_SERVICE_ROLE_KEY`: Yukarıda kopyaladığın service_role key

Script:

- Adresi dolu ama **latitude** veya **longitude** boş olan aktif işletmeleri alır
- Her adresi OpenStreetMap Nominatim ile koordinata çevirir (ücretsiz, API key yok)
- İstekler arası ~1 saniye bekler (Nominatim kullanım koşulu)
- Bulunan koordinatları `businesses` tablosunda günceller

### 3. Sonuç

Script bittikten sonra uygulamadaki harita ekranını yenilediğinde bu işletmeler haritada işaretli görünür.

## Yeni eklenen işletmeler

- Admin panelden işletme eklerken **Enlem / Boylam** alanlarını doldurursan konum doğrudan haritada çıkar.
- Sadece adres girersen, haritada görünmesi için ya admin panelden elle koordinat girmen ya da bu script’i (sadece yeni/eksik kayıtlar için) tekrar çalıştırman gerekir.

## Alternatif: Google Geocoding

Daha isabetli sonuç istersen Nominatim yerine Google Geocoding API kullanacak bir script yazılabilir; bunun için Google Cloud’da API key açman ve ücret limitlerine dikkat etmen gerekir.
