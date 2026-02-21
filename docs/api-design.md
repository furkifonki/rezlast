# API Tasarım Önerisi

## Genel Yaklaşım

RESTful API tasarımı kullanılacak. Supabase PostgREST otomatik REST API sağlar, ancak özel business logic için Edge Functions kullanılacak.

## Base URL

```
Production: https://api.rezervasyon.app/v1
Development: http://localhost:54321/rest/v1
```

## Authentication

Tüm API istekleri JWT token ile korunur:

```http
Authorization: Bearer <jwt_token>
```

## Response Format

### Başarılı Response

```json
{
  "data": { ... },
  "message": "Success",
  "status": 200
}
```

### Hata Response

```json
{
  "error": {
    "code": "RESERVATION_CONFLICT",
    "message": "Bu saat için rezervasyon mevcut değil",
    "details": { ... }
  },
  "status": 400
}
```

## Endpoint'ler

### 1. Authentication Endpoints

#### POST /auth/register
Kullanıcı kaydı

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "Ahmet Yılmaz",
  "phone": "+905551234567"
}
```

**Response:**
```json
{
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "full_name": "Ahmet Yılmaz",
      "role": "customer"
    },
    "token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST /auth/login
Kullanıcı girişi

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "data": {
    "user": { ... },
    "token": "jwt_token",
    "refresh_token": "refresh_token"
  }
}
```

#### POST /auth/refresh
Token yenileme

**Request:**
```json
{
  "refresh_token": "refresh_token"
}
```

#### POST /auth/logout
Çıkış

---

### 2. Categories Endpoints

#### GET /categories
Kategorileri listele

**Query Parameters:**
- `is_active`: boolean (default: true)
- `sort_by`: string (default: "sort_order")

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Restoranlar",
      "slug": "restoranlar",
      "icon": "restaurant",
      "description": "...",
      "is_active": true
    }
  ]
}
```

#### GET /categories/:id
Kategori detayı

---

### 3. Businesses Endpoints

#### GET /businesses
İşletmeleri listele (Mobil App)

**Query Parameters:**
- `category_id`: UUID
- `city`: string (default: "Istanbul")
- `district`: string
- `latitude`: number
- `longitude`: number
- `radius`: number (km, default: 10)
- `search`: string (isim/description arama)
- `min_rating`: number (1-5)
- `is_sponsored`: boolean
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lezzet Restoran",
      "slug": "lezzet-restoran",
      "description": "...",
      "category": {
        "id": "uuid",
        "name": "Restoranlar"
      },
      "address": "Kadıköy, İstanbul",
      "latitude": 40.9923,
      "longitude": 29.0234,
      "rating": 4.5,
      "total_reviews": 120,
      "photos": [
        {
          "url": "https://...",
          "is_primary": true
        }
      ],
      "is_sponsored": true,
      "distance": 2.5
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

