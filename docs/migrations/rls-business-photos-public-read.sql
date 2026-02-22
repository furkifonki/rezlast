-- Mobil: Aktif işletmelerin fotoğraflarını herkes (anon + authenticated) okuyabilsin.
-- Admin panelde eklenen fotoğraflar uygulamada (Keşfet + İşletme detay) görünsün.
-- Supabase SQL Editor'da çalıştırın. İkinci kez çalıştırırsanız "policy already exists" alırsanız
-- önce DROP POLICY ile kaldırıp tekrar CREATE edin; veya aşağıdaki DROP ile birlikte çalıştırın.

DROP POLICY IF EXISTS "Anyone can view photos of active businesses" ON business_photos;

CREATE POLICY "Anyone can view photos of active businesses"
  ON business_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_photos.business_id AND businesses.is_active = true
    )
  );

COMMENT ON POLICY "Anyone can view photos of active businesses" ON business_photos IS 'Mobil: İşletme detay ve Keşfet listesinde fotoğraflar görünsün.';
