-- Rezervasyon: slot (tarih+saat) ve işletmede masa varsa table_id zorunluluğu
-- Çalıştırma: Supabase SQL Editor

-- 1) Tarih ve saat her zaman dolu olsun (mevcut kolonlar NOT NULL değilse ALTER gerekebilir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reservations'
    AND column_name = 'reservation_date'
  ) THEN
    ALTER TABLE reservations
      ALTER COLUMN reservation_date SET NOT NULL,
      ALTER COLUMN reservation_time SET NOT NULL;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL; -- Kolonlar zaten NOT NULL veya yoksa devam et
END $$;

-- 2) İşletmede aktif masa varken table_id olmadan insert engelle (trigger)
CREATE OR REPLACE FUNCTION reservations_require_table_when_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_tables boolean;
BEGIN
  IF NEW.table_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM tables
    WHERE business_id = NEW.business_id AND is_active = true
    LIMIT 1
  ) INTO has_tables;
  IF has_tables THEN
    RAISE EXCEPTION 'Bu işletme için masa seçimi zorunludur.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_require_table ON reservations;
CREATE TRIGGER trg_reservations_require_table
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION reservations_require_table_when_available();

COMMENT ON FUNCTION reservations_require_table_when_available() IS 'İşletmede aktif masa varken table_id olmadan rezervasyon insert engellenir.';
