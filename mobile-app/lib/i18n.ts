/**
 * i18n – tek kaynak: docs/i18n/messages.tr.json
 * Key: auth.invalidCredentials, reservation.*, common.* vb.
 */
const TR: Record<string, string> = {
  'auth.invalidCredentials': 'E-posta veya şifre hatalı.',
  'auth.login.email_password_required': 'E-posta ve şifre girin.',
  'auth.login.failed': 'Giriş hatası',
  'common.loading': 'Yükleniyor...',
  'reservation.success_message': 'Rezervasyonunuz restorana onaya gönderildi. En kısa sürede bilgilendirileceksiniz.',
  'reservation.table_required': 'Lütfen müsait bir masa seçin. Bu tarih ve saat için uygun masa bulunamadıysa başka bir saat deneyin.',
  'reservation.date_time_required': 'Tarih ve saat seçin.',
  'reservation.select_table_required': 'Rezervasyon için müsait bir masa seçin.',
};

export function t(key: string, params?: Record<string, string | number>): string {
  let s = TR[key] ?? key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    });
  }
  return s;
}
