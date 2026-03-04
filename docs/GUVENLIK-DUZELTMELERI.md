# Güvenlik Düzeltmeleri

Tarih: 4 Mart 2026

Bu belge, güvenlik taraması sonucunda tespit edilen açıkları ve uygulanan düzeltmeleri listeler.

---

## KRİTİK Seviye

### 1. Cron Endpoint Auth Bypass

**Dosya:** `admin-panel/app/api/cron/send-trigger-push/route.ts`

**Sorun:** `CRON_SECRET` env var tanımlı değilse auth kontrolü tamamen atlanıyordu. Herkes `GET /api/cron/send-trigger-push` çağırıp service role ile tüm verilere erişebiliyordu.

**Düzeltme:**

```diff
- if (cronSecret && secret !== cronSecret) {
+ if (!cronSecret || secret !== cronSecret) {
```

Ayrıca secret artık sadece `Authorization` header ile kabul ediliyor, query string (`?secret=...`) kaldırıldı.

---

### 2. Yetkisiz Toplu Push Bildirimi

**Dosya:** `admin-panel/app/api/send-push/route.ts`

**Sorun:** Herhangi bir oturum açmış kullanıcı (müşteri dahil) `mode: "bulk"` ile tüm müşterilere push gönderebiliyordu.

**Düzeltme:** İşletme sahipliği kontrolü eklendi:

```typescript
const { data: ownerCheck } = await supabase
  .from('businesses')
  .select('id')
  .eq('owner_id', user.id)
  .limit(1);
if (!ownerCheck?.length) {
  return NextResponse.json({ error: 'Bu işlem için işletme sahibi olmalısınız.' }, { status: 403 });
}
```

---

### 3. CORS Wildcard (`Access-Control-Allow-Origin: *`)

**Dosyalar:**
- `admin-panel/app/api/push-notify-owner/route.ts`
- `admin-panel/app/api/push-notify-message/route.ts`

**Sorun:** `*` ayarı nedeniyle internetteki herhangi bir site API'lere istek gönderebiliyordu.

**Düzeltme:** `admin-panel/lib/cors.ts` oluşturuldu. `ALLOWED_ORIGINS` env var ile izin verilen origin'ler belirleniyor. Tanımlı değilse request origin yansıtılıyor.

**Vercel ayarı:** `ALLOWED_ORIGINS=https://rezvio.com,https://admin.rezvio.com`

---

## YÜKSEK Seviye

### 4. IDOR - Push Bildirim Endpoint'lerinde Sahiplik Kontrolü Yok

**Dosyalar:**
- `admin-panel/app/api/push-notify-customer/route.ts`
- `admin-panel/app/api/push-notify-cancelled/route.ts`
- `admin-panel/app/api/push-notify-message/route.ts`

**Sorun:** Herhangi bir oturum açmış kullanıcı, başka bir işletmenin `reservation_id` veya `conversation_id` bilgisiyle bildirim tetikleyebiliyordu.

**Düzeltme:**
- `push-notify-customer` ve `push-notify-cancelled`: İşletme sahipliği veya personel kontrolü eklendi.
- `push-notify-message`: Konuşma katılımcısı kontrolü eklendi (müşteri veya işletme sahibi/personeli olma zorunluluğu).

---

### 5. Open Redirect

**Dosya:** `admin-panel/app/api/auth/login/route.ts`

**Sorun:** `?next=https://evil.com` ile kullanıcı giriş sonrası zararlı siteye yönlendirilebiliyordu.

**Düzeltme:**

```typescript
const rawNext = searchParams.get('next') ?? '/dashboard';
const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard';
```

Ayrıca `admin-panel/app/login/LoginForm.tsx`'de API yanıtındaki `redirect` değeri de aynı kontrole tabi tutuldu.

---

### 6. Güvenlik Header'ları Eksik

**Dosyalar:**
- `admin-panel/next.config.ts`
- `web-app/next.config.ts`

**Sorun:** XSS, clickjacking, MIME sniffing saldırılarına karşı koruma yoktu.

**Düzeltme:** Her iki config'e eklenen header'lar:

| Header | Değer |
|--------|-------|
| X-Frame-Options | DENY |
| X-Content-Type-Options | nosniff |
| Referrer-Policy | strict-origin-when-cross-origin |
| X-DNS-Prefetch-Control | on |
| Strict-Transport-Security | max-age=31536000; includeSubDomains |
| Permissions-Policy | camera=(), microphone=(), geolocation=() |

---

## ORTA Seviye

### 7. Rate Limiting

**Dosya:** `admin-panel/lib/rateLimit.ts` (yeni)

**Sorun:** Hiçbir API endpoint'inde rate limit yoktu.

**Düzeltme:** In-memory rate limiter oluşturuldu. Uygulanan limitler:

