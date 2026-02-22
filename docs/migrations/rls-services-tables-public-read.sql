-- Mobil: Aktif işletmelerin hizmet ve masalarını herkes (anon + authenticated) okuyabilsin.
-- Keşfet ve rezervasyon akışında hizmet listesi ve müsait masa (RPC) için gerekli.
-- Supabase SQL Editor'da çalıştırın.

-- Aktif işletmenin hizmetlerini herkes okuyabilsin
CREATE POLICY "Anyone can view services of active businesses"
  ON services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = services.business_id AND businesses.is_active = true
    )
  );

-- Aktif işletmenin masalarını herkes okuyabilsin (müsait masa listesi için)
CREATE POLICY "Anyone can view tables of active businesses"
  ON tables FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = tables.business_id AND businesses.is_active = true
    )
  );

COMMENT ON POLICY "Anyone can view services of active businesses" ON services IS 'Mobil: Rezervasyon akışında hizmet listesi.';
COMMENT ON POLICY "Anyone can view tables of active businesses" ON tables IS 'Mobil: Müsait masa listesi (RPC ile birlikte).';
