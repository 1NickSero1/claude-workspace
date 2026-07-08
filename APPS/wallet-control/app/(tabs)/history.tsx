import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import {
  getAllMonthKeys, getMonthData, getCategories,
  formatMonthLabel, CustomCategory, MonthData,
  sumIncomes,
} from '@/lib/storage';
import { sumExpenses, formatCOP } from '@/lib/expenseParser';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

interface MonthSummary {
  key: string;
  data: MonthData;
}

interface TrendPoint {
  label: string;
  ingresos: number;
  gastos: number;
  ahorro: number;
}

export default function HistoryScreen() {
  const { width: SCREEN_W, moderateScale } = useResponsive();
  const [months, setMonths]         = useState<MonthSummary[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);
  const [trend, setTrend]           = useState<TrendPoint[]>([]);

  const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  const load = useCallback(async () => {
    setLoading(true);
    const [keys, cats] = await Promise.all([getAllMonthKeys(), getCategories()]);
    const summaries = await Promise.all(keys.map(async key => ({
      key,
      data: await getMonthData(key),
    })));
    const filtered = summaries.filter(m => m.data.expenses.length > 0 || m.data.incomes.length > 0);
    setMonths(filtered);
    setCategories(cats);

    // Build trend data from last 6 months with data
    const trendPoints = filtered
      .slice().sort((a, b) => a.key.localeCompare(b.key))
      .slice(-6)
      .map(({ key, data }) => {
        const [, month] = key.split('-');
        const gastos   = sumExpenses(data.expenses);
        const ingresos = sumIncomes(data.incomes);
        return {
          label:    MONTH_SHORT[parseInt(month) - 1],
          ingresos: Math.round(ingresos / 1000),
          gastos:   Math.round(gastos / 1000),
          ahorro:   Math.max(0, Math.round((ingresos - gastos) / 1000)),
        };
      });
    setTrend(trendPoints);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const COLORS = useColors();

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
      backgroundColor: COLORS.bg,
    },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl },
    headerSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    searchBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
    scroll: { paddingHorizontal: 16, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 80, gap: 10 },
    emptyText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
    monthCard: {
      backgroundColor: COLORS.card, borderRadius: 18, padding: 16, marginBottom: 12,
      elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    monthLeft: { flex: 1 },
    monthLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, textTransform: 'capitalize' },
    monthBadges: { flexDirection: 'row', gap: 6, marginTop: 6 },
    badge: {
      backgroundColor: COLORS.bg, borderRadius: 8,
      paddingHorizontal: 8, paddingVertical: 3,
      borderWidth: 1, borderColor: COLORS.border,
    },
    badgeGreen: { borderColor: COLORS.debit + '55', backgroundColor: COLORS.debitBg },
    badgeText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    monthRight: { alignItems: 'flex-end' },
    monthTotal: { fontWeight: '800', fontSize: FONT.lg },
    monthSavings: { fontSize: FONT.sm, fontWeight: '600', marginTop: 2 },
    monthDetail: {
      marginTop: 16, paddingTop: 16,
      borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    detailSummary: {
      flexDirection: 'row', backgroundColor: COLORS.bg,
      borderRadius: 12, padding: 12, marginBottom: 16,
      borderWidth: 1, borderColor: COLORS.border,
    },
    detailStat: { flex: 1, alignItems: 'center' },
    detailStatLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
    detailStatVal: { fontWeight: '700', fontSize: FONT.base },
    detailSectionLabel: {
      color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: 10, marginTop: 4,
    },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    catDot: {
      width: 28, height: 28, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    catInfo: { flex: 1 },
    catInfoTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    catName: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
    catAmt: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '700' },
    catTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden' },
    catFill: { height: '100%', borderRadius: 2 },
    incomeRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    incomeDesc: { flex: 1, color: COLORS.text, fontSize: FONT.sm },
    incomeAmt: { color: COLORS.debit, fontWeight: '700', fontSize: FONT.sm },
    trendCard: {
      backgroundColor: COLORS.card, marginHorizontal: 16, marginBottom: 8,
      borderRadius: 18, paddingTop: 16, paddingBottom: 8,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4,
    },
    trendTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base, paddingHorizontal: 16, marginBottom: 8 },
    trendChart: { borderRadius: 12, alignSelf: 'center' },
    trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 10 },
    trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    trendDot: { width: 10, height: 10, borderRadius: 5 },
    trendLegendText: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
  }, moderateScale)), [COLORS, moderateScale]);

  const getCat = (id: string) => categories.find(c => c.id === id);

  const toggle = (key: string) => setExpanded(prev => prev === key ? null : key);

  if (loading) return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Historial</Text>
          <Text style={styles.headerSub}>Todos tus meses</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/busqueda')}
          style={styles.searchBtn}
          accessibilityRole="button"
          accessibilityLabel="Buscar"
        >
          <Ionicons name="search" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {trend.length >= 2 && (
        <View style={styles.trendCard}>
          <Text style={styles.trendTitle}>Tendencia últimos {trend.length} meses</Text>
          <LineChart
            data={{
              labels: trend.map(t => t.label),
              datasets: [
                { data: trend.map(t => t.ingresos), color: () => COLORS.debit, strokeWidth: 2 },
                { data: trend.map(t => t.gastos),   color: () => COLORS.credit, strokeWidth: 2 },
                { data: trend.map(t => t.ahorro),   color: () => COLORS.primary, strokeWidth: 2 },
              ],
              legend: ['Ingresos', 'Gastos', 'Ahorro'],
            }}
            width={SCREEN_W - 32}
            height={180}
            chartConfig={{
              backgroundColor: COLORS.card,
              backgroundGradientFrom: COLORS.card,
              backgroundGradientTo: COLORS.card,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(108,92,231,${opacity})`,
              labelColor: () => COLORS.textMuted,
              propsForDots: { r: '3' },
              propsForBackgroundLines: { stroke: COLORS.border },
            }}
            bezier
            withInnerLines
            withOuterLines={false}
            style={styles.trendChart}
            formatYLabel={v => `$${v}k`}
          />
          <View style={styles.trendLegend}>
            {[
              { label: 'Ingresos', color: COLORS.debit },
              { label: 'Gastos', color: COLORS.credit },
              { label: 'Ahorro', color: COLORS.primary },
            ].map(item => (
              <View key={item.label} style={styles.trendLegendItem}>
                <View style={[styles.trendDot, { backgroundColor: item.color }]} />
                <Text style={styles.trendLegendText}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {months.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={48} color={COLORS.textDim} />
            <Text style={styles.emptyText}>Sin historial todavía</Text>
            <Text style={styles.emptyHint}>
              Registra tus gastos en Finando y aparecerán aquí
            </Text>
          </View>
        ) : (
          months.map(({ key, data }) => {
            const totalExp = sumExpenses(data.expenses);
            const totalInc = sumIncomes(data.incomes);
            const savings  = totalInc - totalExp;
            const isOpen   = expanded === key;

            const catTotals = data.expenses.reduce<Record<string, number>>((acc, e) => {
              acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
              return acc;
            }, {});
            const topCats = Object.entries(catTotals)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5);

            return (
              <TouchableOpacity
                key={key}
                onPress={() => toggle(key)}
                style={styles.monthCard}
                activeOpacity={0.85}
              >
                <View style={styles.monthHeader}>
                  <View style={styles.monthLeft}>
                    <Text style={styles.monthLabel}>{formatMonthLabel(key)}</Text>
                    <View style={styles.monthBadges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{data.expenses.length} gastos</Text>
                      </View>
                      {data.incomes.length > 0 && (
                        <View style={[styles.badge, styles.badgeGreen]}>
                          <Text style={[styles.badgeText, { color: COLORS.debit }]}>
                            {data.incomes.length} ingresos
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.monthRight}>
                    <Text style={[styles.monthTotal, { color: COLORS.credit }]}>
                      -{formatCOP(totalExp)}
                    </Text>
                    {totalInc > 0 && (
                      <Text style={[styles.monthSavings, {
                        color: savings >= 0 ? COLORS.debit : COLORS.credit,
                      }]}>
                        {savings >= 0 ? '↑' : '↓'} {formatCOP(Math.abs(savings))}
                      </Text>
                    )}
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={COLORS.textMuted}
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.monthDetail}>
                    {totalInc > 0 && (
                      <View style={styles.detailSummary}>
                        <View style={styles.detailStat}>
                          <Text style={styles.detailStatLabel}>Ingresos</Text>
                          <Text style={[styles.detailStatVal, { color: COLORS.debit }]}>
                            {formatCOP(totalInc)}
                          </Text>
                        </View>
                        <View style={styles.detailStat}>
                          <Text style={styles.detailStatLabel}>Gastos</Text>
                          <Text style={[styles.detailStatVal, { color: COLORS.credit }]}>
                            {formatCOP(totalExp)}
                          </Text>
                        </View>
                        <View style={styles.detailStat}>
                          <Text style={styles.detailStatLabel}>Ahorro</Text>
                          <Text style={[styles.detailStatVal, {
                            color: savings >= 0 ? COLORS.debit : COLORS.credit,
                          }]}>
                            {formatCOP(Math.abs(savings))}
                          </Text>
                        </View>
                      </View>
                    )}

                    {topCats.length > 0 && (
                      <>
                        <Text style={styles.detailSectionLabel}>Top categorías</Text>
                        {topCats.map(([catId, amount]) => {
                          const cat = getCat(catId);
                          const pct = totalExp > 0 ? (amount / totalExp) * 100 : 0;
                          return (
                            <View key={catId} style={styles.catRow}>
                              <View style={[styles.catDot, {
                                backgroundColor: (cat?.color ?? COLORS.textDim) + '33',
                              }]}>
                                <Ionicons
                                  name={(cat?.icon ?? 'ellipsis-horizontal') as any}
                                  size={13}
                                  color={cat?.color ?? COLORS.textDim}
                                />
                              </View>
                              <View style={styles.catInfo}>
                                <View style={styles.catInfoTop}>
                                  <Text style={styles.catName}>{cat?.name ?? catId}</Text>
                                  <Text style={styles.catAmt}>{formatCOP(amount)}</Text>
                                </View>
                                <View style={styles.catTrack}>
                                  <View style={[styles.catFill, {
                                    width: `${Math.min(pct, 100)}%`,
                                    backgroundColor: cat?.color ?? COLORS.textDim,
                                  }]} />
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </>
                    )}

                    {data.incomes.length > 0 && (
                      <>
                        <Text style={styles.detailSectionLabel}>Ingresos del mes</Text>
                        {data.incomes.map(inc => (
                          <View key={inc.id} style={styles.incomeRow}>
                            <Ionicons name="arrow-down-circle" size={16} color={COLORS.debit} />
                            <Text style={styles.incomeDesc} numberOfLines={1}>{inc.description}</Text>
                            <Text style={styles.incomeAmt}>{formatCOP(inc.amount)}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

