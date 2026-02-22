-- RLS: İşletme sahipleri kendi services ve tables kayıtlarını yönetebilir.
-- Supabase SQL Editor'da çalıştırın.

-- services
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own services"
  ON services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own services"
  ON services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own services"
  ON services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own services"
  ON services FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- tables
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own tables"
  ON tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tables.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own tables"
  ON tables FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tables.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own tables"
  ON tables FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tables.business_id AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own tables"
  ON tables FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tables.business_id AND businesses.owner_id = auth.uid()
    )
  );
