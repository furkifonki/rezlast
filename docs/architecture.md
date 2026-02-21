# Sistem Mimarisi

## Genel Bakış

Platform üç ana bileşenden oluşmaktadır:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Mobil App     │     │  Web Admin      │     │    Backend      │
│  (React Native) │────▶│   (Next.js)     │────▶│   (Supabase)    │
│   B2C Users     │     │   B2B Owners    │     │   PostgreSQL    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Teknoloji Stack

### Frontend - Mobil Uygulama
- **Framework:** React Native
- **Build Tool:** Expo (Expo Go uyumlu)
- **State Management:** Zustand / Redux Toolkit
- **Navigation:** React Navigation
- **UI Library:** React Native Paper / NativeBase
- **Maps:** React Native Maps
- **Notifications:** Expo Notifications
- **HTTP Client:** Axios / React Query

### Frontend - Web Admin Panel
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **State Management:** Zustand / React Query
- **UI Library:** Shadcn/ui + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts / Chart.js
- **Tables:** TanStack Table

### Backend
- **Primary:** Supabase
  - PostgreSQL (veritabanı)
  - Supabase Auth (kimlik doğrulama)
  - Row Level Security (güvenlik)
  - Realtime subscriptions
  - Storage (fotoğraflar)
  - Edge Functions (serverless)

- **Alternatif 1:** Firebase
  - Firestore (NoSQL)
  - Firebase Auth
  - Cloud Functions
  - Cloud Storage

- **Alternatif 2:** Node.js + PostgreSQL
  - Express.js / Fastify
  - PostgreSQL + Prisma ORM
  - JWT Authentication
  - Socket.io (realtime)

### Altyapı ve DevOps
- **Hosting:** Vercel (Web), Expo (Mobil)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry
- **Analytics:** Mixpanel / PostHog
- **Payment:** Stripe / Iyzico / PayTR

## Mimari Prensipler

### 1. Multi-Tenant Yapı
- Her işletme sahibi yalnızca kendi verilerine erişebilir
- Veritabanı seviyesinde izolasyon (RLS)
- Şube bazlı çoklu lokasyon desteği

### 2. Ölçeklenebilirlik
- Stateless API tasarımı
- Horizontal scaling desteği
- CDN entegrasyonu (fotoğraflar)
- Caching stratejileri (Redis - ileriki faz)

### 3. Güvenlik
- JWT tabanlı authentication
- Row Level Security (RLS) politikaları
- Role-based access control (RBAC)
- API rate limiting
- Input validation ve sanitization

### 4. Modülerlik
- Feature-based klasör yapısı
- Reusable component library
- Shared business logic
- API abstraction layer

## Veri Akışı

### Mobil Uygulama Akışı
```
User Action → React Component → State Management → API Service → Supabase Client → Database
                                                                    ↓
                                                              Realtime Updates
```

### Admin Panel Akışı
```
Business Owner → Next.js Page → API Route → Supabase Client → Database (RLS Filtered)
                                                                    ↓
                                                              Real-time Dashboard
```

## Güvenlik Katmanları

1. **Authentication Layer**
   - Supabase Auth (email/password, OAuth)
   - JWT token management
   - Refresh token rotation

2. **Authorization Layer**
   - Role-based permissions
   - Row Level Security policies
   - API endpoint guards

3. **Data Layer**
   - Encrypted sensitive data
   - Audit logging
   - Backup strategies

## Ölçeklenebilirlik Stratejisi

### MVP Fazı
- Single region deployment
- Supabase free tier (geliştirme)
- Basic caching

### Growth Fazı
- Multi-region support
- Redis caching layer
- CDN for static assets
- Database read replicas

### Scale Fazı
- Microservices migration (gerekirse)
- Message queue (RabbitMQ/Kafka)
- Advanced monitoring
- Auto-scaling infrastructure

## Entegrasyonlar

### Harici Servisler
- **Maps:** Google Maps / Mapbox
- **Payments:** Stripe / Iyzico
- **SMS:** Twilio / Netgsm
- **Email:** SendGrid / Resend
- **Analytics:** Mixpanel / PostHog
- **Push Notifications:** Expo Push / FCM

## Deployment Mimarisi

```
┌─────────────────────────────────────────────────┐
│              CDN (Cloudflare)                   │
│         Static Assets, Images                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           Load Balancer                          │
└─────────────────────────────────────────────────┘
         ↓                    ↓
┌──────────────┐    ┌──────────────────┐
│  Next.js     │    │  Supabase Edge   │
│  (Vercel)    │    │  Functions       │
└──────────────┘    └──────────────────┘
         ↓                    ↓
┌─────────────────────────────────────────────────┐
│         Supabase PostgreSQL                     │
│         (Primary + Replicas)                    │
└─────────────────────────────────────────────────┘
```

## Performans Optimizasyonları

1. **Frontend**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Bundle size optimization

2. **Backend**
   - Database indexing
   - Query optimization
   - Connection pooling
   - Caching strategies

3. **Network**
   - API response compression
   - HTTP/2 support
   - CDN caching
   - Request batching

## Monitoring ve Logging

- **Application Monitoring:** Sentry
- **Performance:** Web Vitals, APM tools
- **Error Tracking:** Sentry error boundaries
- **User Analytics:** Mixpanel events
- **Business Metrics:** Custom dashboard

## Gelecek Geliştirmeler

- GraphQL API (REST alternatifi)
- Microservices architecture (scale fazında)
- Event-driven architecture
- Machine learning pipeline (AI önerileri)
- Real-time collaboration features
