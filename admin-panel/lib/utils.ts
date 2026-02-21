/** İsimden URL slug üretir (Türkçe karakterler dönüştürülür) */
export function slugify(name: string): string {
  const tr: Record<string, string> = {
    ı: 'i', ğ: 'g', ü: 'u', ş: 's', ö: 'o', ç: 'c',
    İ: 'i', I: 'i', Ğ: 'g', Ü: 'u', Ş: 's', Ö: 'o', Ç: 'c',
  };
  let s = name.trim();
  for (const [k, v] of Object.entries(tr)) {
    s = s.replace(new RegExp(k, 'g'), v);
  }
  return s
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'isletme';
}
