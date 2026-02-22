-- loyalty_transactions'a her INSERT'te (earned, manual_add, manual_deduct) users.total_points güncellenir.
-- Böylece admin panelden manuel puan ekleme/çıkarma da toplam puana yansır.
-- trigger-loyalty-on-reservation-completed.sql içinde zaten users güncelleniyor; bu trigger tüm insert'lerde
-- tek noktadan güncelleme sağlar. Rezervasyon trigger'ında users güncellemesini kaldırmak yerine bu trigger'ı
-- kullanırsak çift güncelleme olur. O yüzden rezervasyon trigger'ı kendi UPDATE'ini yapmaya devam etsin,
-- bu trigger sadece reservation_id NULL olan (manuel) işlemler için users güncellesin.
-- Alternatif: Rezervasyon trigger'ı sadece loyalty_transactions INSERT etsin, users güncellemesini
-- bu trigger yapsın. O zaman tüm loyalty_transactions INSERT'lerinde bu trigger çalışır.
-- En temizi: Bu trigger her INSERT'te total_points += NEW.points yapsın. Rezervasyon trigger'ından
-- users güncellemesini kaldıralım (çünkü artık loyalty_transactions INSERT'i bu trigger'ı tetikleyecek).

-- Önce rezervasyon trigger fonksiyonundan users güncellemesini kaldırıyoruz (tekrara düşmemek için)
-- ve loyalty_transactions INSERT trigger'ı ekliyoruz.

CREATE OR REPLACE FUNCTION on_loyalty_transaction_insert_update_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET total_points = GREATEST(0, total_points + NEW.points),
      updated_at = NOW()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_loyalty_transaction_insert_user ON loyalty_transactions;
CREATE TRIGGER trg_loyalty_transaction_insert_user
  AFTER INSERT ON loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION on_loyalty_transaction_insert_update_user();

COMMENT ON FUNCTION on_loyalty_transaction_insert_update_user() IS 'Her loyalty_transactions INSERT sonrası users.total_points günceller (manuel puan ekleme/çıkarma dahil).';