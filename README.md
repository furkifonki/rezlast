# Rezervasyon Platformu - İstanbul Marketplace

İstanbul'da faaliyet gösteren işletmeler için ölçeklenebilir, SaaS modeline uygun, marketplace mantığında çalışan kapsamlı rezervasyon platformu.

## 📋 Proje Özeti

Bu platform, başlangıçta **Restoran** ve **Berber/Güzellik** kategorileriyle Lean MVP olarak yayına alınacak; daha sonra tenis kortları, halı sahalar ve futbol sahaları gibi saat bloklu rezervasyon gerektiren kategorilere genişletilecektir.

## 🏗️ Sistem Bileşenleri

### 1. Mobil Uygulama (B2C)
- **Teknoloji:** React Native + Expo
- **Hedef:** Son kullanıcılar için rezervasyon yapma ve işletme keşfi
- **Test:** Expo Go üzerinden test edilebilir

### 2. Web Admin Panel (B2B)
- **Teknoloji:** Next.js / React
- **Hedef:** İşletme sahipleri için SaaS yönetim paneli
- **Tasarım:** Responsive, multi-tenant destekli

### 3. Backend
- **Önerilen:** Supabase (Auth + PostgreSQL + RLS + Realtime)
- **Alternatifler:** Firebase, Node.js + PostgreSQL

## 🎯 MVP Kategorileri

- ✅ Restoranlar
- ✅ Berberler / Güzellik Salonları
- 🔄 Tenis Kortları (ileriki faz)
- 🔄 Halı Sahalar (ileriki faz)
- 🔄 Futbol Sahaları (ileriki faz)

## 📚 Dokümantasyon

Tüm detaylı dokümantasyon `docs/` klasöründe bulunmaktadır:

1. **[Quick Start Guide](docs/quick-start.md)** ⭐ - Hızlı başlangıç rehberi
2. **[Sistem Mimarisi](docs/architecture.md)** - Genel mimari yapı ve teknoloji stack
3. **[Backend Seçimi](docs/backend-selection.md)** - Backend teknolojisi karşılaştırması ve gerekçe
4. **[Veritabanı Şeması](docs/database-schema.md)** - Tüm tablolar, ilişkiler ve RLS politikaları
5. **[Güvenlik ve RBAC](docs/security-rbac.md)** - Rol bazlı yetkilendirme modeli
6. **[API Tasarımı](docs/api-design.md)** - REST/GraphQL endpoint'leri ve payload örnekleri
7. **[Mobil Akış Diyagramı](docs/mobile-flow.md)** - Mobil uygulama ekran akışları
8. **[Admin Panel Akışı](docs/admin-flow.md)** - Web admin panel ekran akışları
9. **[Sponsorlu Sıralama](docs/sponsored-ranking.md)** - Ücretli reklam sistemi algoritması
10. **[MVP Sprint Planı](docs/mvp-sprint-plan.md)** - İlk 8 haftalık geliştirme planı
11. **[Roadmap](docs/roadmap.md)** - 1 yıllık MVP → Growth → Full SaaS planı

## 🎨 Tasarım Dili

- **Renk Paleti:** Starbucks benzeri koyu yeşil tonları
- **Stil:** Minimal, premium, modern
- **Navigasyon:** Bottom tab navigation (mobil)
- **Bileşenler:** Kart bazlı listeler, net CTA'ler

## 💰 Monetization Modeli

1. **Sponsorlu Sıralama** (MVP'den itibaren)
2. **SaaS Abonelik** (ilerleyen faz)
3. **Online Ödeme + Komisyon** (ileriki faz)

## 🚀 Hızlı Başlangıç

```bash
# 1. Supabase projesi oluştur
# 2. Veritabanı şemasını uygula (docs/database-schema.md)
# 3. Mobil app ve admin panel'i kur

# Detaylı adımlar için:
# docs/quick-start.md dosyasına bakınız
```

Detaylı kurulum ve geliştirme talimatları için **[Quick Start Guide](docs/quick-start.md)** dosyasına bakınız.

## 📝 Lisans

Bu proje özel bir projedir.
