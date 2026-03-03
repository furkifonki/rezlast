-- Aynı kullanıcı hem müşteri (mobile-app) hem işletme (admin-app) kullanabiliyor.
-- İki uygulama farklı Expo projectId kullandığı için iki ayrı token olmalı.
-- Bu migration: app_type sütunu + unique(user_id, app_type).

ALTER TABLE push_tokens
  ADD COLUMN IF NOT EXISTS app_type TEXT DEFAULT 'customer' CHECK (app_type IN ('customer', 'owner'));

-- Eski tekil user_id kısıtını kaldır (varsa)
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_id_key;

-- Aynı user için customer ve owner ayrı satır olabilsin
ALTER TABLE push_tokens DROP CONSTRAINT IF EXISTS push_tokens_user_app_type_key;
ALTER TABLE push_tokens ADD CONSTRAINT push_tokens_user_app_type_key UNIQUE (user_id, app_type);

COMMENT ON COLUMN push_tokens.app_type IS 'customer: müşteri uygulaması, owner: işletme (admin) uygulaması.';
