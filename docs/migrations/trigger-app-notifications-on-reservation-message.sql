-- Rezervasyon veya mesaj oluştuğunda bildirim merkezine (app_notifications) kayıt ekler.
-- Böylece API çağrılmadan da bildirim merkezinde görünür. Push için istemci yine API'yi çağırmalı.
-- create-app-notifications.sql ve add-app-notifications-cancelled-type.sql sonrası çalıştırın.

-- 1) Rezervasyon INSERT -> işletme sahibine "Yeni rezervasyon" bildirimi
CREATE OR REPLACE FUNCTION notify_owner_reservation_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_business_name TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_business_name
  FROM businesses WHERE id = NEW.business_id;
  IF v_owner_id IS NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO app_notifications (user_id, type, title, body, data_reservation_id, created_at)
  VALUES (
    v_owner_id,
    'reservation_created',
    'Yeni rezervasyon',
    v_business_name || ' için yeni bir rezervasyon oluşturuldu.',
    NEW.id,
    now()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_notify_reservation_created ON reservations;
CREATE TRIGGER trg_app_notify_reservation_created
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_reservation_created();

-- 2) Mesaj INSERT (müşteriden -> restoran) -> işletme sahibi ve staff'a "Yeni mesaj" bildirimi
CREATE OR REPLACE FUNCTION notify_owner_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id UUID;
  v_owner_id UUID;
  v_customer_name TEXT;
  v_title TEXT := 'Yeni mesaj';
  v_body TEXT;
  v_staff_row RECORD;
BEGIN
  IF NEW.sender_type <> 'user' THEN
    RETURN NEW;
  END IF;
  SELECT restaurant_id INTO v_restaurant_id FROM conversations WHERE id = NEW.conversation_id;
  IF v_restaurant_id IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT owner_id INTO v_owner_id FROM businesses WHERE id = v_restaurant_id;
  SELECT r.customer_name INTO v_customer_name
  FROM reservations r
  JOIN conversations c ON c.reservation_id = r.id
  WHERE c.id = NEW.conversation_id
  LIMIT 1;
  v_body := COALESCE(TRIM(v_customer_name), 'Müşteri') || ' size mesaj gönderdi.';

  -- İşletme sahibi
  IF v_owner_id IS NOT NULL THEN
    INSERT INTO app_notifications (user_id, type, title, body, data_conversation_id, created_at)
    VALUES (v_owner_id, 'new_message', v_title, v_body, NEW.conversation_id, now());
  END IF;

  -- Staff (owner hariç, tekrar eklememek için)
  FOR v_staff_row IN
    SELECT user_id FROM restaurant_staff WHERE restaurant_id = v_restaurant_id AND user_id IS NOT NULL
  LOOP
    IF v_staff_row.user_id IS DISTINCT FROM v_owner_id THEN
      INSERT INTO app_notifications (user_id, type, title, body, data_conversation_id, created_at)
      VALUES (v_staff_row.user_id, 'new_message', v_title, v_body, NEW.conversation_id, now());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_app_notify_new_message ON messages;
CREATE TRIGGER trg_app_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_new_message();

COMMENT ON FUNCTION notify_owner_reservation_created() IS 'Rezervasyon eklendiğinde işletme sahibine app_notifications kaydı.';
COMMENT ON FUNCTION notify_owner_new_message() IS 'Müşteri mesaj gönderdiğinde işletme sahibi ve staffa app_notifications kaydı.';
