import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getUserProfile, saveUserProfile, UserProfile, BudgetPeriod,
  getMonthData, getCurrentMonthKey, saveBudget, getEffectiveBudget,
  addIncomes, updateIncome, Income, creditCashFromIncome,
} from '@/lib/storage';
import { scheduleRecurringReminder } from '@/lib/notifications';
import { formatCOP, GASTO_HORMIGA_MAX } from '@/lib/expenseParser';
import BudgetFormModal from '@/components/BudgetFormModal';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

const PERIOD_OPTIONS: { id: BudgetPeriod; label: string; icon: string }[] = [
  { id: 'weekly',   label: 'Semanal',   icon: '📆' },
  { id: 'biweekly', label: 'Quincenal', icon: '🗓️' },
  { id: 'monthly',  label: 'Mensual',   icon: '📅' },
];

export default function PersonalizacionScreen() {
  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [budget, setBudget]             = useState<number | null>(null);
  const [budgetModal, setBudgetModal]   = useState(false);
  const [hormigaModal, setHormigaModal] = useState(false);
  const [fixedIncome, setFixedIncome]   = useState<Income | null>(null);
  const [incomeModal, setIncomeModal]   = useState(false);
  const monthKey = getCurrentMonthKey();

  useEffect(() => {
    getUserProfile().then(setProfile);
    getEffectiveBudget(monthKey).then(setBudget);
    getMonthData(monthKey).then(d => {
      setFixedIncome(d.incomes.find(i => i.isRecurring) ?? null);
    });
  }, [monthKey]);

  const handleChangePeriod = async (period: BudgetPeriod) => {
    if (!profile) return;
    const updated = { ...profile, budgetPeriod: period };
    await saveUserProfile(updated);
    setProfile(updated);
  };

  const handleSaveBudget = async (amount: number) => {
    await saveBudget(monthKey, amount);
    setBudget(amount);
    setBudgetModal(false);
  };

  const handleSaveHormigaThreshold = async (amount: number) => {
    if (!profile) return;
    const updated = { ...profile, hormigaThreshold: amount };
    await saveUserProfile(updated);
    setProfile(updated);
    setHormigaModal(false);
  };

  const handleSaveIncome = async (amount: number) => {
    if (fixedIncome) {
      // Ya existe un ingreso fijo este mes — se corrige el monto guardado, y
      // updateIncome ajusta también el depósito de Efectivo que lo fondeó
      // (si tiene fundedCardId) para que el saldo no quede desincronizado.
      await updateIncome(monthKey, { id: fixedIncome.id, amount });
      setFixedIncome({ ...fixedIncome, amount });
    } else {
      // Ingreso fijo nuevo para este mes — mismo flujo que el onboarding:
      // se fondea (o crea) la cuenta de Efectivo y se registra el ingreso
      // con el id de esa cuenta, para poder revertir/ajustar el depósito
      // si el ingreso se edita o se borra más adelante.
      const day = new Date().getDate();
      const quincena: 1 | 2 = day <= 15 ? 1 : 2;
      const notificationId = await scheduleRecurringReminder('Sueldo', 'monthly', new Date());
      const incomeId = `inc_${Date.now()}`;
      const fundedCardId = await creditCashFromIncome(amount, 'Sueldo', incomeId);
      const income: Income = {
        id: incomeId,
        description: 'Sueldo',
        amount,
        quincena,
        createdAt: new Date().toISOString(),
        monthKey,
        isRecurring: true,
        recurrenceFrequency: 'monthly',
        notificationId,
        fundedCardId,
      };
      await addIncomes(monthKey, [income]);
      setFixedIncome(income);
    }
    setIncomeModal(false);
  };

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    scroll: { padding: SPACING.xl, paddingBottom: 40 },

    introCard: {
      backgroundColor: COLORS.primaryBg, borderRadius: 16, padding: SPACING.lg, marginBottom: SPACING.xl,
      borderWidth: 1, borderColor: COLORS.primary + '44',
    },
    introTitle: { color: COLORS.primary, fontWeight: '800', fontSize: FONT.lg, marginBottom: 4 },
    introSub: { color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18 },

    sectionLabel: {
      color: COLORS.textMuted, fontWeight: '700', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: 4,
    },
    section: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden',
      marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
    rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    rowHint: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },

    themeRow: { flexDirection: 'row', gap: SPACING.sm, flex: 1 },
    themeBtn: {
      flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 2,
      borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg, gap: 2,
    },
    themeBtnActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    themeBtnEmoji:      { fontSize: FONT.lg },
    themeBtnText:       { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.xs },
    themeBtnTextActive: { color: COLORS.primary },
  }, moderateScale)), [COLORS, moderateScale]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personaliza tu vida financiera</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <Text style={styles.introTitle}>Ajusta la app a tu manera</Text>
          <Text style={styles.introSub}>
            Aquí defines tus categorías, tu presupuesto y qué cuenta como gasto hormiga —
            para que la app se ajuste a como tú manejas la plata, no al revés.
          </Text>
        </View>

        {/* ── Categorías de gastos ─────────────────────── */}
        <Text style={styles.sectionLabel}>Categorías de gastos</Text>
        <TouchableOpacity style={styles.section} onPress={() => router.push('/categorias')}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="pricetags-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Crear o editar categorías</Text>
              <Text style={styles.rowHint}>Nombre, color y emoji de cada categoría</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>
        </TouchableOpacity>

        {/* ── Periodicidad de cuenta ───────────────────── */}
        <Text style={styles.sectionLabel}>Periodicidad de cuenta</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>Cómo manejas tu dinero</Text>
          </View>
          <View style={[styles.row, styles.rowDivider, { paddingTop: 8 }]}>
            <View style={styles.themeRow}>
              {PERIOD_OPTIONS.map(opt => {
                const active = (profile?.budgetPeriod ?? 'biweekly') === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => handleChangePeriod(opt.id)}
                    style={[styles.themeBtn, active && styles.themeBtnActive]}
                  >
                    <Text style={styles.themeBtnEmoji}>{opt.icon}</Text>
                    <Text style={[styles.themeBtnText, active && styles.themeBtnTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Presupuesto mensual ───────────────────────── */}
        <Text style={styles.sectionLabel}>Presupuesto mensual</Text>
        <TouchableOpacity style={styles.section} onPress={() => setBudgetModal(true)}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="wallet-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>
              {budget && budget > 0 ? formatCOP(budget) : 'Sin configurar'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>
        </TouchableOpacity>

        {/* ── Ingreso fijo mensual ──────────────────────── */}
        <Text style={styles.sectionLabel}>Ingreso fijo mensual</Text>
        <TouchableOpacity style={styles.section} onPress={() => setIncomeModal(true)}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="cash-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>
              {fixedIncome && fixedIncome.amount > 0 ? formatCOP(fixedIncome.amount) : 'Sin configurar'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>
        </TouchableOpacity>

        {/* ── Gasto hormiga ────────────────────────────── */}
        <Text style={styles.sectionLabel}>Gasto hormiga</Text>
        <TouchableOpacity style={styles.section} onPress={() => setHormigaModal(true)}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.warning + '22' }]}>
              <Text style={{ fontSize: 16 }}>🐜</Text>
            </View>
            <Text style={styles.rowLabel}>
              Hasta {formatCOP(profile?.hormigaThreshold ?? GASTO_HORMIGA_MAX)}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      <BudgetFormModal
        visible={budgetModal}
        budget={budget}
        onSave={handleSaveBudget}
        onClose={() => setBudgetModal(false)}
      />

      <BudgetFormModal
        visible={hormigaModal}
        budget={profile?.hormigaThreshold ?? GASTO_HORMIGA_MAX}
        onSave={handleSaveHormigaThreshold}
        onClose={() => setHormigaModal(false)}
        title="Gasto hormiga"
        hint='Gastos por este monto o menos se marcan como "🐜 Hormiga" en vez de mostrar la quincena.'
        placeholder="Ej: 30.000"
        accessibilityLabel="Monto máximo de gasto hormiga"
      />

      <BudgetFormModal
        visible={incomeModal}
        budget={fixedIncome?.amount ?? null}
        onSave={handleSaveIncome}
        onClose={() => setIncomeModal(false)}
        title="Ingreso fijo mensual"
        hint={fixedIncome
          ? 'Corrige el monto de tu ingreso fijo de este mes.'
          : 'Por ejemplo tu salario. Se registra este mes y se fondea tu cuenta de Efectivo con este monto.'}
        placeholder="Ej: 2.500.000"
        accessibilityLabel="Monto de ingreso fijo mensual"
      />
    </SafeAreaView>
  );
}
