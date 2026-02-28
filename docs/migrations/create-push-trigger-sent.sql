-- Tetikleyici push'ların hangi rezervasyona ne zaman gönderildiğini takip eder (çift gönderim önlenir).
-- create-push-trigger-settings.sql sonrası çalıştırın.

CREATE TABLE IF NOT EXISTS push_trigger_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('30min', '1day')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reservation_id, trigger_type)
);

CREATE INDEX IF NOT EXISTS idx_push_trigger_sent_reservation ON push_trigger_sent(reservation_id);
CREATE INDEX IF NOT EXISTS idx_push_trigger_sent_type ON push_trigger_sent(trigger_type);

COMMENT ON TABLE push_trigger_sent IS 'Cron: Hangi rezervasyona 30dk/1gün tetikleyici push atıldı.';

ALTER TABLE push_trigger_sent ENABLE ROW LEVEL SECURITY;

-- Sadece service role veya cron API üzerinden insert yapılacak; RLS ile kullanıcı erişimi kapatıyoruz.
DROP POLICY IF EXISTS "No direct user access" ON push_trigger_sent;
CREATE POLICY "No direct user access"
  ON push_trigger_sent FOR ALL
  USING (false)
  WITH CHECK (false);

-- Service role ile insert/select için policy gerekmez (bypass RLS).
