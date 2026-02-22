-- Loyalty, Reviews ve Sponsorlu tabloları.
-- Supabase SQL Editor'da çalıştırın. Tablolar zaten varsa hata alırsınız; o zaman sadece RLS migration'ını çalıştırın.

-- loyalty_transactions: puan kazanım/harcama kayıtları
CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL DEFAULT 'earned',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON loyalty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_business ON loyalty_transactions(business_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_reservation ON loyalty_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_created ON loyalty_transactions(created_at DESC);

-- reviews: işletme yorumları ve 1-5 puan
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_hidden BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_business_user ON reviews(business_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_business ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(created_at DESC);

-- sponsored_listings: öne çıkan işletmeler (tarih aralığı + öncelik)
CREATE TABLE IF NOT EXISTS sponsored_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  package_type VARCHAR(50) NOT NULL DEFAULT 'weekly',
  payment_status VARCHAR(50) DEFAULT 'paid',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_business ON sponsored_listings(business_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_category ON sponsored_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_dates ON sponsored_listings(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sponsored_listings_active ON sponsored_listings(end_date) WHERE payment_status = 'paid';

-- loyalty_rules: işletme bazlı puan kuralları (opsiyonel)
CREATE TABLE IF NOT EXISTS loyalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  rule_type VARCHAR(50) NOT NULL DEFAULT 'points_per_reservation',
  rule_config JSONB NOT NULL DEFAULT '{"points": 10}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_rules_business ON loyalty_rules(business_id);

COMMENT ON TABLE loyalty_transactions IS 'Kullanıcı puan hareketleri (kazanç/harcama).';
COMMENT ON TABLE reviews IS 'İşletme yorumları ve 1-5 yıldız puanı.';
COMMENT ON TABLE sponsored_listings IS 'Öne çıkan (sponsorlu) işletmeler, tarih ve öncelik.';
COMMENT ON TABLE loyalty_rules IS 'İşletme bazlı puan kazanım kuralları.';
