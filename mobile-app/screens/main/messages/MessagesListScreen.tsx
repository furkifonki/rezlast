import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useConversations } from '../../../hooks/useConversations';
import { ConversationRow } from './components/ConversationRow';
import type { ConversationWithMeta } from '../../../types/messaging';

type Props = {
  onBack: () => void;
  onOpenChat: (conversationId: string, businessName?: string, messagingDisabled?: boolean) => void;
};

export default function MessagesListScreen({ onBack, onOpenChat }: Props) {
  const { conversations, loading, error, totalUnread, refetch } = useConversations();

  const renderItem = ({ item }: { item: ConversationWithMeta }) => (
    <ConversationRow
      conversation={item}
      onPress={() => {
        const status = (item.reservations as { status?: string } | undefined)?.status;
        const messagingDisabled = status ? !['pending', 'confirmed'].includes(status) : undefined;
        onOpenChat(item.id, item.businessName, messagingDisabled);
      }}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mesajlar</Text>
        {totalUnread > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{totalUnread > 99 ? '99+' : totalUnread}</Text>
          </View>
        )}
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#15803d" />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : conversations.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Henüz sohbet yok</Text>
          <Text style={styles.emptySub}>Rezervasyon detayından restoranla mesajlaşabilirsiniz.</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={['#15803d']} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
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
  headerBadge: {
    backgroundColor: '#dc2626',
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  headerBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { marginTop: 12, fontSize: 15, color: '#64748b' },
  errorText: { fontSize: 15, color: '#dc2626', textAlign: 'center' },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#64748b' },
  emptySub: { marginTop: 8, fontSize: 14, color: '#94a3b8', textAlign: 'center' },
});
