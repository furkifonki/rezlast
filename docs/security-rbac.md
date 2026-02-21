# Rol Bazlı Yetkilendirme ve Güvenlik Modeli

## Rol Yapısı

Sistem üç ana rol ile çalışmaktadır:

### 1. customer (Son Kullanıcı)
- Mobil uygulama kullanıcıları
- Rezervasyon yapma, görüntüleme
- Profil yönetimi
- Yorum ve puan verme

### 2. business_owner (İşletme Sahibi)
- Web admin panel erişimi
- Kendi işletmesini yönetme
- Rezervasyon onaylama/iptal
- Analytics görüntüleme

### 3. super_admin (Sistem Yöneticisi)
- Tüm işletmelere erişim
- Kategori yönetimi
- Sponsorlu sıralama onayı
- Sistem ayarları

## Yetki Matrisi

| İşlem | customer | business_owner | super_admin |
|-------|----------|----------------|-------------|
| **Rezervasyon Oluşturma** | ✅ | ❌ | ❌ |
| **Kendi Rezervasyonlarını Görme** | ✅ | ❌ | ❌ |
| **İşletme Profili Düzenleme** | ❌ | ✅ (Kendi) | ✅ (Tümü) |
| **Rezervasyon Onaylama/İptal** | ❌ | ✅ (Kendi İşletme) | ✅ (Tümü) |
| **Analytics Görüntüleme** | ❌ | ✅ (Kendi İşletme) | ✅ (Tümü) |
| **Kategori Yönetimi** | ❌ | ❌ | ✅ |
| **Sponsorlu Sıralama Onayı** | ❌ | ❌ | ✅ |
| **Kullanıcı Yönetimi** | ❌ | ❌ | ✅ |

## Authentication Akışı

### 1. Kullanıcı Kaydı

```
User Registration Flow:
1. Email/Password ile kayıt
2. Email doğrulama (Supabase Auth)
3. users tablosuna kayıt oluşturulur
4. Varsayılan rol: 'customer'
5. JWT token döner
```

### 2. İşletme Sahibi Kaydı

```
Business Owner Registration:
1. Email/Password ile kayıt
2. Email doğrulama
3. users tablosuna 'business_owner' rolü ile kayıt
4. İşletme oluşturma formu
5. İşletme onayı (super_admin tarafından - ileriki faz)
```

### 3. Login Akışı

```
Login Flow:
1. Email/Password doğrulama (Supabase Auth)
2. JWT token oluşturulur
3. Token içinde user_id ve role bilgisi
4. Client-side'da token saklanır
5. Her API isteğinde token gönderilir
```

## Row Level Security (RLS) Politikaları

### Users Tablosu

```sql
-- Kullanıcılar sadece kendi profillerini görebilir
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Kullanıcılar sadece kendi profillerini güncelleyebilir
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Businesses Tablosu

```sql
-- Herkes aktif işletmeleri görebilir (mobil app için)
CREATE POLICY "Anyone can view active businesses"
  ON businesses FOR SELECT
  USING (is_active = true);

-- İşletme sahipleri sadece kendi işletmelerini görebilir (admin panel)
CREATE POLICY "Business owners can view own businesses"
  ON businesses FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Kullanıcılar kendi adlarına işletme ekleyebilir.
-- owner_id = auth.uid() (public.users.id = auth.users.id olmalı; trigger ile sağlanır)
CREATE POLICY "Users can insert own businesses"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- İşletme sahipleri sadece kendi işletmelerini güncelleyebilir
CREATE POLICY "Business owners can update own businesses"
  ON businesses FOR UPDATE
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
```

### Reservations Tablosu

```sql
-- Kullanıcılar sadece kendi rezervasyonlarını görebilir
CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (auth.uid() = user_id);

-- Kullanıcılar rezervasyon oluşturabilir
CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- İşletme sahipleri kendi işletmelerinin rezervasyonlarını görebilir
CREATE POLICY "Business owners can view own business reservations"
  ON reservations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reservations.business_id
      AND businesses.owner_id = auth.uid()
    )
  );

-- İşletme sahipleri kendi işletmelerinin rezervasyonlarını güncelleyebilir
CREATE POLICY "Business owners can update own business reservations"
  ON reservations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM businesses
      WHERE businesses.id = reservations.business_id
      AND businesses.owner_id = auth.uid()
    )
  );
```

### Reviews Tablosu

```sql
-- Herkes aktif yorumları görebilir
CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

