-- Çalışma saatleri: açılış/kapanış her zaman yerel saat (Türkiye) olarak saklansın.
-- Admin panelde 19:00 girilirse uygulamada da 19:00 görünsün (timezone kayması olmasın).
-- Çalıştırma: Supabase SQL Editor

-- business_hours tablosunda open_time, close_time (ve varsa break_*) kolonları
-- TIME WITHOUT TIME ZONE olmalı. Eğer şu an WITH TIME ZONE ise dönüştür.

DO $$
DECLARE
  col_type text;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'business_hours' AND column_name = 'open_time';

  IF col_type = 'time with time zone' THEN
    ALTER TABLE business_hours
      ALTER COLUMN open_time TYPE time WITHOUT TIME ZONE USING open_time AT TIME ZONE 'Europe/Istanbul',
      ALTER COLUMN close_time TYPE time WITHOUT TIME ZONE USING close_time AT TIME ZONE 'Europe/Istanbul';
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'business_hours' AND column_name = 'break_start') THEN
      ALTER TABLE business_hours
        ALTER COLUMN break_start TYPE time WITHOUT TIME ZONE USING break_start AT TIME ZONE 'Europe/Istanbul',
        ALTER COLUMN break_end TYPE time WITHOUT TIME ZONE USING break_end AT TIME ZONE 'Europe/Istanbul';
    END IF;
  END IF;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;

COMMENT ON COLUMN business_hours.open_time IS 'Açılış saati yerel (Türkiye) - TIME WITHOUT TIME ZONE';
COMMENT ON COLUMN business_hours.close_time IS 'Kapanış saati yerel (Türkiye) - TIME WITHOUT TIME ZONE';
