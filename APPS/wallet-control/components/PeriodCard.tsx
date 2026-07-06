import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { PeriodInfo } from '@/lib/periodInfo';

interface Props {
  info: PeriodInfo;
}

export default function PeriodCard({ info }: Props) {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: COLORS.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    label: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    days: { fontWeight: '700', fontSize: FONT.base, color: COLORS.primary },
    track: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
  }), [COLORS]);

  const pct = Math.max(0, Math.min(info.progressPct, 100));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>{info.label}</Text>
        <Text style={styles.days}>
          {info.daysRemaining === 0 ? 'Último día' : `${info.daysRemaining} días restantes`}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}
