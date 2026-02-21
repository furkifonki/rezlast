# Web Admin Panel Ekran Akış Diyagramı

## Genel Yapı

```
Admin Panel Layout:
├── Sidebar Navigation
├── Top Bar (Header)
└── Main Content Area
```

## 1. Authentication Flow

```
Login Screen
    ↓
[Email/Password]
    ↓
Email Verification (if needed)
    ↓
Role Check
    ├── business_owner → Business Dashboard
    ├── super_admin → Super Admin Dashboard
    └── customer → Access Denied
```

### Login Screen:
- Email/Password form
- "Şifremi Unuttum" linki
- Remember me checkbox
- Social login (Google - opsiyonel)

---

## 2. Business Owner Dashboard

### 2.1 Ana Dashboard

```
Dashboard Screen
    ├── Stats Cards
    │   ├── Bugünkü Rezervasyonlar
    │   ├── Bekleyen Onaylar
    │   ├── Bu Hafta Gelir
    │   └── Toplam Müşteri
    ├── Chart Section
    │   ├── Rezervasyon Trendi (Line Chart)
    │   ├── Doluluk Oranı (Bar Chart)
    │   └── En Yoğun Saatler (Heatmap)
    ├── Recent Reservations Table
    └── Quick Actions
        ├── Yeni Rezervasyon Ekle
        ├── Masa Planı Düzenle
        └── Kampanya Oluştur
```

### 2.2 İşletme Yönetimi

```
Sidebar: "İşletmelerim"
    ↓
Businesses List Screen
    ├── Business Cards/Table
    │   ├── Name, Category
    │   ├── Status (Active/Inactive)
    │   ├── Total Reservations
    │   └── Actions (Edit, View, Delete)
    └── "Yeni İşletme Ekle" Button
        ↓
[Business Tıklama veya "Yeni İşletme"]
    ↓
Business Form Screen
    ├── Basic Info Tab
    │   ├── Name *
    │   ├── Category *
    │   ├── Description
    │   ├── Phone
    │   ├── Email
    │   └── Website
    ├── Location Tab
    │   ├── Address *
    │   ├── City (Istanbul - default)
    │   ├── District
    │   └── Map Picker (Lat/Lng)
    ├── Photos Tab
    │   ├── Photo Upload (Multiple)
    │   ├── Primary Photo Selection
    │   └── Photo Gallery Preview
    ├── Hours Tab
    │   ├── Weekly Schedule
    │   │   └── Day Rows
    │   │       ├── Day Name
    │   │       ├── Open Time
    │   │       ├── Close Time
    │   │       ├── Break Start/End
    │   │       └── Closed Toggle
    │   └── Special Closures
    │       └── Date Picker + Reason
    └── Settings Tab
        ├── Active Status Toggle
        ├── Verification Status (Read-only)
        └── Slug (Auto-generated)
    ↓
[Save Button]
    ↓
Business Saved
    ↓
Business Detail Screen (Read-only view)
```

### 2.3 Rezervasyon Yönetimi

```
Sidebar: "Rezervasyonlar"
    ↓
Reservations List Screen
    ├── Filters
    │   ├── Status (All, Pending, Confirmed, Cancelled)
    │   ├── Date Range
    │   ├── Search (Customer name/phone)
    │   └── Table/Service Filter
    ├── Calendar View Toggle
    │   ├── List View (Default)
    │   └── Calendar View
    ├── Reservations Table
    │   ├── Date & Time
    │   ├── Customer Info
    │   ├── Party Size / Service
    │   ├── Table Number
    │   ├── Status Badge
    │   └── Actions (View, Confirm, Cancel)
    └── Bulk Actions
        ├── Export to CSV
        └── Print Schedule
    ↓
[Reservation Tıklama]
    ↓
Reservation Detail Screen
    ├── Customer Info Card
    │   ├── Name, Phone, Email
    │   ├── Total Reservations (History)
    │   └── Loyalty Level
    ├── Reservation Details
    │   ├── Date & Time
    │   ├── Duration
    │   ├── Party Size
    │   ├── Table/Service
    │   ├── Special Requests
    │   └── Status
    ├── Actions
    │   ├── Confirm (if pending)
    │   ├── Cancel
    │   ├── Edit (Limited)
    │   ├── Contact Customer
    │   └── Mark as No-Show
    └── Timeline
        ├── Created At
        ├── Confirmed At
        └── Cancelled At (if applicable)
```

#### Calendar View:
```
Calendar View Screen
    ├── Month/Week/Day Toggle
    ├── Calendar Grid
    │   └── Day Cells
    │       ├── Date
    │       └── Reservation Blocks
    │           ├── Time
    │           ├── Customer Name
    │           ├── Party Size
    │           └── Status Color
    └── Legend
        ├── Pending (Yellow)
        ├── Confirmed (Green)
        └── Cancelled (Red)
```

