import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ReservationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rezervasyonlarım</Text>
      <Text style={styles.subtitle}>Rezervasyonlarınız burada listelenecek.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});
