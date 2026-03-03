/**
 * Türkiye 81 il listesi — filtrede sadece il (şehir) gösterilir, ilçeler ayrı alanda.
 * İlçe listesi getDistrictsByCity ile alınır (İstanbul → Kağıthane vb.).
 */
const TURKEY_CITY_NAMES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elâzığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Şanlıurfa', 'Siirt', 'Sinop', 'Sivas', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak',
].sort((a, b) => a.localeCompare(b, 'tr'));

/** Verilen isim resmi bir il (şehir) mi? İlçe isimleri false döner. */
export function isOfficialCity(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const n = name.trim();
  if (TURKEY_CITY_NAMES.includes(n)) return true;
  if (n === 'Istanbul') return true;
  return false;
}

/** Filtre için: API'den gelen şehir listesinden sadece il (resmi şehir) olanları döndür. */
export function filterOfficialCities(citiesFromDb: string[]): string[] {
  const set = new Set<string>();
  for (const c of citiesFromDb) {
    if (!c || typeof c !== 'string') continue;
    const t = c.trim();
    if (TURKEY_CITY_NAMES.includes(t)) {
      set.add(t);
    } else if (t === 'Istanbul') {
      set.add('İstanbul');
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
}

/** İstanbul ilçeleri (Kağıthane dahil) — ilçe listesi şehir seçildikten sonra DB'den de geliyor. */
const ISTANBUL_DISTRICTS = ['Adalar', 'Arnavutköy', 'Ataşehir', 'Avcılar', 'Bağcılar', 'Bahçelievler', 'Bakırköy', 'Başakşehir', 'Bayrampaşa', 'Beşiktaş', 'Beykoz', 'Beylikdüzü', 'Beyoğlu', 'Büyükçekmece', 'Çatalca', 'Çekmeköy', 'Esenler', 'Esenyurt', 'Eyüpsultan', 'Fatih', 'Gaziosmanpaşa', 'Güngören', 'Kadıköy', 'Kağıthane', 'Kartal', 'Küçükçekmece', 'Maltepe', 'Pendik', 'Sancaktepe', 'Sarıyer', 'Şile', 'Silivri', 'Şişli', 'Sultanbeyli', 'Sultangazi', 'Tuzla', 'Ümraniye', 'Üsküdar', 'Zeytinburnu'];

export function getDistrictsByCity(cityName: string): string[] {
  if (cityName === 'İstanbul' || cityName === 'Istanbul') {
    return [...ISTANBUL_DISTRICTS].sort((a, b) => a.localeCompare(b, 'tr'));
  }
  return [];
}
