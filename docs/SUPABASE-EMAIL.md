# Supabase: Kayıt Sonrası E-posta Gelmiyor

Yeni kayıt açıldığında doğrulama e-postası gelmiyorsa aşağıdakileri kontrol edin.

---

## 1. Hızlı çözüm: E-posta doğrulamayı kapat (test / MVP)

E-posta gelmeden de kullanıcı giriş yapabilsin istiyorsanız:

1. **Supabase Dashboard** → **Authentication** → **Providers** → **Email**
2. **"Confirm email"** seçeneğini **kapatın** (OFF)
3. **Save** ile kaydedin

Bundan sonra kayıt olan kullanıcılar **doğrulama linkine tıklamadan** doğrudan giriş yapabilir. Geliştirme ve ilk testler için genelde bu yeterli olur.

---

## 2. E-postanın gerçekten gelmemesi (Confirm email açıkken)

E-posta doğrulama açıkken mail gelmiyorsa:

### Site URL ve Redirect URL

1. **Supabase** → **Authentication** → **URL Configuration**
2. **Site URL:** Canlı sitenizin adresi (örn. `https://rezlast.vercel.app`)
3. **Redirect URLs:** Şunları ekleyin:
   - `https://rezlast.vercel.app/**` (veya kendi domain’iniz)
   - **Şifre sıfırlama** için: `https://rezlast.vercel.app/reset-password`  
   (Doğrulama ve şifre sıfırlama linkleri tıklanınca kullanıcı bu adreslere yönlendirilir.)

Yanlış veya eksik URL olursa link çalışmaz; bazen mail “gönderildi” görünür ama kullanıcı yanlış sayfaya düşer.

### Spam / Promotions

- Gelen kutusunda **Spam** ve **Promotions** klasörlerine bakın.
- Supabase varsayılan e-posta servisi bazen spam’e düşer.

### Supabase varsayılan e-posta limiti

- Ücretsiz planda günlük e-posta sayısı sınırlıdır.
- Limit aşıldıysa veya proje duraklatıldıysa mail gitmez.  
  **Dashboard** → **Settings** → **General** içinde proje durumunu kontrol edin.

---

## 3. Kalıcı çözüm: Kendi SMTP’nizi kullanın (önerilen)

Canlı ortamda güvenilir e-posta için kendi SMTP’nizi tanımlayın:

1. **Supabase** → **Project Settings** → **Authentication** → **SMTP Settings**
2. **Enable Custom SMTP** açın.
3. Bir e-posta servisi kullanın, örneğin:
   - **Resend** (resend.com) – ücretsiz kotası var
   - **SendGrid**
   - **Mailgun**
   - Kendi sunucunuz / hosting SMTP bilgileri

4. Servisin verdiği **Host, Port, User, Password** değerlerini girin, **Sender email** ve **Sender name** ayarlayın, kaydedin.

Böylece doğrulama e-postaları bu SMTP üzerinden gider; teslim ve spam sorunları genelde azalır.

---

## Özet

| Amaç | Ne yapın |
|------|----------|
| Hızlı test, mail beklemeden giriş | Auth → Providers → Email → **Confirm email** OFF |
| Link çalışsın, doğru siteye gitsin | Auth → URL Configuration → **Site URL** ve **Redirect URLs** = canlı site adresi |
| Mail hiç gelmiyor | Spam/promotions, proje limiti, gerekirse **Custom SMTP** ekleyin |
