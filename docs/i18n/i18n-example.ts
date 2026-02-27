/**
 * i18n helper – tek kaynak: docs/i18n/messages.tr.json
 * Kullanım: import { t } from '@/lib/i18n';  t('reservation.success_message');
 * Parametre: t('reservation.party_exceeds_max', { max: 6 })
 *
 * Mobile app için: messages.tr.json'ı assets veya src/i18n'e kopyalayıp
 * aşağıdaki import path'ini güncelleyin (örn. require('../assets/messages.tr.json')).
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const messages = require('./messages.tr.json') as Record<string, unknown>;

function getNested(obj: unknown, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const p of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return typeof current === 'string' ? current : undefined;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const s = getNested(messages, key) ?? key;
  if (!params) return s;
  return Object.entries(params).reduce(
    (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
    s
  );
}
