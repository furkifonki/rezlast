-- İşletme sahibi (admin-app) beklemedeki rezervasyon için sohbet açar veya mevcut sohbet id'sini döner.
-- get_or_create_conversation müşteri tarafı içindir; bu fonksiyon owner/staff içindir.

CREATE OR REPLACE FUNCTION get_or_create_conversation_for_owner(p_reservation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation RECORD;
  v_conv_id UUID;
BEGIN
  SELECT id, user_id, business_id, status
  INTO v_reservation
  FROM reservations
  WHERE id = p_reservation_id;

  IF v_reservation.id IS NULL THEN
    RAISE EXCEPTION 'Rezervasyon bulunamadı.';
  END IF;

  -- Sadece pending veya confirmed için mesajlaşma
  IF v_reservation.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Bu rezervasyon için mesajlaşma kapalı.';
  END IF;

  -- İşletme sahibi veya staff mı?
  IF NOT EXISTS (
    SELECT 1 FROM businesses b WHERE b.id = v_reservation.business_id AND b.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM restaurant_staff rs WHERE rs.restaurant_id = v_reservation.business_id AND rs.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu rezervasyona erişim yetkiniz yok.';
  END IF;

  SELECT id INTO v_conv_id
  FROM conversations
  WHERE reservation_id = p_reservation_id;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Sohbet yoksa oluştur (owner adına; conversations.restaurant_id = business_id)
  INSERT INTO conversations (reservation_id, restaurant_id, user_id, status)
  VALUES (p_reservation_id, v_reservation.business_id, v_reservation.user_id, 'open')
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_conversation_for_owner(UUID) IS 'İşletme sahibi: rezervasyon için sohbet id döner; yoksa oluşturur. pending/confirmed.';
