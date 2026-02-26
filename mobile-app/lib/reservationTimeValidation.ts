/**
 * Europe/Istanbul (UTC+3) bazında rezervasyon zaman validasyonu.
 * Geçmiş saat ve "şu andan itibaren en az 1 saat sonrası" kuralı.
 */

const MIN_HOURS_AHEAD = 1;
const MIN_MS_AHEAD = MIN_HOURS_AHEAD * 60 * 60 * 1000;

/** Seçilen tarih+saati Istanbul (UTC+3) olarak Date'e çevirir. */
function parseIstanbulDateTime(dateStr: string, timeStr: string): number {
  const timePart = timeStr.length >= 5 ? timeStr.slice(0, 5) : timeStr;
  const iso = `${dateStr}T${timePart}:00.000+03:00`;
  return new Date(iso).getTime();
}

/** Şu anki zaman (UTC) - Istanbul ile karşılaştırmak için seçilen zamanı UTC ms'e çevirdik, "now" için Date.now() yeterli. */
export function getNowIstanbulMs(): number {
  return Date.now();
}

export type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * Europe/Istanbul bazında seçilen tarih/saatin geçerli olup olmadığını kontrol eder.
 * - Geçmiş saatler için rezervasyon alınamaz.
 * - Rezervasyon saati en az 1 saat sonrası olmalıdır.
 */
export function validateReservationTime(dateStr: string, timeStr: string): ValidationResult {
  const selectedMs = parseIstanbulDateTime(dateStr, timeStr);
  if (Number.isNaN(selectedMs)) {
    return { valid: false, error: 'Geçersiz tarih veya saat.' };
  }
  const nowMs = getNowIstanbulMs();
  if (selectedMs < nowMs) {
    return { valid: false, error: 'Geçmiş saatler için rezervasyon alınamaz.' };
  }
  if (selectedMs - nowMs < MIN_MS_AHEAD) {
    return { valid: false, error: 'Rezervasyon saati en az 1 saat sonrası olmalıdır.' };
  }
  return { valid: true };
}

/**
 * UI'da slot'u devre dışı bırakmak için: geçmiş veya 1 saatten yakın slotlar true döner.
 */
export function isSlotDisabled(dateStr: string, slotTime: string): boolean {
  const result = validateReservationTime(dateStr, slotTime);
  return !result.valid;
}
