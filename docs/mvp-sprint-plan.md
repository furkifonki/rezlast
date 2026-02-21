# MVP Sprint Planı - 8 Hafta

## Genel Yaklaşım

MVP, 2 haftalık sprint'ler halinde planlanmıştır. Her sprint sonunda test edilebilir bir ürün çıktısı olmalıdır.

## Sprint Yapısı

- **Sprint Süresi:** 2 hafta
- **Toplam Sprint:** 4 sprint (8 hafta)
- **Sprint Review:** Her sprint sonunda demo
- **Retrospective:** Her sprint sonunda iyileştirme toplantısı

---

## Sprint 1: Temel Altyapı ve Authentication (Hafta 1-2)

### Hedefler
- Proje kurulumu ve altyapı hazırlığı
- Authentication sistemi
- Temel veritabanı şeması
- İlk deploy

### Backend Görevleri
- [ ] Supabase projesi kurulumu
- [ ] Veritabanı şeması oluşturma (users, businesses, categories)
- [ ] Row Level Security (RLS) politikaları
- [ ] Authentication API (register, login, logout)
- [ ] Role-based access control temel yapısı

### Frontend - Mobil App
- [ ] Expo projesi kurulumu
- [ ] Navigation yapısı (React Navigation)
- [ ] Authentication ekranları (Login, Register)
- [ ] Supabase client entegrasyonu
- [ ] Token yönetimi

### Frontend - Admin Panel
- [ ] Next.js projesi kurulumu
- [ ] Authentication sayfaları
- [ ] Dashboard layout (sidebar, header)
- [ ] Supabase client entegrasyonu

### DevOps
- [ ] Git repository kurulumu
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Environment variables yönetimi
- [ ] Staging environment

### Deliverables
- ✅ Çalışan authentication sistemi
- ✅ Temel veritabanı yapısı
- ✅ Login/Register ekranları (mobil + web)

---

## Sprint 2: İşletme Yönetimi ve Keşif (Hafta 3-4)

### Hedefler
- İşletme CRUD işlemleri
- Kategori yönetimi
- Mobil app'te işletme listeleme
- Admin panel'de işletme yönetimi

### Backend Görevleri
- [ ] Business API endpoints
- [ ] Category API endpoints
- [ ] Business photos upload (Supabase Storage)
- [ ] Location-based search (PostGIS)
- [ ] Business hours yönetimi

### Frontend - Mobil App
- [ ] Category tabs (Restoran, Berber, Güzellik)
- [ ] Business list screen
- [ ] Business detail screen
- [ ] Search ve filter
- [ ] Photo gallery
- [ ] Map integration (opsiyonel)

### Frontend - Admin Panel
- [ ] Business list screen
- [ ] Business form (create/edit)
- [ ] Photo upload
- [ ] Business hours editor
- [ ] Location picker (map)

### Deliverables
- ✅ İşletme ekleme/düzenleme (admin panel)
- ✅ İşletme listeleme (mobil app)
- ✅ İşletme detay sayfası (mobil app)
- ✅ Kategori bazlı filtreleme

---

## Sprint 3: Rezervasyon Sistemi (Hafta 5-6)

### Hedefler
- Rezervasyon oluşturma akışı
- Restoran için masa planı
- Berber/Güzellik için hizmet ve slot sistemi
- Rezervasyon yönetimi (admin panel)

### Backend Görevleri
- [ ] Reservation API endpoints
- [ ] Availability check logic
- [ ] Table management (restoran)
- [ ] Service management (berber/güzellik)
- [ ] Slot conflict prevention
- [ ] Reservation status workflow

### Frontend - Mobil App
- [ ] Restaurant reservation flow
  - [ ] Date picker
  - [ ] Time slot selection
  - [ ] Table selection (floor plan)
  - [ ] Party size selector
  - [ ] Duration selector
- [ ] Service reservation flow (berber/güzellik)
  - [ ] Service selection
  - [ ] Date/time picker
  - [ ] Slot availability
- [ ] Reservation confirmation screen
- [ ] My Reservations screen
- [ ] Reservation detail screen

### Frontend - Admin Panel
- [ ] Reservations list screen
- [ ] Reservation detail screen
- [ ] Reservation actions (confirm, cancel)
- [ ] Table plan editor (restoran)
- [ ] Service management (berber/güzellik)
- [ ] Calendar view (opsiyonel)

### Deliverables
- ✅ Restoran rezervasyon akışı (mobil)
- ✅ Berber/Güzellik rezervasyon akışı (mobil)
- ✅ Rezervasyon yönetimi (admin panel)
- ✅ Masa planı yönetimi (admin panel)

---

## Sprint 4: Loyalty, Reviews ve Sponsorlu Sıralama (Hafta 7-8)

### Hedefler
- Loyalty puan sistemi
- Yorum ve puan verme
- Sponsorlu sıralama sistemi
- Analytics dashboard (temel)
- MVP polish ve test

### Backend Görevleri
- [ ] Loyalty points calculation
- [ ] Loyalty transactions API
- [ ] Reviews API
- [ ] Sponsored listings system
- [ ] Ranking algorithm
- [ ] Basic analytics queries
- [ ] Notification system (push/email)

