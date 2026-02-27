-- Rezervasyon INSERT sırasında user_id varsa ve customer_name/phone/email boşsa,
-- users tablosundan (first_name, last_name, phone, email) doldurur.
-- Böylece mobil uygulama sadece user_id gönderse bile admin panelde müşteri bilgileri görünür.
-- Supabase SQL Editor'da çalıştırın.

CREATE OR REPLACE FUNCTION reservations_fill_customer_from_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first_name TEXT;
  v_last_name TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_name TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT u.first_name, u.last_name, u.phone, u.email
  INTO v_first_name, v_last_name, v_phone, v_email
  FROM users u
  WHERE u.id = NEW.user_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF (NEW.customer_name IS NULL OR TRIM(COALESCE(NEW.customer_name, '')) = '') THEN
    v_name := TRIM(COALESCE(v_first_name, '') || ' ' || COALESCE(v_last_name, ''));
    NEW.customer_name := NULLIF(TRIM(v_name), '');
  END IF;

  IF (NEW.customer_phone IS NULL OR TRIM(COALESCE(NEW.customer_phone, '')) = '') AND v_phone IS NOT NULL THEN
    NEW.customer_phone := NULLIF(TRIM(v_phone), '');
  END IF;

  IF (NEW.customer_email IS NULL OR TRIM(COALESCE(NEW.customer_email, '')) = '') AND v_email IS NOT NULL THEN
    NEW.customer_email := NULLIF(TRIM(v_email), '');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservations_fill_customer_from_user ON reservations;
CREATE TRIGGER trg_reservations_fill_customer_from_user
  BEFORE INSERT ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION reservations_fill_customer_from_user();

COMMENT ON FUNCTION reservations_fill_customer_from_user() IS 'INSERT sırasında user_id ile users tablosundan customer_name, customer_phone, customer_email doldurulur (boşsa). Admin panelde müşteri bilgileri görünsün diye.';
