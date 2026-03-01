import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';

const styles = StyleSheet.create({
  wrap: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: '#fff',
    overflow: 'visible',
  },
  bellBadgeWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  bellIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(21, 128, 61, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  bellImage: {
    width: 20,
    height: 20,
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  bellBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
});

export function NotificationBellIcon({ onPress, count = 0 }: { onPress: () => void; count?: number }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.wrap} hitSlop={12} accessibilityLabel="Bildirimler">
      <View style={styles.bellBadgeWrap}>
        <View style={styles.bellIconWrap}>
          <Image source={require('../assets/notification-bell.png')} style={styles.bellImage} resizeMode="contain" />
        </View>
        {count > 0 && (
          <View style={styles.bellBadge}>
            <Text style={styles.bellBadgeText} numberOfLines={1}>
              {count > 9 ? '9+' : count}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
