/** Rezervasyon durumu etiketleri - tüm ekranlarda aynı kullanılır */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

/** Rezervasyon durumu renkleri - liste ve detayda tutarlı */
export const RESERVATION_STATUS_COLORS: Record<string, { bg: string; text: string; border?: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },   // sarı/amber - beklemede
  confirmed: { bg: '#dcfce7', text: '#166534', border: '#22c55e' }, // yeşil - onaylandı
  completed: { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' }, // mavi - tamamlandı
  cancelled: { bg: '#f4f4f5', text: '#52525b', border: '#a1a1aa' },  // gri - iptal
  no_show: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },   // kırmızı - gelmedi
};

export function getReservationStatusStyle(status: string) {
  return RESERVATION_STATUS_COLORS[status] ?? RESERVATION_STATUS_COLORS.pending;
}