-- Kullanıcılar sadece kendi yorumlarını oluşturabilir
CREATE POLICY "Users can create own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar sadece kendi yorumlarını güncelleyebilir
CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  USING (auth.uid() = user_id);
```

## API Seviyesi Güvenlik

> **Bu bölüm ne zaman kullanılır?**  
> Aşağıdaki TypeScript kodları **veritabanı kurulumunda çalıştırılmaz**. **Admin panel (Next.js)** projesini yazarken kullanırsın: `admin-panel/` klasöründe ilgili dosyaları oluşturup bu örnekleri oraya koyarsın. Şu an sadece veritabanı + RLS ile ilerliyorsan **bu bölümü atlayıp** "Güvenlik Best Practices" kısmına geçebilirsin; admin paneli kodlamaya başladığında geri dönersin.

### Middleware Örnekleri (Admin panel projesinde kullanılacak)

#### 1. Authentication Middleware

```typescript
// middleware/auth.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function requireAuth(request: Request) {
  const supabase = createMiddlewareClient({ req: request });
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return { session, supabase };
}
```

#### 2. Role-Based Middleware

```typescript
// middleware/rbac.ts
export async function requireRole(
  session: Session,
  allowedRoles: string[]
) {
  const { data: user } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (!user || !allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }
  
  return user;
}
```

#### 3. Business Owner Check

```typescript
// middleware/business-owner.ts
export async function requireBusinessOwner(
  supabase: SupabaseClient,
  userId: string,
  businessId: string
) {
  const { data: business } = await supabase
    .from('businesses')
    .select('owner_id')
    .eq('id', businessId)
    .single();
  
  if (!business || business.owner_id !== userId) {
    throw new Error('Unauthorized: Not business owner');
  }
  
  return business;
}
```

## Frontend Güvenlik

### 1. Token Yönetimi

```typescript
// lib/auth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Token otomatik olarak header'a eklenir
export const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Authorization': `Bearer ${session?.access_token}`,
    'Content-Type': 'application/json',
  };
};
```

### 2. Protected Routes

```typescript
// components/ProtectedRoute.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export function ProtectedRoute({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  useEffect(() => {
    if (!loading && (!user || !allowedRoles.includes(user.role))) {
      router.push('/login');
    }
  }, [user, loading, allowedRoles, router]);
  
  if (loading || !user || !allowedRoles.includes(user.role)) {
    return <LoadingSpinner />;
  }
  
  return <>{children}</>;
}
```

### 3. Role-Based Component Rendering

```typescript
// hooks/useRole.ts
export function useRole() {
  const { user } = useAuth();
  
  const isCustomer = user?.role === 'customer';
  const isBusinessOwner = user?.role === 'business_owner';
  const isSuperAdmin = user?.role === 'super_admin';
  
  const hasRole = (role: string) => user?.role === role;
  const hasAnyRole = (roles: string[]) => roles.includes(user?.role || '');
  
  return {
    isCustomer,
    isBusinessOwner,
    isSuperAdmin,
    hasRole,
    hasAnyRole,
    role: user?.role,
  };
}
```

## Güvenlik Best Practices

### 1. Input Validation

```typescript
// lib/validation.ts
import { z } from 'zod';

export const reservationSchema = z.object({
  business_id: z.string().uuid(),
  reservation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reservation_time: z.string().regex(/^\d{2}:\d{2}$/),
  party_size: z.number().int().min(1).max(20),
  special_requests: z.string().max(500).optional(),
});

export function validateReservation(data: unknown) {
  return reservationSchema.parse(data);
}
```

### 2. SQL Injection Koruması

- Supabase client otomatik olarak parametreli sorgular kullanır
- Raw SQL kullanımından kaçınılmalı
- Input sanitization yapılmalı

### 3. Rate Limiting

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function rateLimit(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    );
  }
}
```

### 4. CORS Ayarları

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
        ],
      },
    ];
  },
};
```

### 5. Sensitive Data Encryption

- Şifreler: Supabase Auth (bcrypt)
- Kredi kartı bilgileri: Payment provider (Stripe, Iyzico)
- Kişisel veriler: GDPR uyumlu saklama

## Audit Logging

```sql
-- Audit log tablosu
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
```

## Güvenlik Checklist

- [x] Authentication (JWT tokens)
- [x] Authorization (RBAC)
- [x] Row Level Security (RLS)
- [x] Input validation
- [x] SQL injection koruması
- [x] Rate limiting
- [x] CORS ayarları
- [x] HTTPS zorunlu
- [x] Sensitive data encryption
- [x] Audit logging
- [x] Error handling (sensitive bilgi sızıntısı yok)
- [x] Session management
- [x] Password policies
- [x] Email verification
- [x] 2FA (ileriki faz)

## GDPR Uyumluluğu

- Kullanıcı verileri silme (Right to be forgotten)
- Veri dışa aktarma (Data portability)
- Gizlilik politikası
- Cookie consent
- Veri işleme kayıtları
