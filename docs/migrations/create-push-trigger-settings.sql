-- Push tetikleyici ayarları: Rezervasyondan X önce otomatik bildirim (cron ile kullanılır).
-- Supabase SQL Editor'da çalıştırın.

CREATE TABLE IF NOT EXISTS push_trigger_settings (
  owner_id UUID NOT NULL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_30min BOOLEAN NOT NULL DEFAULT true,
  trigger_1day BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE push_trigger_settings IS 'İşletme sahibi: Rezervasyondan 30 dk / 1 gün önce otomatik push bildirimi aç/kapa.';

ALTER TABLE push_trigger_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can manage own push trigger settings" ON push_trigger_settings;
CREATE POLICY "Owners can manage own push trigger settings"
  ON push_trigger_settings FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);
