import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LoyaltyScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.hint}>Müşteri puanı ekleme / düşme işlemleri için web panelini kullanın.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f4f5' },
  content: { flex: 1, padding: 16, justifyContent: 'center' },
  hint: { fontSize: 14, color: '#71717a', textAlign: 'center' },
});
