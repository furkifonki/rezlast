-- Kapasite bazlı rezervasyon (masa seçimi kaldırılıyor, capacity_tables kullanılacak)
-- Çalıştırma: Supabase SQL Editor. Sırayla çalıştırın.

-- ========== 1) businesses tablosuna kapasite alanları ==========
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS capacity_tables INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS capacity_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN businesses.capacity_tables IS 'Toplam kapasite (masa sayısı veya kapasite birimi). Onaylanan rezervasyonlar buradan düşer.';
COMMENT ON COLUMN businesses.slot_duration_minutes IS 'Rezervasyon slot süresi (dakika). Varsayılan 90.';
COMMENT ON COLUMN businesses.capacity_enabled IS 'Kapasite kontrolü açık mı. true ise capacity_tables kullanılır, table_id zorunlu değil.';

-- İsteğe bağlı: Mevcut işletmelerde masa sayısı varsa capacity_tables’a kopyala
UPDATE businesses b
SET capacity_tables = COALESCE(
  (SELECT COUNT(*) FROM tables t WHERE t.business_id = b.id AND t.is_active = true),
  0
)
WHERE capacity_tables = 0;

-- ========== 2) reservations tablosuna slot zamanları ve table_count_used ==========
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS reservation_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reservation_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS table_count_used INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN reservations.reservation_start IS 'Rezervasyon başlangıç (tarih+saat). Kapasite çakışma kontrolü için.';
COMMENT ON COLUMN reservations.reservation_end IS 'Rezervasyon bitiş (start + duration).';
COMMENT ON COLUMN reservations.table_count_used IS 'Bu rezervasyonun kullandığı kapasite birimi. Varsayılan 1.';

-- Mevcut rezervasyonlar için reservation_start / reservation_end doldur
UPDATE reservations r
SET
  reservation_start = (
    (r.reservation_date::text || ' ' || COALESCE(substring(r.reservation_time::text from 1 for 8), '00:00:00'))::timestamp
    AT TIME ZONE 'Europe/Istanbul'
  ) AT TIME ZONE 'UTC',
  reservation_end = (
    (r.reservation_date::text || ' ' || COALESCE(substring(r.reservation_time::text from 1 for 8), '00:00:00'))::timestamp
    AT TIME ZONE 'Europe/Istanbul'
    + (COALESCE(NULLIF(r.duration_minutes, 0), 90) || ' minutes')::interval
  ) AT TIME ZONE 'UTC'
WHERE r.reservation_start IS NULL AND r.reservation_date IS NOT NULL AND r.reservation_time IS NOT NULL;

-- ========== 3) Index (kapasite / uygunluk sorguları) ==========
CREATE INDEX IF NOT EXISTS idx_reservations_capacity_slot
  ON reservations (business_id, reservation_start, reservation_end)
  WHERE status = 'confirmed';

-- ========== 4) Masa zorunluluğu trigger’ını güncelle: capacity kullanılıyorsa table_id zorunlu değil ==========
CREATE OR REPLACE FUNCTION reservations_require_table_when_available()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  use_capacity boolean;
  has_tables boolean;
BEGIN
  -- Kapasite modu açıksa table_id zorunlu değil
  SELECT (b.capacity_enabled = true AND b.capacity_tables > 0)
  INTO use_capacity
  FROM businesses b WHERE b.id = NEW.business_id;

  IF use_capacity THEN
    RETURN NEW;
  END IF;

  IF NEW.table_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM tables t
    WHERE t.business_id = NEW.business_id AND t.is_active = true
    LIMIT 1
  ) INTO has_tables;

  IF has_tables THEN
    RAISE EXCEPTION 'Bu işletme için masa seçimi zorunludur.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- ========== 5) Kapasite uygunluğu: slotta confirmed sayısı ==========
-- Kullanım: SELECT * FROM get_confirmed_count_in_slot('business_id', 'start_ts', 'end_ts');
CREATE OR REPLACE FUNCTION get_confirmed_count_in_slot(
  p_business_id UUID,
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(table_count_used), 0)::INTEGER
  FROM reservations
  WHERE business_id = p_business_id
    AND status = 'confirmed'
    AND reservation_start IS NOT NULL
    AND reservation_end IS NOT NULL
    AND reservation_start < p_end
    AND reservation_end > p_start;
$$;

COMMENT ON FUNCTION get_confirmed_count_in_slot IS 'Verilen slotta (start-end) bu işletme için confirmed rezervasyonların toplam table_count_used değeri.';

