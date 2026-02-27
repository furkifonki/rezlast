# i18n Kullanımı

Tek kaynak: `docs/i18n/messages.tr.json`. Anahtarlar: `auth.*`, `reservation.*`, `profile.*`, `chat.*`, `admin.*`, `common.*`, `errors.*`.

## Mobile App (React Native)

```ts
// lib/i18n.ts
import { t } from '../lib/i18n';

// Kullanım
toast.error(t('auth.invalidCredentials'));
toast.error(t('reservation.date_time_required'));
toast.error(t('reservation.table_required'));
toast.error(t('reservation.select_table_required'));
toast.error(t('reservation.party_exceeds_max', { max: '8' }));
<Text>{t('reservation.success_message')}</Text>
```

`lib/i18n.ts` içinde `TR` map’e yeni anahtarlar ekleyin; mümkünse `messages.tr.json` ile senkron tutun.

## Web App (Next.js)

```ts
// lib/i18n.ts – t(key, params?) ile aynı mantık
import { t } from '@/lib/i18n';

setError(t('auth.invalidCredentials'));
<p>{t('reservation.empty')}</p>
```

## Anahtar Örnekleri

| Anahtar | Örnek metin |
|--------|--------------|
| `auth.invalidCredentials` | E-posta veya şifre hatalı. |
| `auth.login.email_password_required` | E-posta ve şifre girin. |
| `reservation.date_time_required` | Tarih ve saat seçin. |
| `reservation.table_required` | Lütfen müsait bir masa seçin... |
| `reservation.select_table_required` | Rezervasyon için müsait bir masa seçin. |
| `reservation.party_exceeds_max` | Bu işletmede masa kapasitesi en fazla {max} kişiliktir... |
| `reservation.success_message` | Rezervasyonunuz restorana onaya gönderildi... |
| `profile.save_success` | Profil bilgileriniz güncellendi. |
| `chat.empty` | Henüz mesaj yok. İlk mesajı siz atın. |
| `chat.send_error` | Mesaj gönderilemedi. |
| `common.loading` | Yükleniyor... |
| `errors.network` | İnternet bağlantınızı kontrol edin. |

Parametreli kullanım: `t('reservation.party_exceeds_max', { max: String(maxTableCapacity) })`.
