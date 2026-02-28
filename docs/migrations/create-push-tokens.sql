-- Push bildirim token'ları (Expo Push Token). Uygulama token'ı kaydeder; admin "Bildirim gönder" ile toplu push atar.
-- Supabase SQL Editor'da çalıştırın.

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_expo ON push_tokens(expo_push_token);

COMMENT ON TABLE push_tokens IS 'Mobil uygulama kullanıcılarının Expo push token''ları. Admin panelden toplu bildirim gönderimi için kullanılır.';

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi token'ını ekleyebilir / güncelleyebilir
DROP POLICY IF EXISTS "Users can manage own push token" ON push_tokens;
CREATE POLICY "Users can manage own push token"
  ON push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- İşletme sahipleri (admin) tüm token'ları okuyabilir (bildirim göndermek için)
DROP POLICY IF EXISTS "Business owners can read push tokens" ON push_tokens;
CREATE POLICY "Business owners can read push tokens"
  ON push_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM businesses WHERE owner_id = auth.uid())
  );

COMMENT ON POLICY "Users can manage own push token" ON push_tokens IS 'Mobil: Kullanıcı kendi Expo push token''ını kaydeder/günceller.';
COMMENT ON POLICY "Business owners can read push tokens" ON push_tokens IS 'Admin: Bildirim göndermek için token listesi okunur.';
