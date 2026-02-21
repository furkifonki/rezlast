-- İşletme eklerken "new row violates row-level security policy" hatasını gidermek için
-- Supabase SQL Editor'da bu script'i çalıştırın.

-- Kullanıcılar kendi adlarına işletme ekleyebilir (owner_id = giriş yapan kullanıcı)
CREATE POLICY "Users can insert own businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
