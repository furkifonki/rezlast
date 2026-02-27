-- Mevcut rezervasyonlarda customer_name, customer_phone, customer_email boşsa
-- user_id üzerinden users tablosundan doldurur.
-- trigger-reservations-fill-customer-from-user.sql çalıştırıldıktan sonra (isteğe bağlı) çalıştırın.
-- Supabase SQL Editor'da service_role veya postgres ile çalıştırın (RLS bypass).

UPDATE reservations r
SET
  customer_name = COALESCE(
    NULLIF(TRIM(r.customer_name), ''),
    NULLIF(TRIM(u.first_name || ' ' || COALESCE(u.last_name, '')), '')
  ),
  customer_phone = COALESCE(
    NULLIF(TRIM(r.customer_phone), ''),
    NULLIF(TRIM(u.phone), '')
  ),
  customer_email = COALESCE(
    NULLIF(TRIM(r.customer_email), ''),
    NULLIF(TRIM(u.email), '')
  )
FROM users u
WHERE r.user_id = u.id
  AND r.user_id IS NOT NULL
  AND (
    (r.customer_name IS NULL OR TRIM(COALESCE(r.customer_name, '')) = '')
    OR (r.customer_phone IS NULL OR TRIM(COALESCE(r.customer_phone, '')) = '')
    OR (r.customer_email IS NULL OR TRIM(COALESCE(r.customer_email, '')) = '')
  );
