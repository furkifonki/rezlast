-- Mobil: Giriş yapan kullanıcı kendi adına rezervasyon oluşturabilsin ve kendi rezervasyonlarını görebilsin.
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can insert own reservations" ON reservations IS 'Mobil: Kullanıcı kendi user_id ile rezervasyon ekleyebilir.';
COMMENT ON POLICY "Users can view own reservations" ON reservations IS 'Mobil: Rezervasyonlarım sekmesi.';