#### GET /businesses/:id
İşletme detayı

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "name": "Lezzet Restoran",
    "description": "...",
    "category": { ... },
    "address": "...",
    "location": {
      "latitude": 40.9923,
      "longitude": 29.0234
    },
    "phone": "+905551234567",
    "email": "info@lezzet.com",
    "website": "https://lezzet.com",
    "rating": 4.5,
    "total_reviews": 120,
    "photos": [ ... ],
    "hours": [
      {
        "day": "monday",
        "open_time": "09:00",
        "close_time": "22:00",
        "is_closed": false
      }
    ],
    "tables": [ ... ], // Restoran için
    "services": [ ... ], // Berber/Güzellik için
    "reviews": [
      {
        "id": "uuid",
        "user": {
          "name": "Ahmet Y.",
          "avatar": "..."
        },
        "rating": 5,
        "comment": "Harika bir deneyim!",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### GET /businesses/:id/availability
Müsaitlik kontrolü

**Query Parameters:**
- `date`: string (YYYY-MM-DD)
- `party_size`: number (Restoran için)
- `service_id`: UUID (Berber/Güzellik için)
- `duration_minutes`: number

**Response:**
```json
{
  "data": {
    "date": "2024-01-20",
    "available_slots": [
      {
        "time": "19:00",
        "duration_minutes": 120,
        "available_tables": [
          {
            "id": "uuid",
            "table_number": "T-5",
            "capacity": 4
          }
        ]
      }
    ],
    "unavailable_times": ["18:00", "18:30"]
  }
}
```

---

### 4. Reservations Endpoints

#### POST /reservations
Rezervasyon oluştur

**Request (Restoran):**
```json
{
  "business_id": "uuid",
  "reservation_date": "2024-01-20",
  "reservation_time": "19:00",
  "duration_minutes": 120,
  "party_size": 4,
  "table_id": "uuid",
  "special_requests": "Pencere kenarı tercih ederiz"
}
```

**Request (Berber/Güzellik):**
```json
{
  "business_id": "uuid",
  "reservation_date": "2024-01-20",
  "reservation_time": "14:00",
  "service_id": "uuid",
  "special_requests": "..."
}
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "business": {
      "id": "uuid",
      "name": "Lezzet Restoran"
    },
    "reservation_date": "2024-01-20",
    "reservation_time": "19:00",
    "duration_minutes": 120,
    "end_time": "21:00",
    "party_size": 4,
    "status": "pending",
    "loyalty_points_earned": 10,
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### GET /reservations
Kullanıcının rezervasyonlarını listele

**Query Parameters:**
- `status`: string (pending, confirmed, cancelled, completed)
- `upcoming`: boolean (sadece gelecek rezervasyonlar)
- `page`: number
- `limit`: number

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "business": {
        "id": "uuid",
        "name": "Lezzet Restoran",
        "photo": "..."
      },
      "reservation_date": "2024-01-20",
      "reservation_time": "19:00",
      "party_size": 4,
      "status": "confirmed",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### GET /reservations/:id
Rezervasyon detayı

#### PATCH /reservations/:id/cancel
Rezervasyon iptal et

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "status": "cancelled",
    "cancelled_at": "2024-01-16T10:00:00Z"
  }
}
```

---

### 5. Business Owner Endpoints (Admin Panel)

#### GET /admin/businesses
İşletme sahibinin işletmelerini listele

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Lezzet Restoran",
      "category": { ... },
      "is_active": true,
      "total_reservations": 150,
      "pending_reservations": 5
    }
  ]
}
```

#### PATCH /admin/businesses/:id
İşletme bilgilerini güncelle

**Request:**
```json
{
  "name": "Yeni İsim",
  "description": "...",
  "address": "...",
  "phone": "...",
  "hours": [
    {
      "day_of_week": 1,
      "open_time": "09:00",
      "close_time": "22:00",
      "is_closed": false
    }
  ]
}
```

#### GET /admin/businesses/:id/reservations
İşletme rezervasyonlarını listele

**Query Parameters:**
- `status`: string
- `date_from`: string (YYYY-MM-DD)
- `date_to`: string (YYYY-MM-DD)
- `page`: number
- `limit`: number

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "full_name": "Ahmet Yılmaz",
        "phone": "+905551234567"
      },
      "reservation_date": "2024-01-20",
      "reservation_time": "19:00",
      "party_size": 4,
      "status": "pending",
      "created_at": "2024-01-15T10:00:00Z"
    }
  ]
}
```

#### PATCH /admin/reservations/:id/confirm
Rezervasyon onayla

#### PATCH /admin/reservations/:id/cancel
Rezervasyon iptal et (işletme tarafından)

#### GET /admin/businesses/:id/analytics
Analytics dashboard verileri

**Query Parameters:**
- `period`: string (daily, weekly, monthly)
- `date_from`: string
- `date_to`: string

