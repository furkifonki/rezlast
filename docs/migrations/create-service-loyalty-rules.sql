-- Hizmet bazlı puan kuralları: Her hizmet için tamamlanan randevuda verilecek puan.
-- İşletme sahipleri sadece kendi hizmetlerine kural ekleyebilir (RLS ile).
-- Trigger: Önce service_loyalty_rules'a bakılır (reservation.service_id varsa), yoksa loyalty_rules (işletme), yoksa varsayılan 10.

CREATE TABLE IF NOT EXISTS service_loyalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 10 CHECK (points >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_loyalty_rules_service ON service_loyalty_rules(service_id);

COMMENT ON TABLE service_loyalty_rules IS 'Hizmet bazlı puan: Tamamlanan randevuda müşteriye verilecek puan (sadece işletme sahibi kendi hizmetleri için düzenler).';
