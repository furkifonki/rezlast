import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Service = { id: string; name: string; duration_minutes: number; price: number | null };
type TableRow = { id: string; table_number: string; capacity: number };

type Props = {
  businessId: string;
  businessName?: string;
  onBack: () => void;
  onDone: () => void;
};

export default function ReservationFlowScreen({ businessId, businessName, onBack, onDone }: Props) {
  const { session } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingTables, setLoadingTables] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [reservationDate, setReservationDate] = useState('');
  const [reservationTime, setReservationTime] = useState('19:00');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [tableId, setTableId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [specialRequests, setSpecialRequests] = useState('');

  useEffect(() => {
    if (!supabase || !businessId) return;
    (async () => {
      setLoadingServices(true);
      const { data } = await supabase
        .from('services')
        .select('id, name, duration_minutes, price')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('name');
      setServices((data ?? []) as Service[]);
      if (data?.length === 1) setServiceId((data[0] as Service).id);
      if (data?.length === 1 && (data[0] as Service).duration_minutes > 0) {
        setDurationMinutes((data[0] as Service).duration_minutes);
      }
      setLoadingServices(false);
    })();
  }, [businessId]);

  const loadAvailableTables = async () => {
    if (!supabase || !businessId || !reservationDate || !reservationTime) return;
    setLoadingTables(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc('get_available_tables', {
      p_business_id: businessId,
      p_date: reservationDate,
      p_time: reservationTime,
      p_duration_minutes: durationMinutes,
    });
    setLoadingTables(false);
    if (rpcError) {
      setTables([]);
      return;
    }
    setTables((data ?? []) as TableRow[]);
    setTableId(null);
  };

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      Alert.alert('Hata', 'Giriş yapmanız gerekiyor.');
      return;
    }
    if (!reservationDate.trim() || !reservationTime.trim()) {
      Alert.alert('Hata', 'Tarih ve saat seçin.');
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase.from('reservations').insert({
      business_id: businessId,
      user_id: session.user.id,
      reservation_date: reservationDate.trim(),
      reservation_time: reservationTime.trim().slice(0, 5),
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

  const today = new Date().toISOString().slice(0, 10);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Geri</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rezervasyon</Text>
        {businessName ? <Text style={styles.headerSubtitle} numberOfLines={1}>{businessName}</Text> : null}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text style={styles.label}>Hizmet (opsiyonel)</Text>
          {loadingServices ? (
            <ActivityIndicator size="small" color="#15803d" style={styles.loader} />
          ) : (
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[styles.chip, serviceId === null && styles.chipActive]}
                onPress={() => setServiceId(null)}
              >
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
                  <Text style={[styles.chipText, serviceId === s.id && styles.chipTextActive]}>{s.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Tarih *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            value={reservationDate}
            onChangeText={setReservationDate}
          />

          <Text style={styles.label}>Saat *</Text>
          <TextInput
            style={styles.input}
            placeholder="19:00"
            placeholderTextColor="#94a3b8"
            value={reservationTime}
            onChangeText={setReservationTime}
          />

          <Text style={styles.label}>Süre (dakika)</Text>
          <TextInput
            style={styles.input}
            placeholder="120"
            placeholderTextColor="#94a3b8"
            value={String(durationMinutes)}
            onChangeText={(t) => setDurationMinutes(Math.max(0, parseInt(t, 10) || 0))}
            keyboardType="number-pad"
          />

          <TouchableOpacity style={styles.secondaryButton} onPress={loadAvailableTables} disabled={loadingTables || !reservationDate || !reservationTime}>
            <Text style={styles.secondaryButtonText}>
              {loadingTables ? 'Yükleniyor...' : 'Müsait masaları getir'}
            </Text>
          </TouchableOpacity>

          {tables.length > 0 ? (
            <>
              <Text style={styles.label}>Masa (opsiyonel)</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, tableId === null && styles.chipActive]}
                  onPress={() => setTableId(null)}
                >
                  <Text style={[styles.chipText, tableId === null && styles.chipTextActive]}>Seçmeyeyim</Text>
                </TouchableOpacity>
                {tables.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.chip, tableId === t.id && styles.chipActive]}
                    onPress={() => setTableId(t.id)}
                  >
                    <Text style={[styles.chipText, tableId === t.id && styles.chipTextActive]}>
                      Masa {t.table_number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Kişi sayısı</Text>
          <TextInput
            style={styles.input}
            placeholder="2"
            placeholderTextColor="#94a3b8"
            value={String(partySize)}
            onChangeText={(t) => setPartySize(Math.max(1, parseInt(t, 10) || 1))}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Özel istek (opsiyonel)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Not ekleyebilirsiniz"
            placeholderTextColor="#94a3b8"
            value={specialRequests}
            onChangeText={setSpecialRequests}
            multiline
          />

          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Rezervasyonu oluştur</Text>
            )}
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
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  chipActive: { backgroundColor: '#15803d' },
  chipText: { fontSize: 14, color: '#64748b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: { fontSize: 14, color: '#15803d', fontWeight: '600' },
  loader: { marginVertical: 8 },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#15803d',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 8 },
});
