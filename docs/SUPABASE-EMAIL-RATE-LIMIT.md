# Supabase "Email rate limit exceeded" Hatası

## Neden oluyor?

Kayıt (signup) sırasında Supabase Auth, varsayılan olarak **e-posta doğrulama** gönderir. Supabase’in kendi SMTP’si **geliştirme/test** içindir ve saatte **2 e-posta** ile sınırlıdır. Bu limiti aşınca "Email rate limit exceeded" hatası alırsınız.

## Çözümler

### 1. Geliştirme için: E-posta onayını kapat (hızlı çözüm)

Supabase Dashboard’da:

1. **Authentication** → **Providers** → **Email**
2. **Confirm email** seçeneğini **OFF** yapın.

Böylece kayıt sırasında doğrulama e-postası gönderilmez, limit aşılmaz ve kullanıcı hemen giriş yapabilir. **Sadece geliştirme ortamı için** uygundur.

### 2. Canlı / üretim için: Özel SMTP kullan

Varsayılan SMTP yerine kendi SMTP’nizi kullanırsanız limitler genelde daha yüksek olur (ve e-postalar kendi domain’inizden gider):

1. **Project Settings** → **Auth** → **SMTP Settings**
2. **Custom SMTP** açın.
3. SendGrid, Resend, Brevo, AWS SES vb. bir sağlayıcıdan SMTP bilgilerini girin.

Detay: [Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

### 3. Rate limit değerini artırmak

Özel SMTP kullandıktan sonra:

- **Dashboard** → **Auth** → **Rate Limits** (veya Management API) üzerinden `rate_limit_email_sent` değerini artırabilirsiniz.

## Özet

| Ortam        | Öneri |
|-------------|--------|
| Geliştirme  | "Confirm email" kapat → kayıt hemen çalışır, e-posta limiti sorun olmaz. |
| Canlı/Prod  | Custom SMTP + gerekirse rate limit artırımı. |

Hata mesajı doğrudan Supabase Auth’tan gelir; uygulama tarafında ek bir kod değişikliği gerekmez (e-posta gönderimini Supabase yapar).
