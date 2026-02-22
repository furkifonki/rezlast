-- Rezervasyon status 'completed' olduğunda kullanıcıya puan ekler ve users.total_points günceller.
-- Puan: loyalty_rules varsa oradan, yoksa varsayılan 10 puan.
-- Supabase SQL Editor'da create-loyalty-reviews-sponsored-tables.sql ve rls-loyalty-reviews-sponsored.sql sonrası çalıştırın.

CREATE OR REPLACE FUNCTION on_reservation_completed_loyalty()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points INTEGER := 10;
  v_rule_points INTEGER;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- İşletme için loyalty_rules varsa points al
  SELECT (rule_config->>'points')::INTEGER INTO v_rule_points
  FROM loyalty_rules
  WHERE business_id = NEW.business_id
    AND rule_type = 'points_per_reservation'
    AND is_active = true
  LIMIT 1;
  IF v_rule_points IS NOT NULL AND v_rule_points > 0 THEN
    v_points := v_rule_points;
  END IF;
  v_points := GREATEST(1, v_points);

  INSERT INTO loyalty_transactions (user_id, business_id, reservation_id, points, transaction_type, description)
  VALUES (NEW.user_id, NEW.business_id, NEW.id, v_points, 'earned', 'Rezervasyon tamamlandı');

  UPDATE users
  SET total_points = total_points + v_points,
      updated_at = NOW()
  WHERE id = NEW.user_id;

  UPDATE reservations
  SET loyalty_points_earned = v_points
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_completed_loyalty ON reservations;
CREATE TRIGGER trg_reservation_completed_loyalty
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION on_reservation_completed_loyalty();

COMMENT ON FUNCTION on_reservation_completed_loyalty() IS 'Rezervasyon completed olunca kullanıcıya puan ekler, users.total_points günceller.';
