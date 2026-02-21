# Veritabanı Şeması ve İlişkiler

## Genel Bakış

PostgreSQL veritabanı, multi-tenant yapı için Row Level Security (RLS) ile korunmaktadır. Tüm tablolar `business_id` veya `user_id` ile izole edilmiştir.

## Tablolar

### 1. users
Kullanıcı bilgileri (Supabase Auth ile entegre)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(50) NOT NULL DEFAULT 'customer', -- customer, business_owner, super_admin
  loyalty_level VARCHAR(50) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2. roles
Rol tanımları (genişletilebilir)

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB, -- {"reservations": ["read", "write"], ...}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. businesses
İşletme bilgileri

```sql
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) DEFAULT 'Istanbul',
  district VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_businesses_owner ON businesses(owner_id);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_city ON businesses(city);

-- Konum index'i (PostGIS kullanır; yoksa: CREATE EXTENSION IF NOT EXISTS postgis;)
CREATE INDEX idx_businesses_location ON businesses USING GIST(
  (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography)
);

-- Seçenek B (earthdistance kullanacaksanız): Önce eklentiyi açın:
-- CREATE EXTENSION IF NOT EXISTS cube;
-- CREATE EXTENSION IF NOT EXISTS earthdistance;
-- Sonra:
-- CREATE INDEX idx_businesses_location ON businesses USING GIST(
--   ll_to_earth(latitude::double precision, longitude::double precision)
-- );
```

### 4. branches
Çoklu şube desteği

```sql
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100) DEFAULT 'Istanbul',
  district VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_branches_business ON branches(business_id);
```

### 5. categories
İşletme kategorileri

```sql
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MVP kategorileri
INSERT INTO categories (name, slug, icon, sort_order) VALUES
  ('Restoranlar', 'restoranlar', 'restaurant', 1),
  ('Berberler', 'berberler', 'scissors', 2),
  ('Güzellik Salonları', 'guzellik-salonlari', 'sparkles', 3),
  ('Tenis Kortları', 'tenis-kortlari', 'tennis', 4),
  ('Halı Sahalar', 'hali-sahalar', 'football', 5),
  ('Futbol Sahaları', 'futbol-sahalari', 'football', 6);
```

### 6. business_hours
Çalışma saatleri

```sql
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sunday, 1=Monday, ..., 6=Saturday
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  break_start TIME,
  break_end TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, day_of_week)
);

CREATE INDEX idx_business_hours_business ON business_hours(business_id);
```

### 7. business_closures
Kapalı günler (tatil, özel günler)

```sql
CREATE TABLE business_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  closure_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, closure_date)
);

CREATE INDEX idx_business_closures_business ON business_closures(business_id);
CREATE INDEX idx_business_closures_date ON business_closures(closure_date);
```

### 8. business_photos
İşletme fotoğrafları

```sql
CREATE TABLE business_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_business_photos_business ON business_photos(business_id);
```

### 9. services
Hizmet tanımları (Berber/Güzellik için)

```sql
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL, -- Hizmet süresi (dakika)
  price DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_business ON services(business_id);
```

### 10. tables
Masa planı (Restoran için)

```sql
CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  table_number VARCHAR(50) NOT NULL,
  capacity INTEGER NOT NULL, -- Kişi kapasitesi
  floor_number INTEGER DEFAULT 1,
  position_x DECIMAL(10, 2), -- Masa planı koordinatları
  position_y DECIMAL(10, 2),
  table_type VARCHAR(50), -- indoor, outdoor, vip
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, table_number)
);

CREATE INDEX idx_tables_business ON tables(business_id);
```

### 11. availability_slots
Müsaitlik slotları (Saat bazlı rezervasyonlar için)

```sql
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  max_capacity INTEGER, -- Günlük kapasite limiti
  current_bookings INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  price DECIMAL(10, 2), -- Dinamik fiyatlandırma (ileriki faz)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, slot_date, slot_time)
);

CREATE INDEX idx_availability_slots_business ON availability_slots(business_id);
CREATE INDEX idx_availability_slots_date ON availability_slots(slot_date);
CREATE INDEX idx_availability_slots_available ON availability_slots(is_available, slot_date);
```

### 12. reservations
Rezervasyonlar

```sql
CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  branch_id UUID REFERENCES branches(id),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  end_time TIME, -- Otomatik hesaplanır
  party_size INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed, no_show
  table_id UUID REFERENCES tables(id), -- Restoran için
  service_id UUID REFERENCES services(id), -- Berber/Güzellik için
  slot_id UUID REFERENCES availability_slots(id), -- Saat bazlı için
  special_requests TEXT,
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  loyalty_points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_reservations_business ON reservations(business_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_table ON reservations(table_id);
CREATE INDEX idx_reservations_slot ON reservations(slot_id);
```

### 13. loyalty_transactions
Loyalty puan işlemleri

