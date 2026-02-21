# Backend Seçimi ve Gerekçesi

## Önerilen: Supabase

### Neden Supabase?

#### 1. **PostgreSQL + Row Level Security (RLS)**
- Multi-tenant yapı için kritik özellik
- Veritabanı seviyesinde güvenlik
- Her işletme sahibi yalnızca kendi verilerine erişebilir
- SQL ile güçlü sorgu yetenekleri

#### 2. **Built-in Authentication**
- Email/password, OAuth (Google, Apple)
- JWT token yönetimi
- Role-based access control
- Session yönetimi

#### 3. **Realtime Subscriptions**
- Rezervasyon güncellemeleri için real-time
- Dashboard'da canlı veri
- WebSocket desteği

#### 4. **Edge Functions**
- Serverless fonksiyonlar
- Ödeme işlemleri, bildirimler
- Ölçeklenebilir altyapı

#### 5. **Storage**
- Fotoğraf yükleme
- CDN entegrasyonu
- Otomatik optimizasyon

#### 6. **Hızlı Geliştirme**
- REST API otomatik oluşturulur
- TypeScript client library
- Admin panel (veritabanı yönetimi)

#### 7. **Maliyet**
- MVP için ücretsiz tier yeterli
- Büyüdükçe ölçeklenebilir fiyatlandırma
- Self-hosted seçeneği mevcut

### Supabase Avantajları

✅ PostgreSQL'in gücü (ilişkisel veri, JOIN'ler)  
✅ RLS ile güvenlik  
✅ Realtime desteği  
✅ Hızlı MVP geliştirme  
✅ TypeScript desteği  
✅ Ücretsiz başlangıç  
✅ Open source (self-hosted seçeneği)

### Supabase Dezavantajları

❌ Vendor lock-in riski (kısmen)  
❌ Öğrenme eğrisi (RLS politikaları)  
❌ Edge Functions limitleri (ücretsiz tier)

---

## Alternatif 1: Firebase

### Firebase Avantajları

✅ Google altyapısı (güvenilirlik)  
✅ NoSQL esnekliği  
✅ Realtime database  
✅ Kolay entegrasyon  
✅ Geniş dokümantasyon

### Firebase Dezavantajları

❌ NoSQL (ilişkisel veri zorluğu)  
❌ Multi-tenant için manuel izolasyon  
❌ Vendor lock-in  
❌ Fiyatlandırma karmaşıklığı  
❌ Rezervasyon sistemi için uygun değil (ilişkisel veri gereksinimi)

### Firebase Ne Zaman Kullanılır?

- Hızlı prototip
- Basit veri yapısı
- NoSQL uygun olduğunda
- Google ekosistemi tercih edildiğinde

---

## Alternatif 2: Node.js + PostgreSQL

### Node.js + PostgreSQL Avantajları

✅ Tam kontrol  
✅ Vendor lock-in yok  
✅ Özelleştirilebilir  
✅ Açık kaynak  
✅ Esnek mimari

### Node.js + PostgreSQL Dezavantajları

❌ Daha fazla geliştirme süresi  
❌ Altyapı yönetimi  
❌ Scaling zorluğu  
❌ DevOps gereksinimi  
❌ Authentication implementasyonu

### Node.js + PostgreSQL Ne Zaman Kullanılır?

- Tam kontrol gerektiğinde
- Özel gereksinimler olduğunda
- Self-hosted tercih edildiğinde
- Büyük ekip ve DevOps kapasitesi

---

## Karşılaştırma Tablosu

| Özellik | Supabase | Firebase | Node.js + PostgreSQL |
|---------|----------|----------|----------------------|
| **Veritabanı** | PostgreSQL (SQL) | Firestore (NoSQL) | PostgreSQL (SQL) |
| **Multi-tenant** | ✅ RLS ile kolay | ❌ Manuel | ✅ Manuel |
| **Realtime** | ✅ Built-in | ✅ Built-in | ⚠️ Socket.io gerekli |
| **Auth** | ✅ Built-in | ✅ Built-in | ⚠️ JWT implementasyonu |
| **Storage** | ✅ Built-in | ✅ Built-in | ⚠️ S3/MinIO gerekli |
| **Geliştirme Hızı** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Ölçeklenebilirlik** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Maliyet (MVP)** | Ücretsiz | Ücretsiz (limitli) | Sunucu maliyeti |
| **Vendor Lock-in** | Orta | Yüksek | Düşük |
| **Öğrenme Eğrisi** | Orta | Düşük | Yüksek |

---

## Önerilen Yaklaşım: Supabase

### MVP Fazı
- **Supabase Free Tier** kullanılacak
- Hızlı geliştirme
- RLS ile güvenlik
- Realtime dashboard

### Growth Fazı
- **Supabase Pro Plan** ($25/ay)
- Daha fazla storage
- Daha fazla Edge Function
- Priority support

### Scale Fazı
- **Supabase Enterprise** veya **Self-hosted**
- Özel gereksinimler
- Yüksek trafik
- Özel SLA

---

## Migration Stratejisi

Eğer ileride alternatif bir backend'e geçiş gerekirse:

1. **API Abstraction Layer** oluşturulmalı
2. **Repository Pattern** kullanılmalı
3. **Database-agnostic** kod yazılmalı
4. **Migration scripts** hazırlanmalı

### Örnek API Abstraction

```typescript
// services/reservation.service.ts
interface ReservationService {
  createReservation(data: CreateReservationDto): Promise<Reservation>;
  getReservations(filters: ReservationFilters): Promise<Reservation[]>;
}

// Supabase implementation
class SupabaseReservationService implements ReservationService {
  // Supabase-specific implementation
}

// Firebase implementation (alternatif)
class FirebaseReservationService implements ReservationService {
  // Firebase-specific implementation
}
```

---

## Sonuç

**Supabase**, bu proje için en uygun seçimdir çünkü:

1. ✅ PostgreSQL + RLS = Multi-tenant için ideal
2. ✅ Hızlı MVP geliştirme
3. ✅ Built-in özellikler (Auth, Realtime, Storage)
4. ✅ Ölçeklenebilir
5. ✅ TypeScript desteği
6. ✅ Ücretsiz başlangıç

Alternatifler, özel gereksinimler veya farklı mimari tercihler için değerlendirilebilir.
