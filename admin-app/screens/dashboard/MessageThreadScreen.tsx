import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import type { MainStackParamList } from './MenuScreen';

type Message = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  text: string;
  created_at: string;
  read_at_restaurant: string | null;
};

type Props = NativeStackScreenProps<MainStackParamList, 'MessageThread'>;

export default function MessageThreadScreen({ route, navigation }: Props) {
  const { conversationId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [customerName, setCustomerName] = useState('Konuşma');
  const [canMessage, setCanMessage] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ title: customerName });
  }, [navigation, customerName]);

  const loadMessages = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (!error) setMessages((data ?? []) as Message[]);
  }, [conversationId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supabase) { setLoading(false); return; }
      setLoading(true);
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, reservation_id, reservations ( customer_name, status )')
        .eq('id', conversationId)
        .single();
      if (!cancelled && conv) {
        const res = (conv as { reservations?: { customer_name?: string | null; status?: string } | null }).reservations;
        const r = Array.isArray(res) ? res[0] : res;
        setCustomerName((r as { customer_name?: string | null } | null)?.customer_name?.trim() || 'Müşteri');
        setCanMessage(r && typeof r === 'object' && 'status' in r ? ['pending', 'confirmed'].includes((r as { status: string }).status) : true);
      }
      await loadMessages();
      const now = new Date().toISOString();
      await supabase
        .from('messages')
        .update({ read_at_restaurant: now })
        .eq('conversation_id', conversationId)
        .eq('sender_type', 'user')
        .is('read_at_restaurant', null);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [conversationId, loadMessages]);

  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel(`admin-msg:${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || !supabase || sending || !canMessage) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setReplyText('');
    setSending(true);
    const { data: created, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_type: 'restaurant', sender_id: user.id, text })
      .select()
      .single();
    setSending(false);
    if (!error && created) setMessages((prev) => [...prev, created as Message]);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isRestaurant = item.sender_type === 'restaurant';
    return (
      <View style={[styles.msgRow, isRestaurant ? styles.msgRowRight : styles.msgRowLeft]}>
        <View style={[styles.bubble, isRestaurant ? styles.bubbleRestaurant : styles.bubbleUser]}>
          <Text style={[styles.bubbleText, isRestaurant && styles.bubbleTextWhite]}>{item.text}</Text>
          <Text style={[styles.bubbleTime, isRestaurant ? styles.bubbleTimeWhite : styles.bubbleTimeGray]}>
            {new Date(item.created_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#15803d" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.empty}>Henüz mesaj yok. İlk mesajı siz gönderin.</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={replyText}
          onChangeText={setReplyText}
          placeholder={canMessage ? 'Mesaj yazın...' : 'Bu rezervasyon için mesajlaşma kapalı.'}
          placeholderTextColor="#a1a1aa"
          editable={canMessage && !sending}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!replyText.trim() || !canMessage || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!replyText.trim() || !canMessage || sending}
        >
          <Text style={styles.sendBtnText}>{sending ? '...' : 'Gönder'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: '#71717a' },
  listContent: { padding: 16, paddingBottom: 24 },
  empty: { fontSize: 14, color: '#71717a', textAlign: 'center', marginTop: 24 },
  msgRow: { marginBottom: 12 },
  msgRowLeft: { alignItems: 'flex-start' },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  bubbleUser: { backgroundColor: '#e4e4e7', borderBottomLeftRadius: 4 },
  bubbleRestaurant: { backgroundColor: '#15803d', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: '#18181b' },
  bubbleTextWhite: { color: '#fff' },
  bubbleTime: { fontSize: 11, marginTop: 4 },
  bubbleTimeGray: { color: '#71717a' },
  bubbleTimeWhite: { color: 'rgba(255,255,255,0.8)' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, paddingBottom: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e4e4e7', gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 100, backgroundColor: '#f4f4f5', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#18181b' },
  sendBtn: { backgroundColor: '#15803d', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 22, justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: '#a1a1aa', opacity: 0.8 },
  sendBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
