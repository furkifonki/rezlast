-- İşletme sahiplerinin kendi işletmelerinin rezervasyonlarını görüp güncellemesi (Admin panel: Onayla, İptal, Tamamlandı).
-- rls-reservations-insert-mobile.sql sonrası çalıştırın.

-- Görüntüleme: Kendi işletmesinin rezervasyonları
DROP POLICY IF EXISTS "Business owners can view own business reservations" ON reservations;
CREATE POLICY "Business owners can view own business reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reservations.business_id AND businesses.owner_id = auth.uid()
    )
  );

-- Güncelleme: Durum değişikliği (pending → confirmed → completed, iptal vb.)
DROP POLICY IF EXISTS "Business owners can update own business reservations" ON reservations;
CREATE POLICY "Business owners can update own business reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reservations.business_id AND businesses.owner_id = auth.uid()
    )
  );

COMMENT ON POLICY "Business owners can update own business reservations" ON reservations IS 'Admin: Rezervasyon durumu Tamamlandı/İptal vb. güncellenebilir.';
