import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { Expense, CustomCategory, DEFAULT_CATEGORIES } from '@/lib/storage';
import { formatCOP, sumExpenses } from '@/lib/expenseParser';

interface Props {
  expenses: Expense[];
  categories?: CustomCategory[];
}

function getCat(id: string, cats: CustomCategory[]) {
  return cats.find(c => c.id === id) ?? DEFAULT_CATEGORIES.find(c => c.id === id) ?? DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1];
}

export default function ExpenseExtractCard({ expenses, categories = [] }: Props) {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    card: {
      backgroundColor: COLORS.card, borderRadius: 14,
      marginHorizontal: 12, marginVertical: 6, padding: 14,
      borderWidth: 1, borderColor: COLORS.primary + '44',
    },
    header: {
      color: COLORS.primary, fontSize: FONT.sm, fontWeight: '700',
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
    },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
    info: { flex: 1 },
    name: { color: COLORS.text, fontWeight: '600', fontSize: FONT.md },
    cat: { color: COLORS.textMuted, fontSize: FONT.sm },
    amount: { fontWeight: '700', fontSize: FONT.md },
    divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { color: COLORS.textMuted, fontSize: FONT.sm },
    totalAmt: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.base },
  }), [COLORS]);

  if (!expenses.length) return null;
  const allCats = categories.length ? categories : DEFAULT_CATEGORIES;
  const total = sumExpenses(expenses);

  return (
    <View style={styles.card}>
      <Text style={styles.header}>Gastos registrados</Text>
      {expenses.map(e => {
        const cat = getCat(e.categoryId, allCats)!;
        return (
          <View key={e.id} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: cat.color }]} />
            <View style={styles.info}>
              <Text style={styles.name}>{e.name}</Text>
              <Text style={styles.cat}>{cat.name} · Q{e.quincena}</Text>
            </View>
            <Text style={[styles.amount, { color: cat.color }]}>{formatCOP(e.amount)}</Text>
          </View>
        );
      })}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total registrado</Text>
        <Text style={styles.totalAmt}>{formatCOP(total)}</Text>
      </View>
    </View>
  );
}
