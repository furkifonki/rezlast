-- Puan seviyeleri (bronz/gümüş/altın/platin) açıklamaları, KVKK/ETK metinleri ve e-posta/SMS izinleri.
-- Supabase SQL Editor'da çalıştırın.

-- 1) Puan seviyesi tanımları (minimum puan ve açıklama)
CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id TEXT PRIMARY KEY,
  min_points INTEGER NOT NULL DEFAULT 0,
  display_name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE loyalty_tiers IS 'Puan seviyeleri: Bronz, Gümüş, Altın, Platin - kullanıcıya nasıl kullanılır bilgisi için.';

INSERT INTO loyalty_tiers (id, min_points, display_name, description, sort_order) VALUES
  ('bronze', 0, 'Bronz', 'Rezervasyonlarınızı tamamladıkça puan kazanırsınız. Puanlarınızı işletmelerde indirim veya özel avantajlar için kullanabilirsiniz.', 1),
  ('silver', 100, 'Gümüş', '100+ puan: Gümüş üye avantajları. İşletmelerin belirlediği indirimlerden yararlanın.', 2),
  ('gold', 500, 'Altın', '500+ puan: Altın üye avantajları. Öncelikli rezervasyon ve ekstra indirimler.', 3),
  ('platinum', 1500, 'Platin', '1500+ puan: Platin üye. En yüksek avantajlar ve özel kampanyalara erişim.', 4)
ON CONFLICT (id) DO UPDATE SET
  min_points = EXCLUDED.min_points,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

-- 2) Yasal metinler (KVKK, ETK)
CREATE TABLE IF NOT EXISTS app_legal_texts (
  key TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE app_legal_texts IS 'KVKK ve ETK metinleri; uygulama ve admin panelde gösterilir.';

INSERT INTO app_legal_texts (key, title, body) VALUES
  ('kvkk', 'KVKK Aydınlatma Metni', 'REZVIO olarak kişisel verilerinizin güvenliği bizim için önemlidir. 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) kapsamında aydınlatma yükümlülüğümüzü yerine getirmek amacıyla bu metni sunmaktayız.

Veri Sorumlusu: Rezvio uygulaması kapsamında kişisel verileriniz, veri sorumlusu sıfatıyla tarafımızca işlenmektedir.

İşlenen Veriler: Ad, soyad, e-posta adresi, telefon numarası, rezervasyon geçmişi ve uygulama kullanım verileriniz işlenebilmektedir.

Amaç: Rezervasyon yönetimi, müşteri hizmetleri, iletişim, yasal yükümlülüklerin yerine getirilmesi ve meşru menfaat kapsamında hizmet kalitesinin artırılması.

Hukuki Sebep: KVKK md. 5 kapsamında açık rızanız, sözleşmenin ifası ve meşru menfaat.

Aktarım: Verileriniz yalnızca yasal zorunluluk veya hizmet sağlayıcılar (sunucu, e-posta vb.) ile sınırlı olarak paylaşılabilir.

Haklarınız: Kişisel verilerinize erişim, düzeltme, silme, işlemenin kısıtlanması, itiraz ve taşınabilirlik taleplerinizi bize iletebilirsiniz.')
ON CONFLICT (key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = NOW();

INSERT INTO app_legal_texts (key, title, body) VALUES
  ('etk', 'Elektronik Ticaret ve İletişim İzinleri', '6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (“ETK”) kapsamında, ticari elektronik iletiler (e-posta, SMS vb.) gönderebilmemiz için açık rızanız gerekmektedir.

Rezvio olarak:
• Rezervasyon onayı, hatırlatma ve iptal bildirimleri (yasal/zorunlu iletişim) için iletişim bilgilerinizi kullanırız.
• Kampanya, indirim ve yenilikler hakkında e-posta veya SMS göndermek için ayrıca izninize ihtiyacımız vardır.

Aşağıdaki onayları isteğe bağlı olarak verebilirsiniz:
• E-posta ile ticari ileti: Kampanya ve bilgilendirmelerin e-posta ile gönderilmesi.
• SMS ile ticari ileti: Kampanya ve bilgilendirmelerin SMS ile gönderilmesi.

Bu izinleri istediğiniz zaman profil ayarlarından geri alabilirsiniz.')
ON CONFLICT (key) DO UPDATE SET title = EXCLUDED.title, body = EXCLUDED.body, updated_at = NOW();

-- 3) Kullanıcı iletişim izinleri (users tablosuna sütunlar)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_marketing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sms_marketing_consent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS kvkk_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS etk_accepted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN users.email_marketing_consent IS 'ETK: E-posta ile ticari ileti gönderilmesine açık rıza.';
COMMENT ON COLUMN users.sms_marketing_consent IS 'ETK: SMS ile ticari ileti gönderilmesine açık rıza.';
COMMENT ON COLUMN users.marketing_consent_at IS 'İletişim izinlerinin verildiği tarih.';
COMMENT ON COLUMN users.kvkk_accepted_at IS 'KVKK metninin kabul edildiği tarih.';
COMMENT ON COLUMN users.etk_accepted_at IS 'ETK metninin kabul edildiği tarih.';

-- RLS: loyalty_tiers ve app_legal_texts herkese okunabilir (anon + authenticated)
ALTER TABLE loyalty_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read loyalty_tiers" ON loyalty_tiers;
CREATE POLICY "Anyone can read loyalty_tiers" ON loyalty_tiers FOR SELECT USING (true);

ALTER TABLE app_legal_texts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read app_legal_texts" ON app_legal_texts;
CREATE POLICY "Anyone can read app_legal_texts" ON app_legal_texts FOR SELECT USING (true);

-- users güncellemesi: profil sayfasında email_marketing_consent, sms_marketing_consent güncellenebilsin
-- (Mevcut "Users can update own profile" policy zaten tüm sütunları kapsıyor olabilir; ek sütunlar da güncellenebilir.)
-- Gerekirse ayrı policy gerekmez; "Users can update own profile" WITH CHECK (auth.uid() = id) tüm sütunları kapsar.
