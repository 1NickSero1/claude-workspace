import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user';
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginVertical: 4,
      paddingHorizontal: 12,
      alignItems: 'flex-end',
    },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    avatar: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      marginRight: 8, marginBottom: 2,
    },
    avatarText: { color: '#fff', fontWeight: '800', fontSize: 10 },
    bubble: {
      maxWidth: '78%', borderRadius: 18,
      paddingHorizontal: 14, paddingVertical: 10,
    },
    aiBubble: {
      backgroundColor: COLORS.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: COLORS.border,
      elevation: 2,
      shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1,
      shadowRadius: 3,
    },
    userBubble: {
      backgroundColor: COLORS.primary,
      borderBottomRightRadius: 4,
      elevation: 2,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    text: { fontSize: FONT.md, lineHeight: 20 },
    aiText: { color: COLORS.text },
    userText: { color: '#FFFFFF' },
  }), [COLORS]);

  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>AI</Text>
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        <Text style={[styles.text, isUser ? styles.userText : styles.aiText]}>{content}</Text>
      </View>
    </View>
  );
}