| Endpoint | Limit |
|----------|-------|
| send-push | 5 istek / dakika |
| push-notify-owner | 10 istek / dakika |
| push-notify-customer | 10 istek / dakika |
| push-notify-cancelled | 10 istek / dakika |
| push-notify-message | 20 istek / dakika |

---

### 8. admin-app `.gitignore` Eksikti

**Dosya:** `admin-app/.gitignore` (yeni)

**Sorun:** `.expo/`, `.env`, build artifact'ları yanlışlıkla commit edilebiliyordu.

**Düzeltme:** `mobile-app/.gitignore` ile uyumlu bir `.gitignore` oluşturuldu.

---

### 9. web-app `getSession()` Yerine `getUser()` Kullanılmalı

**Dosya:** `web-app/contexts/AuthContext.tsx`

**Sorun:** `getSession()` token'ı sunucuda doğrulamaz, sadece local storage'dan okur.

**Düzeltme:** Önce `getUser()` ile sunucu doğrulaması yapılıyor, ardından session alınıyor:

```typescript
supabase.auth.getUser().then(({ data: { user: u } }) => {
  if (u) {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });
  } else {
    setSession(null);
    setLoading(false);
  }
});
```

---

### 10. Dosya Upload Validasyonu Yetersiz

**Dosya:** `admin-panel/app/dashboard/businesses/[id]/edit/page.tsx`

**Sorun:** Sadece `file.type` kontrol ediliyordu (client-side MIME spoofing mümkün). SVG ile XSS riski vardı.

**Düzeltme:** Uzantı allowlist + SVG engeli eklendi:

```typescript
const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp'];
const ext = file.name.split('.').pop()?.toLowerCase() || '';
if (!ALLOWED_EXTS.includes(ext)) { /* reddet */ }
if (file.type === 'image/svg+xml') { /* reddet */ }
```

---

### 11. Hata Mesajları İç Detayları Sızdırıyordu

**Dosyalar:** Birçok API route

**Sorun:** Supabase hata mesajları (tablo adları, constraint isimleri) doğrudan client'a döndürülüyordu.

**Düzeltme:** Tüm API'lerde iç hata mesajları `console.error()` ile loglanıp, client'a genel mesaj döndürülüyor.

---

### 12. admin-app Rol Doğrulaması

**Dosya:** `admin-app/screens/auth/LoginScreen.tsx`

**Sorun:** Admin-app'e herhangi bir müşteri hesabıyla giriş yapılabiliyordu.

**Düzeltme:** Login sonrası `businesses` ve `restaurant_staff` tabloları kontrol ediliyor. Eşleşme yoksa oturum kapatılıp hata gösteriliyor.

---

### 13. Production Build'de Console.log

**Dosya:** `admin-app/lib/pushNotifications.ts`

**Sorun:** Push token'lar production build'de konsola loglanıyordu.

**Düzeltme:** Tüm log'lar `if (__DEV__)` ile sarmalandı.

---

### 14. `detectSessionInUrl` Değişikliği

**Dosya:** `web-app/lib/supabase.ts`

**Sorun:** `detectSessionInUrl: true` ayarı ile token'lar URL hash'inde görünüyor, tarayıcı geçmişine ve Referer header'a sızıyordu.

**Düzeltme:** `detectSessionInUrl: false` olarak değiştirildi.

---

## DÜŞÜK Seviye

### 15. URL Sanitizasyonu

**Dosya:** `mobile-app/screens/main/BusinessDetailScreen.tsx`

**Sorun:** İşletme web sitesi URL'i yeterince doğrulanmadan `Linking.openURL` ile açılıyordu.

**Düzeltme:** `new URL()` ile parse edip protocol kontrolü eklendi (sadece `http:` ve `https:` izinli).

---

### 16. web-app Middleware

**Dosya:** `web-app/middleware.ts` (yeni)

**Sorun:** `/app/*` route'larına unauthenticated erişim mümkündü (veri RLS ile korunsa da).

**Düzeltme:** Server-side middleware eklendi. Oturumsuz kullanıcılar `/app/*` route'larından `/login`'e yönlendiriliyor.

---

## Yapılması Gereken Ek Adımlar

### Vercel Ortam Değişkenleri

admin.rezvio.com (admin-panel) projesine ekle:

| Key | Value |
|-----|-------|
| ALLOWED_ORIGINS | `https://rezvio.com,https://admin.rezvio.com` |
| CRON_SECRET | Güçlü rastgele bir değer (yoksa cron endpoint çalışmaz) |

### Supabase

1. `push-tokens-add-app-type.sql` migration'ının çalıştırıldığından emin ol
2. `cleanup-push-tokens-null-app-type.sql` ile eski NULL token'ları temizle
3. `enable-rls-unused-tables.sql` ile kullanılmayan tablolara RLS ekle
