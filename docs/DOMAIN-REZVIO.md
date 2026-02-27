# Domain Yapılandırması: rezvio.com

- **Ana uygulama (kullanıcı):** `rezvio.com` (veya `www.rezvio.com`)
- **Admin panel:** `admin.rezvio.com`

Aşağıdaki ayarlar yapılmadan “Application error: a client-side exception” veya giriş/rezervasyon sorunları yaşanabilir.

---

## 1. Supabase – Auth URL ayarları

Supabase Dashboard’da:

1. **Authentication** → **URL Configuration**
2. **Site URL:** Ana uygulama adresiniz (örn. `https://rezvio.com` veya `https://www.rezvio.com`).
3. **Redirect URLs** listesine **her iki domain** için ekleyin:
   - Ana uygulama:
     - `https://rezvio.com/**`
     - `https://rezvio.com`
     - `https://www.rezvio.com/**`
     - `https://www.rezvio.com`
   - Admin panel:
     - `https://admin.rezvio.com/**`
     - `https://admin.rezvio.com`
   - Geliştirme:
     - `http://localhost:3000/**`
     - `http://localhost:3001/**` (admin farklı portta çalışıyorsa)

Admin panel de Supabase ile giriş yaptığı için `admin.rezvio.com` mutlaka Redirect URLs’de olmalı.

---

## 2. Vercel – Projeler ve domainler

İki ayrı Vercel projesi kullanıyorsanız:

| Proje    | Root Directory | Domain(ler)        |
|----------|----------------|--------------------|
| Web app  | `web-app`     | `rezvio.com`, `www.rezvio.com` |
| Admin    | `admin-panel` | `admin.rezvio.com` |

Her iki projede de:

- **Settings** → **Environment Variables**
- `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` tanımlı olsun (Production / Preview / Development için gerekli ortamlarda).

Tek Vercel projesinde hem web-app hem admin’i deploy ediyorsanız (monorepo + farklı root), Vercel’de iki ayrı “project” tanımlayıp biri `web-app` root + rezvio.com, diğeri `admin-panel` root + admin.rezvio.com şeklinde domain atayın; her projede env’leri tanımlayın.

Değişiklikten sonra ilgili proje(ler) için **Redeploy** yapın.

---

## 3. Başka yapılacak bir şey var mı?

- **Kod tarafı:** Gerek yok. Admin panel zaten `window.location.origin` ile redirect kullanıyor; domain’e göre otomatik `admin.rezvio.com` olur.
- **DNS:** `rezvio.com`, `www.rezvio.com` ve `admin.rezvio.com` için Vercel’in verdiği kayıtları (A/CNAME) domain sağlayıcınızda tanımlayın.
- **SSL:** Vercel otomatik sertifika verir; ekstra işlem gerekmez.

---

## 4. Hata ayıklama

Hata devam ederse:

1. Sitede **F12** → **Console** sekmesine bakın.
2. Supabase Auth veya CORS ile ilgili kırmızı mesajları not alın.

---

## Özet

| Nerede    | Ne yapılacak |
|-----------|----------------|
| Supabase  | Auth → URL Configuration: Site URL + Redirect URLs’e **rezvio.com** ve **admin.rezvio.com** ekleyin |
| Vercel    | Her proje için env’ler tanımlı olsun; domain’ler doğru projeye atanmış olsun; gerekirse Redeploy |
| DNS       | rezvio.com, www.rezvio.com, admin.rezvio.com → Vercel’e yönlendirilsin |
