import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { COLORS as _COLORS, FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

interface Props {
  role: 'user' | 'assistant';
  content: string;
}

// ── Markdown mínimo: **bold** / *bold*, líneas con • o - como viñeta ──────────

function parseBoldSegments(line: string): { text: string; bold: boolean }[] {
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  const segments: { text: string; bold: boolean }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: line.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1] ?? match[2] ?? '', bold: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), bold: false });
  }
  return segments.length > 0 ? segments : [{ text: line, bold: false }];
}

function renderMarkdownText(
  content: string,
  baseStyle: StyleProp<TextStyle>,
  boldStyle: TextStyle,
): React.ReactNode {
  const lines = content.split('\n');

  return lines.map((line, i) => {
    const bulletMatch = line.match(/^[•-]\s+(.*)$/);
    const isBullet = !!bulletMatch;
    const lineContent = isBullet ? bulletMatch![1] : line;
    const segments = parseBoldSegments(lineContent);

    return (
      <Text key={i} style={baseStyle}>
        {isBullet ? '•  ' : ''}
        {segments.map((seg, j) => (
          <Text key={j} style={seg.bold ? boldStyle : undefined}>{seg.text}</Text>
        ))}
        {i < lines.length - 1 ? '\n' : ''}
      </Text>
    );
  });
}

export default function ChatBubble({ role, content }: Props) {
  const isUser = role === 'user';
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row',
      marginVertical: SPACING.xs,
      paddingHorizontal: SPACING.md,
      alignItems: 'flex-end',
    },
    rowLeft: { justifyContent: 'flex-start' },
    rowRight: { justifyContent: 'flex-end' },
    avatar: {
      width: 32, height: 32, borderRadius: RADIUS.lg,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      marginRight: SPACING.sm, marginBottom: 2,
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
        {renderMarkdownText(
          content,
          [styles.text, isUser ? styles.userText : styles.aiText],
          { fontWeight: '700' },
        )}
      </View>
    </View>
  );
}
