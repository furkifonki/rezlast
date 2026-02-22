-- Hizmet süresi etiketi: Tüm gün, Tüm akşam, Süre yok veya belirli dakika.
-- duration_minutes = 0 iken duration_display ile etiket gösterilir.
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE services
ADD COLUMN IF NOT EXISTS duration_display VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN services.duration_display IS 'duration_minutes=0 iken: no_limit, all_day, all_evening. Null = süre yok (genel).';
