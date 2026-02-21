-- Konum index'i düzeltmesi
-- Hata: ll_to_earth(numeric, numeric) does not exist
--
-- ÇÖZÜM 1: PostGIS kullan (Supabase'de sıklıkla hazır)
-- Önce (sadece PostGIS yoksa):
CREATE EXTENSION IF NOT EXISTS postgis;

-- Sonra index:
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses USING GIST(
  (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography)
);

-- ÇÖZÜM 2: PostGIS yoksa earthdistance kullan
-- Önce eklentileri aç (Supabase: Database > Extensions'dan cube + earthdistance açılabilir):
-- CREATE EXTENSION IF NOT EXISTS cube;
-- CREATE EXTENSION IF NOT EXISTS earthdistance;
--
-- Sonra index (numeric için cast gerekli):
-- DROP INDEX IF EXISTS idx_businesses_location;
-- CREATE INDEX idx_businesses_location ON businesses USING GIST(
--   ll_to_earth(latitude::double precision, longitude::double precision)
-- );

-- ÇÖZÜM 3: Hiçbir eklenti yoksa sadece basit index (mesafe sorgusu olmaz, filtre olur)
-- DROP INDEX IF EXISTS idx_businesses_location;
-- CREATE INDEX idx_businesses_lat ON businesses(latitude);
-- CREATE INDEX idx_businesses_lng ON businesses(longitude);
