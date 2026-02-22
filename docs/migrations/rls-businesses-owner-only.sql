-- RLS: Admin panelde kullanıcı sadece kendi işletmelerini görsün.
-- Bu script'i çalıştırmadan önce: Admin panelde tüm businesses sorguları
-- .eq('owner_id', user.id) ile filtrelenmiş olmalı (yapıldı).
-- Bu migration ile veritabanı tarafında da SELECT sadece owner'a açılır.
--
-- Dikkat: Mobil uygulama müşteri tarafında "tüm aktif işletmeleri listele" için
-- bu policy yeterli değildir (müşteri owner değil). Müşteri listesi için:
-- - Ya ayrı bir view/fonksiyon (SECURITY DEFINER) kullanın (is_active = true),
-- - Ya da anon key ile erişilebilir bir API/Edge Function.
--
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- Eski "herkes aktif işletmeleri görsün" varsa kaldır (policy adı farklı olabilir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'businesses' AND policyname = 'Anyone can view active businesses'
  ) THEN
    DROP POLICY "Anyone can view active businesses" ON businesses;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Sadece kendi işletmelerini görebilir
CREATE POLICY "Business owners can view own businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Business owners can update own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Business owners can delete own businesses"
  ON businesses FOR DELETE
  USING (auth.uid() = owner_id);

-- INSERT zaten add-businesses-insert-policy.sql ile eklenmiş olmalı:
-- WITH CHECK (auth.uid() = owner_id)
COMMENT ON TABLE businesses IS 'RLS: SELECT/UPDATE/DELETE only where owner_id = auth.uid(). Insert policy separate.';
