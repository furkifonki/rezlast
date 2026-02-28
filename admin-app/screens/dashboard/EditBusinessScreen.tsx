import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { cityNames, getDistrictsByCity } from '../../lib/turkey-cities';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainStackParamList } from './MenuScreen';

type Props = NativeStackScreenProps<MainStackParamList, 'EditBusiness'>;

type Category = { id: string; name: string };
type Business = {
  id: string;
  name: string;
  category_id: string;
  address: string;
  city: string;
  district: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string | null;
  is_active: boolean;
};

export default function EditBusinessScreen({ route, navigation }: Props) {
  const { businessId } = route.params;
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [cityModal, setCityModal] = useState(false);
  const [districtModal, setDistrictModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!businessId || !supabase) { setLoading(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const [bRes, catRes] = await Promise.all([
        supabase.from('businesses').select('id, name, category_id, address, city, district, phone, email, website, description, is_active').eq('id', businessId).eq('owner_id', user.id).single(),
        supabase.from('categories').select('id, name').eq('is_active', true).order('sort_order'),
      ]);
      if (!cancelled) {
        setCategories((catRes.data ?? []) as Category[]);
        if (bRes.data) setForm(bRes.data as Business);
        else setError(bRes.error?.message ?? 'İşletme bulunamadı.');
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    navigation.setOptions({ title: form ? `Düzenle: ${form.name}` : 'İşletme Düzenle' });
  }, [form?.name, navigation]);

  const handleSubmit = async () => {
    if (!form || !supabase) return;
    setError(null);
    setSuccess(null);
    if (!form.name.trim()) { setError('İşletme adı zorunludur.'); return; }
    if (!form.category_id) { setError('Kategori seçin.'); return; }
    if (!form.address.trim()) { setError('Adres zorunludur.'); return; }
    setSaving(true);
    const { error: err } = await supabase
      .from('businesses')
      .update({
        name: form.name.trim(),
        category_id: form.category_id,
        address: form.address.trim(),
        city: form.city.trim() || 'İstanbul',
        district: form.district?.trim() || null,
        phone: form.phone?.trim() || null,
        email: form.email?.trim() || null,
        website: form.website?.trim() || null,
        description: form.description?.trim() || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);
    setSaving(false);
    if (err) setError(err.message);
    else {
      setSuccess('Kaydedildi.');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const districts = form ? getDistrictsByCity(form.city) : [];

  if (loading) {
    return (
      <View style={styles.centered}><ActivityIndicator size="large" color="#15803d" /><Text style={styles.loadingText}>Yükleniyor...</Text></View>
    );
  }
  if (error && !form) {
    return (
      <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>
    );
  }
  if (!form) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      {success ? <View style={styles.successBox}><Text style={styles.successText}>{success}</Text></View> : null}
      <View style={styles.card}>
        <Text style={styles.label}>İşletme adı *</Text>
        <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm((f) => (f ? { ...f, name: v } : f))} placeholder="İşletme adı" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Kategori *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {categories.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.chip, form.category_id === c.id && styles.chipActive]} onPress={() => setForm((f) => (f ? { ...f, category_id: c.id } : f))}>
                <Text style={[styles.chipText, form.category_id === c.id && styles.chipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Adres *</Text>
        <TextInput style={styles.input} value={form.address} onChangeText={(v) => setForm((f) => (f ? { ...f, address: v } : f))} placeholder="Adres" placeholderTextColor="#a1a1aa" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>İl *</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setCityModal(true)}>
          <Text style={styles.selectBtnText}>{form.city || 'Seçin'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>İlçe</Text>
        <TouchableOpacity style={styles.selectBtn} onPress={() => setDistrictModal(true)} disabled={!form.city}>
          <Text style={styles.selectBtnText}>{form.district || 'Seçin'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Telefon</Text>
        <TextInput style={styles.input} value={form.phone ?? ''} onChangeText={(v) => setForm((f) => (f ? { ...f, phone: v || null } : f))} placeholder="Telefon" placeholderTextColor="#a1a1aa" keyboardType="phone-pad" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>E-posta</Text>
        <TextInput style={styles.input} value={form.email ?? ''} onChangeText={(v) => setForm((f) => (f ? { ...f, email: v || null } : f))} placeholder="E-posta" placeholderTextColor="#a1a1aa" keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Web sitesi</Text>
        <TextInput style={styles.input} value={form.website ?? ''} onChangeText={(v) => setForm((f) => (f ? { ...f, website: v || null } : f))} placeholder="https://..." placeholderTextColor="#a1a1aa" keyboardType="url" autoCapitalize="none" />
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Açıklama</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.description ?? ''} onChangeText={(v) => setForm((f) => (f ? { ...f, description: v || null } : f))} placeholder="Açıklama" placeholderTextColor="#a1a1aa" multiline numberOfLines={3} />
      </View>
      <View style={styles.cardRow}>
        <Text style={styles.label}>Aktif</Text>
        <Switch value={form.is_active} onValueChange={(v) => setForm((f) => (f ? { ...f, is_active: v } : f))} trackColor={{ false: '#d4d4d8', true: '#86efac' }} thumbColor={form.is_active ? '#15803d' : '#f4f4f5'} />
      </View>
      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={saving}>
        <Text style={styles.submitBtnText}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelBtnText}>İptal</Text>
      </TouchableOpacity>

      <Modal visible={cityModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCityModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İl seçin</Text>
            <FlatList data={cityNames} keyExtractor={(item) => item} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setForm((f) => (f ? { ...f, city: item, district: null } : f)); setCityModal(false); }}>
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setCityModal(false)}><Text style={styles.modalCloseText}>Kapat</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <Modal visible={districtModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDistrictModal(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>İlçe seçin</Text>
            <FlatList data={districts} keyExtractor={(item) => item} renderItem={({ item }) => (
              <TouchableOpacity style={styles.modalItem} onPress={() => { setForm((f) => (f ? { ...f, district: item } : f)); setDistrictModal(false); }}>
                <Text style={styles.modalItemText}>{item}</Text>
              </TouchableOpacity>
            )} />
            <TouchableOpacity style={styles.modalClose} onPress={() => setDistrictModal(false)}><Text style={styles.modalCloseText}>Kapat</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  successBox: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#86efac', borderRadius: 10, padding: 12, marginBottom: 16 },
  successText: { fontSize: 14, color: '#166534' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '600', color: '#71717a', marginBottom: 6, textTransform: 'uppercase' },
  input: { backgroundColor: '#f4f4f5', borderRadius: 10, padding: 12, fontSize: 16, color: '#18181b' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  selectBtn: { backgroundColor: '#f4f4f5', borderRadius: 10, padding: 12 },
  selectBtnText: { fontSize: 16, color: '#18181b' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f4f4f5', borderWidth: 1, borderColor: '#e4e4e7' },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 13, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  submitBtn: { backgroundColor: '#15803d', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 8 },
  submitBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  cancelBtn: { marginTop: 12, padding: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 16, color: '#71717a' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%', padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  modalItemText: { fontSize: 16, color: '#18181b' },
  modalClose: { marginTop: 12, padding: 12, alignItems: 'center' },
  modalCloseText: { fontSize: 16, color: '#71717a' },
});
