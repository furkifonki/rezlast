import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ConversationWithMeta } from '../../../../types/messaging';

type Props = {
  conversation: ConversationWithMeta;
  onPress: () => void;
};

export function ConversationRow({ conversation, onPress }: Props) {
  const name = conversation.businessName ?? '—';
  const date = conversation.reservationDate ?? '';
  const time = conversation.reservationTime ?? '';
  const sub = [date, time].filter(Boolean).join(' · ') || 'Rezervasyon';
  const last = conversation.lastMessageText;
  const unread = conversation.unreadCount ?? 0;

  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.main}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
        {last ? (
          <Text style={styles.preview} numberOfLines={1}>{last}</Text>
        ) : null}
      </View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 2 },
  sub: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  preview: { fontSize: 14, color: '#94a3b8' },
  badge: {
    backgroundColor: '#dc2626',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
