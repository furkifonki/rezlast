-- push_tokens tablosunda app_type = NULL olan kayıtları temizle.
-- API'ler artık sadece app_type = 'customer' veya 'owner' olan tokenları sorguluyor.
-- NULL tokenlar hiçbir push sorgusuna eşleşmez, bu yüzden silinmeli.
-- Her iki uygulama da (mobile-app, admin-app) bir sonraki açılışta tokenı doğru
-- app_type ile yeniden kaydedecek.
-- Bu script idempotent'tir, birden fazla çalıştırılabilir.

BEGIN;

-- 1) Tüm app_type=NULL tokenları sil
DELETE FROM push_tokens WHERE app_type IS NULL;

-- 2) Artık NULL olamaz - NOT NULL kısıtı ekle (DEFAULT zaten 'customer')
ALTER TABLE push_tokens ALTER COLUMN app_type SET NOT NULL;

COMMIT;
