# Supabase RLS Uyarısı – Tablo Analizi

Supabase’den gelen **“RLS Disabled in Public”** uyarısında listelenen tabloların projede kullanılıp kullanılmadığı ve ne yapılması gerektiği.

---

## Özet

| Tablo | Projede kullanılıyor mu? | Öneri |
|-------|---------------------------|--------|
| `branches` | Hayır | RLS aç veya kaldır |
| `roles` | Hayır | RLS aç veya kaldır |
| `availability_slots` | Hayır | RLS aç veya kaldır |
| `subscription_plans` | Hayır | RLS aç veya kaldır |
| `subscriptions` | Hayır | RLS aç veya kaldır |
| `campaigns` | Hayır | RLS aç veya kaldır |
| `payments` | Hayır | RLS aç veya kaldır |
| `spatial_ref_sys` | Hayır (PostGIS sistem tablosu) | Genelde dokunma |
| `notifications` | Hayır | RLS aç veya kaldır |

**Not:** Projede **`app_notifications`** ve **`payment_methods`** kullanılıyor; bunlar RLS uyarısındaki `notifications` ve `payments` tablolarından **farklı** tablolar.

---

## 1. `public.branches`

- **Kullanım:** Proje kodunda (admin-app, admin-panel, mobile-app, web-app) **hiçbir yerde** `branches` tablosuna erişim yok.
- **Şema:** Sadece `docs/database-schema.md` içinde dokümante edilmiş; bu repodaki migration’larda **CREATE TABLE branches** yok.
- **Kaynak:** Muhtemelen eski bir şema veya başka bir proje / şablon ile oluşturulmuş.

**Öneri:** Kullanmıyorsanız `DROP TABLE IF EXISTS public.branches CASCADE;` ile kaldırın. Kullanacaksanız RLS açıp uygun policy’leri ekleyin.

---

## 2. `public.roles`

- **Kullanım:** Kodda **`.from('roles')`** veya `roles` tablosuna doğrudan sorgu yok. Sadece dokümantasyonda (database-schema, security-rbac, mvp-sprint-plan) geçiyor.
- **Şema:** `docs/database-schema.md`’de rol tanımları tablosu olarak anlatılmış; migration’larda **CREATE TABLE roles** yok.

**Öneri:** Kullanmıyorsanız `DROP TABLE IF EXISTS public.roles CASCADE;`. Kullanacaksanız RLS + policy ekleyin.

---

## 3. `public.availability_slots`

- **Kullanım:** Uygulama kodu bu tabloyu **kullanmıyor**. Rezervasyon/slot mantığı `business_hours`, `get_available_slots_for_date` RPC ve kapasite tabloları ile yürüyor.
- **Doküman:** `docs/database-schema.md` ve `docs/MVP-OZET.md` (“slot bazlı ayrı akış yok”).
- **Migration:** Bu repoda **availability_slots** oluşturan migration yok.

**Öneri:** Kullanmıyorsanız `DROP TABLE IF EXISTS public.availability_slots CASCADE;`. İleride kullanacaksanız RLS açın.

---

## 4. `public.subscription_plans` ve 5. `public.subscriptions`

- **Kullanım:** Hiçbir uygulama kodu bu tablolara **erişmiyor**.
- **Doküman:** `docs/database-schema.md` ve `docs/MVP-OZET.md` (“SaaS abonelik tabloları şemada; kullanılmıyor”).
- **Migration:** Bu repoda bu tabloları oluşturan migration yok.

**Öneri:** Kullanmıyorsanız:

```sql
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
```

Kullanacaksanız RLS + policy ekleyin.

---

## 6. `public.campaigns`

- **Kullanım:** Kodda **kullanılmıyor**.
- **Doküman:** `docs/MVP-OZET.md` (“Kampanya/kupon tabloları; kullanılmıyor”).
- **Migration:** Bu repoda **campaigns** oluşturan migration yok.

**Öneri:** Kullanmıyorsanız `DROP TABLE IF EXISTS public.campaigns CASCADE;`. Kullanacaksanız RLS açın.

