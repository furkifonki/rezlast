-- =============================================================================
-- Toplu mağaza (işletme) ekleme
-- =============================================================================
-- Çalıştırmadan önce:
-- 1. owner_id: Mağazaların sahibi olacak kullanıcının users.id değeri (UUID)
-- 2. category_id: Kategori UUID (categories tablosundan; örn. Restoranlar, Berberler)
-- 3. Görsel URL'leri: Supabase Storage veya harici URL ile değiştirin
-- =============================================================================

-- Örnek: owner_id ve category_id almak için (Supabase SQL Editor'da çalıştırıp kopyalayın):
-- SELECT id FROM users WHERE email = 'sizin@email.com' LIMIT 1;
-- SELECT id FROM categories WHERE slug = 'restoranlar' LIMIT 1;

-- Aşağıdaki 'YOUR_OWNER_UUID' ve 'YOUR_CATEGORY_UUID' yerine gerçek UUID yazın.
DO $$
DECLARE
  v_owner_id    UUID := 'YOUR_OWNER_UUID';
  v_category_id UUID := 'YOUR_CATEGORY_UUID';
  v_b1_id       UUID;
  v_b2_id       UUID;
  v_b3_id       UUID;
BEGIN
  -- Mağaza 1
  INSERT INTO businesses (
    owner_id, name, slug, description, category_id, address, city, district,
    latitude, longitude, phone, email, website, is_active, is_verified
  ) VALUES (
    v_owner_id,
    'Örnek Restoran Kadıköy',
    'ornek-restoran-kadikoy',
    'Kadıköy merkezde lezzetli yemekler.',
    v_category_id,
    'Caferağa Mah. Moda Cad. No:1',
    'Istanbul',
    'Kadıköy',
    40.9876,
    29.0234,
    '+902161234567',
    'info@ornekrestoran.com',
    'https://ornekrestoran.com',
    true,
    false
  )
  RETURNING id INTO v_b1_id;

  -- Mağaza 1 görselleri (photo_url: Supabase Storage veya harici URL)
  INSERT INTO business_photos (business_id, photo_url, photo_order, is_primary) VALUES
    (v_b1_id, 'https://your-project.supabase.co/storage/v1/object/public/business-photos/restoran1-1.jpg', 1, true),
    (v_b1_id, 'https://your-project.supabase.co/storage/v1/object/public/business-photos/restoran1-2.jpg', 2, false);

  -- Mağaza 2
  INSERT INTO businesses (
    owner_id, name, slug, description, category_id, address, city, district,
    latitude, longitude, phone, email, website, is_active, is_verified
  ) VALUES (
    v_owner_id,
    'Örnek Berber Beşiktaş',
    'ornek-berber-besiktas',
    'Klasik ve modern saç kesimi.',
    v_category_id,
    'Levent Mah. Nispetiye Cad. No:5',
    'Istanbul',
    'Beşiktaş',
    41.0820,
    29.0100,
    '+902121234567',
    'info@ornekberber.com',
    NULL,
    true,
    false
  )
  RETURNING id INTO v_b2_id;

  INSERT INTO business_photos (business_id, photo_url, photo_order, is_primary) VALUES
    (v_b2_id, 'https://your-project.supabase.co/storage/v1/object/public/business-photos/berber1-1.jpg', 1, true);

  -- Mağaza 3
  INSERT INTO businesses (
    owner_id, name, slug, description, category_id, address, city, district,
    latitude, longitude, phone, email, website, is_active, is_verified
  ) VALUES (
    v_owner_id,
    'Örnek Güzellik Salonu Şişli',
    'ornek-guzellik-salonu-sisli',
    'Cilt bakımı ve makyaj.',
    v_category_id,
    'Mecidiyeköy Mah. Büyükdere Cad. No:100',
    'Istanbul',
    'Şişli',
    41.0700,
    28.9876,
    '+902121112233',
    'info@orneksalon.com',
    'https://orneksalon.com',
    true,
    false
  )
  RETURNING id INTO v_b3_id;

  INSERT INTO business_photos (business_id, photo_url, photo_order, is_primary) VALUES
    (v_b3_id, 'https://your-project.supabase.co/storage/v1/object/public/business-photos/salon1-1.jpg', 1, true),
    (v_b3_id, 'https://your-project.supabase.co/storage/v1/object/public/business-photos/salon1-2.jpg', 2, false);

  RAISE NOTICE '3 mağaza ve görselleri eklendi.';
END $$;

-- =============================================================================
-- Sadece businesses (görselsiz) toplu eklemek isterseniz:
-- =============================================================================
-- INSERT INTO businesses (
--   owner_id, name, slug, description, category_id, address, city, district,
--   latitude, longitude, phone, email, website, is_active, is_verified
-- ) VALUES
--   ('YOUR_OWNER_UUID', 'Mağaza 1', 'magaza-1', 'Açıklama', 'YOUR_CATEGORY_UUID', 'Adres 1', 'Istanbul', 'Kadıköy', 40.99, 29.02, '+902161234567', 'a@a.com', NULL, true, false),
--   ('YOUR_OWNER_UUID', 'Mağaza 2', 'magaza-2', 'Açıklama', 'YOUR_CATEGORY_UUID', 'Adres 2', 'Istanbul', 'Beşiktaş', 41.08, 29.01, '+902121234567', 'b@b.com', NULL, true, false);
-- (slug her satırda benzersiz olmalı.)

-- =============================================================================
-- Sonradan görsel eklemek için (business_id veya slug ile):
-- =============================================================================
-- INSERT INTO business_photos (business_id, photo_url, photo_order, is_primary)
-- SELECT id, 'https://...', 1, true
-- FROM businesses WHERE slug = 'ornek-restoran-kadikoy';
