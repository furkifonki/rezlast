-- Seçilen gün için müsait saatleri döner.
-- İşletmede masa varsa: sadece en az bir müsait masası olan saatler döner.
-- İşletmede masa yoksa (güzellik salonu, berber vb.): çalışma saatlerine göre tüm slotlar döner (30 dk).
-- Mobil: supabase.rpc('get_available_slots_for_date', { p_business_id: '...', p_date: '2025-02-22', p_duration_minutes: 120 })
-- Supabase SQL Editor'da çalıştırın.

CREATE OR REPLACE FUNCTION get_available_slots_for_date(
  p_business_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 120
)
RETURNS TABLE(slot_time TIME)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open TIME;
  v_close TIME;
  v_slot TIME;
  v_duration INTEGER;
  v_step INTERVAL := '30 minutes'::INTERVAL;
  v_has_tables BOOLEAN;
  v_capacity INTEGER;
  v_capacity_enabled BOOLEAN;
  v_rule_capacity INTEGER;
  v_rule_slot_minutes INTEGER;
  v_rule_closed BOOLEAN;
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
  v_used INTEGER;
BEGIN
  v_duration := COALESCE(NULLIF(p_duration_minutes, 0), 120);
  IF v_duration < 0 THEN
    v_duration := 120;
  END IF;

  -- İşletmede aktif masa var mı? (Yoksa güzellik salonu/berber gibi; tüm slotları döneceğiz.)
  SELECT EXISTS (SELECT 1 FROM public.tables t WHERE t.business_id = p_business_id AND t.is_active = true) INTO v_has_tables;

  -- Gün bazlı kapasite kuralı: varsa businesses değerlerinin üzerine yazar.
  v_rule_capacity := NULL;
  v_rule_slot_minutes := NULL;
  v_rule_closed := false;

  SELECT
    r.capacity_tables,
    r.slot_duration_minutes,
    COALESCE(r.is_closed, false)
  INTO
    v_rule_capacity,
    v_rule_slot_minutes,
    v_rule_closed
  FROM business_capacity_rules r
  WHERE r.business_id = p_business_id
    AND r.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER;

  IF v_rule_closed THEN
    RETURN;
  END IF;

  -- Kapasite modu: Masa planı yoksa ve capacity_enabled + capacity_tables > 0 ise slotları kapasiteye göre filtrele.
  SELECT b.capacity_tables, b.capacity_enabled
    INTO v_capacity, v_capacity_enabled
  FROM businesses b
  WHERE b.id = p_business_id;

  IF v_rule_capacity IS NOT NULL THEN
    v_capacity := v_rule_capacity;
  END IF;
  IF v_rule_slot_minutes IS NOT NULL THEN
    v_duration := v_rule_slot_minutes;
  END IF;

  -- PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday (business_hours.day_of_week ile uyumlu)
  SELECT bh.open_time, bh.close_time
    INTO v_open, v_close
  FROM business_hours bh
  WHERE bh.business_id = p_business_id
    AND bh.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
    AND (bh.is_closed IS NOT TRUE);

  IF v_open IS NULL OR v_close IS NULL OR v_close <= v_open THEN
    RETURN;
  END IF;

  v_slot := v_open;
  WHILE v_slot + (v_duration || ' minutes')::INTERVAL <= v_close LOOP
    IF NOT v_has_tables THEN
      -- Masa yok: Eğer kapasite tanımlıysa (capacity_tables > 0) slotları kapasiteye göre filtrele,
      -- aksi halde tüm slotları müsait say (güzellik salonu, berber vb.).
      IF v_capacity_enabled AND v_capacity IS NOT NULL AND v_capacity > 0 THEN
        -- Seçilen tarih + slot saati için rezervasyon başlangıç/bitişini (İstanbul saati) hesapla
        v_start_ts := (p_date + v_slot) AT TIME ZONE 'Europe/Istanbul';
        v_end_ts := v_start_ts + (v_duration || ' minutes')::INTERVAL;

        SELECT COALESCE(SUM(table_count_used), 0)::INTEGER
        INTO v_used
        FROM reservations r
        WHERE r.business_id = p_business_id
          AND r.status IN ('pending', 'confirmed')
          AND r.reservation_start IS NOT NULL
          AND r.reservation_end IS NOT NULL
          AND r.reservation_start < v_end_ts
          AND r.reservation_end > v_start_ts;

        IF v_used < v_capacity THEN
          slot_time := v_slot;
          RETURN NEXT;
        END IF;
      ELSE
        slot_time := v_slot;
        RETURN NEXT;
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM get_available_tables(p_business_id, p_date, v_slot, v_duration) LIMIT 1
    ) THEN
      -- Masa var: sadece en az bir müsait masa olan saatleri döndür
      slot_time := v_slot;
      RETURN NEXT;
    END IF;
    v_slot := v_slot + v_step;
    IF v_slot < v_open THEN  -- Gece yarısı geçtiyse çık
      EXIT;
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION get_available_slots_for_date IS 'Mobil: Seçilen günde müsait saatleri döner. Masa yoksa çalışma saatlerine göre tüm slotlar; masa varsa sadece müsait masalı saatler.';
GRANT EXECUTE ON FUNCTION get_available_slots_for_date TO anon, authenticated;
