import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMessages } from '../../../hooks/useMessages';
import { sendMessage } from '../../../lib/messaging';
import { useAuth } from '../../../contexts/AuthContext';
import { ChatBubble } from './components/ChatBubble';
import { ChatInput } from './components/ChatInput';
import type { Message } from '../../../types/messaging';

type Props = {
  conversationId: string;
  businessName?: string;
  messagingDisabled?: boolean;
  onBack: () => void;
};

export default function ChatScreen({
  conversationId,
  businessName = 'Restoran',
  messagingDisabled,
  onBack,
}: Props) {
  const { session } = useAuth();
  const { messages, loading, error } = useMessages(conversationId);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async (text: string) => {
    if (!session?.user?.id || messagingDisabled) return;
    await sendMessage(conversationId, text, 'user', session.user.id);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <ChatBubble message={item} isOwn={item.sender_type === 'user'} />
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{businessName}</Text>
        {messagingDisabled && (
          <Text style={styles.disabledHint}>Mesajlaşma kapalı</Text>
        )}
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>Henüz mesaj yok. İlk mesajı siz atın.</Text>
              </View>
            }
          />
          <ChatInput
            onSend={handleSend}
            disabled={messagingDisabled}
            placeholder={messagingDisabled ? 'Bu rezervasyon için mesajlaşma kapalı.' : 'Mesaj yazın...'}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backBtnText: { fontSize: 22, color: '#15803d', fontWeight: '600' },
  title: { flex: 1, fontSize: 18, fontWeight: '600', color: '#0f172a' },
  disabledHint: { fontSize: 12, color: '#94a3b8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 15, color: '#dc2626' },
  listContent: { padding: 12, paddingBottom: 16 },
  empty: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#94a3b8' },
});
