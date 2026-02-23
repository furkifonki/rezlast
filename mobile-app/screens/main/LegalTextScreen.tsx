import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

type Props = {
  legalKey: 'kvkk' | 'etk';
  onBack: () => void;
  onAccept?: () => void;
  /** Sadece true ise "Kabul ediyorum" butonu gösterilir (bilgilendirme sayfasında gösterilmez). */
  showAcceptButton?: boolean;
};

type LegalRow = { key: string; title: string; body: string };

export default function LegalTextScreen({ legalKey, onBack, onAccept, showAcceptButton = false }: Props) {
  const { session } = useAuth();
  const [item, setItem] = useState<LegalRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from('app_legal_texts').select('key, title, body').eq('key', legalKey).single();
      setItem(data as LegalRow | null);
      setLoading(false);
    })();
  }, [legalKey]);

  const handleAccept = async () => {
    const userId = session?.user?.id;
    if (!supabase || !userId) {
      onBack();
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('users')
      .update(
        legalKey === 'kvkk' ? { kvkk_accepted_at: new Date().toISOString() } : { etk_accepted_at: new Date().toISOString() }
      )
      .eq('id', userId);
    setSaving(false);
    if (!error && onAccept) onAccept();
    onBack();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Metin yüklenemedi.</Text>
        <TouchableOpacity style={styles.backBtnStandalone} onPress={onBack}>
          <Text style={styles.backBtnText}>Geri</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{item.title}</Text>
      </View>
      <Text style={styles.body}>{item.body}</Text>
      {showAcceptButton && onAccept ? (
        <TouchableOpacity style={[styles.acceptButton, saving && styles.buttonDisabled]} onPress={handleAccept} disabled={saving}>
          <Text style={styles.acceptButtonText}>{saving ? 'Kaydediliyor...' : 'Kabul ediyorum'}</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 48 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnIcon: { fontSize: 22, color: '#15803d', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  body: { fontSize: 14, color: '#475569', lineHeight: 22 },
  acceptButton: { marginTop: 24, backgroundColor: '#15803d', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  acceptButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.7 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 14, color: '#dc2626', marginBottom: 16 },
  backBtnStandalone: { paddingVertical: 12, paddingHorizontal: 20 },
  backBtnText: { fontSize: 16, color: '#15803d', fontWeight: '600' },
});
