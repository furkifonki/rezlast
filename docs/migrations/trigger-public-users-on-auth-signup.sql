-- Yeni kullanıcı kaydında public.users'a otomatik satır ekler (id = auth.users.id).
-- Böylece businesses.owner_id = auth.uid() hem FK hem RLS ile uyumlu olur.
-- Supabase SQL Editor'da çalıştırın.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, auth_user_id, role)
  VALUES (new.id, new.email, new.id, 'customer');
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    RETURN new;  -- Zaten varsa sessizce geç
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
