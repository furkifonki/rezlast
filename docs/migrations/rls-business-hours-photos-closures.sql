-- RLS: İşletme sahipleri kendi business_hours, business_photos, business_closures kayıtlarını yönetebilir.
-- Supabase Dashboard → SQL Editor'da bu dosyayı çalıştırın.
--
-- Çalışma saatleri / fotoğraf / kapalı gün kaydederken "permission denied" veya kayıt oluşmuyorsa
-- bu tablolarda RLS açık ama politika yok demektir; bu script ile politikaları ekleyin.

-- business_hours
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own business_hours"
  ON business_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_hours.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own business_hours"
  ON business_hours FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_hours.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own business_hours"
  ON business_hours FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_hours.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own business_hours"
  ON business_hours FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_hours.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- business_photos
ALTER TABLE business_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own business_photos"
  ON business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own business_photos"
  ON business_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own business_photos"
  ON business_photos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own business_photos"
  ON business_photos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- business_closures
ALTER TABLE business_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own business_closures"
  ON business_closures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_closures.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own business_closures"
  ON business_closures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_closures.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own business_closures"
  ON business_closures FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_closures.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own business_closures"
  ON business_closures FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_closures.business_id AND businesses.owner_id = auth.uid()
    )
  );
