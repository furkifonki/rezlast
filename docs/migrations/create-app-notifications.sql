-- Uygulama bildirim merkezi: Gelen bildirimler (rezervasyon onaylandı, yeni mesaj vb.) listelenir.
-- RLS: Kullanıcı sadece kendi bildirimlerini görür.

CREATE TABLE IF NOT EXISTS app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('reservation_created', 'reservation_confirmed', 'new_message')),
  title TEXT NOT NULL,
  body TEXT,
  data_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  data_conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_notifications_user ON app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_app_notifications_created ON app_notifications(user_id, created_at DESC);

ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON app_notifications;
CREATE POLICY "Users can view own notifications"
  ON app_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own read_at" ON app_notifications;
CREATE POLICY "Users can update own read_at"
  ON app_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert sadece service role veya trigger/API ile (RLS ile kullanıcı insert yapmaz)
DROP POLICY IF EXISTS "No user insert" ON app_notifications;
CREATE POLICY "No user insert"
  ON app_notifications FOR INSERT
  WITH CHECK (false);

COMMENT ON TABLE app_notifications IS 'Bildirim merkezi: Rezervasyon oluşturuldu, onaylandı, yeni mesaj. Push ile birlikte kayıt eklenir.';
