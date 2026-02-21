# Sponsorlu Sıralama Sistemi

## Genel Bakış

Sponsorlu sıralama, işletmelerin kategorilerinde üst sıralara çıkmak için ödeme yaptığı bir reklam modelidir. MVP'den itibaren aktif olacak ve platformun ana gelir kanallarından biridir.

## İş Mantığı

### 1. Paket Tipleri

#### Weekly Package (Haftalık)
- **Süre:** 7 gün
- **Fiyat:** X₺ (MVP'de manuel belirlenir)
- **Özellikler:**
  - Kategori listesinde üst sıralarda görünme
  - "Featured" badge gösterimi
  - Öncelikli sıralama

#### Monthly Package (Aylık)
- **Süre:** 30 gün
- **Fiyat:** Y₺ (Weekly'den daha uygun birim fiyat)
- **Özellikler:**
  - Weekly paket özellikleri
  - Daha uzun görünürlük
  - Toplu indirim avantajı

### 2. Sıralama Algoritması

```
Sıralama Önceliği:
1. Sponsorlu İşletmeler (Active)
   ├── Priority Score (Yüksek → Düşük)
   ├── End Date (Yakın biten önce - renewal için)
   └── Start Date (Yeni başlayan önce)
2. Normal İşletmeler
   ├── Rating (Yüksek → Düşük)
   ├── Total Reviews (Çok → Az)
   ├── Distance (Yakın → Uzak)
   └── Recent Activity
```

### 3. Priority Score Hesaplama

```typescript
interface SponsoredListing {
  business_id: string;
  category_id: string;
  start_date: Date;
  end_date: Date;
  package_type: 'weekly' | 'monthly';
  payment_status: 'pending' | 'paid' | 'expired';
  priority: number; // 0-100
}

function calculatePriorityScore(listing: SponsoredListing): number {
  let score = 0;
  
  // Base priority (package type)
  if (listing.package_type === 'monthly') {
    score += 50;
  } else {
    score += 30;
  }
  
  // Time remaining (more time = higher priority)
  const daysRemaining = (listing.end_date - new Date()) / (1000 * 60 * 60 * 24);
  score += Math.min(daysRemaining / 30 * 20, 20); // Max 20 points
  
  // Payment status
  if (listing.payment_status === 'paid') {
    score += 30;
  }
  
  // Manual priority boost (admin can set)
  score += listing.priority;
  
  return Math.min(score, 100);
}
```

## Veritabanı Şeması

```sql
CREATE TABLE sponsored_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  package_type VARCHAR(50) NOT NULL, -- 'weekly', 'monthly'
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'expired'
  priority INTEGER DEFAULT 0, -- 0-100, admin tarafından ayarlanabilir
  payment_amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: Aynı işletme aynı kategoride aynı anda sadece bir aktif listing olabilir
  CONSTRAINT unique_active_listing EXCLUDE USING gist (
    business_id WITH =,
    category_id WITH =,
    tstzrange(start_date, end_date) WITH &&
  ) WHERE (payment_status = 'paid')
);

CREATE INDEX idx_sponsored_listings_active 
  ON sponsored_listings(category_id, payment_status, end_date) 
  WHERE payment_status = 'paid' AND end_date >= CURRENT_DATE;

CREATE INDEX idx_sponsored_listings_business 
  ON sponsored_listings(business_id);
```

## Sıralama Query'si

### Mobil App - Business List Endpoint

```sql
-- İşletmeleri sıralı getir
WITH sponsored_businesses AS (
  SELECT 
    b.*,
    sl.priority,
    sl.end_date as listing_end_date,
    ROW_NUMBER() OVER (
      PARTITION BY b.category_id 
      ORDER BY 
        sl.priority DESC,
        sl.end_date ASC,
        sl.start_date DESC
    ) as sponsored_rank
  FROM businesses b
  INNER JOIN sponsored_listings sl ON b.id = sl.business_id
  WHERE 
    sl.category_id = $1
    AND sl.payment_status = 'paid'
    AND sl.start_date <= CURRENT_DATE
    AND sl.end_date >= CURRENT_DATE
    AND b.is_active = true
),
normal_businesses AS (
  SELECT 
    b.*,
    b.rating * 0.4 + 
    (b.total_reviews::float / 100) * 0.3 + 
    (CASE WHEN $2 IS NOT NULL AND $3 IS NOT NULL 
      THEN 1 / (1 + ST_Distance(
        ll_to_earth(b.latitude, b.longitude),
        ll_to_earth($2, $3)
      ) / 1000) 
      ELSE 0.3 
    END) as relevance_score
  FROM businesses b
  WHERE 
    b.category_id = $1
    AND b.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM sponsored_listings sl
      WHERE sl.business_id = b.id
        AND sl.payment_status = 'paid'
        AND sl.start_date <= CURRENT_DATE
        AND sl.end_date >= CURRENT_DATE
    )
)
SELECT 
  id, name, slug, description, rating, total_reviews,
  'sponsored' as listing_type,
  sponsored_rank as display_order
FROM sponsored_businesses
UNION ALL
SELECT 
  id, name, slug, description, rating, total_reviews,
  'normal' as listing_type,
  1000 + ROW_NUMBER() OVER (ORDER BY relevance_score DESC) as display_order
FROM normal_businesses
ORDER BY display_order
LIMIT $4 OFFSET $5;
```

## API Endpoints

### 1. Sponsorlu Listeleri Getir (Public)

```http
GET /businesses?category_id={id}&include_sponsored=true
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lezzet Restoran",
      "is_sponsored": true,
      "sponsored_badge": "Featured",
      "priority": 85,
      ...
    },
    {
      "id": "uuid",
      "name": "Normal Restoran",
      "is_sponsored": false,
      ...
    }
  ]
}
```

### 2. Sponsorlu Sıralama Satın Al (Business Owner)

```http
POST /admin/sponsored-listings
```

**Request:**
```json
{
  "business_id": "uuid",
  "category_id": "uuid",
  "package_type": "weekly",
  "start_date": "2024-01-20",
  "payment_method": "card"
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "business_id": "uuid",
    "category_id": "uuid",
    "package_type": "weekly",
    "start_date": "2024-01-20",
    "end_date": "2024-01-27",
    "payment_status": "pending",
    "payment_amount": 500.00,
    "payment_url": "https://payment-provider.com/..."
  }
}
```

### 3. Ödeme Onayı (Webhook)

```http
POST /webhooks/payment-confirmed
```

**Request:**
```json
{
  "listing_id": "uuid",
  "transaction_id": "uuid",
  "payment_status": "completed",
  "amount": 500.00
}
```

**Action:**
- `sponsored_listings.payment_status` → 'paid' olarak güncelle
- `sponsored_listings.payment_date` → şu anki tarih
- İşletmeye bildirim gönder

### 4. Aktif Sponsorlu Listeler (Admin)

```http
GET /admin/sponsored-listings?status=active
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "business": {
        "id": "uuid",
        "name": "Lezzet Restoran"
      },
      "category": {
        "id": "uuid",
        "name": "Restoranlar"
      },
      "package_type": "weekly",
      "start_date": "2024-01-20",
      "end_date": "2024-01-27",
      "payment_status": "paid",
      "priority": 85,
      "days_remaining": 5
    }
  ]
}
```

## UI/UX Özellikleri

### Mobil App'te Görünüm

1. **Featured Badge:**
   - Sponsorlu işletmelerde "⭐ Featured" badge
   - Yeşil renk, premium görünüm

2. **Sıralama:**
   - Sponsorlu işletmeler her zaman üstte
   - Normal işletmeler altında

3. **Visual Distinction:**
   - Sponsorlu kartlarda hafif border/shadow
   - "Promoted" etiketi (opsiyonel)

### Admin Panel'de Yönetim

1. **Listing Yönetimi:**
   - Aktif listeleri görüntüleme
   - Bitiş tarihlerini takip etme
   - Otomatik yenileme önerileri

2. **Analytics:**
   - Sponsorlu işletmelerin görüntülenme sayısı
   - Tıklanma oranı (CTR)
   - Dönüşüm oranı (rezervasyon)

## Otomasyon Kuralları

### 1. Otomatik Expiry

```sql
-- Günlük çalışan cron job
UPDATE sponsored_listings
SET payment_status = 'expired'
WHERE payment_status = 'paid'
  AND end_date < CURRENT_DATE;
```

### 2. Yenileme Hatırlatması

```typescript
// 3 gün kala hatırlatma gönder
async function sendRenewalReminders() {
  const expiringListings = await supabase
    .from('sponsored_listings')
    .select('*, businesses(*)')
    .eq('payment_status', 'paid')
    .gte('end_date', new Date())
    .lte('end_date', addDays(new Date(), 3));
  
  for (const listing of expiringListings.data) {
    await sendNotification({
      to: listing.businesses.owner_id,
      type: 'sponsored_listing_expiring',
      data: {
        listing_id: listing.id,
        end_date: listing.end_date,
        renewal_url: `/admin/sponsored-listings/${listing.id}/renew`
      }
    });
  }
}
```

### 3. Otomatik Yenileme (Opsiyonel)

```typescript
// Kullanıcı otomatik yenileme açtıysa
async function autoRenewListing(listingId: string) {
  const listing = await getListing(listingId);
  
  if (listing.auto_renew && listing.payment_method) {
    // Ödeme işlemi
    const payment = await processPayment({
      amount: listing.payment_amount,
      method: listing.payment_method
    });
    
    if (payment.success) {
      // Yeni listing oluştur
      await createListing({
        ...listing,
        start_date: listing.end_date,
        end_date: addDays(listing.end_date, listing.package_type === 'weekly' ? 7 : 30)
      });
    }
  }
}
```

## Fiyatlandırma Stratejisi

### MVP Fazı (Manuel)
- Haftalık: 500₺
- Aylık: 1500₺ (haftalık bazda %25 indirim)

### Growth Fazı
- Dinamik fiyatlandırma
- Kategori bazlı fiyatlar (popüler kategoriler daha pahalı)
- Rekabet bazlı fiyatlandırma

### Örnek Fiyatlandırma Tablosu

| Kategori | Haftalık | Aylık |
|----------|----------|-------|
| Restoranlar | 750₺ | 2000₺ |
| Berberler | 500₺ | 1500₺ |
| Güzellik Salonları | 500₺ | 1500₺ |
| Tenis Kortları | 600₺ | 1700₺ |
| Halı Sahalar | 600₺ | 1700₺ |
| Futbol Sahaları | 600₺ | 1700₺ |

## Analytics ve Raporlama

### İşletme Sahibi İçin:
- Görüntülenme sayısı
- Tıklanma sayısı
- Rezervasyon dönüşümü
- ROI hesaplama

### Platform İçin:
- Toplam sponsorlu listing sayısı
- Gelir raporu
- Kategori bazlı performans
- Yenileme oranı

## Güvenlik ve Doğrulama

1. **İşletme Doğrulaması:**
   - Sadece aktif ve doğrulanmış işletmeler sponsorlu listing alabilir

2. **Ödeme Doğrulaması:**
   - Ödeme tamamlanmadan listing aktif olmaz
   - Webhook ile ödeme doğrulama

3. **Çakışma Önleme:**
   - Aynı işletme aynı kategoride aynı anda sadece bir aktif listing
   - Database constraint ile garanti

## Gelecek Geliştirmeler

1. **A/B Testing:** Farklı badge tasarımları test etme
2. **Targeting:** Belirli bölgelere/spesifik kullanıcılara gösterim
3. **Bidding System:** Açık artırma sistemi
4. **Performance-Based Pricing:** Tıklama başına ödeme (CPC)
5. **Multi-Category Packages:** Birden fazla kategoride paket