**Response:**
```json
{
  "data": {
    "occupancy_rate": 0.75,
    "total_reservations": 150,
    "confirmed_reservations": 120,
    "cancelled_reservations": 20,
    "no_show_count": 10,
    "average_duration": 120,
    "peak_hours": [
      {
        "hour": 19,
        "reservation_count": 25
      }
    ],
    "revenue_estimate": 45000.00,
    "repeat_customer_rate": 0.35,
    "top_services": [
      {
        "service_id": "uuid",
        "service_name": "Saç Kesimi",
        "count": 45
      }
    ]
  }
}
```

#### POST /admin/businesses/:id/tables
Masa ekle (Restoran)

**Request:**
```json
{
  "table_number": "T-10",
  "capacity": 6,
  "floor_number": 1,
  "position_x": 100,
  "position_y": 200,
  "table_type": "indoor"
}
```

#### POST /admin/businesses/:id/services
Hizmet ekle (Berber/Güzellik)

**Request:**
```json
{
  "name": "Saç Kesimi",
  "description": "...",
  "duration_minutes": 30,
  "price": 150.00
}
```

---

### 6. Reviews Endpoints

#### POST /reviews
Yorum ve puan ver

**Request:**
```json
{
  "business_id": "uuid",
  "reservation_id": "uuid",
  "rating": 5,
  "comment": "Harika bir deneyim!"
}
```

#### GET /businesses/:id/reviews
İşletme yorumlarını listele

**Query Parameters:**
- `rating`: number (1-5)
- `page`: number
- `limit`: number

---

### 7. Loyalty Endpoints

#### GET /loyalty/points
Kullanıcının puan bilgisi

**Response:**
```json
{
  "data": {
    "total_points": 250,
    "loyalty_level": "silver",
    "points_to_next_level": 50,
    "transactions": [
      {
        "id": "uuid",
        "points": 10,
        "type": "earned",
        "description": "Rezervasyon bonusu",
        "created_at": "2024-01-15T10:00:00Z"
      }
    ]
  }
}
```

#### GET /loyalty/rules/:business_id
İşletme loyalty kuralları

---

### 8. Sponsored Listings Endpoints

#### POST /admin/sponsored-listings
Sponsorlu sıralama satın al

**Request:**
```json
{
  "business_id": "uuid",
  "category_id": "uuid",
  "package_type": "weekly",
  "start_date": "2024-01-20"
}
```

#### GET /admin/sponsored-listings
Aktif sponsorlu listeler

---

### 9. Notifications Endpoints

#### GET /notifications
Kullanıcı bildirimlerini listele

**Query Parameters:**
- `is_read`: boolean
- `page`: number
- `limit`: number

#### PATCH /notifications/:id/read
Bildirimi okundu olarak işaretle

---

## Edge Functions (Özel Business Logic)

### 1. reservation-conflict-check
Rezervasyon çakışma kontrolü

### 2. loyalty-points-calculation
Loyalty puan hesaplama

### 3. send-notification
Bildirim gönderme (email, SMS, push)

### 4. payment-processing
Ödeme işleme (ileriki faz)

### 5. analytics-aggregation
Analytics veri toplama

## Rate Limiting

- **Public Endpoints:** 100 requests/minute
- **Authenticated Endpoints:** 200 requests/minute
- **Admin Endpoints:** 500 requests/minute

## Error Codes

| Code | HTTP Status | Açıklama |
|------|-------------|----------|
| `UNAUTHORIZED` | 401 | Token geçersiz/eksik |
| `FORBIDDEN` | 403 | Yetki yok |
| `NOT_FOUND` | 404 | Kayıt bulunamadı |
| `VALIDATION_ERROR` | 400 | Geçersiz input |
| `RESERVATION_CONFLICT` | 409 | Rezervasyon çakışması |
| `BUSINESS_NOT_ACTIVE` | 400 | İşletme aktif değil |
| `SLOT_NOT_AVAILABLE` | 409 | Slot müsait değil |
| `RATE_LIMIT_EXCEEDED` | 429 | Çok fazla istek |
| `INTERNAL_ERROR` | 500 | Sunucu hatası |

## Webhooks (İleriki Faz)

- `reservation.created`
- `reservation.confirmed`
- `reservation.cancelled`
- `payment.completed`
- `review.created`
