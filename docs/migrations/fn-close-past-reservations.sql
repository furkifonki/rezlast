-- Zamanı geçen rezervasyonları otomatik "Tamamlandı" yapar.
-- Admin panel ve mobil uygulama liste yüklenmeden önce bu RPC'leri çağırarak güncel durumu alır.
-- Supabase SQL Editor'da çalıştırın.

-- Tarih+saat geçmiş mi (reservation_time DATE veya TIME veya TEXT olabilir)
-- (reservation_date::text || ' ' || substring(reservation_time::text from 1 for 5))::timestamp < now()

-- Mobil: Giriş yapan kullanıcının kendi geçmiş rezervasyonlarını tamamlandı yapar.
CREATE OR REPLACE FUNCTION close_my_past_reservations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE reservations
  SET status = 'completed',
      updated_at = now()
  WHERE user_id = auth.uid()
    AND status IN ('pending', 'confirmed')
    AND (reservation_date::text || ' ' || substring(reservation_time::text from 1 for 5))::timestamp < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION close_my_past_reservations() IS 'Mobil: Kullanıcının zamanı geçmiş bekleyen/onaylı rezervasyonlarını tamamlandı yapar. Rezervasyonlarım listesi açılmadan önce çağrılır.';

-- Admin: Giriş yapan işletme sahibinin işletmelerine ait geçmiş rezervasyonları tamamlandı yapar.
CREATE OR REPLACE FUNCTION close_past_reservations_for_owner()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE reservations
  SET status = 'completed',
      updated_at = now()
  WHERE business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid())
    AND status IN ('pending', 'confirmed')
    AND (reservation_date::text || ' ' || substring(reservation_time::text from 1 for 5))::timestamp < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION close_past_reservations_for_owner() IS 'Admin: İşletme sahibinin işletmelerine ait zamanı geçmiş rezervasyonları tamamlandı yapar. Rezervasyonlar sayfası yüklenmeden önce çağrılır.';
