-- Tetikleyici ayarlarına: Mesaj ve rezervasyon bildirimlerini aç/kapa (işletme seçimi).
-- create-push-trigger-settings.sql sonrası çalıştırın.

ALTER TABLE push_trigger_settings
  ADD COLUMN IF NOT EXISTS notify_messages BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_reservations BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN push_trigger_settings.notify_messages IS 'İşletme: Yeni mesaj bildirimlerini al (müşteriden gelen mesaj push/app_notifications).';
COMMENT ON COLUMN push_trigger_settings.notify_reservations IS 'İşletme: Yeni rezervasyon bildirimlerini al (yeni rezervasyon push/app_notifications).';