-- ========== 6) Onay öncesi kapasite kontrolü (admin / API) ==========
-- Kullanım: SELECT * FROM check_capacity_for_confirm('reservation_id');
-- Döner: ok boolean, msg text. reservation_start/end null ise reservation_date + reservation_time + duration_minutes ile hesaplanır.
CREATE OR REPLACE FUNCTION check_capacity_for_confirm(p_reservation_id UUID)
RETURNS TABLE(ok boolean, msg text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_table_count_used INTEGER;
  v_capacity_tables INTEGER;
  v_current_used INTEGER;
  v_date DATE;
  v_time TIME;
  v_duration INTEGER;
BEGIN
  SELECT r.business_id, r.reservation_start, r.reservation_end, r.table_count_used,
         r.reservation_date, r.reservation_time, r.duration_minutes
  INTO v_business_id, v_start, v_end, v_table_count_used,
       v_date, v_time, v_duration
  FROM reservations r
  WHERE r.id = p_reservation_id;

  IF v_business_id IS NULL THEN
    RETURN QUERY SELECT false, 'Rezervasyon bulunamadı.'::text;
    RETURN;
  END IF;

  IF v_start IS NULL OR v_end IS NULL THEN
    IF v_date IS NOT NULL AND v_time IS NOT NULL THEN
      v_start := (v_date + v_time) AT TIME ZONE 'Europe/Istanbul';
      v_duration := COALESCE(NULLIF(v_duration, 0), 90);
      v_end := v_start + (v_duration || ' minutes')::interval;
    ELSE
      RETURN QUERY SELECT true, ''::text;
      RETURN;
    END IF;
  END IF;

  SELECT b.capacity_tables INTO v_capacity_tables
  FROM businesses b WHERE b.id = v_business_id;

  IF v_capacity_tables IS NULL OR v_capacity_tables <= 0 THEN
    RETURN QUERY SELECT true, ''::text;
    RETURN;
  END IF;

  v_current_used := get_confirmed_count_in_slot(v_business_id, v_start, v_end);

  IF v_current_used + COALESCE(v_table_count_used, 1) > v_capacity_tables THEN
    RETURN QUERY SELECT false, 'Bu saat diliminde kapasite dolu.'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, ''::text;
END;
$$;

GRANT EXECUTE ON FUNCTION get_confirmed_count_in_slot TO authenticated;
GRANT EXECUTE ON FUNCTION get_confirmed_count_in_slot TO service_role;
GRANT EXECUTE ON FUNCTION check_capacity_for_confirm TO authenticated;
GRANT EXECUTE ON FUNCTION check_capacity_for_confirm TO service_role;

-- ========== 7) Seçilen slotta kapasitesi olan işletme ID'leri (liste/Keşfet filtresi) ==========
-- Kullanım: SELECT * FROM list_business_ids_available_for_slot('2025-02-26'::date, '19:00'::time, 90);
-- Döner: business_id uuid. Explore'da tarih+saat seçildiğinde bu ID'lere göre filtre uygulanabilir.
CREATE OR REPLACE FUNCTION list_business_ids_available_for_slot(
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER
)
RETURNS SETOF UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_used INTEGER;
  v_cap INTEGER;
  v_bid UUID;
BEGIN
  v_start := (p_date + p_time) AT TIME ZONE 'Europe/Istanbul';
  v_end := v_start + (COALESCE(NULLIF(p_duration_minutes, 0), 90) || ' minutes')::interval;

  FOR v_bid IN SELECT id FROM businesses WHERE is_active = true
  LOOP
    SELECT capacity_tables INTO v_cap FROM businesses WHERE id = v_bid;
    IF v_cap IS NULL OR v_cap <= 0 THEN
      RETURN NEXT v_bid;
      CONTINUE;
    END IF;
    v_used := get_confirmed_count_in_slot(v_bid, v_start, v_end);
    IF v_used < v_cap THEN
      RETURN NEXT v_bid;
    END IF;
  END LOOP;
  RETURN;
END;
$$;

COMMENT ON FUNCTION list_business_ids_available_for_slot IS 'Verilen tarih+saat+slot süresinde kapasitesi olan işletme ID''leri. Explore/listing''de filtre için kullanılır.';
GRANT EXECUTE ON FUNCTION list_business_ids_available_for_slot TO authenticated;
GRANT EXECUTE ON FUNCTION list_business_ids_available_for_slot TO anon;
GRANT EXECUTE ON FUNCTION list_business_ids_available_for_slot TO service_role;