### 2.4 Masa Planı Yönetimi (Restoran)

```
Sidebar: "Masa Planı"
    ↓
Table Plan Screen
    ├── Floor Selector (if multi-floor)
    ├── Canvas Area
    │   └── Interactive Floor Plan
    │       ├── Tables (Draggable)
    │       ├── Walls/Obstacles
    │       └── Grid/Background
    ├── Toolbar
    │   ├── Add Table
    │   ├── Edit Table
    │   ├── Delete Table
    │   └── Save Plan
    └── Table Properties Panel
        ├── Table Number
        ├── Capacity
        ├── Table Type
        └── Position (X, Y)
    ↓
[Table Tıklama]
    ↓
Table Edit Modal
    ├── Table Number *
    ├── Capacity *
    ├── Floor Number
    ├── Table Type (Indoor/Outdoor/VIP)
    └── Position (Auto from drag)
```

### 2.5 Hizmet Yönetimi (Berber/Güzellik)

```
Sidebar: "Hizmetler"
    ↓
Services List Screen
    ├── Service Cards/Table
    │   ├── Name
    │   ├── Duration
    │   ├── Price
    │   ├── Status (Active/Inactive)
    │   └── Actions (Edit, Delete)
    └── "Yeni Hizmet Ekle" Button
        ↓
Service Form Modal
    ├── Name *
    ├── Description
    ├── Duration (Minutes) *
    ├── Price (Optional)
    └── Active Toggle
```

### 2.6 Saat Blokları Yönetimi (Tenis/Halı Saha - Future)

```
Sidebar: "Saat Blokları"
    ↓
Availability Slots Screen
    ├── Date Range Selector
    ├── Bulk Actions
    │   ├── Generate Slots (Auto-fill)
    │   ├── Set Default Hours
    │   └── Block Dates
    ├── Calendar Grid
    │   └── Time Slots
    │       ├── Time
    │       ├── Available Toggle
    │       ├── Max Capacity
    │       └── Price (Dynamic)
    └── Settings
        ├── Default Slot Duration
        ├── Default Capacity
        └── Pricing Rules
```

### 2.7 Analytics Dashboard

```
Sidebar: "Analitik"
    ↓
Analytics Dashboard
    ├── Date Range Selector
    ├── Overview Cards
    │   ├── Total Reservations
    │   ├── Confirmed Rate
    │   ├── Cancellation Rate
    │   ├── No-Show Rate
    │   └── Revenue Estimate
    ├── Charts Section
    │   ├── Reservation Trend (Line Chart)
    │   ├── Daily Occupancy (Bar Chart)
    │   ├── Peak Hours Heatmap
    │   ├── Service Popularity (Pie Chart)
    │   └── Customer Retention (Line Chart)
    ├── Tables Section
    │   ├── Top Services
    │   ├── Repeat Customers
    │   └── Revenue by Period
    └── Export Options
        ├── Export to PDF
        ├── Export to Excel
        └── Schedule Report (Email)
```

### 2.8 Müşteri Yönetimi

```
Sidebar: "Müşteriler"
    ↓
Customers List Screen
    ├── Search Bar
    ├── Filters
    │   ├── Loyalty Level
    │   ├── Last Visit Date
    │   └── Total Reservations
    ├── Customers Table
    │   ├── Name
    │   ├── Phone
    │   ├── Email
    │   ├── Total Reservations
    │   ├── Loyalty Level
    │   ├── Last Visit
    │   └── Actions (View, VIP Tag)
    └── "Export Customers" Button
    ↓
[Customer Tıklama]
    ↓
Customer Detail Screen
    ├── Customer Info
    │   ├── Contact Details
    │   ├── Loyalty Points
    │   └── VIP Status Toggle
    ├── Reservation History
    │   └── Reservations Table
    ├── Reviews Given
    └── Notes Section
        └── Internal Notes (Private)
```

### 2.9 Kampanya Yönetimi

```
Sidebar: "Kampanyalar"
    ↓
Campaigns List Screen
    ├── Campaign Cards
    │   ├── Name
    │   ├── Type (Discount, First Booking, etc.)
    │   ├── Status (Active/Inactive)
    │   ├── Usage Count
    │   └── Actions (Edit, Deactivate)
    └── "Yeni Kampanya" Button
        ↓
Campaign Form Screen
    ├── Basic Info
    │   ├── Name *
    │   ├── Description
    │   └── Campaign Type *
    ├── Discount Settings
    │   ├── Discount Type (Percentage/Fixed)
    │   ├── Discount Value *
    │   └── Min Purchase Amount
    ├── Rules
    │   ├── Max Uses
    │   ├── Start Date *
    │   ├── End Date *
    │   └── Target Audience
    └── Preview
        └── Campaign Preview Card
```

