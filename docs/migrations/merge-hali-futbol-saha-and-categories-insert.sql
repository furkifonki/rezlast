-- 1) Halı Sahalar + Futbol Sahaları tek kategoride birleştirilir: "Halı Saha"
-- 2) categories tablosuna işletme sahiplerinin yeni kategori ekleyebilmesi için INSERT policy

-- ----- Birleştirme -----
DO $$
DECLARE
  v_keep_id UUID;
  v_remove_id UUID;
BEGIN
  SELECT id INTO v_keep_id FROM categories WHERE slug = 'hali-sahalar' LIMIT 1;
  SELECT id INTO v_remove_id FROM categories WHERE slug = 'futbol-sahalari' LIMIT 1;

  IF v_keep_id IS NOT NULL THEN
    UPDATE categories SET name = 'Halı Saha', slug = 'hali-saha' WHERE id = v_keep_id;
  END IF;

  IF v_remove_id IS NOT NULL THEN
    UPDATE businesses SET category_id = v_keep_id WHERE category_id = v_remove_id;
    UPDATE sponsored_listings SET category_id = v_keep_id WHERE category_id = v_remove_id;
    UPDATE categories SET is_active = false WHERE id = v_remove_id;
  END IF;
END $$;

-- ----- RLS: Kategoriler okunabilir, authenticated yeni kategori ekleyebilir -----
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active categories" ON categories;
CREATE POLICY "Anyone can read active categories"
  ON categories FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert categories" ON categories;
CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE categories IS 'Kategoriler. Filtrelerde sadece en az bir aktif işletmesi olan kategoriler gösterilir. İşletme sahipleri yeni kategori ekleyebilir.';
