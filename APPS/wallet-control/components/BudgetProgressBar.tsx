import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { formatCOP } from '@/lib/expenseParser';

interface Props {
  budget: number;
  spent: number;
}

export default function BudgetProgressBar({ budget, spent }: Props) {
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
    pct: { fontWeight: '700', fontSize: FONT.base },
    track: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    sub: { color: COLORS.textMuted, fontSize: FONT.sm },
    val: { fontWeight: '700', fontSize: FONT.base, marginTop: 2 },
    budgetLine: { color: COLORS.textDim, fontSize: FONT.sm, marginTop: 8, textAlign: 'center' },
  }), [COLORS]);

  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const remaining = Math.max(budget - spent, 0);

  const barColor =
    pct < 70 ? COLORS.primary :
    pct < 90 ? COLORS.gold :
    COLORS.danger;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Presupuesto mensual</Text>
        <Text style={[styles.pct, { color: barColor }]}>{Math.round(pct)}%</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>

      <View style={styles.footer}>
        <View>
          <Text style={styles.sub}>Gastado</Text>
          <Text style={[styles.val, { color: barColor }]}>{formatCOP(spent)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.sub}>Disponible</Text>
          <Text style={[styles.val, { color: COLORS.primary }]}>{formatCOP(remaining)}</Text>
        </View>
      </View>

      <Text style={styles.budgetLine}>Presupuesto: {formatCOP(budget)}</Text>
    </View>
  );
}
