# Mesaj Envanteri ve i18n / Toast Uygulama Rehberi

## A) Mesaj Envanteri Özet Tablosu

| key | current_text | screen/module | type | platform | severity |
|-----|--------------|---------------|------|----------|----------|
| auth.login.email_required | E-posta ve şifre girin. | Auth/Login | error | mobile_app | medium |
| auth.login.failed | Giriş hatası | Auth/Login | error | mobile_app | high |
| auth.forgot.email_required | E-posta adresi girin. | Auth/ForgotPassword | error | mobile_app | medium |
| auth.forgot.config_missing | Bağlantı yapılandırılmamış. | Auth/ForgotPassword | error | mobile_app | high |
| auth.register.name_required | Ad ve soyad zorunludur... | Auth/Register | error | mobile_app | medium |
| auth.register.email_password_required | E-posta ve şifre girin. | Auth/Register | error | mobile_app | medium |
| auth.register.password_min | Şifre en az 6 karakter olmalı. | Auth/Register | error | mobile_app | medium |
| auth.register.kvkk_required | Üyelik için KVKK... | Auth/Register | error | mobile_app | medium |
| auth.register.failed | Kayıt hatası | Auth/Register | error | mobile_app | high |
| auth.logout.confirm_title/body | Çıkış / Çıkış yapmak istediğinize emin misiniz? | Profile | confirm | mobile_app | low – **Alert kalacak** |
| reservation.flow.login_required | Giriş yapmanız gerekiyor. | Reservation/ReservationFlow | error | mobile_app | high |
| reservation.flow.date_time_required | Tarih ve saat seçin. | Reservation/ReservationFlow | error | mobile_app | medium |
| reservation.flow.table_required | Lütfen müsait bir masa seçin... | Reservation/ReservationFlow | error | mobile_app | medium |
| reservation.flow.success_message | Rezervasyonunuz restorana onaya gönderildi... | Reservation/ReservationFlow | success | mobile_app | low – **TOAST** |
| reservation.flow.submit_error | Rezervasyon kaydedilirken bir hata oluştu... | Reservation/ReservationFlow | error | mobile_app | high |
| reservation.detail.not_found | Rezervasyon bulunamadı. | Reservation/ReservationDetail | error | mobile_app | medium |
| reservation.detail.cancel_confirm | Rezervasyonu iptal et | Reservation/ReservationDetail | confirm | mobile_app | **Alert kalacak** |
| business.detail.unavailable | Bu işletme şu anda hizmet veremiyor... | BusinessDetail | error | mobile_app | medium |
| profile.save_success | Profil bilgileriniz güncellendi. | Profile/ProfileAccount | success | mobile_app | low – **TOAST** |
| profile.save_error | Profil güncellenirken hata... | Profile/ProfileAccount | error | mobile_app | medium |
| common.loading | Yükleniyor... | * | info | all | low |
| explore.no_connection | Bağlantı yok | Explore | error | mobile_app | high |
| errors.network | İnternet bağlantınızı kontrol edin. | * | error | all | high |
| errors.unauthorized | Oturumunuz sonlanmış. Lütfen tekrar giriş yapın. | * | error | all | high |

Tam liste: `docs/i18n/message-inventory.json`

---

## B) messages.tr.json

Tek kaynak: **`docs/i18n/messages.tr.json`**

- Key convention: `auth.*`, `reservation.*`, `chat.*`, `admin.*`, `common.*`, `errors.*`, `web.*`
- Mobile app / mobile web / admin panel aynı key'leri kullanacak (kopyala veya monorepo shared modül).

**Kullanım örneği (React / React Native):**

```ts
// lib/i18n.ts (her uygulama kendi copy'si veya shared)
import tr from '../docs/i18n/messages.tr.json'; // veya require

export const t = (key: string, params?: Record<string, string | number>): string => {
  const path = key.split('.');
  let v: unknown = tr;
  for (const p of path) v = (v as Record<string, unknown>)?.[p];
  let s = typeof v === 'string' ? v : key;
  if (params) Object.entries(params).forEach(([k, val]) => { s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(val)); });
  return s;
};

// Kullanım
t('reservation.success_message') 
t('reservation.party_exceeds_max', { max: 6 })
t('common.loading')
```

---

## C) Mobile In-App Notification (Toast) – Uygulandı

**Yaklaşım:** Custom toast (Expo uyumlu, ek paket yok). Üst safe area altında, 4 sn gösterim, success/error/warning/info renkleri.

**Dosyalar:**
- `mobile-app/contexts/NotificationContext.tsx` – NotificationProvider, useToast, ToastOverlay
- `mobile-app/App.tsx` – NotificationProvider ile sarıldı

**Kullanım:**

```tsx
import { useToast } from '../../contexts/NotificationContext';

const toast = useToast();

// Rezervasyon başarı
toast.success('Rezervasyonunuz restorana onaya gönderildi. En kısa sürede bilgilendirileceksiniz.', 'Başarılı');

// Validasyon / hata
toast.error('Tarih ve saat seçin.');
toast.error(err.message);

// Chat gönderim hatası
toast.error('Mesaj gönderilemedi.');

// Bilgi
toast.info('Yükleniyor...');
toast.warning('Bu günde uygunluk bulunamadı.');
```

**Kural:** Destructive onay (çıkış, iptal et) için `Alert.alert` kullanılmaya devam eder. Success/info/warning/error için toast kullanılır.

---

## D) Alert / Popup → Toast Dönüşüm Noktaları (Ekran Bazlı)

### Yapıldı
- **ReservationFlowScreen**: Tüm hata ve başarı → toast.
- **LoginScreen**: E-posta/şifre boş ve giriş hatası → toast.error.
- **ForgotPasswordScreen**: E-posta boş, config eksik, API hatası → toast.error.
- **RegisterScreen**: Tüm validasyon ve kayıt hatası → toast.error; kayıt başarılı → toast.success.
- **ProfileScreen**: Profil kaydet hata → toast.error, kaydedildi → toast.success.
- **ProfileAccountScreen**: Aynı (kaydet hata/success → toast).
- **BusinessDetailScreen**: Rezervasyon ekranına geçilemiyor → toast.error.
- **BusinessReviewsScreen**: Yorum gönderim hatası → toast.error.
- **ReservationDetailScreen**: Sohbet açılamadı → toast.error.

### Kalacak (Alert.alert – destructive onay)
- **ProfileHomeScreen, ProfileAccountScreen, ProfileScreen**: "Çıkış yapmak istediğinize emin misiniz?" → Alert.alert.
- **ReservationDetailScreen**: "Rezervasyonu iptal et" onayı → Alert.alert.

---

## Standart Mesaj (Özel)

- **Rezervasyon başarı:**  
  "Rezervasyonunuz restorana onaya gönderildi. En kısa sürede bilgilendirileceksiniz."  
  → Toast/banner ile gösterilir (popup zorunlu değil). **ReservationFlowScreen'de uygulandı.**

- **Teknik hatalar:**  
  Network/timeout → "İnternet bağlantınızı kontrol edin."  
  401/unauthorized → "Oturumunuz sonlanmış. Lütfen tekrar giriş yapın."  
  messages.tr.json içinde `errors.network`, `errors.unauthorized`, `errors.server` tanımlı; API katmanında map edilebilir.

- Tüm platformlarda aynı Türkçe metinler: `docs/i18n/messages.tr.json` tek kaynak.
