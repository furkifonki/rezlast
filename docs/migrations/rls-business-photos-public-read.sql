-- Mobil: Aktif işletmelerin fotoğraflarını herkes (anon + authenticated) okuyabilsin.
-- İşletme detay (product) sayfasında admin panelinden eklenen fotoğraflar görünsün.
-- Supabase SQL Editor'da çalıştırın.

CREATE POLICY "Anyone can view photos of active businesses"
  ON business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.is_active = true
    )
  );

COMMENT ON POLICY "Anyone can view photos of active businesses" ON business_photos IS 'Mobil: İşletme detay sayfasında fotoğraf galerisi.';
