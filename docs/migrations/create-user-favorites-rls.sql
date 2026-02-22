-- Kullanıcıya özel favori işletmeler. Her kullanıcı sadece kendi favorilerini görür/yönetir.
-- Supabase SQL Editor'da çalıştırın.

CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_business ON user_favorites(business_id);

COMMENT ON TABLE user_favorites IS 'Mobil: Kullanıcıya özel favori işletmeler. RLS ile her kullanıcı sadece kendi kayıtlarını görür.';

-- RLS: Kullanıcı sadece kendi favorilerini görsün, eklesin, silsin
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own favorites" ON user_favorites;
CREATE POLICY "Users can view own favorites"
  ON user_favorites FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON user_favorites;
CREATE POLICY "Users can insert own favorites"
  ON user_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON user_favorites;
CREATE POLICY "Users can delete own favorites"
  ON user_favorites FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY "Users can view own favorites" ON user_favorites IS 'Her kullanıcı sadece kendi favorilerini görür.';
COMMENT ON POLICY "Users can insert own favorites" ON user_favorites IS 'Kullanıcı sadece kendi adına favori ekleyebilir.';
COMMENT ON POLICY "Users can delete own favorites" ON user_favorites IS 'Kullanıcı sadece kendi favorilerini silebilir.';