```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES reservations(id),
  points INTEGER NOT NULL, -- Pozitif (kazanç) veya negatif (harcama)
  transaction_type VARCHAR(50) NOT NULL, -- earned, redeemed, expired
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_transactions_user ON loyalty_transactions(user_id);
CREATE INDEX idx_loyalty_transactions_business ON loyalty_transactions(business_id);
CREATE INDEX idx_loyalty_transactions_reservation ON loyalty_transactions(reservation_id);
```

### 14. loyalty_rules
İşletme bazlı loyalty kuralları

```sql
CREATE TABLE loyalty_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  rule_type VARCHAR(50) NOT NULL, -- points_per_reservation, level_benefit, etc.
  rule_config JSONB NOT NULL, -- {"points": 10, "min_amount": 100}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_rules_business ON loyalty_rules(business_id);
```

### 15. reviews
Yorumlar ve puanlar

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reservation_id UUID REFERENCES reservations(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false, -- Rezervasyon yapmış kullanıcı
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(business_id, user_id, reservation_id)
);

CREATE INDEX idx_reviews_business ON reviews(business_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

### 16. sponsored_listings
Sponsorlu sıralama (ücretli reklam)

```sql
CREATE TABLE sponsored_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  package_type VARCHAR(50) NOT NULL, -- weekly, monthly
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, expired
  priority INTEGER DEFAULT 0, -- Yüksek = üst sırada
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sponsored_listings_business ON sponsored_listings(business_id);
CREATE INDEX idx_sponsored_listings_category ON sponsored_listings(category_id);
CREATE INDEX idx_sponsored_listings_dates ON sponsored_listings(start_date, end_date);
-- Partial index: CURRENT_DATE predicate kullanılamaz (IMMUTABLE değil). Sadece payment_status ile.
CREATE INDEX idx_sponsored_listings_active ON sponsored_listings(category_id, end_date) 
  WHERE payment_status = 'paid';
```

### 17. subscription_plans
SaaS abonelik planları

```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  features JSONB, -- {"max_branches": 1, "analytics": true, ...}
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 18. subscriptions
İşletme abonelikleri

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, cancelled, expired
  start_date DATE NOT NULL,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_business ON subscriptions(business_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

### 19. payments
Ödeme işlemleri (ileriki faz)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES reservations(id),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'TRY',
  payment_method VARCHAR(50), -- card, bank_transfer, etc.
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded
  payment_provider VARCHAR(50), -- stripe, iyzico, paytr
  provider_transaction_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payments_reservation ON payments(reservation_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_business ON payments(business_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
```

### 20. notifications
Bildirimler

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL, -- reservation_confirmed, reminder, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Ek bilgiler
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);
```

### 21. campaigns
Kampanyalar ve kuponlar

```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL, -- discount, first_booking, birthday, etc.
  discount_type VARCHAR(50), -- percentage, fixed_amount
  discount_value DECIMAL(10, 2),
  min_purchase_amount DECIMAL(10, 2),
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_business ON campaigns(business_id);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
```

## İlişki Diyagramı

```
users
  ├── businesses (owner_id)
  ├── reservations (user_id)
  ├── reviews (user_id)
  ├── loyalty_transactions (user_id)
  └── notifications (user_id)

businesses
  ├── branches (business_id)
  ├── business_hours (business_id)
  ├── business_closures (business_id)
  ├── business_photos (business_id)
  ├── services (business_id)
  ├── tables (business_id)
  ├── availability_slots (business_id)
  ├── reservations (business_id)
  ├── loyalty_rules (business_id)
  ├── reviews (business_id)
  ├── sponsored_listings (business_id)
  ├── subscriptions (business_id)
  └── campaigns (business_id)

categories
  ├── businesses (category_id)
  └── sponsored_listings (category_id)

reservations
  ├── tables (table_id)
  ├── services (service_id)
  ├── availability_slots (slot_id)
  ├── reviews (reservation_id)
  ├── loyalty_transactions (reservation_id)
  └── payments (reservation_id)
```

## Row Level Security (RLS) Politikaları

### Örnek RLS Politikaları

```sql
-- Businesses: İşletme sahipleri sadece kendi işletmelerini görebilir
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own businesses"
  ON businesses FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Business owners can update own businesses"
  ON businesses FOR UPDATE
  USING (auth.uid() = owner_id);

-- Reservations: İşletme sahipleri kendi işletmelerinin rezervasyonlarını görebilir
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners can view own business reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reservations.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Customers: Herkes aktif işletmeleri görebilir
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (is_active = true);
```

## Indexing Stratejisi

- **Primary Keys:** Tüm tablolarda UUID primary key
- **Foreign Keys:** İlişkili tablolarda index
- **Query Patterns:** Sık sorgulanan alanlarda index
- **Geospatial:** İşletme konumları için GIST index
- **Composite Indexes:** Çoklu filtreleme için

## Veri Bütünlüğü

- **Foreign Key Constraints:** Tüm ilişkilerde
- **Check Constraints:** Rating, status değerleri
- **Unique Constraints:** Email, slug, vb.
- **Triggers:** `updated_at` otomatik güncelleme

## Backup ve Recovery

- **Daily Backups:** Supabase otomatik backup
- **Point-in-time Recovery:** Supabase Pro plan
- **Export Scripts:** Manuel backup için