---

## 7. `public.payments`

- **Kullanım:** Projede **`payments`** tablosu kullanılmıyor. Gelir/ödeme tarafında **`payment_methods`** (ve rezervasyonlardaki `amount`, `payment_method_id`) kullanılıyor.
- **Migration:** `add-reservations-revenue-payment-method.sql` ile **payment_methods** ve rezervasyon sütunları eklenmiş; **payments** tablosu bu repoda oluşturulmuyor.

**Öneri:** Bu `payments` tablosunu hiç kullanmıyorsanız `DROP TABLE IF EXISTS public.payments CASCADE;`. Kullanacaksanız RLS + policy ekleyin.

---

## 8. `public.spatial_ref_sys`

- **Kullanım:** Bu tablo **PostGIS** eklentisinin sistem tablosudur; proje kodu buna **erişmiyor**.
- **Not:** PostGIS kurulduğunda otomatik oluşur. RLS genelde bu tür sistem/katalog tablolarında kapatık bırakılır.

**Öneri:** Dokunmayın veya Supabase/PostGIS dokümantasyonuna göre hareket edin. Zorunlu değilse RLS açmaya çalışmayın.

---

## 9. `public.notifications`

- **Kullanım:** Uygulama **`app_notifications`** tablosunu kullanıyor (bildirim merkezi, push kayıtları). **`notifications`** tablosuna yapılan hiçbir sorgu yok.
- **Migration:** `create-app-notifications.sql` ile **app_notifications** (RLS’li) oluşturulmuş; **notifications** bu repoda oluşturulmuyor.

**Öneri:** Eski veya kullanılmayan bir tablo ise `DROP TABLE IF EXISTS public.notifications CASCADE;`. Kullanacaksanız RLS + policy ekleyin.

---

## Kullandığımız Benzer İsimler (Karışmaması İçin)

- **`app_notifications`** – Kullanılıyor, RLS açık (create-app-notifications.sql).
- **`payment_methods`** – Kullanılıyor, RLS açık (add-reservations-revenue-payment-method.sql).

Bunlar uyarıdaki `notifications` ve `payments` tablolarından farklıdır.

---

## Toplu İşlem (Kullanılmayan Tabloları Kaldırmak)

Aşağıdaki SQL’i **sadece** bu tabloları gerçekten kullanmadığınızdan eminseniz Supabase SQL Editor’da çalıştırabilirsiniz. **`spatial_ref_sys`** PostGIS’e ait olduğu için **drop edilmez**; onu atladım.

```sql
-- Kullanılmayan tabloları kaldır (isterseniz tek tek çalıştırın)
-- Önce bağımlılıkları kontrol edin: bu tablolara FK ile bağlı başka tablo var mı?

DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;
DROP TABLE IF EXISTS public.availability_slots CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.branches CASCADE;
DROP TABLE IF EXISTS public.roles CASCADE;

-- spatial_ref_sys PostGIS sistem tablosu – DROP ETMEYİN.
```

**Alternatif:** Tabloları silmek istemiyorsanız, her biri için sadece RLS’i açıp “tüm erişimi kısıtla” anlamında sıkı bir policy ekleyebilirsiniz (ör. `USING (false)` ile hiç satır dönmeyen SELECT policy). Bu, linter uyarısını giderir ama tabloyu fiilen kapalı tutar.

---

## Son Kontrol

- Bu tablolar **bu proje repo’sundaki migration’larda oluşturulmuyor**; muhtemelen Supabase şablonu, eski proje veya manuel oluşturma ile gelmiş.
- Proje şu an **businesses, users, reservations, conversations, messages, app_notifications, push_tokens, payment_methods, categories, business_hours, services, reviews, loyalty_*, sponsored_listings, business_capacity_rules** vb. tablolarla çalışıyor; yukarıdaki 9 tablo bu akışta **yer almıyor**.

Bu doküman, Supabase RLS uyarısındaki tabloların projede kullanılıp kullanılmadığını ve nasıl hareket edileceğini özetler.
