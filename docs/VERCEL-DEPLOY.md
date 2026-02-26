# Web Uygulamasını Vercel ile Deploy Etme

Mobil web versiyonu (**web-app** – Next.js) Vercel üzerinde yayınlanabilir.

---

## 1. Ön koşullar

- Proje **Git** ile takip ediliyor ve **GitHub** / **GitLab** / **Bitbucket**’a push edilmiş olmalı.
- Supabase **Project URL** ve **anon public** key’e sahip olmalısınız.

---

## 2. Vercel’de proje oluşturma

1. **[vercel.com](https://vercel.com)** → giriş yapın (GitHub ile bağlayabilirsiniz).
2. **Add New…** → **Project**.
3. **Import** ile reponuzu seçin (örn. `Rezervasyon Uygulaması` veya repo adı).
4. **Root Directory:** **Edit** deyip **`web-app`** yazın (proje kökü değil, `web-app` klasörü deploy edilecek).
5. **Framework Preset:** Vercel otomatik **Next.js** seçer; değiştirmeyin.
6. **Build Command:** `npm run build` (varsayılan).
7. **Output Directory:** boş bırakın (Next.js varsayılanı kullanılır).
8. **Install Command:** `npm install` (varsayılan).

---

## 3. Ortam değişkenleri (Environment Variables)

Supabase kullanıldığı için build ve çalışma anında bu değişkenler gerekli:

| Name | Value | Not |
|------|--------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGci...` | Supabase → Settings → API → anon public |

**Vercel’de ekleme:**

- Import ekranında **Environment Variables** bölümünde ekleyin **veya**
- Proje açıldıktan sonra **Settings** → **Environment Variables** → **Add** (Production, Preview, Development için işaretleyin).

---

## 4. Deploy

- **Deploy** butonuna tıklayın.
- Build bittikten sonra size bir URL verilir (örn. `https://web-app-xxx.vercel.app`).
- Her `main` (veya bağladığınız branch) push’unda otomatik yeni deploy alınır.

---

## 5. Özel domain (isteğe bağlı)

- **Project** → **Settings** → **Domains** → kendi domain’inizi ekleyin.
- Vercel’in verdiği DNS kayıtlarını domain sağlayıcınızda tanımlayın.

---

## Özet

| Adım | Yapılacak |
|------|------------|
| Repo | GitHub/GitLab’a push |
| Vercel | Import → Root: **web-app** |
| Env | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Deploy | Deploy → URL’den erişim |

Bu adımlarla mobil web versiyonu Vercel’de yayında olur.
