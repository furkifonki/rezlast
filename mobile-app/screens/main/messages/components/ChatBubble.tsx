import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Message } from '../../../../types/messaging';

type Props = {
  message: Message;
  isOwn: boolean;
};

export function ChatBubble({ message, isOwn }: Props) {
  return (
    <View style={[styles.wrapper, isOwn ? styles.wrapperOwn : styles.wrapperOther]}>
      <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
        <Text style={[styles.text, isOwn ? styles.textOwn : styles.textOther]}>{message.text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  wrapperOwn: { justifyContent: 'flex-end' },
  wrapperOther: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: '#15803d',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15 },
  textOwn: { color: '#fff' },
  textOther: { color: '#0f172a' },
});
