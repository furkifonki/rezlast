# Mobil: Masa + Hizmet Seçimi ve Rezervasyon Akışı

## Amaç

Kullanıcı işletmenin hizmetlerini görür → mini haritada müsait masaları görür → bir masa seçer → o masa için hangi hizmeti alacağını seçer → tarih/saat seçer → rezervasyon oluşur. Rezervasyon sonrası ilgili masa, seçilen tarih/saatte “dolu” kabul edilir.

## Mevcut şema

- **reservations**: `table_id` (hangi masa), `service_id` (hangi hizmet, örn. Yemek), `business_id`, `user_id`, `reservation_date`, `reservation_time`, `duration_minutes` / `duration_display`, `party_size`, `status`.
- **tables**: `business_id`, `table_number`, `capacity`, `position_x`, `position_y`, harita için.
- **services**: `business_id`, `name`, `duration_minutes`, `duration_display`, `price`.

Bir rezervasyon hem `table_id` hem `service_id` alabilir (restoran: masa + “Yemek” hizmeti).

## Akış (mobil uygulama)

1. Kullanıcı işletmeyi açar → **Hizmetler** listesi (bu işletmenin `services` kayıtları).
2. **Harita / Masa planı** ekranı: İşletmenin `tables` kayıtları (position_x, position_y ile çizilir).
3. **Müsait masalar**: Seçilen **tarih** ve **saat** (ve isteğe bağlı süre) için, bu saatte rezervasyonu olmayan masalar “müsait” gösterilir.
4. Kullanıcı bir **masa** seçer.
5. O masa için **hizmet** seçimi: İşletmenin hizmetlerinden biri (örn. “Yemek”) seçilir.
6. **Tarih / saat** (ve kişi sayısı) zaten seçilmiş veya bu adımda seçilir.
7. **Rezervasyon oluştur**: `reservations` tablosuna `business_id`, `user_id`, `table_id`, `service_id`, `reservation_date`, `reservation_time`, `duration_minutes`/`duration_display`, `party_size`, `status: 'pending'` ile INSERT.

Böylece bu masa, ilgili tarih/saat (ve süre) için dolu sayılır; bir sonraki “müsait masa” sorgusunda çıkmaz.

## Müsait masa hesabı

Bir masa **müsait** sayılır ⇔ seçilen tarih ve saatte (ve varsa süre boyunca) o masada **confirmed** veya **pending** rezervasyon yok.

### RPC (önerilen)

Migration `docs/migrations/fn-get-available-tables.sql` çalıştırıldıktan sonra mobil uygulama:

```ts
const { data: tables } = await supabase.rpc('get_available_tables', {
  p_business_id: businessId,
  p_date: '2025-02-22',       // YYYY-MM-DD
  p_time: '19:00',            // HH:mm
  p_duration_minutes: 120,    // 0 = tüm gün blok
});
// data = müsait tables satırları (id, table_number, capacity, position_x, position_y, ...)
```

### Örnek sorgu (Supabase / SQL)

- Verilen: `business_id`, `reservation_date`, `reservation_time`, `duration_minutes` (0 ise “tüm gün/akşam” kabul edilebilir; yoksa örn. 120 dk varsay).
- Çakışma: Aynı `table_id` için `reservation_date` = verilen tarih, `status IN ('pending','confirmed')` ve zaman aralığı çakışan rezervasyon var mı?
- Müsait masalar: `tables` içinde bu `business_id`’e ait olup, yukarıdaki çakışma sorgusunda **hiç çıkmayan** `table_id`’ler.

Basit uygulama (süre 0 veya “tüm akşam” için tüm gün bloklu sayılabilir):

```sql
-- Örnek: 2025-02-22, 19:00, 120 dk için müsait masalar
-- reservations tablosunda (pending/confirmed) bu tarih ve zaman aralığına düşen table_id'leri çıkar
WITH blocked AS (
  SELECT DISTINCT table_id FROM reservations
  WHERE business_id = $business_id
    AND reservation_date = $reservation_date
    AND status IN ('pending', 'confirmed')
    AND table_id IS NOT NULL
    -- Zaman çakışması: (reservation_time, reservation_time + duration) ile (19:00, 21:00) çakışıyor mu?
    -- end_time varsa onu kullan, yoksa reservation_time + duration_minutes
)
SELECT t.id, t.table_number, t.capacity, t.position_x, t.position_y
FROM tables t
WHERE t.business_id = $business_id
  AND t.is_active = true
  AND t.id NOT IN (SELECT table_id FROM blocked WHERE table_id IS NOT NULL);
```

Zaman çakışması için: `reservation_time` ve bitiş (end_time veya reservation_time + duration_minutes) ile istenen başlangıç/bitiş çakışıyorsa o rezervasyon o masayı bloke eder.

## Özet

| Adım | Veri |
|------|------|
| Hizmetler listesi | `services` WHERE `business_id` = X AND `is_active` = true |
| Masa planı (harita) | `tables` WHERE `business_id` = X AND `is_active` = true |
| Müsait masalar | Yukarıdaki bloke sorgusu ile filtrelenmiş `tables` |
| Rezervasyon oluştur | `reservations` INSERT: business_id, user_id, table_id, service_id, reservation_date, reservation_time, duration_* , party_size, status |

Bu bağlantı kurulduğunda, kullanıcı seçtiği masa + hizmet + tarih/saat ile rezervasyon yapar; o masa ilgili saatlerde/günlerde dolu sayılır.
