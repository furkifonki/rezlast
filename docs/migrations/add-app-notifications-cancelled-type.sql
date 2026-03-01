-- Rezervasyon iptal bildirimi için type ekle. create-app-notifications.sql sonrası çalıştırın.

ALTER TABLE app_notifications
  DROP CONSTRAINT IF EXISTS app_notifications_type_check;

ALTER TABLE app_notifications
  ADD CONSTRAINT app_notifications_type_check
  CHECK (type IN ('reservation_created', 'reservation_confirmed', 'reservation_cancelled', 'new_message'));

COMMENT ON COLUMN app_notifications.type IS 'reservation_created, reservation_confirmed, reservation_cancelled, new_message';