### 2.10 Loyalty Kuralları

```
Sidebar: "Loyalty Kuralları"
    ↓
Loyalty Rules Screen
    ├── Current Rules List
    │   └── Rule Cards
    │       ├── Rule Type
    │       ├── Configuration
    │       ├── Status
    │       └── Actions (Edit, Delete)
    └── "Yeni Kural Ekle" Button
        ↓
Loyalty Rule Form
    ├── Rule Type *
    │   ├── Points per Reservation
    │   ├── Points per Amount Spent
    │   ├── Level Benefits
    │   └── Special Bonuses
    ├── Configuration (JSON)
    │   └── Rule-specific fields
    └── Active Toggle
```

### 2.11 Sponsorlu Sıralama

```
Sidebar: "Reklam & Sıralama"
    ↓
Sponsored Listings Screen
    ├── Active Listings
    │   └── Listing Cards
    │       ├── Category
    │       ├── Package Type
    │       ├── Start/End Date
    │       ├── Status
    │       └── Actions
    ├── Available Packages
    │   ├── Weekly Package
    │   ├── Monthly Package
    │   └── Package Details
    └── "Yeni Reklam Al" Button
        ↓
Purchase Sponsored Listing
    ├── Category Selection
    ├── Package Selection
    ├── Date Selection
    ├── Payment Method
    └── Confirm Purchase
```

### 2.12 Ayarlar

```
Sidebar: "Ayarlar"
    ↓
Settings Screen
    ├── Account Settings
    │   ├── Email
    │   ├── Password Change
    │   └── Profile Info
    ├── Business Settings
    │   ├── Default Reservation Duration
    │   ├── Auto-confirm Reservations
    │   ├── Cancellation Policy
    │   └── Notification Preferences
    ├── Payment Settings (Future)
    │   ├── Payment Methods
    │   └── Commission Settings
    └── Subscription (Future)
        ├── Current Plan
        ├── Usage Limits
        └── Upgrade Options
```

---

## 3. Super Admin Dashboard

### 3.1 Ana Dashboard

```
Super Admin Dashboard
    ├── System Stats
    │   ├── Total Businesses
    │   ├── Total Users
    │   ├── Total Reservations
    │   └── Revenue
    ├── Recent Activity
    └── Quick Actions
```

### 3.2 İşletme Yönetimi

```
Super Admin: "Tüm İşletmeler"
    ├── Businesses Table
    │   ├── All columns
    │   ├── Owner Info
    │   ├── Verification Status
    │   └── Actions (Verify, Suspend, Delete)
    └── Filters
        ├── Verification Status
        ├── Category
        └── City
```

### 3.3 Kategori Yönetimi

```
Super Admin: "Kategoriler"
    ├── Categories List
    ├── Add/Edit Category
    └── Category Settings
```

### 3.4 Sponsorlu Sıralama Onayı

```
Super Admin: "Reklam Onayları"
    ├── Pending Approvals
    └── Approval Actions
```

### 3.5 Kullanıcı Yönetimi

```
Super Admin: "Kullanıcılar"
    ├── Users Table
    ├── Role Management
    └── User Actions
```

---

## Responsive Design

### Desktop (>1024px):
- Sidebar navigation (always visible)
- Multi-column layouts
- Hover states

### Tablet (768px - 1024px):
- Collapsible sidebar
- Adjusted column counts
- Touch-friendly buttons

### Mobile (<768px):
- Hamburger menu
- Bottom navigation (optional)
- Single column layouts
- Full-screen modals

---

## UI Components

### Reusable Components:
- DataTable (with sorting, filtering, pagination)
- Chart Components (Line, Bar, Pie, Heatmap)
- Form Components (Input, Select, DatePicker, TimePicker)
- Modal/Dialog
- Toast Notifications
- Loading States
- Empty States
- Error States

### Design System:
- Color Palette (Starbucks-inspired green)
- Typography
- Spacing System
- Component Library (Shadcn/ui)

---

## Özellik Özeti

### MVP Özellikleri:
- ✅ İşletme yönetimi
- ✅ Rezervasyon yönetimi
- ✅ Masa planı (Restoran)
- ✅ Hizmet yönetimi (Berber/Güzellik)
- ✅ Analytics dashboard
- ✅ Müşteri listesi
- ✅ Kampanya yönetimi
- ✅ Loyalty kuralları

### İleriki Faz:
- 🔄 Çoklu şube yönetimi
- 🔄 Gelişmiş analytics
- 🔄 Ödeme entegrasyonu
- 🔄 Raporlama ve export
- 🔄 API entegrasyonları
- 🔄 Otomasyon kuralları
