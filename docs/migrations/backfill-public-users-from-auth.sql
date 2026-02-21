-- Mevcut auth.users kayıtları için public.users satırı oluşturur.
-- Sadece public.users'da karşılığı olmayan auth kullanıcıları eklenir.
-- Supabase SQL Editor'da ÖNCE trigger'ı (trigger-public-users-on-auth-signup.sql)
-- çalıştırdıktan sonra bu script'i çalıştırın.

INSERT INTO public.users (id, email, auth_user_id, role)
SELECT
  au.id,
  au.email,
  au.id,
  'customer'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.auth_user_id = au.id
)
ON CONFLICT (id) DO NOTHING;
