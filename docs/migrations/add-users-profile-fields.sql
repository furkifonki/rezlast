-- Son kullanıcı profil alanları: isim, soyisim, telefon (profil detay sayfası için).
-- rls-users-own-read.sql sonrası çalıştırın.
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

COMMENT ON COLUMN users.first_name IS 'Kullanıcı adı (profil sayfası, zorunlu).';
COMMENT ON COLUMN users.last_name IS 'Kullanıcı soyadı (profil sayfası, zorunlu).';
COMMENT ON COLUMN users.phone IS 'Telefon numarası (profil sayfası, zorunlu).';

-- Kullanıcı kendi profil alanlarını (first_name, last_name, phone) güncelleyebilsin.
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "Users can update own profile" ON users IS 'Mobil: Profil sayfasında isim, soyisim, telefon güncellemesi.';
