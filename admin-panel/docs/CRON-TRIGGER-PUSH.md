# Tetikleyici push (cron)

Rezervasyondan **30 dakika önce** ve **1 gün önce** otomatik push bildirimi için zamanlanmış görev tanımlanır.

## 1. Veritabanı

Sırayla çalıştırın:

- `docs/migrations/create-push-trigger-settings.sql`
- `docs/migrations/create-push-trigger-sent.sql`

## 2. Ortam değişkenleri (admin-panel)

`.env.local` içinde:

- `SUPABASE_SERVICE_ROLE_KEY`: Supabase Dashboard > Settings > API > service_role secret.  
  Cron API’si RLS’i bypass etmek için bu anahtarı kullanır.
- `CRON_SECRET` (isteğe bağlı): Cron isteğini korumak için. Tanımlıysa istekte bu değer gönderilmelidir.

## 3. Cron endpoint

**URL:** `GET /api/cron/send-trigger-push`

**Yetkilendirme (CRON_SECRET tanımlıysa):**

- Header: `Authorization: Bearer <CRON_SECRET>`
- veya query: `?secret=<CRON_SECRET>`

**Davranış:**

- Tetikleyici ayarı açık olan işletme sahipleri için:
  - **30 dk:** Rezervasyon saati şu andan 25–35 dk sonra ise tek seferlik push atar.
  - **1 gün:** Rezervasyon tarihi yarın (İstanbul) ise tek seferlik push atar.
- Hangi rezervasyona hangi tetikte push atıldığı `push_trigger_sent` tablosunda tutulur; aynı tetik tekrar gönderilmez.

## 4. Zamanlama örneği

Her **15 dakikada bir** çağrı yapacak şekilde (Vercel Cron, GitHub Actions, veya sunucu crontab) ayarlayın.

**Vercel (`vercel.json`):**

```json
{
  "crons": [{ "path": "/api/cron/send-trigger-push", "schedule": "*/15 * * * *" }]
}
```

Vercel Cron, isteğe `CRON_SECRET` eklemez; güvenlik için ya `CRON_SECRET`’i boş bırakıp sadece Vercel’in kendi IP’sine kısıtlayın ya da Vercel Environment Variable ile `CRON_SECRET` tanımlayıp kendi backend’inizde bu endpoint’i periyodik çağıran bir servis kullanın.

**Örnek manuel test:**

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" "https://your-admin.vercel.app/api/cron/send-trigger-push"
```
