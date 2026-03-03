import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';

type Sponsored = {
  id: string;
  business_id: string;
  start_date: string;
  end_date: string;
  priority: number | null;
  payment_status: string | null;
  businesses: { name: string } | null;
};

type BusinessOption = { id: string; name: string };

export default function SponsoredScreen() {
  const [items, setItems] = useState<Sponsored[]>([]);
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formBusinessId, setFormBusinessId] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formPriority, setFormPriority] = useState(0);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setItems([]);
        setBusinesses([]);
        setLoading(false);
        return;
      }
      const { data: myBusinesses } = await supabase
        .from('businesses')
        .select('id, name')
        .eq('owner_id', user.id)
        .order('name');
      const bizList = (myBusinesses ?? []) as BusinessOption[];
      setBusinesses(bizList);
      const businessIds = bizList.map((b) => b.id);
      if (businessIds.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('sponsored_listings')
        .select('id, business_id, start_date, end_date, priority, payment_status, businesses ( name )')
        .in('business_id', businessIds)
        .order('priority', { ascending: false })
        .order('start_date', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setItems([]);
      } else {
        setItems((data ?? []) as Sponsored[]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const openNew = () => {
    setEditingId(null);
    setFormBusinessId(businesses[0]?.id ?? '');
    setFormStartDate(today);
    const end = new Date();
    end.setDate(end.getDate() + 7);
    setFormEndDate(end.toISOString().slice(0, 10));
    setFormPriority(0);
    setShowForm(true);
  };

  const openEdit = (row: Sponsored) => {
    setEditingId(row.id);
    setFormBusinessId(row.business_id);
    setFormStartDate(row.start_date);
    setFormEndDate(row.end_date);
    setFormPriority(row.priority ?? 0);
    setShowForm(true);
  };

  const save = async () => {
    if (!supabase) return;
    if (!formBusinessId || !formStartDate || !formEndDate) {
      setError('İşletme ve tarih alanları zorunludur.');
      return;
    }
    if (formStartDate > formEndDate) {
      setError('Bitiş tarihi başlangıçtan önce olamaz.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      business_id: formBusinessId,
      start_date: formStartDate,
      end_date: formEndDate,
      priority: formPriority,
      payment_status: 'paid',
    };
    if (editingId) {
      const { error: err } = await supabase
        .from('sponsored_listings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingId);
      if (err) {
        setError(err.message);
      } else {
        setItems((prev) =>
          prev.map((r) => (r.id === editingId ? { ...r, ...payload } as Sponsored : r))
        );
        setShowForm(false);
      }
    } else {
      const { data, error: err } = await supabase
        .from('sponsored_listings')
        .insert({ ...payload, updated_at: new Date().toISOString() })
        .select('id, business_id, start_date, end_date, priority, payment_status, businesses ( name )')
        .single();
      if (err) {
        setError(err.message);
      } else {
        setItems((prev) => [data as Sponsored, ...prev]);
        setShowForm(false);
      }
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!supabase) return;
    setActionLoading(id);
    const { error: err } = await supabase
      .from('sponsored_listings')
      .delete()
      .eq('id', id);
    setActionLoading(null);
    if (err) {
      setError(err.message);
    } else {
      setItems((prev) => prev.filter((r) => r.id !== id));
    }
  };

  const isActive = (row: Sponsored) =>
    row.payment_status === 'paid' && row.start_date <= today && row.end_date >= today;

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Öne Çıkan İşletmeler</Text>
              <Text style={styles.subtitle}>
                Keşfet ekranında &quot;Öne Çıkan&quot; blokta görünecek işletmeleri burada
                yönetebilirsiniz.
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.newButton,
                (businesses.length === 0 || saving) && styles.newButtonDisabled,
              ]}
              onPress={openNew}
              disabled={businesses.length === 0 || saving}
              activeOpacity={0.8}
            >
              <Text style={styles.newButtonText}>Yeni ekle</Text>
            </TouchableOpacity>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {showForm && (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>{editingId ? 'Kaydı düzenle' : 'Yeni öne çıkan ekle'}</Text>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>İşletme</Text>
                <View style={styles.pillRow}>
                  {businesses.map((b) => {
                    const active = formBusinessId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.pill, active && styles.pillActive]}
                        onPress={() => setFormBusinessId(b.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.pillText, active && styles.pillTextActive]} numberOfLines={1}>
                          {b.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              <View style={styles.formRow}>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Başlangıç (YYYY-AA-GG)</Text>
                  <TextInput
                    style={styles.input}
                    value={formStartDate}
                    onChangeText={setFormStartDate}
                    placeholder="2026-03-01"
                    placeholderTextColor="#a1a1aa"
                  />
                </View>
                <View style={[styles.formField, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Bitiş (YYYY-AA-GG)</Text>
                  <TextInput
                    style={styles.input}
                    value={formEndDate}
                    onChangeText={setFormEndDate}
                    placeholder="2026-03-31"
                    placeholderTextColor="#a1a1aa"
                  />
                </View>
              </View>
              <View style={styles.formField}>
                <Text style={styles.formLabel}>Öncelik (yüksek = üstte)</Text>
                <TextInput
                  style={styles.input}
                  value={String(formPriority)}
                  onChangeText={(txt) => setFormPriority(Number(txt) || 0)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#a1a1aa"
                />
              </View>
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={save}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setShowForm(false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.cancelBtnText}>İptal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {items.length === 0 ? (
            <Text style={styles.empty}>Henüz öne çıkan liste kaydı yok.</Text>
          ) : (
            items.map((s) => {
              const active = isActive(s);
              return (
                <View key={s.id} style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardName}>
                      {(s.businesses as { name: string } | null)?.name ?? '—'}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        active ? styles.statusBadgeActive : styles.statusBadgeInactive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          active ? styles.statusBadgeTextActive : styles.statusBadgeTextInactive,
                        ]}
                      >
                        {active ? 'Aktif' : 'Pasif'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardMeta}>
                    {s.start_date} – {s.end_date} · Öncelik: {s.priority ?? 0}
                  </Text>
                  <Text style={styles.cardMeta}>
                    Ödeme durumu: {s.payment_status ?? '—'}
                  </Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardActionPrimary}
                      onPress={() => openEdit(s)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardActionPrimaryText}>Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cardActionDanger}
                      onPress={() => remove(s.id)}
                      disabled={actionLoading === s.id}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cardActionDangerText}>
                        {actionLoading === s.id ? 'Siliniyor...' : 'Sil'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#71717a' },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', paddingVertical: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  newButton: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#15803d' },
  newButtonDisabled: { opacity: 0.5 },
  newButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#b91c1c' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e4e4e7' },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 8 },
  formField: { marginBottom: 10 },
  formLabel: { fontSize: 12, fontWeight: '600', color: '#4b5563', marginBottom: 4 },
  formRow: { flexDirection: 'row', gap: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: '#111827' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f3f4f6' },
  pillActive: { backgroundColor: '#15803d' },
  pillText: { fontSize: 13, color: '#374151' },
  pillTextActive: { color: '#fff', fontWeight: '600' },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  saveBtn: { flex: 1, backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  cancelBtn: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff' },
  cancelBtnText: { fontSize: 14, fontWeight: '500', color: '#4b5563' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#18181b', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusBadgeActive: { backgroundColor: '#dcfce7', borderColor: '#16a34a' },
  statusBadgeInactive: { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  statusBadgeTextActive: { color: '#166534' },
  statusBadgeTextInactive: { color: '#4b5563' },
  cardMeta: { fontSize: 13, color: '#71717a', marginBottom: 2 },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  cardActionPrimary: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#e5f3ff' },
  cardActionPrimaryText: { fontSize: 13, fontWeight: '600', color: '#1d4ed8' },
  cardActionDanger: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fee2e2' },
  cardActionDangerText: { fontSize: 13, fontWeight: '600', color: '#b91c1c' },
});
