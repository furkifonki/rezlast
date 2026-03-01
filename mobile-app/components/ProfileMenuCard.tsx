import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type ProfileMenuCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  destructive?: boolean;
  showUnreadDot?: boolean;
};

export function ProfileMenuCard({ icon, title, description, onPress, destructive, showUnreadDot }: ProfileMenuCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, destructive && styles.cardDestructive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
          {showUnreadDot && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Text style={[styles.chevron, destructive && styles.chevronDestructive]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardDestructive: {
    backgroundColor: '#fef2f2',
    shadowColor: '#dc2626',
    shadowOpacity: 0.1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#dc2626',
    marginLeft: 8,
  },
  titleDestructive: {
    color: '#dc2626',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  chevron: {
    fontSize: 26,
    color: '#cbd5e1',
    fontWeight: '400',
  },
  chevronDestructive: {
    color: '#dc2626',
  },
});
