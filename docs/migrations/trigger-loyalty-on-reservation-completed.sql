-- Rezervasyon status 'completed' olduğunda kullanıcıya puan ekler ve users.total_points günceller.
-- Puan önceliği: 1) reservation.service_id varsa service_loyalty_rules, 2) loyalty_rules (işletme), 3) varsayılan 10.
-- Supabase SQL Editor'da create-loyalty-reviews-sponsored-tables.sql, create-service-loyalty-rules.sql ve RLS'ler sonrası çalıştırın.

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

  -- 1) Hizmet bazlı kural (rezervasyonda hizmet seçilmişse)
  IF NEW.service_id IS NOT NULL THEN
    SELECT slr.points INTO v_rule_points
    FROM service_loyalty_rules slr
    WHERE slr.service_id = NEW.service_id AND slr.is_active = true
    LIMIT 1;
    IF v_rule_points IS NOT NULL AND v_rule_points > 0 THEN
      v_points := v_rule_points;
    END IF;
  END IF;

  -- 2) Hizmet kuralı yoksa işletme bazlı loyalty_rules
  IF v_points = 10 THEN
    SELECT (rule_config->>'points')::INTEGER INTO v_rule_points
    FROM loyalty_rules
    WHERE business_id = NEW.business_id
      AND rule_type = 'points_per_reservation'
      AND is_active = true
    LIMIT 1;
    IF v_rule_points IS NOT NULL AND v_rule_points > 0 THEN
      v_points := v_rule_points;
    END IF;
  END IF;
  v_points := GREATEST(1, v_points);

  INSERT INTO loyalty_transactions (user_id, business_id, reservation_id, points, transaction_type, description)
  VALUES (NEW.user_id, NEW.business_id, NEW.id, v_points, 'earned', 'Rezervasyon tamamlandı');

  UPDATE reservations
  SET loyalty_points_earned = v_points
  WHERE id = NEW.id;

  -- users.total_points güncellemesi trg_loyalty_transaction_insert_user trigger'ı ile yapılır

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reservation_completed_loyalty ON reservations;
CREATE TRIGGER trg_reservation_completed_loyalty
  AFTER UPDATE OF status ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION on_reservation_completed_loyalty();

COMMENT ON FUNCTION on_reservation_completed_loyalty() IS 'Rezervasyon completed olunca kullanıcıya puan ekler, users.total_points günceller.';
