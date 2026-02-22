import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Service = { id: string; name: string; duration_minutes: number; duration_display: string | null; price: number | null };
type TableRow = { id: string; table_number: string; capacity: number; table_type: string | null; position_x: number | null; position_y: number | null };

const AREA_TYPE_LABELS: Record<string, string> = {
  indoor: 'İç Mekân',
  outdoor: 'Dış Mekân',
  terrace: 'Teras',
  seaside: 'Deniz Kenarı',
  vip: 'VIP',
  bar: 'Bar',
};
const AREA_TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  indoor: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  outdoor: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  terrace: { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
  seaside: { bg: '#e0f2fe', border: '#0ea5e9', text: '#0369a1' },
  vip: { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  bar: { bg: '#f3e8ff', border: '#a855f7', text: '#6b21a8' },
};
function getAreaLabel(tableType: string | null): string {
  if (!tableType) return '';
  return AREA_TYPE_LABELS[tableType] ?? tableType;
}
function getTableStyle(tableType: string | null) {
  const key = tableType && AREA_TYPE_COLORS[tableType] ? tableType : 'indoor';
  return AREA_TYPE_COLORS[key] ?? AREA_TYPE_COLORS.indoor;
}

const PLAN_CANVAS_W = 1000;
const PLAN_CANVAS_H = 700;
const PLAN_TABLE_W = 72;
const PLAN_TABLE_H = 56;
const MAP_TABLE_MIN_W = 64;
const MAP_TABLE_MIN_H = 52;
const MAP_HEIGHT = 380;

type TableMapViewProps = {
  tables: TableRow[];
  selectedTableId: string | null;
  onSelectTable: (id: string | null) => void;
  getAreaLabel: (tableType: string | null) => string;
  occupiedTableIds: Set<string>;
};

function TableMapView({ tables, selectedTableId, onSelectTable, getAreaLabel, occupiedTableIds }: TableMapViewProps) {
  const screenWidth = Dimensions.get('window').width - 32;
  const scaleX = screenWidth / PLAN_CANVAS_W;
  const scaleY = MAP_HEIGHT / PLAN_CANVAS_H;
  const tablesWithPosition = tables.filter((t) => t.position_x != null && t.position_y != null);
  const tablesWithoutPosition = tables.filter((t) => t.position_x == null || t.position_y == null);

  return (
    <View style={styles.mapContainer}>
      <View style={[styles.mapCanvas, { width: screenWidth, height: MAP_HEIGHT }]}>
        {tablesWithPosition.map((t) => {
          const x = (t.position_x ?? 0) * scaleX;
          const y = (t.position_y ?? 0) * scaleY;
          const w = Math.max(MAP_TABLE_MIN_W, PLAN_TABLE_W * scaleX);
          const h = Math.max(MAP_TABLE_MIN_H, PLAN_TABLE_H * scaleY);
          const isSelected = selectedTableId === t.id;
          const isOccupied = occupiedTableIds.has(t.id);
          const areaLabel = getAreaLabel(t.table_type);
          const style = getTableStyle(t.table_type);
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.mapTable,
                {
                  position: 'absolute',
                  left: x,
                  top: y,
                  width: w,
                  height: h,
                  backgroundColor: isOccupied ? '#e5e7eb' : isSelected ? '#15803d' : style.bg,
                  borderColor: isOccupied ? '#9ca3af' : isSelected ? '#0f766e' : style.border,
                  borderWidth: isSelected ? 3 : 2,
                  opacity: isOccupied ? 0.9 : 1,
                },
              ]}
              onPress={() => !isOccupied && onSelectTable(t.id)}
              activeOpacity={isOccupied ? 1 : 0.8}
              disabled={isOccupied}
            >
              <Text style={[styles.mapTableNum, { color: isOccupied ? '#6b7280' : isSelected ? '#fff' : style.text }]} numberOfLines={1}>{t.table_number}</Text>
              {isOccupied ? (
                <Text style={[styles.mapTableCapacity, { color: '#6b7280', fontSize: 10 }]}>Meşgul</Text>
              ) : (
                <Text style={[styles.mapTableCapacity, { color: isSelected ? '#fff' : style.text }]}>{t.capacity} kişi</Text>
              )}
              {areaLabel && !isOccupied ? <Text style={[styles.mapTableType, { color: isSelected ? '#fff' : style.text }]} numberOfLines={1}>{areaLabel}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
      {tablesWithoutPosition.length > 0 ? (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackLabel}>Konumu tanımlanmamış masalar:</Text>
          <View style={styles.chipRow}>
            {tablesWithoutPosition.map((t) => {
              const areaLabel = getAreaLabel(t.table_type);
              const subtitle = areaLabel ? ` · ${areaLabel}` : '';
              const isSelected = selectedTableId === t.id;
              const isOccupied = occupiedTableIds.has(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, isSelected && styles.chipActive, isOccupied && styles.chipOccupied]}
                  onPress={() => !isOccupied && onSelectTable(t.id)}
                  disabled={isOccupied}
                >
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive, isOccupied && styles.chipTextOccupied]} numberOfLines={1}>
                    Masa {t.table_number}{subtitle}{isOccupied ? ' · Meşgul' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

type HourRow = { day_of_week: number; open_time: string | null; close_time: string | null; is_closed: boolean };
type ClosureRow = { closure_date: string };

const SLOT_INTERVAL_MIN = 30;
const FALLBACK_TIMES = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'];

function getDurationLabel(s: Service): string {
  if (s.duration_minutes != null && s.duration_minutes > 0) return `${s.duration_minutes} dk`;
  switch (s.duration_display) {
    case 'all_day': return 'Gün boyu';
    case 'all_evening': return 'Tüm akşam';
    case 'no_limit': return 'Süre sınırı yok';
    default: return s.duration_minutes === 0 ? 'Süre yok' : `${s.duration_minutes ?? 0} dk`;
  }
}

function timeToMinutes(t: string | null): number {
  if (!t) return 0;
  const s = String(t).slice(0, 5);
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

type Props = {
  businessId: string;
  businessName?: string;
  onBack: () => void;
  onDone: () => void;
};

export default function ReservationFlowScreen({ businessId, businessName, onBack, onDone }: Props) {
  const { session } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<HourRow[]>([]);
  const [closures, setClosures] = useState<ClosureRow[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [occupiedTableIds, setOccupiedTableIds] = useState<Set<string>>(new Set());
  const [tablesError, setTablesError] = useState<string | null>(null);
  const [tablesLoadAttempted, setTablesLoadAttempted] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [tableId, setTableId] = useState<string | null>(null);
  const [tableViewMode, setTableViewMode] = useState<'list' | 'map'>('list');
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');

  const selectedTable = tableId ? (tables.find((t) => t.id === tableId) || null) : null;
  const maxTableCapacity = tables.length > 0 ? Math.max(...tables.map((t) => t.capacity)) : null;
  const capacityExceeded = selectedTable !== null && selectedTable !== undefined && partySize > selectedTable.capacity;
  const exceedsMaxCapacity = maxTableCapacity != null && partySize > maxTableCapacity;

  const availableDates = useMemo(() => {
    const out: { date: string; label: string; dayOfWeek: number }[] = [];
    const closureSet = new Set(closures.map((c) => c.closure_date));
    const hourByDay = new Map(hours.map((h) => [h.day_of_week, h]));
    const today = new Date();
    const hasHours = hours.length > 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayOfWeek = d.getDay();
      if (closureSet.has(dateStr)) continue;
      if (hasHours) {
        const h = hourByDay.get(dayOfWeek);
        if (h?.is_closed) continue;
      }
      const dayLabel = i === 0 ? 'Bugün' : i === 1 ? 'Yarın' : d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' });
      out.push({ date: dateStr, label: dayLabel, dayOfWeek });
    }
    return out;
  }, [hours, closures]);

  const availableTimes = useMemo(() => {
    if (!reservationDate) return [];
    const d = new Date(reservationDate + 'T12:00:00');
    const dayOfWeek = d.getDay();
    const hourRow = hours.find((h) => h.day_of_week === dayOfWeek);
    if (!hourRow || hourRow.is_closed) {
      return FALLBACK_TIMES;
    }
    const openMin = timeToMinutes(hourRow.open_time);
    const closeMin = timeToMinutes(hourRow.close_time);
    if (openMin >= closeMin) return FALLBACK_TIMES;
    const slots: string[] = [];
    for (let m = openMin; m + durationMinutes <= closeMin; m += SLOT_INTERVAL_MIN) {
      slots.push(minutesToTime(m));
    }
    return slots.length > 0 ? slots : FALLBACK_TIMES;
  }, [reservationDate, hours, durationMinutes]);

  useEffect(() => {
    if (!supabase || !businessId) return;
    setTables([]);
    setTableId(null);
    setTablesError(null);
    setTablesLoadAttempted(false);
    (async () => {
      setLoadingServices(true);
      setLoadingSlots(true);
      const [sRes, hRes, cRes] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, duration_display, price').eq('business_id', businessId).eq('is_active', true).order('name'),
        supabase.from('business_hours').select('day_of_week, open_time, close_time, is_closed').eq('business_id', businessId).order('day_of_week'),
        supabase.from('business_closures').select('closure_date').eq('business_id', businessId).gte('closure_date', new Date().toISOString().slice(0, 10)).order('closure_date'),
      ]);
      setServices((sRes.data ?? []) as Service[]);
      setHours((hRes.data ?? []) as HourRow[]);
      setClosures((cRes.data ?? []) as ClosureRow[]);
      if ((sRes.data?.length ?? 0) === 1) {
        const s = sRes.data![0] as Service;
        setServiceId(s.id);
        if (s.duration_minutes > 0) setDurationMinutes(s.duration_minutes);
      }
      setLoadingServices(false);
      setLoadingSlots(false);
    })();
  }, [businessId]);

  useEffect(() => {
    if (availableDates.length > 0 && !reservationDate) {
      setReservationDate(availableDates[0].date);
    }
  }, [availableDates, reservationDate]);

  useEffect(() => {
    if (!reservationDate) {
      if (reservationTime) setReservationTime('');
      return;
    }
    if (availableTimes.length > 0) {
      if (!reservationTime || !availableTimes.includes(reservationTime)) {
        setReservationTime(availableTimes[0]);
      }
    }
  }, [availableTimes, reservationDate]);

  useEffect(() => {
    if (!tableId || tables.length === 0) return;
    const t = tables.find((x) => x.id === tableId);
    if (t && partySize > t.capacity) setPartySize(t.capacity);
  }, [tableId, tables]);

  useEffect(() => {
    if (maxTableCapacity == null) return;
    if (partySize > maxTableCapacity) setPartySize(maxTableCapacity);
  }, [maxTableCapacity]);

  const loadAvailableTables = async () => {
    if (!supabase || !businessId || !reservationDate || !reservationTime) return;
    setTablesLoadAttempted(true);
    setLoadingTables(true);
    setTablesError(null);
    // 1) Tüm masaları göster (her masa listede/haritada görünsün).
    const { data: tablesData, error: listError } = await supabase
      .from('tables')
      .select('id, table_number, capacity, table_type, position_x, position_y')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('table_number');
    if (listError) {
      setLoadingTables(false);
      setTables([]);
      setOccupiedTableIds(new Set());
      setTablesError(
        'Masa listesi alınamadı: ' + listError.message + '. Supabase\'de "Anyone can view tables of active businesses" (rls-services-tables-public-read.sql) çalıştırıldı mı?'
      );
      return;
    }
    const list = (tablesData ?? []) as TableRow[];
    setTables(list);
    if (list.length === 0) {
      setLoadingTables(false);
      setOccupiedTableIds(new Set());
      setTableId(null);
      setTablesError('Bu işletmede henüz masa tanımlanmamış. Admin panel > Masalar bölümünden bu işletme için masa ekleyin.');
      return;
    }
    setTablesError(null);
    // 2) Bu tarih/saat için müsait masaları RPC ile al; dolu olanları "Meşgul" göstereceğiz.
    const timeParam = reservationTime.length === 5 ? `${reservationTime}:00` : reservationTime;
    const { data: availableRows } = await supabase.rpc('get_available_tables', {
      p_business_id: businessId,
      p_date: reservationDate,
      p_time: timeParam,
      p_duration_minutes: durationMinutes,
    });
    const availableIds = new Set((availableRows ?? []).map((r: { id: string }) => r.id));
    const occupied = new Set(list.map((t) => t.id).filter((id) => !availableIds.has(id)));
    setOccupiedTableIds(occupied);
    setTableId((prev) => (prev && occupied.has(prev) ? null : prev));
    setLoadingTables(false);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
      return;
    }
    if (!reservationDate || !reservationTime) {
      Alert.alert('Hata', 'Tarih ve saat seçin.');
      return;
    }
    if (maxTableCapacity != null && partySize > maxTableCapacity) {
      Alert.alert('Hata', `Bu işletmede masa kapasitesi en fazla ${maxTableCapacity} kişiliktir. Kişi sayısını ${maxTableCapacity} veya altına düşürün.`);
      return;
    }
    if (selectedTable && partySize > selectedTable.capacity) {
      Alert.alert('Hata', `Seçilen masa ${selectedTable.capacity} kişiliktir. Kişi sayısını azaltın veya masa seçimini kaldırın.`);
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('reservations').insert({
      business_id: businessId,
      user_id: session.user.id,
      reservation_date: reservationDate,
      reservation_time: reservationTime.slice(0, 5),
      duration_minutes: durationMinutes,
      party_size: partySize,
      service_id: serviceId || null,
      table_id: tableId || null,
      special_requests: specialRequests.trim() || null,
      status: 'pending',
    });
    setSaving(false);
    if (err) {
      setError(err.message);
      Alert.alert('Hata', err.message);
      return;
    }
    Alert.alert('Başarılı', 'Rezervasyonunuz alındı. İşletme onayı bekleniyor.', [
      { text: 'Tamam', onPress: onDone },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyon</Text>
        {businessName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{businessName}</Text> : null}
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Hizmet (opsiyonel)</Text>
          {loadingServices ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : (
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, serviceId === null && styles.chipActive]} onPress={() => setServiceId(null)}>
                <Text style={[styles.chipText, serviceId === null && styles.chipTextActive]}>Yok</Text>
              </TouchableOpacity>
              {services.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.chip, serviceId === s.id && styles.chipActive]}
                  onPress={() => {
                    setServiceId(s.id);
                    if (s.duration_minutes > 0) setDurationMinutes(s.duration_minutes);
                  }}
                >
                  <Text style={[styles.chipText, serviceId === s.id && styles.chipTextActive]} numberOfLines={1}>
                    {s.name} ({getDurationLabel(s)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Süre (dakika)</Text>
          <View style={styles.chipRow}>
            {[30, 60, 90, 120].map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, durationMinutes === d && styles.chipActive]}
                onPress={() => setDurationMinutes(d)}
              >
                <Text style={[styles.chipText, durationMinutes === d && styles.chipTextActive]}>{d} dk</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Tarih *</Text>
          {loadingSlots ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : availableDates.length === 0 ? (
            <>
              <Text style={styles.hint}>Bu işletme için müsait gün tanımlı değil veya çalışma saatleri eksik.</Text>
              <Text style={[styles.hint, { marginTop: 4 }]}>Admin panel: İşletme düzenle → Çalışma saatleri ekleyin (her gün için açılış/kapanış veya kapalı işaretleyin).</Text>
            </>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {availableDates.map(({ date, label }) => (
                <TouchableOpacity
                  key={date}
                  style={[styles.dateChip, reservationDate === date && styles.chipActive]}
                  onPress={() => setReservationDate(date)}
                >
                  <Text style={[styles.dateChipText, reservationDate === date && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <Text style={styles.label}>Saat *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll} contentContainerStyle={styles.chipRowScroll}>
            {availableTimes.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.dateChip, reservationTime === t && styles.chipActive]}
                onPress={() => setReservationTime(t)}
              >
                <Text style={[styles.dateChipText, reservationTime === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[styles.secondaryButton, (loadingTables || !reservationDate || !reservationTime) && styles.buttonDisabled]}
            onPress={loadAvailableTables}
            disabled={loadingTables || !reservationDate || !reservationTime}
          >
            <Text style={styles.secondaryButtonText}>
              {loadingTables ? 'Yükleniyor...' : 'Masaları getir'}
            </Text>
          </TouchableOpacity>
          {tablesLoadAttempted && tablesError ? <Text style={styles.errorText}>{tablesError}</Text> : null}

          {tables.length > 0 ? (
            <>
              <Text style={styles.label}>Masa / Alan (opsiyonel)</Text>
              <Text style={styles.hint}>Deniz kenarı, VIP, teras vb. alan tipleri işletmenin tanımladığı şekilde gösterilir. Seçtiğiniz tarih ve saatte dolu olan masalar &quot;Meşgul&quot; olarak görünür ve seçilemez.</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, tableId === null && styles.chipActive]} onPress={() => setTableId(null)}>
                  <Text style={[styles.chipText, tableId === null && styles.chipTextActive]}>Seçmeyeyim</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, tableViewMode === 'list' && styles.chipActive]}
                  onPress={() => setTableViewMode('list')}
                >
                  <Text style={[styles.chipText, tableViewMode === 'list' && styles.chipTextActive]}>Liste</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, tableViewMode === 'map' && styles.chipActive]}
                  onPress={() => setTableViewMode('map')}
                >
                  <Text style={[styles.chipText, tableViewMode === 'map' && styles.chipTextActive]}>Harita</Text>
                </TouchableOpacity>
              </View>
              {tableViewMode === 'list' ? (
                <View style={styles.chipRow}>
                  {tables.map((t) => {
                    const areaLabel = getAreaLabel(t.table_type);
                    const subtitle = areaLabel ? ` · ${areaLabel}` : '';
                    const isOccupied = occupiedTableIds.has(t.id);
                    return (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.chip, tableId === t.id && styles.chipActive, isOccupied && styles.chipOccupied]}
                        onPress={() => !isOccupied && setTableId(t.id)}
                        disabled={isOccupied}
                      >
                        <Text style={[styles.chipText, tableId === t.id && styles.chipTextActive, isOccupied && styles.chipTextOccupied]} numberOfLines={1}>
                          Masa {t.table_number}{subtitle} ({t.capacity} kişi){isOccupied ? ' · Meşgul' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TableMapView
                  tables={tables}
                  selectedTableId={tableId}
                  onSelectTable={setTableId}
                  getAreaLabel={getAreaLabel}
                  occupiedTableIds={occupiedTableIds}
                />
              )}
            </>
          ) : null}

          <Text style={styles.label}>Kişi sayısı</Text>
          {maxTableCapacity != null && (
            <Text style={styles.hintText}>Bu işletmede masa kapasitesi en fazla {maxTableCapacity} kişiliktir.</Text>
          )}
          {capacityExceeded ? (
            <Text style={styles.capacityError}>
              Seçilen masa {selectedTable?.capacity} kişiliktir. Kişi sayısını azaltın veya başka masa seçin.
            </Text>
          ) : null}
          {exceedsMaxCapacity ? (
            <Text style={styles.capacityError}>
              Kişi sayısı en fazla {maxTableCapacity} olabilir.
            </Text>
          ) : null}
          <View style={styles.chipRow}>
            {[1, 2, 3, 4, 5, 6]
              .filter((n) => maxTableCapacity == null || n <= maxTableCapacity)
              .map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, partySize === n && styles.chipActive]}
                  onPress={() => setPartySize(n)}
                >
                  <Text style={[styles.chipText, partySize === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
          </View>

          <Text style={styles.label}>Özel istek (opsiyonel)</Text>
          <TextInput
            style={styles.specialInput}
            value={specialRequests}
            onChangeText={setSpecialRequests}
            placeholder="Not ekleyebilirsiniz"
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, (saving || capacityExceeded || exceedsMaxCapacity) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={saving || !reservationDate || !reservationTime || capacityExceeded || exceedsMaxCapacity}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Rezervasyonu oluştur</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 16 },
  backBtnText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginTop: 4 },
  headerSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  label: { fontSize: 12, fontWeight: '600', color: '#64748b', marginTop: 16, marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f1f5f9' },
  chipActive: { backgroundColor: '#15803d' },
  chipOccupied: { backgroundColor: '#e5e7eb', borderColor: '#d1d5db' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  chipTextOccupied: { color: '#6b7280' },
  dateScroll: { marginHorizontal: -16, paddingHorizontal: 16, marginTop: 4 },
  chipRowScroll: { flexDirection: 'row', paddingBottom: 4 },
  dateChip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', marginRight: 8, minWidth: 80, alignItems: 'center' },
  dateChipText: { fontSize: 14, color: '#64748b' },
  hint: { fontSize: 13, color: '#64748b', marginTop: 4 },
  noSlotsError: { fontSize: 14, color: '#dc2626', marginTop: 4, fontWeight: '500' },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonDisabled: { opacity: 0.6 },
  secondaryButtonText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
  loader: { marginVertical: 8 },
  submitButton: { marginTop: 24, backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 8 },
  mapContainer: { marginTop: 8 },
  mapCanvas: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mapTable: {
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  mapTableNum: { fontSize: 14, fontWeight: '700' },
  mapTableCapacity: { fontSize: 11, marginTop: 2 },
  mapTableType: { fontSize: 10, marginTop: 2 },
  mapFallback: { marginTop: 12 },
  mapFallbackLabel: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  hintText: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  capacityError: { fontSize: 13, color: '#dc2626', marginTop: 4, marginBottom: 4 },
  specialInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 4,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#0f172a',
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
