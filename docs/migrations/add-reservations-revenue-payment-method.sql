-- Gelir takibi: Rezervasyonlara elde edilen ücret ve ödeme yöntemi alanları.
-- Ödeme yöntemleri admin tarafından eklenebilir (Nakit, Kredi Kartı, Havale vb.).
-- Supabase SQL Editor'da çalıştırın.

-- Ödeme yöntemleri (admin panelden eklenebilir)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_sort ON payment_methods(sort_order);

COMMENT ON TABLE payment_methods IS 'Ödeme yöntemleri: Nakit, Kredi Kartı, Havale vb. Admin panelden eklenir.';

-- Varsayılan ödeme yöntemlerini ekle
INSERT INTO payment_methods (name, sort_order) VALUES
  ('Nakit', 1),
  ('Kredi Kartı', 2),
  ('Havale / EFT', 3),
  ('Diğer', 4)
ON CONFLICT (name) DO NOTHING;

-- Rezervasyonlara ücret ve ödeme yöntemi (opsiyonel, admin girer)
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS amount DECIMAL(10, 2) NULL,
  ADD COLUMN IF NOT EXISTS payment_method_id UUID NULL REFERENCES payment_methods(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reservations_payment_method ON reservations(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_reservations_amount ON reservations(amount) WHERE amount IS NOT NULL;

COMMENT ON COLUMN reservations.amount IS 'Elde edilen ücret (TL). Opsiyonel, admin tarafından girilir.';
COMMENT ON COLUMN reservations.payment_method_id IS 'Ödeme yöntemi. Opsiyonel, admin tarafından seçilir.';

-- RLS: payment_methods herkes (authenticated) okuyabilsin, sadece authenticated insert/update/delete (admin panel)
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read payment_methods" ON payment_methods;
CREATE POLICY "Authenticated can read payment_methods"
  ON payment_methods FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can manage payment_methods" ON payment_methods;
CREATE POLICY "Authenticated can manage payment_methods"
  ON payment_methods FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON POLICY "Authenticated can read payment_methods" ON payment_methods IS 'Gelir sayfası ve rezervasyon formu için liste.';
COMMENT ON POLICY "Authenticated can manage payment_methods" ON payment_methods IS 'Admin yeni ödeme yöntemi ekleyebilir.';
