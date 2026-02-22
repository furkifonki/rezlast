-- Mobil uygulama: Müşteriler aktif işletmeleri listeleyebilsin (Keşfet).
-- Bu policy ile authenticated ve anon kullanıcılar is_active = true olan
-- işletmeleri okuyabilir. Admin panelde sadece kendi işletmelerini görmek için
-- uygulama tarafında .eq('owner_id', user.id) kullanılıyor.
--
-- Önce rls-businesses-owner-only.sql ile sadece owner SELECT varsa,
-- bu policy'yi eklediğinizde artık "owner VEYA is_active" ile SELECT açılır.
-- Yani: sahipler kendi işletmelerini, herkes aktif işletmeleri görebilir.
--
-- Supabase SQL Editor'da çalıştırın.

-- Aktif işletmeleri herkes (anon + authenticated) okuyabilsin
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (is_active = true);

COMMENT ON POLICY "Anyone can view active businesses" ON businesses IS 'Mobil Keşfet: müşteriler aktif işletmeleri listeler.';
