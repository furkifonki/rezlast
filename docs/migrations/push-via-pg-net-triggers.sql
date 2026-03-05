-- =============================================================================
-- SERVER-SIDE PUSH BİLDİRİMLERİ (pg_net ile)
-- =============================================================================
-- Client tarafına (mobile-app, web-app) bağımlı olmadan, doğrudan veritabanı
-- seviyesinde Expo Push API çağrısı yapar.
--
-- Kapsam:
--   1) Yeni rezervasyon → işletme sahibine push (app_type = 'owner')
--   2) Müşteriden mesaj  → işletme sahibi + personeline push (app_type = 'owner')
-- =============================================================================

-- 1. pg_net uzantısını etkinleştir (Supabase'de tüm planlarda mevcut)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- =============================================================================
-- 2. Yeni rezervasyon → işletme sahibine push
-- =============================================================================
CREATE OR REPLACE FUNCTION push_notify_owner_on_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_owner_id UUID;
  v_biz_name TEXT;
  v_notify   BOOLEAN;
  v_tokens   TEXT[];
  v_messages JSONB := '[]'::JSONB;
  v_tok      TEXT;
BEGIN
  SELECT owner_id, name INTO v_owner_id, v_biz_name
  FROM businesses WHERE id = NEW.business_id;

  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT notify_reservations INTO v_notify
  FROM push_trigger_settings WHERE owner_id = v_owner_id;
  IF v_notify IS NOT NULL AND v_notify = false THEN RETURN NEW; END IF;

  SELECT array_agg(expo_push_token) INTO v_tokens
  FROM push_tokens
  WHERE user_id = v_owner_id
    AND app_type = 'owner'
    AND expo_push_token IS NOT NULL;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN RETURN NEW; END IF;

  FOREACH v_tok IN ARRAY v_tokens LOOP
    v_messages := v_messages || jsonb_build_object(
      'to',    v_tok,
      'title', 'Yeni rezervasyon',
      'body',  COALESCE(v_biz_name, 'İşletme') || ' için yeni bir rezervasyon oluşturuldu.',
      'sound', 'default'
    );
  END LOOP;

  PERFORM net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_messages,
    headers := '{"Content-Type": "application/json"}'::JSONB
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notify_owner_reservation ON reservations;
CREATE TRIGGER trg_push_notify_owner_reservation
  AFTER INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_owner_on_reservation();

-- =============================================================================
-- 3. Müşteri mesajı → işletme sahibi + personeline push
-- =============================================================================
CREATE OR REPLACE FUNCTION push_notify_owner_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_restaurant_id UUID;
  v_owner_id      UUID;
  v_biz_name      TEXT;
  v_notify        BOOLEAN;
  v_tokens        TEXT[];
  v_messages      JSONB := '[]'::JSONB;
  v_tok           TEXT;
BEGIN
  IF NEW.sender_type IS DISTINCT FROM 'user' THEN RETURN NEW; END IF;

  SELECT restaurant_id INTO v_restaurant_id
  FROM conversations WHERE id = NEW.conversation_id;
  IF v_restaurant_id IS NULL THEN RETURN NEW; END IF;

  SELECT owner_id, name INTO v_owner_id, v_biz_name
  FROM businesses WHERE id = v_restaurant_id;
  IF v_owner_id IS NULL THEN RETURN NEW; END IF;

  SELECT notify_messages INTO v_notify
  FROM push_trigger_settings WHERE owner_id = v_owner_id;
  IF v_notify IS NOT NULL AND v_notify = false THEN RETURN NEW; END IF;

  SELECT array_agg(DISTINCT pt.expo_push_token) INTO v_tokens
  FROM push_tokens pt
  WHERE pt.app_type = 'owner'
    AND pt.expo_push_token IS NOT NULL
    AND (
      pt.user_id = v_owner_id
      OR pt.user_id IN (
        SELECT rs.user_id FROM restaurant_staff rs
        WHERE rs.restaurant_id = v_restaurant_id
      )
    );

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN RETURN NEW; END IF;

  FOREACH v_tok IN ARRAY v_tokens LOOP
    v_messages := v_messages || jsonb_build_object(
      'to',    v_tok,
      'title', 'Yeni mesaj',
      'body',  'Müşterinizden yeni bir mesaj aldınız.',
      'sound', 'default'
    );
  END LOOP;

  PERFORM net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_messages,
    headers := '{"Content-Type": "application/json"}'::JSONB
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_push_notify_owner_message ON messages;
CREATE TRIGGER trg_push_notify_owner_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION push_notify_owner_on_message();
