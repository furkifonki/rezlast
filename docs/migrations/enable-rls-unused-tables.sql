-- Kullanılmayan public tablolarda RLS aç (Supabase güvenlik uyarısını gidermek için).
-- Bu tablolar uygulama tarafından kullanılmıyor; policy eklenmediği için anon/authenticated erişemez.
-- service_role (backend) gerekirse erişebilir.
-- spatial_ref_sys PostGIS sistem tablosu olduğu için dahil edilmedi.

-- 1. branches
ALTER TABLE IF EXISTS public.branches ENABLE ROW LEVEL SECURITY;

-- 2. roles
ALTER TABLE IF EXISTS public.roles ENABLE ROW LEVEL SECURITY;

-- 3. availability_slots
ALTER TABLE IF EXISTS public.availability_slots ENABLE ROW LEVEL SECURITY;

-- 4. subscription_plans
ALTER TABLE IF EXISTS public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- 5. subscriptions
ALTER TABLE IF EXISTS public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. campaigns
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;

-- 7. payments
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

-- 8. notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy eklenmediği için anon ve authenticated hiçbir satır göremez/güncelleyemez.
-- İleride bu tabloları kullanacaksanız, uygun policy'leri ayrı bir migration ile ekleyin.
