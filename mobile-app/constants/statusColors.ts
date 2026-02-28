/** Rezervasyon durumu etiketleri - admin ile aynı */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  pending: 'Beklemede',
  confirmed: 'Onaylandı',
  cancelled: 'İptal',
  completed: 'Tamamlandı',
  no_show: 'Gelmedi',
};

/** Rezervasyon durumu renkleri - liste ve detayda tutarlı (admin ile aynı palet) */
export const RESERVATION_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#92400e' },
  confirmed: { bg: '#dcfce7', text: '#166534' },
  completed: { bg: '#dbeafe', text: '#1e40af' },
  cancelled: { bg: '#f4f4f5', text: '#52525b' },
  no_show: { bg: '#fee2e2', text: '#991b1b' },
};

export function getReservationStatusStyle(status: string) {
  return RESERVATION_STATUS_COLORS[status] ?? RESERVATION_STATUS_COLORS.pending;
}
