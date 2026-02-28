import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

export default function NotificationsScreen() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    setResult(null);
    if (!title.trim()) {
      setError('Başlık gerekli.');
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
      const { data: tokens, error: fetchErr } = await supabase
        .from('push_tokens')
        .select('expo_push_token')
        .not('expo_push_token', 'is', null);
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

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.desc}>Uygulama kullanıcılarına push bildirimi gönderir.</Text>
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
        {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
        {result ? (
          <Text style={styles.result}>Toplam: {result.total} cihaz — Gönderilen: {result.sent}, Başarısız: {result.failed}</Text>
        ) : null}
        <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Gönder</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  desc: { fontSize: 14, color: '#71717a', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#3f3f46', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: '#18181b', marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  errorBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 14, color: '#b91c1c' },
  result: { fontSize: 14, color: '#52525b', marginBottom: 16 },
  button: { backgroundColor: '#15803d', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
