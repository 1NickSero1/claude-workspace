import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCategories, getCategoryIdsWithExpenses, searchExpenses, CustomCategory, Expense } from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import { COLORS as _COLORS, FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

const parseDateBoundary = (raw: string, end: boolean): Date | null => {
  const parts = raw.trim().split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts.map(Number);
  if (!d || !m || !y || y < 2000) return null;
  const date = end
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
  return isNaN(date.getTime()) ? null : date;
};

export default function BusquedaScreen() {
  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const [query, setQuery]           = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [fromText, setFromText]     = useState('');
  const [toText, setToText]         = useState('');
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [results, setResults]       = useState<Expense[]>([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    Promise.all([getCategories(), getCategoryIdsWithExpenses()]).then(([cats, usedIds]) => {
      setCategories(cats.filter(c => usedIds.has(c.id)));
    });
  }, []);

  const runSearch = useCallback(async () => {
    setLoading(true);
    const from = parseDateBoundary(fromText, false);
    const to   = parseDateBoundary(toText, true);
    const res = await searchExpenses({
      query:      query.trim() || undefined,
      categoryId: categoryId ?? undefined,
      fromDate:   from ? from.toISOString() : undefined,
      toDate:     to   ? to.toISOString()   : undefined,
    });
    setResults(res);
    setLoading(false);
  }, [query, categoryId, fromText, toText]);

  useEffect(() => {
    const handle = setTimeout(runSearch, 300);
    return () => clearTimeout(handle);
  }, [runSearch]);

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    body: { flex: 1, padding: SPACING.lg },
    searchBox: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.bg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
      paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
    },
    searchInput: { flex: 1, color: COLORS.text, fontSize: FONT.base, paddingVertical: 10 },
    chipsRow: { flexGrow: 0, marginBottom: SPACING.md },
    chip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm, backgroundColor: COLORS.bg },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    dateRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
    dateCol: { flex: 1 },
    dateLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', marginBottom: SPACING.xs },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    resultRow: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
      borderRadius: 14, padding: SPACING.md, marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    },
    resultIcon: { width: 38, height: 38, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    resultBody: { flex: 1 },
    resultName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.sm },
    resultMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    resultAmt: { fontWeight: '800', fontSize: FONT.sm },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: SPACING.sm },
    emptyText: { color: COLORS.textMuted, fontSize: FONT.sm },
  }, moderateScale)), [COLORS, moderateScale]);

  const categoryOptions = [{ id: null as string | null, name: 'Todas', emoji: undefined, icon: 'apps', color: COLORS.textMuted } as any, ...categories];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buscar gastos</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por nombre..."
            placeholderTextColor={COLORS.textDim}
          />
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categoryOptions}
          keyExtractor={item => item.id ?? 'all'}
          style={styles.chipsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setCategoryId(item.id)}
              style={[styles.chip, categoryId === item.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, categoryId === item.id && { color: '#fff' }]}>
                {item.emoji ? `${item.emoji} ` : ''}{item.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.dateRow}>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Desde</Text>
            <TextInput
              style={styles.input}
              value={fromText}
              onChangeText={setFromText}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
          <View style={styles.dateCol}>
            <Text style={styles.dateLabel}>Hasta</Text>
            <TextInput
              style={styles.input}
              value={toText}
              onChangeText={setToText}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={COLORS.textDim}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={32} color={COLORS.textDim} />
                <Text style={styles.emptyText}>Sin resultados</Text>
              </View>
            }
            renderItem={({ item }) => {
              const cat = categories.find(c => c.id === item.categoryId);
              const date = new Date(item.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <View style={styles.resultRow}>
                  <View style={[styles.resultIcon, { backgroundColor: (cat?.color ?? COLORS.textDim) + '22' }]}>
                    {cat?.emoji
                      ? <Text style={{ fontSize: 18 }}>{cat.emoji}</Text>
                      : <Ionicons name={(cat?.icon as any) ?? 'ellipsis-horizontal'} size={18} color={cat?.color ?? COLORS.textMuted} />}
                  </View>
                  <View style={styles.resultBody}>
                    <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.resultMeta}>{cat?.name ?? 'Sin categoría'} · {date}</Text>
                  </View>
                  <Text style={[styles.resultAmt, { color: cat?.color ?? COLORS.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{formatCOP(item.amount)}</Text>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
