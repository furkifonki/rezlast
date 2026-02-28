# Admin uygulaması ve veritabanı

## Aynı veritabanı

**Admin panel** (web) ve **admin uygulaması** (mobil) aynı Supabase projesini kullandığında **aynı veritabanına** bağlanır.

- **Admin panel:** `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local` veya Vercel Environment Variables)
- **Admin uygulaması:** `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` (`.env` veya EAS secrets)

Bu değerler **aynı projeden** (aynı URL, aynı anon key) alınırsa:

- Rezervasyonlar, işletmeler, hizmetler, mesajlar, gelir verisi **senkron** görünür.
- Web’de yaptığınız değişiklikler uygulamada, uygulamada yaptıklarınız web’de görünür.

## Mesajlar gelmiyorsa

1. **Aynı hesapla giriş yapın.** Mesajlar giriş yapan kullanıcıya göre (işletme sahibi veya personel) listelenir.
2. **Ortam değişkenlerini kontrol edin.** Admin uygulamasındaki `EXPO_PUBLIC_SUPABASE_*` değerleri, admin paneldeki `NEXT_PUBLIC_SUPABASE_*` ile aynı projeye ait olmalı.
3. **İşletme / personel ilişkisi:** Konuşmalar, sizin sahibi veya personeli olduğunuz işletmelere (`businesses.owner_id` veya `restaurant_staff`) göre çekilir. Web ve uygulama aynı mantığı kullanır; aynı kullanıcı ve aynı Supabase ile ikisinde de aynı liste görünür.

Özet: İkisi de **aynı Supabase projesi** ve **aynı giriş** ile çalışıyorsa mesajlar ve diğer veriler tutarlıdır.
