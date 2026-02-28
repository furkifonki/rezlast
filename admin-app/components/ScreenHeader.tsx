import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';

export function ScreenHeader({ title }: { title: string }) {
  const navigation = useNavigation<DrawerNavigationProp<Record<string, unknown>, string>>();
  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.openDrawer()} style={styles.menuBtn} hitSlop={12}>
        <Text style={styles.menuIcon}>☰</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e4e4e7' },
  menuBtn: { marginRight: 12 },
  menuIcon: { fontSize: 22, color: '#3f3f46', fontWeight: '600' },
  title: { fontSize: 16, fontWeight: '600', color: '#3f3f46' },
});