### Frontend - Mobil App
- [ ] Profile screen
- [ ] Loyalty points display
- [ ] Points history
- [ ] Review screen
- [ ] Featured badge (sponsored listings)
- [ ] Notification center

### Frontend - Admin Panel
- [ ] Analytics dashboard
  - [ ] Reservation stats
  - [ ] Occupancy rate
  - [ ] Peak hours chart
- [ ] Customer management
- [ ] Reviews management
- [ ] Sponsored listings purchase
- [ ] Loyalty rules configuration

### Testing & Polish
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] UI/UX improvements
- [ ] Documentation

### Deliverables
- ✅ Loyalty sistemi (mobil + admin)
- ✅ Yorum sistemi
- ✅ Sponsorlu sıralama
- ✅ Analytics dashboard (temel)
- ✅ MVP ready for launch

---

## Detaylı Görev Listesi

### Hafta 1
**Backend:**
- Supabase setup
- Database schema (users, roles, businesses, categories)
- RLS policies
- Auth API

**Mobil:**
- Expo setup
- Navigation structure
- Login/Register screens

**Admin:**
- Next.js setup
- Auth pages
- Layout structure

### Hafta 2
**Backend:**
- Business API
- Category API
- Storage setup
- Location search

**Mobil:**
- Business list screen
- Business detail screen
- Category tabs

**Admin:**
- Business CRUD
- Photo upload
- Business hours

### Hafta 3
**Backend:**
- Reservation API
- Availability logic
- Table management
- Service management

**Mobil:**
- Restaurant reservation flow
- Service reservation flow
- Reservation confirmation

**Admin:**
- Reservations list
- Reservation management
- Table plan editor

### Hafta 4
**Backend:**
- Slot conflict prevention
- Reservation status workflow
- Notification triggers

**Mobil:**
- My Reservations screen
- Reservation detail
- Cancel reservation

**Admin:**
- Calendar view
- Service management
- Bulk actions

### Hafta 5
**Backend:**
- Loyalty points system
- Loyalty transactions
- Reviews API
- Rating calculation

**Mobil:**
- Profile screen
- Loyalty display
- Review screen

**Admin:**
- Analytics queries
- Customer management
- Reviews moderation

### Hafta 6
**Backend:**
- Sponsored listings
- Ranking algorithm
- Payment integration (basic)
- Notification system

**Mobil:**
- Featured badge
- Notification center
- Points history

**Admin:**
- Analytics dashboard
- Sponsored listings purchase
- Loyalty rules

### Hafta 7
**Testing:**
- E2E testing
- Bug fixes
- Performance testing
- Security audit

**Polish:**
- UI improvements
- UX refinements
- Error handling
- Loading states

### Hafta 8
**Final:**
- Final testing
- Documentation
- Deployment preparation
- Launch checklist
- MVP launch 🚀

---

## Risk Yönetimi

### Yüksek Riskli Görevler
1. **Masa Planı Editor:** Karmaşık UI, fazla zaman alabilir
   - **Mitigation:** Basit drag-drop, ileriki fazda geliştirilebilir

2. **Availability Logic:** Çakışma kontrolü karmaşık
   - **Mitigation:** Basit slot-based sistem, test senaryoları

3. **Sponsorlu Sıralama:** Algoritma optimizasyonu
   - **Mitigation:** Basit priority-based sistem, sonra optimize

### Bağımlılıklar
- Supabase API limits (free tier)
- Third-party services (maps, payments)
- Design assets hazırlığı

---

## Success Criteria

MVP başarılı sayılır eğer:
- ✅ Kullanıcılar kayıt olup giriş yapabiliyor
- ✅ İşletmeler eklenip listelenebiliyor
- ✅ Restoran ve Berber/Güzellik için rezervasyon yapılabiliyor
- ✅ İşletme sahipleri rezervasyonları yönetebiliyor
- ✅ Loyalty puanları kazanılıyor
- ✅ Sponsorlu sıralama çalışıyor
- ✅ Temel analytics görüntülenebiliyor

---

## Post-MVP (İlk 2 Hafta Sonrası)

### Hızlı İyileştirmeler
- Bug fixes
- Performance optimizations
- User feedback implementation
- Additional features (küçük)

### Metrics Tracking
- User registrations
- Reservations created
- Business sign-ups
- Sponsored listings sold
- User retention

---

## Ekip ve Roller (Önerilen)

- **Backend Developer:** 1 kişi (full-time)
- **Frontend Developer (Mobil):** 1 kişi (full-time)
- **Frontend Developer (Web):** 1 kişi (full-time)
- **UI/UX Designer:** 0.5 kişi (part-time)
- **Product Manager:** 0.5 kişi (part-time)
- **QA Tester:** 0.5 kişi (part-time, sprint 3-4)

**Toplam:** ~4.5 FTE

---

## Notlar

- Her sprint sonunda demo yapılmalı
- Kullanıcı feedback'i toplanmalı
- Sürekli iyileştirme yaklaşımı
- MVP'de "perfect" değil "working" hedeflenmeli
- Technical debt not edilmeli, sonra ele alınmalı
