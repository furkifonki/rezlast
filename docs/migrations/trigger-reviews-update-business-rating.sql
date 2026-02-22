-- Yorum eklendiğinde/güncellendiğinde/silindiğinde işletmenin ortalama puanı ve yorum sayısını günceller.
-- create-loyalty-reviews-sponsored-tables.sql sonrası çalıştırın.

CREATE OR REPLACE FUNCTION on_review_change_update_business_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_avg_rating DECIMAL(3,2);
  v_total_reviews INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_business_id := OLD.business_id;
  ELSE
    v_business_id := NEW.business_id;
  END IF;

  SELECT
    COALESCE(ROUND(AVG(rating)::numeric, 2), 0),
    COUNT(*)::INTEGER
  INTO v_avg_rating, v_total_reviews
  FROM reviews
  WHERE business_id = v_business_id AND is_hidden = false;

  UPDATE businesses
  SET rating = v_avg_rating,
      total_reviews = v_total_reviews,
      updated_at = NOW()
  WHERE id = v_business_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_review_update_business_rating ON reviews;
CREATE TRIGGER trg_review_update_business_rating
  AFTER INSERT OR UPDATE OF rating, comment, is_hidden OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION on_review_change_update_business_rating();

COMMENT ON FUNCTION on_review_change_update_business_rating() IS 'reviews değişince businesses.rating ve total_reviews günceller.';
