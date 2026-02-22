-- Mobil: Kullanıcı kendi rezervasyonunu iptal edebilsin, not ve ödeme yöntemini güncelleyebilsin.
-- rls-reservations-insert-mobile.sql ve rls-reservations-admin-update.sql sonrası çalıştırın.

DROP POLICY IF EXISTS "Users can update own reservations" ON reservations;
CREATE POLICY "Users can update own reservations"
  ON reservations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON POLICY "Users can update own reservations" ON reservations IS 'Mobil: Kullanıcı kendi rezervasyonunu iptal edebilir, not/ödeme yöntemi güncelleyebilir.';
