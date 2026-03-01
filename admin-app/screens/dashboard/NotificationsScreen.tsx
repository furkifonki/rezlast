import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { supabase } from '../../lib/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

type Channel = 'email' | 'sms' | 'app_push';
type Tab = 'bulk' | 'single' | 'trigger';
type ActiveCustomer = { user_id: string; label: string };
type TriggerSettings = {
  enabled: boolean;
  trigger_30min: boolean;
  trigger_1day: boolean;
  notify_messages: boolean;
  notify_reservations: boolean;
};

export default function NotificationsScreen() {
  const [channel, setChannel] = useState<Channel>('app_push');
  const [tab, setTab] = useState<Tab>('bulk');
  const [customerSearch, setCustomerSearch] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeCustomers, setActiveCustomers] = useState<ActiveCustomer[]>([]);
  const [activeCustomersLoading, setActiveCustomersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');

  const [triggerSettings, setTriggerSettings] = useState<TriggerSettings>({
    enabled: true,
    trigger_30min: true,
    trigger_1day: false,
    notify_messages: true,
    notify_reservations: true,
  });
  const [triggerLoading, setTriggerLoading] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);

  useEffect(() => {
    if (tab === 'single' && supabase) {
      setActiveCustomersLoading(true);
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setActiveCustomers([]);
          setActiveCustomersLoading(false);
          return;
        }
        const { data: myBusinesses } = await supabase.from('businesses').select('id').eq('owner_id', user.id);
        const businessIds = (myBusinesses ?? []).map((b: { id: string }) => b.id);
        if (businessIds.length === 0) {
          setActiveCustomers([]);
          setActiveCustomersLoading(false);
          return;
        }
        const { data: rows } = await supabase
          .from('reservations')
          .select('user_id, customer_name')
          .in('business_id', businessIds)
          .in('status', ['pending', 'confirmed']);
        const byUser = new Map<string, string>();
        (rows ?? []).forEach((r: { user_id: string; customer_name: string | null }) => {
          if (r.user_id && !byUser.has(r.user_id)) {
            byUser.set(r.user_id, r.customer_name?.trim() || `Müşteri ${r.user_id.slice(0, 8)}`);
          }
        });
        setActiveCustomers(Array.from(byUser.entries()).map(([user_id, label]) => ({ user_id, label })));
        if (byUser.size > 0 && !selectedUserId) {
          setSelectedUserId(Array.from(byUser.keys())[0]);
        }
        setActiveCustomersLoading(false);
      })();
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'trigger' && supabase) {
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('push_trigger_settings')
          .select('enabled, trigger_30min, trigger_1day, notify_messages, notify_reservations')
          .eq('owner_id', user.id)
          .single();
        if (data) {
          setTriggerSettings({
            enabled: !!data.enabled,
            trigger_30min: !!data.trigger_30min,
            trigger_1day: !!data.trigger_1day,
            notify_messages: data.notify_messages !== false,
            notify_reservations: data.notify_reservations !== false,
          });
        }
      })();
    }
  }, [tab]);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    if (!title.trim()) {
      setError('Başlık gerekli.');
      return;
    }
    if (tab === 'single' && !selectedUserId) {
      setError('Tekil gönderim için müşteri seçin.');
      return;
    }
    if (!supabase) {
      setError('Supabase yapılandırılmamış.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Oturum gerekli.');
        setLoading(false);
        return;
      }
      let query = supabase
        .from('push_tokens')
        .select('expo_push_token')
        .not('expo_push_token', 'is', null);
      if (tab === 'single' && selectedUserId) {
        query = query.eq('user_id', selectedUserId);
      }
      const { data: tokens, error: fetchErr } = await query;
      if (fetchErr) {
        setError(fetchErr.message || 'Token listesi alınamadı.');
        setLoading(false);
        return;
      }
      const list = (tokens ?? []).map((t: { expo_push_token: string }) => t.expo_push_token).filter(Boolean);
      const total = list.length;
      if (total === 0) {
        setResult({ sent: 0, failed: 0, total: 0 });
        setLoading(false);
        return;
      }
      let sent = 0;
      let failed = 0;
      const messageBody = (typeof body === 'string' ? body.trim() : '') || title.trim();
      for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const chunk = list.slice(i, i + BATCH_SIZE);
        const messages = chunk.map((to: string) => ({ to, title: title.trim(), body: messageBody, sound: 'default' as const }));
        const res = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
        if (!res.ok) {
          failed += chunk.length;
          continue;
        }
        const data = (await res.json()) as { data?: { status: string }[] };
        (data.data ?? []).forEach((d: { status?: string }) => {
          if (d.status === 'ok') sent += 1;
          else failed += 1;
        });
      }
      setResult({ sent, failed, total });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bildirim gönderilemedi.');
    }
    setLoading(false);
  };

  const saveTriggerSettings = async () => {
    if (!supabase) return;
    setTriggerLoading(true);
    setTriggerSaved(false);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Oturum gerekli.');
        setTriggerLoading(false);
        return;
      }
      const { error: upsertErr } = await supabase
        .from('push_trigger_settings')
        .upsert(
          {
            owner_id: user.id,
            enabled: triggerSettings.enabled,
            trigger_30min: triggerSettings.trigger_30min,
            trigger_1day: triggerSettings.trigger_1day,
            notify_messages: triggerSettings.notify_messages,
            notify_reservations: triggerSettings.notify_reservations,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'owner_id' }
        );
      if (upsertErr) {
        setError(upsertErr.message || 'Ayarlar kaydedilemedi. push_trigger_settings tablosu mevcut mu?');
        setTriggerLoading(false);
        return;
      }
      setTriggerSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ayarlar kaydedilemedi.');
    }
    setTriggerLoading(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.channelRow}>
        <TouchableOpacity
          style={[styles.channelTab, channel === 'email' && styles.channelTabActive]}
          onPress={() => setChannel('email')}
        >
          <Text style={[styles.channelTabText, channel === 'email' && styles.channelTabTextActive]}>E-posta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.channelTab, channel === 'sms' && styles.channelTabActive]}
          onPress={() => setChannel('sms')}
        >
          <Text style={[styles.channelTabText, channel === 'sms' && styles.channelTabTextActive]}>SMS</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.channelTab, channel === 'app_push' && styles.channelTabActive]}
          onPress={() => setChannel('app_push')}
        >
          <Text style={[styles.channelTabText, channel === 'app_push' && styles.channelTabTextActive]}>App push</Text>
        </TouchableOpacity>
      </View>

      {channel === 'email' && (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>E-posta bildirimleri yakında eklenecek. Şu an sadece App push kullanılabilir.</Text>
        </View>
      )}

      {channel === 'sms' && (
        <View style={styles.placeholderBox}>
          <Text style={styles.placeholderText}>SMS bildirimleri yakında eklenecek. Şu an sadece App push kullanılabilir.</Text>
        </View>
      )}

      {channel === 'app_push' && (
        <>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === 'bulk' && styles.tabActive]}
          onPress={() => setTab('bulk')}
        >
          <Text style={[styles.tabText, tab === 'bulk' && styles.tabTextActive]}>Toplu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'single' && styles.tabActive]}
          onPress={() => setTab('single')}
        >
          <Text style={[styles.tabText, tab === 'single' && styles.tabTextActive]}>Tekil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'trigger' && styles.tabActive]}
          onPress={() => setTab('trigger')}
        >
          <Text style={[styles.tabText, tab === 'trigger' && styles.tabTextActive]}>Tetikleyici</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {tab === 'bulk' && (
          <>
            <Text style={styles.desc}>Tüm uygulama kullanıcılarına (push tokenı kayıtlı) anında bildirim gönderir.</Text>
            <Text style={styles.label}>Başlık</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Yeni kampanya"
              placeholderTextColor="#71717a"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.label}>Mesaj (isteğe bağlı)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bildirim metni"
              placeholderTextColor="#71717a"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />
          </>
        )}

        {tab === 'single' && (
          <>
            <Text style={styles.desc}>Bekleyen/onaylı rezervasyonu olan müşterilerden birini seçin. Müşteri adıyla arayabilirsiniz.</Text>
            <Text style={styles.label}>Müşteri ara</Text>
            <TextInput
              style={styles.input}
              placeholder="Ad veya isim ile ara…"
              placeholderTextColor="#71717a"
              value={customerSearch}
              onChangeText={setCustomerSearch}
            />
            <Text style={styles.label}>Aktif müşteri</Text>
            {activeCustomersLoading ? (
              <Text style={styles.hint}>Yükleniyor…</Text>
            ) : (
              <View style={styles.pickerWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {activeCustomers
                    .filter((c) => !customerSearch.trim() || c.label.toLowerCase().includes(customerSearch.trim().toLowerCase()))
                    .map((c) => (
                      <TouchableOpacity
                        key={c.user_id}
                        style={[styles.chip, selectedUserId === c.user_id && styles.chipActive]}
                        onPress={() => setSelectedUserId(c.user_id)}
                      >
                        <Text style={[styles.chipText, selectedUserId === c.user_id && styles.chipTextActive]} numberOfLines={1}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>
            )}
            {!activeCustomersLoading && activeCustomers.length === 0 && (
              <Text style={styles.hint}>Bekleyen/onaylı rezervasyonu olan müşteri yok.</Text>
            )}
            {!activeCustomersLoading && activeCustomers.length > 0 && customerSearch.trim() && activeCustomers.filter((c) => c.label.toLowerCase().includes(customerSearch.trim().toLowerCase())).length === 0 && (
              <Text style={styles.hint}>Arama sonucu bulunamadı.</Text>
            )}
            <Text style={styles.label}>Başlık</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Rezervasyonunuz onaylandı"
              placeholderTextColor="#71717a"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.label}>Mesaj (isteğe bağlı)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Bildirim metni"
              placeholderTextColor="#71717a"
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={500}
            />
          </>
        )}

        {tab === 'trigger' && (
          <>
            <Text style={styles.desc}>Rezervasyondan belirtilen süre önce otomatik push. Açık seçenekler zamanlanmış görev (cron) ile çalışır.</Text>
            <TouchableOpacity style={styles.checkRow} onPress={() => setTriggerSettings((s) => ({ ...s, enabled: !s.enabled }))}>
              <View style={[styles.checkbox, triggerSettings.enabled && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Tetikleyici bildirimleri aktif</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => triggerSettings.enabled && setTriggerSettings((s) => ({ ...s, trigger_30min: !s.trigger_30min }))}
              disabled={!triggerSettings.enabled}
            >
              <View style={[styles.checkbox, triggerSettings.trigger_30min && styles.checkboxChecked]} />
              <Text style={[styles.checkLabel, !triggerSettings.enabled && styles.checkLabelDisabled]}>Rezervasyondan 30 dk önce push at</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => triggerSettings.enabled && setTriggerSettings((s) => ({ ...s, trigger_1day: !s.trigger_1day }))}
              disabled={!triggerSettings.enabled}
            >
              <View style={[styles.checkbox, triggerSettings.trigger_1day && styles.checkboxChecked]} />
              <Text style={[styles.checkLabel, !triggerSettings.enabled && styles.checkLabelDisabled]}>Rezervasyondan 1 gün önce push at</Text>
            </TouchableOpacity>
            <Text style={styles.triggerSubtitle}>Bildirim türleri (işletme olarak alacağınız)</Text>
            <TouchableOpacity style={styles.checkRow} onPress={() => setTriggerSettings((s) => ({ ...s, notify_messages: !s.notify_messages }))}>
              <View style={[styles.checkbox, triggerSettings.notify_messages && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Mesaj bildirimleri (müşteriden gelen mesajlar)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.checkRow} onPress={() => setTriggerSettings((s) => ({ ...s, notify_reservations: !s.notify_reservations }))}>
              <View style={[styles.checkbox, triggerSettings.notify_reservations && styles.checkboxChecked]} />
              <Text style={styles.checkLabel}>Rezervasyon bildirimleri (yeni rezervasyonlar)</Text>
            </TouchableOpacity>
            {triggerSaved && <Text style={styles.successText}>Ayarlar kaydedildi.</Text>}
            <TouchableOpacity style={[styles.button, triggerLoading && styles.buttonDisabled]} onPress={saveTriggerSettings} disabled={triggerLoading}>
              {triggerLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Ayarları kaydet</Text>}
            </TouchableOpacity>
          </>
        )}

        {(tab === 'bulk' || tab === 'single') && (
          <>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
            {result ? (
              <Text style={styles.result}>Toplam: {result.total} cihaz — Gönderilen: {result.sent}, Başarısız: {result.failed}</Text>
            ) : null}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || (tab === 'single' ? !selectedUserId : false)}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gönder</Text>}
            </TouchableOpacity>
          </>
        )}

        {error && tab === 'trigger' ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  channelRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  channelTab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  channelTabActive: { backgroundColor: '#15803d' },
  channelTabText: { fontSize: 14, fontWeight: '600', color: '#52525b' },
  channelTabTextActive: { color: '#fff' },
  placeholderBox: { margin: 16, padding: 20, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e4e4e7' },
  placeholderText: { fontSize: 14, color: '#71717a', textAlign: 'center' },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#15803d' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#52525b' },
  tabTextActive: { color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  desc: { fontSize: 14, color: '#71717a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#18181b', marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  pickerWrap: { marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e4e4e7', marginRight: 8, marginBottom: 4 },
  chipActive: { backgroundColor: '#15803d', borderColor: '#15803d' },
  chipText: { fontSize: 14, color: '#52525b' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  hint: { fontSize: 13, color: '#71717a', marginBottom: 16 },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#d4d4d8', marginRight: 10 },
  checkboxChecked: { backgroundColor: '#15803d', borderColor: '#15803d' },
  checkLabel: { fontSize: 15, color: '#374151' },
  checkLabelDisabled: { color: '#a1a1aa' },
  triggerSubtitle: { fontSize: 14, fontWeight: '600', color: '#3f3f46', marginTop: 8, marginBottom: 8 },
  successText: { fontSize: 14, color: '#15803d', marginBottom: 16 },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  result: { fontSize: 14, color: '#52525b', marginBottom: 16 },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
