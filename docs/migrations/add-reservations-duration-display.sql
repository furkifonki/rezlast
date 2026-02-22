-- Rezervasyonda süre kavramı: "Tüm gün", "Tüm akşam", "Süre sınırı yok" veya belirli dakika.
-- duration_minutes = 0 iken duration_display ile etiket gösterilir.
-- Supabase SQL Editor'da çalıştırın.

ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS duration_display VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN reservations.duration_display IS 'duration_minutes=0 iken: no_limit, all_day, all_evening. Null = süre sınırı yok (genel).';
