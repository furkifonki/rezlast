#!/usr/bin/env node
/**
 * İşletmelerin adreslerini koordinata çevirir (geocoding) ve businesses tablosundaki
 * latitude/longitude alanlarını günceller. Böylece haritada konumlar görünür.
 *
 * Kullanım:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/geocode-businesses.mjs
 *
 * Supabase Service Role Key: Dashboard > Project Settings > API > service_role (secret)
 * Nominatim (OpenStreetMap) kullanılır; ücretsiz, API key gerekmez. İstekler arası 1 sn beklenir.
 */

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Hata: SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY ortam değişkenleri gerekli.');
  console.error('Örnek: SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/geocode-businesses.mjs');
  process.exit(1);
}

const NOMINATIM_DELAY_MS = 1100;
const USER_AGENT = 'RezervioApp/1.0 (contact@example.com)';

async function supabaseFetch(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...options.headers,
    },
  });
  if (!res.ok && options.method !== 'PATCH') {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res;
}

async function getBusinessesWithoutCoords() {
  const params = new URLSearchParams({
    select: 'id,name,address,city,district',
    'address': 'not.is.null',
    'or': '(latitude.is.null,longitude.is.null)',
    is_active: 'true',
  });
  const res = await supabaseFetch(`/businesses?${params}`);
  return res.json();
}

async function geocodeAddress(fullAddress) {
  const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
    q: fullAddress,
    format: 'json',
    limit: '1',
  })}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return { latitude: lat, longitude: lon };
}

function buildFullAddress(row) {
  const parts = [row.address, row.city, row.district].filter(Boolean);
  return parts.join(', ') + (parts.length ? ', Turkey' : '');
}

async function updateBusiness(id, latitude, longitude) {
  const res = await supabaseFetch(`/businesses?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ latitude, longitude }),
  });
  return res.ok;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log('Koordinatı eksik işletmeler alınıyor...');
  const rows = await getBusinessesWithoutCoords();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('Güncellenecek işletme yok (hepsinde latitude/longitude dolu veya adres yok).');
    return;
  }
  console.log(`${rows.length} işletme bulundu. Geocoding başlıyor (her istekten sonra ~1 sn beklenir)...\n`);

  let ok = 0;
  let fail = 0;
  for (const row of rows) {
    const fullAddress = buildFullAddress(row);
    process.stdout.write(`${row.name} (${fullAddress.slice(0, 50)}...) → `);
    const coords = await geocodeAddress(fullAddress);
    await sleep(NOMINATIM_DELAY_MS);

    if (!coords) {
      console.log('bulunamadı');
      fail++;
      continue;
    }
    const updated = await updateBusiness(row.id, coords.latitude, coords.longitude);
    if (updated) {
      console.log(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`);
      ok++;
    } else {
      console.log('güncelleme hatası');
      fail++;
    }
  }

  console.log(`\nBitti: ${ok} güncellendi, ${fail} başarısız.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
