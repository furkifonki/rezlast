-- Yorum ekleyebilmek için bu işletmede tamamlanmış (completed) bir rezervasyon gerekir.
-- rls-loyalty-reviews-sponsored.sql çalıştırılmış olmalı.

DROP POLICY IF EXISTS "Users can create own reviews" ON reviews;
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM reservations r
      WHERE r.business_id = reviews.business_id
        AND r.user_id = auth.uid()
        AND r.status = 'completed'
    )
  );

COMMENT ON POLICY "Users can create own reviews" ON reviews IS 'Sadece bu işletmede tamamlanmış rezervasyonu olan kullanıcı yorum ekleyebilir.';
