-- Müsait masalar: Verilen işletme, tarih, saat ve süre için rezervasyonu olmayan masalar.
-- Mobil uygulama: supabase.rpc('get_available_tables', { p_business_id: '...', p_date: '2025-02-22', p_time: '19:00', p_duration_minutes: 120 })
-- Supabase SQL Editor'da çalıştırın.

CREATE OR REPLACE FUNCTION get_available_tables(
  p_business_id UUID,
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER DEFAULT 120
)
RETURNS SETOF tables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_ts TIME;
  v_end_ts TIME;
  v_end_ts_next TIME;
BEGIN
  v_start_ts := p_time;
  IF p_duration_minutes <= 0 THEN
    v_end_ts := '23:59:59'::TIME;
  ELSE
    v_end_ts := p_time + (p_duration_minutes || ' minutes')::INTERVAL;
    IF v_end_ts <= p_time THEN
      v_end_ts := '23:59:59'::TIME;
    END IF;
  END IF;

  RETURN QUERY
  SELECT t.*
  FROM tables t
  WHERE t.business_id = p_business_id
    AND t.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.table_id = t.id
        AND r.reservation_date = p_date
        AND r.status IN ('pending', 'confirmed')
        AND (
          -- Süre yok / tüm gün: o gün masayı tamamen bloke et
          (r.duration_minutes IS NULL OR r.duration_minutes = 0)
          OR
          -- Saat aralığı çakışıyor (end_time varsa onu kullan)
          (r.end_time IS NOT NULL
           AND r.reservation_time IS NOT NULL
           AND r.reservation_time < v_end_ts
           AND r.end_time > v_start_ts)
          OR
          -- end_time yok, duration ile bitiş hesapla
          (r.end_time IS NULL AND r.duration_minutes > 0
           AND r.reservation_time < v_end_ts
           AND (r.reservation_time + (r.duration_minutes || ' minutes')::INTERVAL) > v_start_ts)
        )
    );
END;
$$;

COMMENT ON FUNCTION get_available_tables IS 'Mobil: Verilen tarih/saat/süre için müsait masaları döner. RLS bypass (SECURITY DEFINER) ile çağrılır.';
GRANT EXECUTE ON FUNCTION get_available_tables TO anon, authenticated;
