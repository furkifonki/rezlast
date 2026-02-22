-- Mobil: Aktif işletmelerin çalışma saatleri ve kapalı günlerini herkes okuyabilsin.
-- Rezervasyon akışında müsait tarih/saat listesi için gerekli.
-- Supabase SQL Editor'da çalıştırın.

CREATE POLICY "Anyone can view business_hours of active businesses"
  ON business_hours FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_hours.business_id AND businesses.is_active = true
    )
  );

CREATE POLICY "Anyone can view business_closures of active businesses"
  ON business_closures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = business_closures.business_id AND businesses.is_active = true
    )
  );

COMMENT ON POLICY "Anyone can view business_hours of active businesses" ON business_hours IS 'Mobil: Rezervasyon müsait tarih/saat listesi.';
COMMENT ON POLICY "Anyone can view business_closures of active businesses" ON business_closures IS 'Mobil: Rezervasyon müsait tarih listesi (kapalı günleri hariç tutmak için).';
