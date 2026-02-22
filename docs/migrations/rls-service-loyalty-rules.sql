-- RLS: İşletme sahipleri sadece kendi hizmetlerine ait service_loyalty_rules kayıtlarını yönetebilir.

ALTER TABLE service_loyalty_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Business owners can manage own service_loyalty_rules" ON service_loyalty_rules;
CREATE POLICY "Business owners can manage own service_loyalty_rules"
  ON service_loyalty_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM services
      JOIN businesses ON businesses.id = services.business_id
      WHERE services.id = service_loyalty_rules.service_id AND businesses.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM services
      JOIN businesses ON businesses.id = services.business_id
      WHERE services.id = service_loyalty_rules.service_id AND businesses.owner_id = auth.uid()
    )
  );

-- Okuma: Herkes aktif kuralları okuyabilsin (trigger rezervasyon tamamlandığında kullanır)
DROP POLICY IF EXISTS "Anyone can view active service_loyalty_rules" ON service_loyalty_rules;
CREATE POLICY "Anyone can view active service_loyalty_rules"
  ON service_loyalty_rules FOR SELECT
  USING (is_active = true);
