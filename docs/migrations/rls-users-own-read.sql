-- Kullanıcı kendi users satırını okuyabilsin (profil ekranında total_points, loyalty_level için).
-- Supabase'de users tablosunda RLS açıksa bu policy gerekir.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own row" ON users;
CREATE POLICY "Users can read own row"
  ON users FOR SELECT
  USING (auth.uid() = id);

COMMENT ON POLICY "Users can read own row" ON users IS 'Profil ekranında kullanıcının kendi total_points ve loyalty_level okuması için.';
