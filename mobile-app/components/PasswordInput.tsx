import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  editable?: boolean;
  style?: object;
  accessibilityLabel?: string;
};

export function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Şifre',
  editable = true,
  style,
  accessibilityLabel = 'Şifre alanı',
}: Props) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, style]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        editable={editable}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={visible ? 'Şifre görünür. Gizlemek için dokunun.' : 'Şifre gizli. Göstermek için dokunun.'}
      />
      <TouchableOpacity
        style={styles.eye}
        onPress={() => setVisible((v) => !v)}
        accessibilityLabel={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        accessibilityRole="button"
      >
        <Text style={styles.eyeText}>{visible ? '🙈' : '👁'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingRight: 48,
    fontSize: 16,
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  eye: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    minWidth: 32,
  },
  eyeText: { fontSize: 20 },
});
