-- İşletme sahibinin, kendi işletmesinde henüz geçmemiş (beklemede/onaylı) rezervasyonu olan müşterileri ve puan bakiyelerini görmesi için.
-- Rezervasyon tarih+saati geçtikten veya statü tamamlandı/iptal olduktan sonra o müşteri listede görünmez.
-- Admin panel: supabase.rpc('get_business_customers_with_points', { p_business_id: '...' })
-- Supabase SQL Editor'da çalıştırın.

CREATE OR REPLACE FUNCTION get_business_customers_with_points(p_business_id UUID)
RETURNS TABLE(
  user_id UUID,
  customer_name TEXT,
  customer_email TEXT,
  total_points INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM businesses b WHERE b.id = p_business_id AND b.owner_id = auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (r.user_id)
    r.user_id,
    TRIM(COALESCE(r.customer_name, NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), ''))) AS customer_name,
    COALESCE(r.customer_email, u.email) AS customer_email,
    COALESCE(u.total_points, 0)::INTEGER AS total_points
  FROM reservations r
  JOIN users u ON u.id = r.user_id
  WHERE r.business_id = p_business_id
    AND r.user_id IS NOT NULL
    AND r.status IN ('pending', 'confirmed')
    AND (r.reservation_date::text || ' ' || COALESCE(substring(r.reservation_time::text from 1 for 5), '00:00'))::timestamp > now()
  ORDER BY r.user_id, r.created_at DESC;
END;
$$;

COMMENT ON FUNCTION get_business_customers_with_points IS 'Admin: İşletme sahibi sadece henüz geçmemiş (pending/confirmed) rezervasyonu olan müşterileri ve puan bakiyelerini görür. Geçen veya tamamlanan rezervasyondan sonra müşteri listeden düşer.';
GRANT EXECUTE ON FUNCTION get_business_customers_with_points TO authenticated;
