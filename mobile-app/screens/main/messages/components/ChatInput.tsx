import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

type Props = {
  onSend: (text: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({ onSend, disabled, placeholder = 'Mesaj yazın...' }: Props) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    try {
      await onSend(trimmed);
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        multiline
        maxLength={2000}
        editable={!disabled && !sending}
      />
      <TouchableOpacity
        style={[styles.sendBtn, (!text.trim() || sending || disabled) && styles.sendBtnDisabled]}
        onPress={handleSend}
        disabled={!text.trim() || sending || disabled}
        activeOpacity={0.7}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.sendBtnText}>Gönder</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
    minHeight: 40,
  },
  sendBtnDisabled: { backgroundColor: '#94a3b8', opacity: 0.8 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
