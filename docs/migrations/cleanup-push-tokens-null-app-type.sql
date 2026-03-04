-- push_tokens tablosunda app_type = NULL olan eski kayıtları temizle.
-- Aynı kullanıcının hem NULL hem 'customer' satırı varsa, Expo Go'dan kalan NULL satır silinir.
-- NULL satır tek başına kaldıysa 'customer' olarak güncellenir.
-- Bu script idempotent'tir, birden fazla çalıştırılabilir.

BEGIN;

-- 1) Aynı user_id için zaten app_type='customer' satırı varsa, NULL olanı sil
DELETE FROM push_tokens
WHERE app_type IS NULL
  AND user_id IN (
    SELECT user_id FROM push_tokens WHERE app_type = 'customer'
  );

-- 2) Kalan NULL satırları 'customer' olarak güncelle
UPDATE push_tokens
SET app_type = 'customer'
WHERE app_type IS NULL;

COMMIT;
