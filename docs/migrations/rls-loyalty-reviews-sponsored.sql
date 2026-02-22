-- RLS: Loyalty, Reviews, Sponsored Listings
-- create-loyalty-reviews-sponsored-tables.sql çalıştırıldıktan sonra çalıştırın.

-- ========== loyalty_transactions ==========
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Users can view own loyalty_transactions"
  ON loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Rezervasyon tamamlandığında veya admin manuel eklediğinde: sadece işletme sahibi insert yapabilsin
DROP POLICY IF EXISTS "Business owners can insert loyalty for own business" ON loyalty_transactions;
CREATE POLICY "Business owners can insert loyalty for own business"
  ON loyalty_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = loyalty_transactions.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- ========== reviews ==========
-- Sütun yoksa ekle (tablo eski şemayla oluşturulmuşsa)
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view non-hidden reviews" ON reviews;
CREATE POLICY "Anyone can view non-hidden reviews"
  ON reviews FOR SELECT
  USING (COALESCE(is_hidden, false) = false);

-- İşletme sahibi kendi işletmesinin tüm yorumlarını (gizli dahil) görebilsin (admin paneli)
DROP POLICY IF EXISTS "Business owners can view all reviews of own business" ON reviews;
CREATE POLICY "Business owners can view all reviews of own business"
  ON reviews FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE businesses.id = reviews.business_id AND businesses.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reviews" ON reviews;
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);

-- Admin yorum silme/gizleme: işletme sahibi kendi işletmesinin yorumlarını güncelleyebilsin (is_hidden)
DROP POLICY IF EXISTS "Business owners can update reviews of own business" ON reviews;
CREATE POLICY "Business owners can update reviews of own business"
  ON reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- İşletme sahibi kendi işletmesinin yorumlarını silebilsin (admin paneli)
DROP POLICY IF EXISTS "Business owners can delete reviews of own business" ON reviews;
CREATE POLICY "Business owners can delete reviews of own business"
  ON reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reviews.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- ========== sponsored_listings ==========
ALTER TABLE sponsored_listings ENABLE ROW LEVEL SECURITY;

-- Herkes aktif (paid, end_date >= today) sponsorlu listeleri okuyabilsin (Keşfet için)
DROP POLICY IF EXISTS "Anyone can view active sponsored_listings" ON sponsored_listings;
CREATE POLICY "Anyone can view active sponsored_listings"
  ON sponsored_listings FOR SELECT
  USING (
    payment_status = 'paid' AND end_date >= CURRENT_DATE AND start_date <= CURRENT_DATE
  );

-- Sadece işletme sahibi kendi işletmesinin sponsorlu kayıtlarını yönetebilsin (admin panel)
DROP POLICY IF EXISTS "Business owners can manage own sponsored_listings" ON sponsored_listings;
CREATE POLICY "Business owners can manage own sponsored_listings"
  ON sponsored_listings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = sponsored_listings.business_id AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = sponsored_listings.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- ========== loyalty_rules ==========
ALTER TABLE loyalty_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active loyalty_rules" ON loyalty_rules;
CREATE POLICY "Anyone can view active loyalty_rules"
  ON loyalty_rules FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Business owners can manage own loyalty_rules" ON loyalty_rules;
CREATE POLICY "Business owners can manage own loyalty_rules"
  ON loyalty_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = loyalty_rules.business_id AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = loyalty_rules.business_id AND businesses.owner_id = auth.uid()
    )
  );
