-- Müsait masalar: Verilen işletme, tarih, saat ve süre için rezervasyonu olmayan masalar.
-- Mobil uygulama: supabase.rpc('get_available_tables', { p_business_id: '...', p_date: '2025-02-22', p_time: '19:00:00', p_duration_minutes: 120 })
-- Supabase SQL Editor'da çalıştırın.
--
-- BOŞ MASA GÖRÜNMEMESİNİN NEDENLERİ:
-- 1) İşletmede hiç masa tanımlı değil: Admin panel > Masalar bölümünden bu işletme için en az bir masa ekleyin.
-- 2) O gün için "Tüm gün" veya "Tüm akşam" (duration_minutes = 0 veya NULL) rezervasyon varsa o masa o gün tamamen bloke sayılır;
--    yani o masa o gün hiçbir saatte müsait çıkmaz. Rezervasyonlar farklı gün/saat için olsa bile, aynı günde duration=0
--    olan bir rezervasyon o masayı tüm gün kilitler.

-- Dönüş tipi değiştiği için önce eski fonksiyonu kaldırıyoruz.
DROP FUNCTION IF EXISTS get_available_tables(uuid, date, time without time zone, integer);

-- Açık TABLE(...) dönüş tipi kullanıyoruz; RETURNS SETOF tables PostgREST/anon ile bazen boş dönebiliyor.
CREATE OR REPLACE FUNCTION get_available_tables(
  p_business_id UUID,
  p_date DATE,
  p_time TIME,
  p_duration_minutes INTEGER DEFAULT 120
)
RETURNS TABLE(
  id UUID,
  business_id UUID,
  table_number VARCHAR(50),
  capacity INTEGER,
  floor_number INTEGER,
  position_x DECIMAL(10, 2),
  position_y DECIMAL(10, 2),
  table_type VARCHAR(50),
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_ts TIME;
  v_end_ts TIME;
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
  SELECT t.id, t.business_id, t.table_number, t.capacity, t.floor_number,
         t.position_x, t.position_y, t.table_type, t.is_active, t.created_at
  FROM public.tables t
  WHERE t.business_id = p_business_id
    AND t.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.table_id = t.id
        AND r.reservation_date = p_date
        AND r.status IN ('pending', 'confirmed')
        AND (
          -- Süre yok / tüm gün / tüm akşam: o gün o masayı tamamen bloke et (o tarihte tek kayıt yeter)
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
