-- Trigger: mesaj eklendiğinde conversation.last_message_at güncelle
-- RPC: rezervasyon için sohbet getir veya oluştur (sadece pending/confirmed)

-- 1) Trigger
CREATE OR REPLACE FUNCTION set_conversation_last_message_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_messages_last_message_at ON messages;
CREATE TRIGGER tr_messages_last_message_at
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE PROCEDURE set_conversation_last_message_at();

-- 2) Get or create conversation (müşteri tarafı: reservation kullanıcıya ait ve pending/confirmed olmalı)
CREATE OR REPLACE FUNCTION get_or_create_conversation(p_reservation_id UUID)
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

  IF v_reservation.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Bu rezervasyon size ait değil.';
  END IF;

  IF v_reservation.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Bu rezervasyon için mesajlaşma kapalı.';
  END IF;

  SELECT id INTO v_conv_id
  FROM conversations
  WHERE reservation_id = p_reservation_id;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  INSERT INTO conversations (reservation_id, restaurant_id, user_id, status)
  VALUES (p_reservation_id, v_reservation.business_id, v_reservation.user_id, 'open')
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

COMMENT ON FUNCTION get_or_create_conversation(UUID) IS 'Müşteri: rezervasyon için sohbet id döner; yoksa oluşturur. Sadece kendi rezervasyonu ve pending/confirmed.';
