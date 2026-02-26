import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type ProfileMenuCardProps = {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
  destructive?: boolean;
};

export function ProfileMenuCard({ icon, title, description, onPress, destructive }: ProfileMenuCardProps) {
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
        <Text style={[styles.title, destructive && styles.titleDestructive]}>{title}</Text>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDestructive: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  icon: {
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  titleDestructive: {
    color: '#dc2626',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
  },
  chevron: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '300',
  },
  chevronDestructive: {
    color: '#dc2626',
  },
});
