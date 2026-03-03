-- Haftanın günlerine göre kapasite kuralları.
-- Çalıştırma: Supabase SQL Editor (public şeması).
--
-- Amaç:
-- - Her işletme için genel kapasite: businesses.capacity_tables, businesses.slot_duration_minutes
-- - Gün bazlı override: business_capacity_rules
-- - Kapalı gün: is_closed = true (o gün hiçbir slot üretilmez)
--
-- Not: day_of_week alanı PostgreSQL DOW ile uyumludur (0=Sunday, 1=Monday, ..., 6=Saturday).

CREATE TABLE IF NOT EXISTS business_capacity_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  capacity_tables INTEGER,
  slot_duration_minutes INTEGER,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (business_id, day_of_week)
);

COMMENT ON TABLE business_capacity_rules IS 'İşletme bazında gün gün kapasite/slot süresi kuralları. Boş ise businesses.* değerleri kullanılır.';
COMMENT ON COLUMN business_capacity_rules.capacity_tables IS 'Bu gün için kapasite override. NULL ise businesses.capacity_tables kullanılır.';
COMMENT ON COLUMN business_capacity_rules.slot_duration_minutes IS 'Bu gün için slot süresi override. NULL ise businesses.slot_duration_minutes kullanılır.';
COMMENT ON COLUMN business_capacity_rules.is_closed IS 'Bu gün tamamen rezervasyona kapalı mı? true ise hiçbir slot / uygunluk üretilmez.';

-- Basit updated_at trigger (opsiyonel, idempotent)
CREATE OR REPLACE FUNCTION set_business_capacity_rules_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $func$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$func$;

DROP TRIGGER IF EXISTS trg_business_capacity_rules_set_updated_at ON business_capacity_rules;
CREATE TRIGGER trg_business_capacity_rules_set_updated_at
  BEFORE UPDATE ON business_capacity_rules
  FOR EACH ROW EXECUTE FUNCTION set_business_capacity_rules_updated_at();

-- RLS: İşletme sahibi kendi kapasite kurallarını yönetebilir.
ALTER TABLE business_capacity_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own business_capacity_rules"
  ON business_capacity_rules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_capacity_rules.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can insert own business_capacity_rules"
  ON business_capacity_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_capacity_rules.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can update own business_capacity_rules"
  ON business_capacity_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_capacity_rules.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Business owners can delete own business_capacity_rules"
  ON business_capacity_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_capacity_rules.business_id
        AND businesses.owner_id = auth.uid()
    )
  );

