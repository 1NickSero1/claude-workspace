import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMonthData, getCategories, getCards,
  getGoals, saveGoal, deleteGoal, addGoalDeposit, deleteGoalDeposit,
  saveBudgetNotified,
  getCurrentMonthKey, formatMonthLabel, getUserProfile,
  getPreviousMonthKey, getShowBalanceNotification, computeNetWorth,
  getRecurringTemplates, RecurringTemplate,
  syncCardBalanceSnapshot, getCardBalanceSnapshot,
  CustomCategory, Expense, Card, Goal, GoalDeposit, Income, UserProfile,
  getCardTotalSpent, sumIncomes,
} from '@/lib/storage';
import { sumExpenses, formatCOP, formatThousands } from '@/lib/expenseParser';
import { checkBudgetThreshold, updateBalanceNotification } from '@/lib/notifications';
import DonutChart, { DonutSlice } from '@/components/DonutChart';
import QuickEntryModal from '@/components/QuickEntryModal';
import BudgetProgressBar from '@/components/BudgetProgressBar';
import SemanaCard from '@/components/SemanaCard';
import MesCard from '@/components/MesCard';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildFinancialReportHtml, buildBankStatementHtml } from '@/lib/financialReport';
import { LineChart } from 'react-native-chart-kit';

const GOAL_COLORS = ['#6C5CE7','#00C896','#FF5C5C','#FDCB6E','#0984E3','#A29BFE','#00B894','#E17055'];
const INCOME_COLORS = ['#00C896','#0984E3','#6C5CE7','#FDCB6E','#00B894','#A29BFE','#E17055','#FF5C5C'];
const MONTH_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const shortMonthLabel = (monthKey: string) => MONTH_SHORT[parseInt(monthKey.split('-')[1], 10) - 1];
const fmtShort = (n: number) => n >= 1_000_000 ? `$${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${Math.round(n/1_000)}k` : formatCOP(n);
const GOAL_EMOJI_OPTIONS = [
  '🎯','✈️','🏠','🚗','💍','📱','💻','🎓','🏋️','🌴',
  '🐕','👶','💰','🎸','🏄','🎮','🌎','🏆','💎','🎁',
  '🚀','🌟','🍕','📸','🎭','🛥️','🎪','🌺','🏔️','🎨',
];

export default function ResumenScreen() {
  const { width: SCREEN_W, moderateScale } = useResponsive();
  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [incomes, setIncomes]       = useState<Income[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [cards, setCards]           = useState<Card[]>([]);
  const [goals, setGoals]           = useState<Goal[]>([]);
  const [budget, setBudget]         = useState<number | null>(null);
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [prevExpenses, setPrevExpenses] = useState<Expense[]>([]);
  const [prevIncomes, setPrevIncomes]   = useState<Income[]>([]);
  const [prevCards, setPrevCards]       = useState<Card[] | null>(null);
  const [recurringTemplates, setRecurringTemplates] = useState<RecurringTemplate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [goalModal, setGoalModal]   = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Goal detail modal
  const [goalDetailVisible, setGoalDetailVisible] = useState(false);
  const [goalDetailTarget, setGoalDetailTarget]   = useState<Goal | null>(null);

  // Quick entry modal
  const [quickEntry, setQuickEntry]         = useState(false);
  const [summaryModal, setSummaryModal]     = useState(false);
  const [exporting, setExporting]           = useState(false);
  const [exportingStatement, setExportingStatement] = useState(false);
  const [registrarSheet, setRegistrarSheet] = useState(false);
  const [helpSheet, setHelpSheet]           = useState(false);
  const [patrimonioModal, setPatrimonioModal] = useState(false);
  const [metasModal, setMetasModal]         = useState(false);
  const [ingresosModal, setIngresosModal]   = useState(false);
  const [pendingModal, setPendingModal]     = useState(false);
  const [trendModal, setTrendModal]         = useState(false);
  const [activeDot, setActiveDot]           = useState(0);
  const [balanceDot, setBalanceDot]         = useState(1);
  const [viewedQuincena, setViewedQuincena] = useState<1 | 2>(() => (new Date().getDate() <= 15 ? 1 : 2));

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const html = buildFinancialReportHtml(monthKey, expenses, incomes, categories, goals);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Reporte Wallet Control', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF Generado', `Guardado en:\n${uri}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportBankStatement = async () => {
    setExportingStatement(true);
    try {
      const html = buildBankStatementHtml(monthKey, expenses, incomes, categories);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Extracto Wallet Control', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('PDF Generado', `Guardado en:\n${uri}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo generar el extracto.');
    } finally {
      setExportingStatement(false);
    }
  };

  const monthKey = getCurrentMonthKey();
  const prevMonthKey = getPreviousMonthKey(monthKey);

  const load = useCallback(async () => {
    const [d, cats, c, gs, p, prevData, recurring, prevSnapshot] = await Promise.all([
      getMonthData(monthKey), getCategories(), getCards(), getGoals(), getUserProfile(),
      getMonthData(prevMonthKey), getRecurringTemplates(), getCardBalanceSnapshot(prevMonthKey),
    ]);
    setExpenses(d.expenses);
    setIncomes(d.incomes);
    setCategories(cats);
    setCards(c);
    setGoals(gs);
    setProfile(p);
    setBudget(d.budget);
    setPrevExpenses(prevData.expenses);
    setPrevIncomes(prevData.incomes);
    setRecurringTemplates(recurring);
    setPrevCards(prevSnapshot);
    await syncCardBalanceSnapshot(monthKey, c);

    if (d.budget && d.budget > 0) {
      const notified = d.budgetNotified ?? 0;
      const newNotified = await checkBudgetThreshold(sumExpenses(d.expenses), d.budget, notified);
      if (newNotified !== notified) await saveBudgetNotified(monthKey, newNotified);
    }

    if (await getShowBalanceNotification()) {
      const { patrimonioNeto } = computeNetWorth(d.expenses, c);
      await updateBalanceNotification(patrimonioNeto);
    }
  }, [monthKey, prevMonthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSaveGoal = async (goal: Goal) => {
    await saveGoal(goal); setGoalModal(false); setEditingGoal(null); await load();
  };
  const handleDeleteGoal = (goal: Goal) =>
    Alert.alert('Eliminar meta', `¿Eliminar "${goal.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive',
        onPress: async () => { await deleteGoal(goal.id); await load(); } },
    ]);

  // Debit / Credit classification
  const cardTypeMap = new Map(cards.map(c => [c.id, c.type]));
  let creditSpent = 0;
  for (const e of expenses) {
    const type = e.cardId ? cardTypeMap.get(e.cardId) : 'debit';
    if (type === 'credit') creditSpent += e.amount;
  }

  const totalSpent  = sumExpenses(expenses);
  const totalIncome = sumIncomes(incomes);
  const savings     = totalIncome - totalSpent;
  const savingsPct  = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  const debitAvailable = cards
    .filter(c => c.type === 'debit' && c.balance != null)
    .reduce((s, c) => s + Math.max(c.balance! - getCardTotalSpent(expenses, c.id), 0), 0);

  // Balance General (patrimonio neto)
  const cashAvailable  = cards.filter(c => c.type === 'cash')
    .reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const debtTotal      = cards.filter(c => c.type === 'debt')
    .reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalActivos   = debitAvailable + cashAvailable;
  const totalPasivos   = creditSpent + debtTotal;
  const patrimonioNeto = totalActivos - totalPasivos;

  // Mes anterior: usa el snapshot de saldos guardado ese mes (syncCardBalanceSnapshot
  // en load()); si no existe (meses previos a que existiera esta función), cae
  // de vuelta a los saldos actuales como aproximación.
  const { totalActivos: prevTotalActivos, totalPasivos: prevTotalPasivos, patrimonioNeto: prevPatrimonioNeto } =
    computeNetWorth(prevExpenses, prevCards ?? cards);

  const prevTotalSpent = sumExpenses(prevExpenses);

  const totalSaved     = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget    = goals.reduce((s, g) => s + g.targetAmount, 0);
  const goalsCompleted = goals.filter(g => g.savedAmount >= g.targetAmount).length;
  const globalGoalPct  = totalTarget > 0 ? Math.min((totalSaved / totalTarget) * 100, 100) : 0;

  // Per-category breakdown
  const catBreakdown = (catId: string) => {
    let deb = 0, cre = 0;
    for (const e of expenses) {
      if (e.categoryId !== catId) continue;
      const type = e.cardId ? cardTypeMap.get(e.cardId) : 'debit';
      if (type === 'credit') cre += e.amount; else deb += e.amount;
    }
    return { deb, cre, total: deb + cre };
  };

  const catRows = categories
    .map(cat => ({ cat, ...catBreakdown(cat.id) }))
    .filter(r => r.total > 0 || !r.cat.isDefault)
    .sort((a, b) => b.total - a.total);

  // Donut chart slices: one per category with expenses
  const donutData: DonutSlice[] = catRows
    .filter(r => r.total > 0)
    .map(r => ({ id: r.cat.id, color: r.cat.color, amount: r.total }));

  const donutSize = Math.min(Math.floor((SCREEN_W - 32) * 0.55), 200);
  const cardWidth = SCREEN_W - 32;

  const activoItems = [
    ...cards.filter(c => c.type === 'debit').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '🏦', color: c.color, value: Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0) })),
    ...cards.filter(c => c.type === 'cash').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💵', color: c.color, value: Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0) })),
  ];
  const pasivoItems = [
    ...cards.filter(c => c.type === 'credit').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💳', color: c.color, value: getCardTotalSpent(expenses, c.id) })),
    ...cards.filter(c => c.type === 'debt').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💸', color: c.color, value: c.balance ?? 0 })),
  ];

  const goalsDonutData: DonutSlice[] = goals
    .filter(g => g.savedAmount > 0 && g.targetAmount > 0)
    .map(g => ({ id: g.id, color: g.color, amount: g.savedAmount }));

  const incomesDonutData: DonutSlice[] = incomes.map((inc, i) => ({
    id: inc.id, color: INCOME_COLORS[i % INCOME_COLORS.length], amount: inc.amount,
  }));

  // ── Balance (donut de cuentas, reemplaza las cards Débito/Crédito) ───────
  const balanceItems = [...activoItems, ...pasivoItems].filter(it => it.value > 0);
  const balanceDonutData: DonutSlice[] = balanceItems.map(it => ({ id: it.id, color: it.color, amount: it.value }));
  const totalBalance = balanceItems.reduce((s, it) => s + it.value, 0);

  // ── Tendencia últimos 2 meses (popup de "vs. mes anterior") ───────────────
  const prevTotalIncome = sumIncomes(prevIncomes);
  const trendPoints = [
    {
      label: shortMonthLabel(prevMonthKey),
      ingresos: Math.round(prevTotalIncome / 1000),
      gastos: Math.round(prevTotalSpent / 1000),
      ahorro: Math.max(0, Math.round((prevTotalIncome - prevTotalSpent) / 1000)),
    },
    {
      label: shortMonthLabel(monthKey),
      ingresos: Math.round(totalIncome / 1000),
      gastos: Math.round(totalSpent / 1000),
      ahorro: Math.max(0, Math.round(savings / 1000)),
    },
  ];

  // ── Categorías fijas pendientes por pagar en el periodo activo ────────────
  // Se compara contra los gastos recurrentes ya registrados alguna vez
  // (onboarding o toggle "Gasto recurrente"), no contra un umbral inventado.
  const today = new Date();
  const day = today.getDate();
  const dow = today.getDay();
  const mondayIndex = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayIndex);
  const currentQuincena: 1 | 2 = day <= 15 ? 1 : 2;
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

  const period = profile?.budgetPeriod ?? 'biweekly';
  // Para quincenal, el popup de pendientes refleja la quincena que el
  // usuario está mirando en el slider (no siempre la de hoy).
  const periodLabel = period === 'weekly' ? 'esta semana' : period === 'monthly' ? 'este mes' : `la quincena ${viewedQuincena}`;

  const expensesInPeriodWindow = period === 'weekly'
    ? expenses.filter(e => new Date(e.createdAt).getTime() >= weekStart.getTime())
    : period === 'monthly'
    ? expenses
    : expenses.filter(e => e.quincena === viewedQuincena);

  const loggedNames = new Set(expensesInPeriodWindow.map(e => e.name.trim().toLowerCase()));
  const pendingTemplates = recurringTemplates.filter(t => !loggedNames.has(t.name.trim().toLowerCase()));

  // Progreso de fechas + gasto de cada quincena (para el slider Quincena 1/2)
  const quincenaSpent = (q: 1 | 2) => expenses.filter(e => e.quincena === q).reduce((s, e) => s + e.amount, 0);
  const quincenaProgress = (q: 1 | 2) => {
    if (q === 1) return day > 15 ? 100 : (day / 15) * 100;
    const span = lastDayOfMonth - 15;
    return day <= 15 ? 0 : ((day - 15) / span) * 100;
  };

  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, backgroundColor: COLORS.bg },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl },
    headerSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2, textTransform: 'capitalize' },
    headerRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: COLORS.primaryBg, borderRadius: 22, paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1.5, borderColor: COLORS.primary + '55' },
    headerBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    headerBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 13 },
    headerBtnEmoji: { fontSize: 16 },
    scroll: { paddingBottom: 100 },
    heroCard: {
      marginHorizontal: 16, marginBottom: 20,
      backgroundColor: COLORS.card, borderRadius: 24, paddingVertical: 20, paddingHorizontal: 16,
      alignItems: 'center',
      elevation: 3, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
    },
    pillsRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
    pill: {
      flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14,
    },
    pillIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    pillLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
    pillValue: { fontWeight: '800', fontSize: FONT.xl, color: '#fff' },
    donutTap: { alignItems: 'center' },
    donutSlider: { marginHorizontal: -16, marginTop: 14 },
    donutSlide: { alignItems: 'center', paddingVertical: 8 },
    heroDonutLabel: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
    dotRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.border },
    dotActive: { width: 18, backgroundColor: COLORS.primary },
    goalsEmojiLegend: { flexDirection: 'row', gap: 12, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' },
    goalsEmojiItem: { alignItems: 'center', gap: 4 },
    goalsEmojiChar: { fontSize: 18 },
    goalsEmojiBar: { width: 12, height: 3, borderRadius: 2 },
    incomeLegend: { width: '100%', paddingHorizontal: 20, marginTop: 10, gap: 4 },
    incomeLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    incomeLegendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
    incomeLegendName: { flex: 1, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },
    incomeLegendAmt: { color: COLORS.debit, fontWeight: '700', fontSize: 11 },
    heroGoalsWidget: { marginTop: 12 },
    heroGoalsDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 10 },
    heroGoalsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    heroGoalsLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', width: 56 },
    heroGoalsBarWrap: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    heroGoalsBarFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 3 },
    heroGoalsPct: { color: COLORS.primary, fontWeight: '800', fontSize: 12, width: 36, textAlign: 'right' },
    heroGoalsStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, paddingLeft: 64 },
    heroGoalsSaved: { color: COLORS.debit, fontSize: 11, fontWeight: '700' },
    heroGoalsOf: { color: COLORS.textMuted, fontSize: 11 },
    budgetWrap: { marginHorizontal: 16, marginBottom: 20 },
    heroBudgetWrap: { width: '100%', marginTop: 14 },
    quincenaSlider: { marginHorizontal: -16 },
    balanceSlider: { marginHorizontal: -16 },
    quincenaCardBox: {
      marginHorizontal: 16,
      backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: COLORS.border,
    },
    quincenaCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    quincenaCardLabel: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    quincenaBadge: { backgroundColor: COLORS.primaryBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
    quincenaBadgeText: { color: COLORS.primary, fontWeight: '700', fontSize: 10 },
    quincenaCardSpent: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 8 },
    quincenaCardTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
    quincenaCardFill: { height: '100%', borderRadius: 4, backgroundColor: COLORS.primary },
    gastosCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      marginHorizontal: 16, marginBottom: 24,
      backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: COLORS.border,
    },
    gastosCardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.creditBg, alignItems: 'center', justifyContent: 'center' },
    gastosCardTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    gastosCardSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
    summaryCard: { flex: 1, borderRadius: 18, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6 },
    summaryCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    summaryCardIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
    summaryCardType: { color: 'rgba(255,255,255,0.95)', fontWeight: '700', fontSize: FONT.sm },
    summaryLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 2 },
    summaryAmount: { color: '#fff', fontWeight: '800', fontSize: FONT.lg, marginBottom: 8 },
    summaryLabel2: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginBottom: 2 },
    summaryAvailable: { color: '#fff', fontWeight: '700', fontSize: FONT.base },
    summaryHint: { color: 'rgba(255,255,255,0.65)', fontSize: 10, marginTop: 6, lineHeight: 14 },
    section: { paddingHorizontal: 16, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    sectionHint: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 14, marginTop: -8 },
    sectionAddBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
    goalCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 4 },
    goalDot: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
    goalBody: { flex: 1 },
    goalTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    goalName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    goalPct: { fontWeight: '700', fontSize: FONT.sm },
    goalTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
    goalFill: { height: '100%', borderRadius: 4 },
    goalBottomRow: { flexDirection: 'row', justifyContent: 'space-between' },
    goalSaved: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    goalTarget: { color: COLORS.textMuted, fontSize: FONT.sm },
    goalDeadline: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 4 },
    emptyGoal: { alignItems: 'center', paddingVertical: 32, gap: 8, borderWidth: 2, borderColor: COLORS.border, borderStyle: 'dashed', borderRadius: 16, marginBottom: 16 },
    emptyGoalText: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
    emptyState: { alignItems: 'center', paddingVertical: 48, gap: 10 },
    emptyText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm },
    patrimonioCard: {
      marginHorizontal: 16, marginBottom: 20,
      backgroundColor: COLORS.card, borderRadius: 18, padding: 18,
      borderLeftWidth: 4,
      elevation: 3, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 1, shadowRadius: 6,
    },
    patrimonioHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    patrimonioTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.base },
    patrimonioColumns: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    patrimonioLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 4 },
    patrimonioVal: { fontWeight: '700', fontSize: FONT.md },
    patrimonioDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    patrimonioNetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    patrimonioNetLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    patrimonioNetVal: { fontWeight: '800', fontSize: FONT.xl },
    goalsTotalBox: {
      backgroundColor: COLORS.primaryBg, borderRadius: 14, padding: 14,
      marginBottom: 14, borderWidth: 1, borderColor: COLORS.primary + '33',
    },
    goalsTotalAmtRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
    goalsTotalSaved: { color: COLORS.debit, fontWeight: '800', fontSize: FONT.lg },
    goalsTotalOf: { color: COLORS.textMuted, fontSize: FONT.sm },
    goalsTotalBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
    goalsTotalFill: { height: '100%', borderRadius: 3, backgroundColor: COLORS.primary },
    summaryOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    summaryDismiss: { flex: 1 },
    summarySheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28, maxHeight: '82%' },
    summaryHandle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
    summaryTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: 14 },
    summaryHeaderRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
    summaryStatBox: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', gap: 3 },
    summaryStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
    summaryStatVal: { color: '#fff', fontWeight: '800', fontSize: FONT.base },
    summaryStatEmoji: { fontSize: 18, marginBottom: 2 },
    summarySectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, borderBottomWidth: 2, borderBottomColor: COLORS.primary + '44', marginBottom: 4 },
    summarySectionTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.sm, flex: 1 },
    summarySectionTotal: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.sm },
    summaryCatRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9 },
    summaryCatBar: { position: 'absolute', bottom: 0, left: 0, height: 2, borderRadius: 1 },
    summaryCatName: { flex: 1, color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
    summaryCatAmt: { fontWeight: '700', fontSize: FONT.sm },
    summaryCatPct: { color: COLORS.textDim, fontSize: 11, width: 32, textAlign: 'right' },
    summaryIncomeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '88' },
    summaryIncomeName: { flex: 1, color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
    summaryIncomeAmt: { color: COLORS.debit, fontWeight: '700', fontSize: FONT.sm },
    summaryExpItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, gap: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '88' },
    summaryExpItemMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
    summaryExpItemAmt: { fontWeight: '700', fontSize: FONT.sm },
    summaryCloseBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, alignItems: 'center' },
    summaryCloseBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheetDismiss: { flex: 1 },
    regSheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
    regTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: 16, marginTop: 4 },
    regOption: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: COLORS.card2, borderRadius: 16, padding: 16, marginBottom: 10 },
    regOptionEmoji: { fontSize: 28 },
    regOptionTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    regOptionSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 1 },
    helpOption: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border },
    patModalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
    patModalTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    patSection: { marginBottom: 16 },
    patSectionTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    patRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border + '66' },
    patRowEmoji: { fontSize: 20, width: 28 },
    patRowName: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    patRowVal: { fontWeight: '700', fontSize: FONT.sm },
    patTotal: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, marginBottom: 6 },
    patTotalLabel: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    patTotalVal: { fontWeight: '800', fontSize: FONT.base },
    patNetBox: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 4 },
    patNetLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
    patNetVal: { color: '#fff', fontWeight: '800', fontSize: FONT.xl, marginTop: 4 },
    fabContainer: { position: 'absolute', bottom: 24, right: 24, alignItems: 'center', gap: 4 },
    fab: {
      width: 60, height: 60, borderRadius: 30,
      backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
      elevation: 8, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8,
    },
    fabLabel: { color: COLORS.primary, fontSize: 12, fontWeight: '800', letterSpacing: 0.3, backgroundColor: COLORS.primaryBg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary + '33' },
  }, moderateScale)), [COLORS, moderateScale]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{formatMonthLabel(monthKey)}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setHelpSheet(true)} style={styles.headerBtn}>
            <Text style={styles.headerBtnEmoji}>❓</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Hero: pills arriba + donuts swipeables ─── */}
        <View style={styles.heroCard}>
          {/* Pills ingresos / gastos — arriba */}
          <View style={styles.pillsRow}>
            <View style={[styles.pill, { backgroundColor: COLORS.debit }]}>
              <View style={styles.pillIconRow}>
                <Ionicons name="arrow-up-circle" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.pillLabel}>Ingresos</Text>
              </View>
              <Text style={styles.pillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(totalIncome)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.credit }]}>
              <View style={styles.pillIconRow}>
                <Ionicons name="arrow-down-circle" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.pillLabel}>Gastos</Text>
              </View>
              <Text style={styles.pillValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(totalSpent)}</Text>
            </View>
          </View>

          {/* Donut slider */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.donutSlider}
            onMomentumScrollEnd={e => setActiveDot(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
          >
            {/* Slide 1 — Gastos */}
            <View style={[styles.donutSlide, { width: cardWidth }]}>
              <TouchableOpacity onPress={() => setSummaryModal(true)} activeOpacity={0.85} style={styles.donutTap}>
                <DonutChart
                  data={donutData}
                  total={totalSpent || 1}
                  size={donutSize}
                  centerLabel="💸 toca para ver"
                  centerValue={formatCOP(totalSpent)}
                  centerValueColor={COLORS.credit}
                />
              </TouchableOpacity>
              <Text style={styles.heroDonutLabel}>Gastos del mes</Text>
            </View>

            {/* Slide 2 — Metas */}
            <View style={[styles.donutSlide, { width: cardWidth }]}>
              <TouchableOpacity onPress={() => goals.length > 0 && setMetasModal(true)} activeOpacity={0.85} style={styles.donutTap}>
                <DonutChart
                  data={goalsDonutData}
                  total={totalTarget || 1}
                  size={donutSize}
                  centerValue={goals.length > 0 ? fmtShort(totalSaved) : ''}
                  centerLabel={goals.length > 0 ? `de ${fmtShort(totalTarget)}` : 'Sin metas'}
                  centerValueColor={COLORS.primary}
                  emptyLabel="Sin metas aún"
                  emptyHint="Toca + para crear tu primera meta de ahorro"
                />
              </TouchableOpacity>
              {/* Emoji legend por meta */}
              {goals.length > 0 && (
                <View style={styles.goalsEmojiLegend}>
                  {goals.slice(0, 6).map(g => (
                    <View key={g.id} style={styles.goalsEmojiItem}>
                      <Text style={styles.goalsEmojiChar}>{g.emoji ?? '🎯'}</Text>
                      <View style={[styles.goalsEmojiBar, { backgroundColor: g.color }]} />
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.heroDonutLabel}>Metas de ahorro</Text>
            </View>

            {/* Slide 3 — Ingresos */}
            <View style={[styles.donutSlide, { width: cardWidth }]}>
              <TouchableOpacity onPress={() => incomes.length > 0 && setIngresosModal(true)} activeOpacity={0.85} style={styles.donutTap}>
                <DonutChart
                  data={incomesDonutData}
                  total={totalIncome || 1}
                  size={donutSize}
                  centerValue={formatCOP(totalIncome)}
                  centerLabel="Total ingresos"
                  centerValueColor={COLORS.debit}
                  emptyLabel="Sin ingresos"
                  emptyHint="Toca + para registrar un ingreso"
                />
              </TouchableOpacity>
              {/* Leyenda de ingresos */}
              {incomes.length > 0 && (
                <View style={styles.incomeLegend}>
                  {incomes.slice(0, 4).map((inc, i) => (
                    <View key={inc.id} style={styles.incomeLegendRow}>
                      <View style={[styles.incomeLegendDot, { backgroundColor: INCOME_COLORS[i % INCOME_COLORS.length] }]} />
                      <Text style={styles.incomeLegendName} numberOfLines={1}>{inc.description || 'Ingreso'}</Text>
                      <Text style={styles.incomeLegendAmt}>{formatCOP(inc.amount)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.heroDonutLabel}>Fuentes de ingreso</Text>
            </View>

            {/* Slide 4 — Balance (débito/crédito/efectivo/deudas) */}
            <View style={[styles.donutSlide, { width: cardWidth }]}>
              <TouchableOpacity onPress={() => balanceItems.length > 0 && setPatrimonioModal(true)} activeOpacity={0.85} style={styles.donutTap}>
                <DonutChart
                  data={balanceDonutData}
                  total={totalBalance || 1}
                  size={donutSize}
                  centerValue={balanceItems.length > 0 ? fmtShort(totalBalance) : ''}
                  centerLabel={balanceItems.length > 0 ? 'toca para ver' : 'Sin cuentas'}
                  centerValueColor={COLORS.primary}
                  emptyLabel="Sin cuentas"
                  emptyHint="Agrega tarjetas o efectivo en Balance"
                />
              </TouchableOpacity>
              {/* Leyenda por cuenta */}
              {balanceItems.length > 0 && (
                <View style={styles.incomeLegend}>
                  {balanceItems.slice(0, 4).map(it => (
                    <View key={it.id} style={styles.incomeLegendRow}>
                      <View style={[styles.incomeLegendDot, { backgroundColor: it.color }]} />
                      <Text style={styles.incomeLegendName} numberOfLines={1}>{it.emoji} {it.name}</Text>
                      <Text style={styles.incomeLegendAmt}>{formatCOP(it.value)}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.heroDonutLabel}>Balance por cuenta</Text>
            </View>
          </ScrollView>

          {/* Pagination dots */}
          <View style={styles.dotRow}>
            <View style={[styles.dot, activeDot === 0 && styles.dotActive]} />
            <View style={[styles.dot, activeDot === 1 && styles.dotActive]} />
            <View style={[styles.dot, activeDot === 2 && styles.dotActive]} />
            <View style={[styles.dot, activeDot === 3 && styles.dotActive]} />
          </View>

          {/* ── Presupuesto mensual ──────────────────────── */}
          {/* Solo lectura: el monto se configura desde Perfil. Tocar aquí abre el resumen del mes. */}
          <View style={styles.heroBudgetWrap}>
            {budget && budget > 0 ? (
              <TouchableOpacity activeOpacity={0.85} onPress={() => setSummaryModal(true)}>
                <BudgetProgressBar budget={budget} spent={totalSpent} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setSummaryModal(true)} style={styles.emptyGoal}>
                <Ionicons name="wallet-outline" size={28} color={COLORS.textDim} />
                <Text style={styles.emptyGoalText}>Configura tu presupuesto mensual en Perfil</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Tarjeta de periodo (semanal/quincenal/mensual) ── */}
        {profile?.budgetPeriod === 'weekly' ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPendingModal(true)} style={styles.budgetWrap}>
            <SemanaCard />
          </TouchableOpacity>
        ) : profile?.budgetPeriod === 'monthly' ? (
          <TouchableOpacity activeOpacity={0.85} onPress={() => setPendingModal(true)} style={styles.budgetWrap}>
            <MesCard />
          </TouchableOpacity>
        ) : (
          <View style={styles.budgetWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.quincenaSlider}
              onMomentumScrollEnd={e => setViewedQuincena(Math.round(e.nativeEvent.contentOffset.x / cardWidth) === 0 ? 1 : 2)}
            >
              {([1, 2] as const).map(q => {
                const pct = Math.max(0, Math.min(quincenaProgress(q), 100));
                return (
                  <TouchableOpacity
                    key={q}
                    activeOpacity={0.85}
                    onPress={() => { setViewedQuincena(q); setPendingModal(true); }}
                    style={{ width: cardWidth }}
                  >
                    <View style={styles.quincenaCardBox}>
                      <View style={styles.quincenaCardHeader}>
                        <Text style={styles.quincenaCardLabel}>Quincena {q}</Text>
                        {q === currentQuincena && (
                          <View style={styles.quincenaBadge}>
                            <Text style={styles.quincenaBadgeText}>ACTIVA</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.quincenaCardSpent}>{formatCOP(quincenaSpent(q))} gastado</Text>
                      <View style={styles.quincenaCardTrack}>
                        <View style={[styles.quincenaCardFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <View style={styles.dotRow}>
              <View style={[styles.dot, viewedQuincena === 1 && styles.dotActive]} />
              <View style={[styles.dot, viewedQuincena === 2 && styles.dotActive]} />
            </View>
          </View>
        )}

        {/* ── Balance General (patrimonio neto) — mes actual / anterior ── */}
        {(totalActivos > 0 || totalPasivos > 0 || prevTotalActivos > 0 || prevTotalPasivos > 0) && (() => {
          const netoColor = patrimonioNeto >= 0 ? COLORS.debit : COLORS.danger;
          const prevNetoColor = prevPatrimonioNeto >= 0 ? COLORS.debit : COLORS.danger;
          return (
            <View style={styles.budgetWrap}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.balanceSlider}
                contentOffset={{ x: cardWidth, y: 0 }}
                onMomentumScrollEnd={e => setBalanceDot(Math.round(e.nativeEvent.contentOffset.x / cardWidth))}
              >
                {/* Slide 1 — mes anterior */}
                <TouchableOpacity activeOpacity={0.82} onPress={() => setTrendModal(true)} style={{ width: cardWidth }}>
                  <View style={[styles.patrimonioCard, { marginBottom: 0, borderLeftColor: prevNetoColor, backgroundColor: prevNetoColor + '0D' }]}>
                    <View style={styles.patrimonioHeader}>
                      <Ionicons name={prevPatrimonioNeto >= 0 ? 'trending-up' : 'trending-down'} size={18} color={prevNetoColor} />
                      <Text style={styles.patrimonioTitle}>Balance General · {formatMonthLabel(prevMonthKey)}</Text>
                    </View>
                    <View style={styles.patrimonioColumns}>
                      <View>
                        <Text style={styles.patrimonioLabel}>↑ Activos</Text>
                        <Text style={[styles.patrimonioVal, { color: COLORS.debit }]}>{formatCOP(prevTotalActivos)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.patrimonioLabel}>↓ Pasivos</Text>
                        <Text style={[styles.patrimonioVal, { color: COLORS.credit }]}>{formatCOP(prevTotalPasivos)}</Text>
                      </View>
                    </View>
                    <View style={styles.patrimonioDivider} />
                    <View style={styles.patrimonioNetRow}>
                      <Text style={styles.patrimonioNetLabel}>Neto</Text>
                      <Text style={[styles.patrimonioNetVal, { color: prevNetoColor }]}>
                        {prevPatrimonioNeto >= 0 ? '+' : ''}{formatCOP(prevPatrimonioNeto)}
                      </Text>
                    </View>
                    <Text style={{ color: COLORS.textDim, fontSize: 10, marginTop: 6, textAlign: 'right' }}>Toca para ver tendencia →</Text>
                  </View>
                </TouchableOpacity>

                {/* Slide 2 — mes actual (vista inicial "bloqueada" vía contentOffset) */}
                <TouchableOpacity activeOpacity={0.82} onPress={() => setPatrimonioModal(true)} style={{ width: cardWidth }}>
                  <View style={[styles.patrimonioCard, { marginBottom: 0, borderLeftColor: netoColor, backgroundColor: netoColor + '0D' }]}>
                    <View style={styles.patrimonioHeader}>
                      <Ionicons name={patrimonioNeto >= 0 ? 'trending-up' : 'trending-down'} size={18} color={netoColor} />
                      <Text style={styles.patrimonioTitle}>Balance General</Text>
                    </View>
                    <View style={styles.patrimonioColumns}>
                      <View>
                        <Text style={styles.patrimonioLabel}>↑ Activos</Text>
                        <Text style={[styles.patrimonioVal, { color: COLORS.debit }]}>{formatCOP(totalActivos)}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.patrimonioLabel}>↓ Pasivos</Text>
                        <Text style={[styles.patrimonioVal, { color: COLORS.credit }]}>{formatCOP(totalPasivos)}</Text>
                      </View>
                    </View>
                    <View style={styles.patrimonioDivider} />
                    <View style={styles.patrimonioNetRow}>
                      <Text style={styles.patrimonioNetLabel}>Neto</Text>
                      <Text style={[styles.patrimonioNetVal, { color: netoColor }]}>
                        {patrimonioNeto >= 0 ? '+' : ''}{formatCOP(patrimonioNeto)}
                      </Text>
                    </View>
                    <Text style={{ color: COLORS.textDim, fontSize: 10, marginTop: 6, textAlign: 'right' }}>Toca para ver detalle →</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
              <View style={styles.dotRow}>
                <View style={[styles.dot, balanceDot === 0 && styles.dotActive]} />
                <View style={[styles.dot, balanceDot === 1 && styles.dotActive]} />
              </View>
            </View>
          );
        })()}

        {/* ── Gastos (entra a la pantalla de categorías) ── */}
        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/categorias')} style={styles.gastosCard}>
          <View style={styles.gastosCardIcon}>
            <Ionicons name="pricetags" size={22} color={COLORS.credit} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gastosCardTitle}>Gastos</Text>
            <Text style={styles.gastosCardSub}>
              {catRows.filter(r => r.total > 0).length} categorías · {formatCOP(totalSpent)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>

        {/* ── Metas de ahorro ───────────────────────────── */}
        <View style={[styles.section, { marginTop: 8 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Metas de ahorro</Text>
            <TouchableOpacity onPress={() => { setEditingGoal(null); setGoalModal(true); }} style={styles.sectionAddBtn}>
              <Ionicons name="add" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
          {goals.length === 0 ? (
            <TouchableOpacity onPress={() => { setEditingGoal(null); setGoalModal(true); }} style={styles.emptyGoal}>
              <Ionicons name="flag-outline" size={28} color={COLORS.textDim} />
              <Text style={styles.emptyGoalText}>Crea tu primera meta de ahorro</Text>
            </TouchableOpacity>
          ) : (
            <>
              {totalTarget > 0 && (
                <View style={styles.goalsTotalBox}>
                  <View style={styles.goalsTotalAmtRow}>
                    <Text style={styles.goalsTotalSaved} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(totalSaved)}</Text>
                    <Text style={styles.goalsTotalOf}>de {formatCOP(totalTarget)} · {Math.round(globalGoalPct)}%</Text>
                  </View>
                  <View style={styles.goalsTotalBar}>
                    <View style={[styles.goalsTotalFill, { width: `${globalGoalPct}%` }]} />
                  </View>
                </View>
              )}
              {goals.map(goal => {
              const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
              const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
              const done = goal.savedAmount >= goal.targetAmount;
              return (
                <TouchableOpacity key={goal.id} style={styles.goalCard}
                  onPress={() => { setGoalDetailTarget(goal); setGoalDetailVisible(true); }}
                  onLongPress={() => Alert.alert(goal.name, '', [
                    { text: 'Editar', onPress: () => { setEditingGoal(goal); setGoalModal(true); } },
                    { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteGoal(goal) },
                    { text: 'Cancelar', style: 'cancel' },
                  ])} activeOpacity={0.85}
                >
                  <View style={[styles.goalDot, { backgroundColor: goal.color }]}>
                    {goal.emoji
                      ? <Text style={{ fontSize: 16 }}>{goal.emoji}</Text>
                      : <Ionicons name={done ? 'checkmark' : 'flag'} size={14} color="#fff" />}
                  </View>
                  <View style={styles.goalBody}>
                    <View style={styles.goalTopRow}>
                      <Text style={styles.goalName}>{goal.name}</Text>
                      <Text style={[styles.goalPct, { color: done ? COLORS.debit : COLORS.primary }]}>{Math.round(pct)}%</Text>
                    </View>
                    <View style={styles.goalTrack}>
                      <View style={[styles.goalFill, { width: `${pct}%`, backgroundColor: done ? COLORS.debit : goal.color }]} />
                    </View>
                    <View style={styles.goalBottomRow}>
                      <Text style={styles.goalSaved}>{formatCOP(goal.savedAmount)}</Text>
                      <Text style={styles.goalTarget}>{done ? '¡Meta alcanzada! 🎉' : `Falta ${formatCOP(remaining)}`}</Text>
                    </View>
                    {goal.deadline && <Text style={styles.goalDeadline}>📅 {goal.deadline}</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
            </>
          )}
        </View>
      </ScrollView>

      <GoalFormModal
        visible={goalModal}
        goal={editingGoal}
        onSave={handleSaveGoal}
        onClose={() => { setGoalModal(false); setEditingGoal(null); }}
      />

      <GoalDetailModal
        visible={goalDetailVisible}
        goal={goalDetailTarget}
        onRefresh={async () => {
          await load();
          const updated = await getGoals();
          const g = updated.find(x => x.id === goalDetailTarget?.id);
          if (g) setGoalDetailTarget(g);
        }}
        onClose={() => { setGoalDetailVisible(false); setGoalDetailTarget(null); }}
      />

      {/* ── Summary popup (donut tap) ─────────────────── */}
      <Modal visible={summaryModal} animationType="slide" transparent onRequestClose={() => setSummaryModal(false)}>
        <View style={styles.summaryOverlay}>
          <TouchableOpacity style={styles.summaryDismiss} activeOpacity={1} onPress={() => setSummaryModal(false)} />
          <View style={styles.summarySheet}>
            <View style={styles.summaryHandle} />
            <Text style={styles.summaryTitle}>📅 Resumen del mes</Text>

            {/* Stat boxes */}
            <View style={styles.summaryHeaderRow}>
              <View style={[styles.summaryStatBox, { backgroundColor: COLORS.debit }]}>
                <Text style={styles.summaryStatEmoji}>💰</Text>
                <Text style={styles.summaryStatLabel}>Ingresos</Text>
                <Text style={styles.summaryStatVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(totalIncome)}</Text>
              </View>
              <View style={[styles.summaryStatBox, { backgroundColor: COLORS.credit }]}>
                <Text style={styles.summaryStatEmoji}>💸</Text>
                <Text style={styles.summaryStatLabel}>Gastos</Text>
                <Text style={styles.summaryStatVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(totalSpent)}</Text>
              </View>
              <View style={[styles.summaryStatBox, { backgroundColor: savings >= 0 ? COLORS.primary : COLORS.danger }]}>
                <Text style={styles.summaryStatEmoji}>{savings >= 0 ? '📈' : '📉'}</Text>
                <Text style={styles.summaryStatLabel}>Balance</Text>
                <Text style={styles.summaryStatVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{formatCOP(Math.abs(savings))}</Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Gastos por categoría */}
              {catRows.filter(r => r.total > 0).length > 0 && (
                <>
                  <View style={styles.summarySectionHeader}>
                    <Text style={styles.summarySectionTitle}>💸 Gastos por categoría</Text>
                    <Text style={styles.summarySectionTotal}>{formatCOP(totalSpent)}</Text>
                  </View>
                  {catRows.filter(r => r.total > 0).map(r => {
                    const pct = totalSpent > 0 ? (r.total / totalSpent) * 100 : 0;
                    return (
                      <View key={r.cat.id} style={{ position: 'relative' }}>
                        <View style={[styles.summaryCatRow]}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: r.cat.color }} />
                          <Text style={styles.summaryCatName}>
                            {r.cat.emoji ? `${r.cat.emoji} ` : ''}{r.cat.name}
                          </Text>
                          <Text style={[styles.summaryCatAmt, { color: r.cat.color }]}>{formatCOP(r.total)}</Text>
                          <Text style={styles.summaryCatPct}>{Math.round(pct)}%</Text>
                        </View>
                        <View style={[styles.summaryCatBar, { width: `${pct}%`, backgroundColor: r.cat.color + '33' }]} />
                      </View>
                    );
                  })}
                </>
              )}

              {/* Todos los gastos (itemizado, no agrupado por categoría) */}
              {expenses.length > 0 && (
                <>
                  <View style={[styles.summarySectionHeader, { marginTop: 16 }]}>
                    <Text style={styles.summarySectionTitle}>🧾 Todos los gastos</Text>
                    <Text style={styles.summarySectionTotal}>{expenses.length}</Text>
                  </View>
                  {[...expenses]
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map(e => {
                      const cat = categories.find(c => c.id === e.categoryId);
                      return (
                        <View key={e.id} style={styles.summaryExpItemRow}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: cat?.color ?? COLORS.textDim }} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.summaryIncomeName} numberOfLines={1}>{e.name}</Text>
                            <Text style={styles.summaryExpItemMeta}>
                              {cat?.emoji ? `${cat.emoji} ` : ''}{cat?.name ?? 'Sin categoría'} · {e.quincena === 1 ? '1ª Quincena' : '2ª Quincena'}
                            </Text>
                          </View>
                          <Text style={[styles.summaryExpItemAmt, { color: cat?.color ?? COLORS.text }]}>{formatCOP(e.amount)}</Text>
                        </View>
                      );
                    })}
                </>
              )}

              {/* Ingresos */}
              {incomes.length > 0 && (
                <>
                  <View style={[styles.summarySectionHeader, { marginTop: 16 }]}>
                    <Text style={styles.summarySectionTitle}>💰 Fuentes de ingreso</Text>
                    <Text style={[styles.summarySectionTotal, { color: COLORS.debit }]}>{formatCOP(totalIncome)}</Text>
                  </View>
                  {incomes.map(inc => (
                    <View key={inc.id} style={styles.summaryIncomeRow}>
                      <Text style={styles.summaryIncomeName}>{inc.description || 'Ingreso'}</Text>
                      <Text style={styles.summaryIncomeAmt}>{formatCOP(inc.amount)}</Text>
                    </View>
                  ))}
                </>
              )}

              {catRows.filter(r => r.total > 0).length === 0 && incomes.length === 0 && (
                <Text style={{ color: COLORS.textMuted, textAlign: 'center', paddingVertical: 24, fontSize: FONT.sm }}>
                  Sin movimientos registrados este mes
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.summaryCloseBtn} onPress={() => setSummaryModal(false)}>
              <Text style={styles.summaryCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Registrar sheet ──────────────────────────── */}
      <Modal visible={registrarSheet} animationType="slide" transparent onRequestClose={() => setRegistrarSheet(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setRegistrarSheet(false)} />
          <View style={styles.regSheet}>
            <View style={styles.summaryHandle} />
            <Text style={styles.regTitle}>¿Qué quieres registrar?</Text>
            <TouchableOpacity style={styles.regOption} onPress={() => { setRegistrarSheet(false); setQuickEntry(true); }}>
              <Text style={styles.regOptionEmoji}>💸</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.regOptionTitle}>Gasto / Ingreso</Text>
                <Text style={styles.regOptionSub}>Registra una transacción del mes</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.regOption} onPress={() => { setRegistrarSheet(false); setEditingGoal(null); setGoalModal(true); }}>
              <Text style={styles.regOptionEmoji}>🎯</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.regOptionTitle}>Nueva Meta de ahorro</Text>
                <Text style={styles.regOptionSub}>Crea o registra una meta nueva</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Help sheet ───────────────────────────────── */}
      <Modal visible={helpSheet} animationType="slide" transparent onRequestClose={() => setHelpSheet(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setHelpSheet(false)} />
          <View style={styles.regSheet}>
            <View style={styles.summaryHandle} />
            <Text style={styles.regTitle}>Opciones</Text>
            <TouchableOpacity style={[styles.helpOption, { backgroundColor: COLORS.primaryBg }]} onPress={() => { setHelpSheet(false); handleExportPDF(); }}>
              <Text style={{ fontSize: 24 }}>📊</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.regOptionTitle, { color: COLORS.primary }]}>Exportar PDF</Text>
                <Text style={styles.regOptionSub}>Reporte financiero del mes actual</Text>
              </View>
              {exporting && <ActivityIndicator size={16} color={COLORS.primary} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.helpOption, { backgroundColor: COLORS.debitBg }]} onPress={() => { setHelpSheet(false); handleExportBankStatement(); }}>
              <Text style={{ fontSize: 24 }}>🧾</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.regOptionTitle, { color: COLORS.debit }]}>Extracto de tu cuenta</Text>
                <Text style={styles.regOptionSub}>Movimientos del mes, tipo estado de cuenta (PDF)</Text>
              </View>
              {exportingStatement && <ActivityIndicator size={16} color={COLORS.debit} />}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.helpOption, { backgroundColor: COLORS.card2 }]} onPress={() => { setHelpSheet(false); router.push('/ayuda'); }}>
              <Text style={{ fontSize: 24 }}>❓</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.regOptionTitle}>Ayuda</Text>
                <Text style={styles.regOptionSub}>Preguntas frecuentes y guía de uso</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Patrimonio detail modal ───────────────── */}
      <Modal visible={patrimonioModal} animationType="slide" transparent onRequestClose={() => setPatrimonioModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setPatrimonioModal(false)} />
          <View style={[styles.regSheet, { maxHeight: '80%' }]}>
            <View style={styles.summaryHandle} />
            <View style={styles.patModalHeader}>
              <Ionicons name={patrimonioNeto >= 0 ? 'trending-up' : 'trending-down'} size={22} color={patrimonioNeto >= 0 ? COLORS.debit : COLORS.danger} />
              <Text style={styles.patModalTitle}>Balance General</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Activos */}
              <View style={styles.patSection}>
                <Text style={styles.patSectionTitle}>↑ Activos</Text>
                {activoItems.map(it => (
                  <View key={it.id} style={styles.patRow}>
                    <Text style={styles.patRowEmoji}>{it.emoji}</Text>
                    <Text style={styles.patRowName}>{it.name}</Text>
                    <Text style={[styles.patRowVal, { color: COLORS.debit }]}>{formatCOP(it.value)}</Text>
                  </View>
                ))}
                <View style={styles.patTotal}>
                  <Text style={styles.patTotalLabel}>Total activos</Text>
                  <Text style={[styles.patTotalVal, { color: COLORS.debit }]}>{formatCOP(totalActivos)}</Text>
                </View>
              </View>

              {/* Pasivos */}
              {pasivoItems.length > 0 && (
                <View style={styles.patSection}>
                  <Text style={styles.patSectionTitle}>↓ Pasivos</Text>
                  {pasivoItems.map(it => (
                    <View key={it.id} style={styles.patRow}>
                      <Text style={styles.patRowEmoji}>{it.emoji}</Text>
                      <Text style={styles.patRowName}>{it.name}</Text>
                      <Text style={[styles.patRowVal, { color: COLORS.credit }]}>{formatCOP(it.value)}</Text>
                    </View>
                  ))}
                  <View style={styles.patTotal}>
                    <Text style={styles.patTotalLabel}>Total pasivos</Text>
                    <Text style={[styles.patTotalVal, { color: COLORS.credit }]}>{formatCOP(totalPasivos)}</Text>
                  </View>
                </View>
              )}

              {/* Neto */}
              <View style={[styles.patNetBox, { backgroundColor: patrimonioNeto >= 0 ? COLORS.debit : COLORS.danger }]}>
                <Text style={styles.patNetLabel}>Balance General</Text>
                <Text style={styles.patNetVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{patrimonioNeto >= 0 ? '+' : ''}{formatCOP(patrimonioNeto)}</Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Metas detail modal (donut de metas) ───── */}
      <Modal visible={metasModal} animationType="slide" transparent onRequestClose={() => setMetasModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setMetasModal(false)} />
          <View style={[styles.regSheet, { maxHeight: '80%' }]}>
            <View style={styles.summaryHandle} />
            <View style={styles.patModalHeader}>
              <Ionicons name="flag" size={20} color={COLORS.primary} />
              <Text style={styles.patModalTitle}>Metas de ahorro</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.patSection}>
                {goals.map(g => {
                  const pct = g.targetAmount > 0 ? Math.min((g.savedAmount / g.targetAmount) * 100, 100) : 0;
                  return (
                    <View key={g.id} style={styles.patRow}>
                      <Text style={styles.patRowEmoji}>{g.emoji ?? '🎯'}</Text>
                      <Text style={styles.patRowName}>{g.name}</Text>
                      <Text style={[styles.patRowVal, { color: g.color }]} numberOfLines={1}>
                        {formatCOP(g.savedAmount)} / {formatCOP(g.targetAmount)} · {Math.round(pct)}%
                      </Text>
                    </View>
                  );
                })}
                <View style={styles.patTotal}>
                  <Text style={styles.patTotalLabel}>Total ahorrado</Text>
                  <Text style={[styles.patTotalVal, { color: COLORS.primary }]}>
                    {formatCOP(totalSaved)} de {formatCOP(totalTarget)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Ingresos detail modal (donut de ingresos) ── */}
      <Modal visible={ingresosModal} animationType="slide" transparent onRequestClose={() => setIngresosModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setIngresosModal(false)} />
          <View style={[styles.regSheet, { maxHeight: '80%' }]}>
            <View style={styles.summaryHandle} />
            <View style={styles.patModalHeader}>
              <Ionicons name="cash" size={20} color={COLORS.debit} />
              <Text style={styles.patModalTitle}>Fuentes de ingreso</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.patSection}>
                {incomes.map(inc => (
                  <View key={inc.id} style={styles.patRow}>
                    <Text style={styles.patRowEmoji}>💰</Text>
                    <Text style={styles.patRowName}>{inc.description || 'Ingreso'}</Text>
                    <Text style={[styles.patRowVal, { color: COLORS.debit }]}>{formatCOP(inc.amount)}</Text>
                  </View>
                ))}
                <View style={styles.patTotal}>
                  <Text style={styles.patTotalLabel}>Total ingresos</Text>
                  <Text style={[styles.patTotalVal, { color: COLORS.debit }]}>{formatCOP(totalIncome)}</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Pendientes por pagar (tarjeta de periodo) ── */}
      <Modal visible={pendingModal} animationType="slide" transparent onRequestClose={() => setPendingModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setPendingModal(false)} />
          <View style={[styles.regSheet, { maxHeight: '80%' }]}>
            <View style={styles.summaryHandle} />
            <View style={styles.patModalHeader}>
              <Ionicons name="alert-circle-outline" size={20} color={COLORS.warning} />
              <Text style={styles.patModalTitle}>Pendientes por pagar</Text>
            </View>
            <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 14 }}>
              Gastos fijos que aún no registras en {periodLabel}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {recurringTemplates.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pricetags-outline" size={36} color={COLORS.textDim} />
                  <Text style={styles.emptyText}>Sin gastos fijos configurados</Text>
                  <Text style={styles.emptyHint}>Actívalos con el toggle "Gasto recurrente" al registrar un gasto</Text>
                </View>
              ) : pendingTemplates.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle-outline" size={36} color={COLORS.debit} />
                  <Text style={styles.emptyText}>¡Al día!</Text>
                  <Text style={styles.emptyHint}>No tienes gastos fijos pendientes en {periodLabel}</Text>
                </View>
              ) : (
                <View style={styles.patSection}>
                  {pendingTemplates.map(t => {
                    const cat = categories.find(c => c.id === t.categoryId);
                    return (
                      <View key={t.name} style={styles.patRow}>
                        <Text style={styles.patRowEmoji}>{cat?.emoji ?? '💸'}</Text>
                        <Text style={styles.patRowName}>{t.name}</Text>
                        <Text style={[styles.patRowVal, { color: cat?.color ?? COLORS.credit }]}>{formatCOP(t.amount)}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Tendencia últimos 2 meses (vs. mes anterior) ── */}
      <Modal visible={trendModal} animationType="slide" transparent onRequestClose={() => setTrendModal(false)}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismiss} activeOpacity={1} onPress={() => setTrendModal(false)} />
          <View style={styles.regSheet}>
            <View style={styles.summaryHandle} />
            <View style={styles.patModalHeader}>
              <Ionicons name="stats-chart" size={20} color={COLORS.primary} />
              <Text style={styles.patModalTitle}>Tendencia · últimos 2 meses</Text>
            </View>
            <LineChart
              data={{
                labels: trendPoints.map(t => t.label),
                datasets: [
                  { data: trendPoints.map(t => t.ingresos), color: () => COLORS.debit, strokeWidth: 2 },
                  { data: trendPoints.map(t => t.gastos),   color: () => COLORS.credit, strokeWidth: 2 },
                  { data: trendPoints.map(t => t.ahorro),   color: () => COLORS.primary, strokeWidth: 2 },
                ],
                legend: ['Ingresos', 'Gastos', 'Ahorro'],
              }}
              width={SCREEN_W - 40}
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
              style={{ borderRadius: 12, alignSelf: 'center', marginTop: 8 }}
              formatYLabel={v => `$${v}k`}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, paddingVertical: 10 }}>
              {[
                { label: 'Ingresos', color: COLORS.debit },
                { label: 'Gastos', color: COLORS.credit },
                { label: 'Ahorro', color: COLORS.primary },
              ].map(item => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.color }} />
                  <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <QuickEntryModal
        visible={quickEntry}
        categories={categories}
        onSave={() => { setQuickEntry(false); load(); }}
        onClose={() => setQuickEntry(false)}
      />

      {/* FAB */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => setRegistrarSheet(true)} activeOpacity={0.85}>
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.fabLabel}>Registrar</Text>
      </View>
    </SafeAreaView>
  );
}

// ── Goal Detail Modal ─────────────────────────────────────────────────────────

interface GoalDetailProps {
  visible: boolean;
  goal: Goal | null;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

function GoalDetailModal({ visible, goal, onRefresh, onClose }: GoalDetailProps) {
  type Mode = 'list' | 'add';
  const [mode, setMode]     = useState<Mode>('list');
  const [amount, setAmount] = useState('');
  const [date, setDate]     = useState('');
  const [note, setNote]     = useState('');

  const COLORS = useColors();
  const gdStyles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    goalDot: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    goalEmoji: { fontSize: 20 },
    headerInfo: { flex: 1 },
    goalName: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    goalSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    progressTrack: { height: 10, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: 5 },
    progressLabel: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'right', marginBottom: 14 },
    sectionLabel: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.sm, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
    list: { maxHeight: 300 },
    emptyState: { alignItems: 'center', paddingVertical: 32, gap: 6 },
    emptyText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm },
    depRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    depIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    depInfo: { flex: 1 },
    depAmt: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    depNote: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    depDate: { color: COLORS.textMuted, fontSize: FONT.sm },
    hintText: { color: COLORS.textDim, fontSize: 10, textAlign: 'center', marginTop: 6, marginBottom: 4 },
    addBtn: { borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 8 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  const today = () => {
    const d = new Date();
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  React.useEffect(() => {
    if (visible) { setMode('list'); setAmount(''); setDate(today()); setNote(''); }
  }, [visible]);

  const deposits = goal?.deposits ?? [];
  const pct = goal && goal.targetAmount > 0
    ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
  const done = (goal?.savedAmount ?? 0) >= (goal?.targetAmount ?? 1);

  const handleAdd = async () => {
    const amt = Number(amount.replace(/\D/g, ''));
    if (!amt || !goal) return;
    await addGoalDeposit(goal.id, { amount: amt, date: date || today(), note: note.trim() || undefined });
    await onRefresh();
    setMode('list');
    setAmount(''); setNote(''); setDate(today());
  };

  const handleDelete = (dep: GoalDeposit) => {
    Alert.alert('Eliminar depósito', `¿Eliminar ${dep.amount > 0 ? '+' : ''}$${dep.amount.toLocaleString('es-CO')}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        if (!goal) return;
        await deleteGoalDeposit(goal.id, dep.id);
        await onRefresh();
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={gdStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={gdStyles.sheet}>
          <View style={gdStyles.handle} />

          {/* Header con progreso */}
          <View style={gdStyles.header}>
            <View style={[gdStyles.goalDot, { backgroundColor: goal?.color ?? COLORS.primary }]}>
              <Text style={gdStyles.goalEmoji}>{goal?.emoji ?? (done ? '🎉' : '🎯')}</Text>
            </View>
            <View style={gdStyles.headerInfo}>
              <Text style={gdStyles.goalName}>{goal?.name}</Text>
              <Text style={gdStyles.goalSub}>
                {formatCOP(goal?.savedAmount ?? 0)} de {formatCOP(goal?.targetAmount ?? 0)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={gdStyles.closeBtn}>
              <Text style={{ fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de progreso */}
          <View style={gdStyles.progressTrack}>
            <View style={[gdStyles.progressFill, {
              width: `${pct}%`,
              backgroundColor: done ? COLORS.debit : (goal?.color ?? COLORS.primary),
            }]} />
          </View>
          <Text style={gdStyles.progressLabel}>{Math.round(pct)}% completado</Text>

          {mode === 'list' ? (
            <>
              {/* Historial de depósitos */}
              <Text style={gdStyles.sectionLabel}>Historial de aportes</Text>
              <ScrollView style={gdStyles.list} showsVerticalScrollIndicator={false}>
                {deposits.length === 0 ? (
                  <View style={gdStyles.emptyState}>
                    <Text style={gdStyles.emptyText}>Sin aportes todavía</Text>
                    <Text style={gdStyles.emptyHint}>Agrega tu primer aporte a esta meta</Text>
                  </View>
                ) : (
                  [...deposits].reverse().map(dep => (
                    <TouchableOpacity
                      key={dep.id}
                      onLongPress={() => handleDelete(dep)}
                      style={gdStyles.depRow}
                      activeOpacity={0.8}
                    >
                      <View style={[gdStyles.depIcon, { backgroundColor: (goal?.color ?? COLORS.primary) + '22' }]}>
                        <Text style={{ fontSize: 14 }}>💰</Text>
                      </View>
                      <View style={gdStyles.depInfo}>
                        <Text style={gdStyles.depAmt}>{formatCOP(dep.amount)}</Text>
                        {dep.note ? <Text style={gdStyles.depNote}>{dep.note}</Text> : null}
                      </View>
                      <Text style={gdStyles.depDate}>{dep.date}</Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
              <Text style={gdStyles.hintText}>Mantén un aporte para eliminarlo</Text>
              <TouchableOpacity onPress={() => setMode('add')} style={[gdStyles.addBtn, { backgroundColor: goal?.color ?? COLORS.primary }]}>
                <Text style={gdStyles.addBtnText}>+ Agregar aporte</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={gdStyles.sectionLabel}>Nuevo aporte</Text>
              <Text style={gdStyles.label}>Monto (COP)</Text>
              <TextInput
                style={gdStyles.input}
                value={formatThousands(amount)}
                onChangeText={v => setAmount(v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="number-pad"
                autoFocus
              />
              <Text style={gdStyles.label}>Fecha</Text>
              <TextInput
                style={gdStyles.input}
                value={date}
                onChangeText={setDate}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={COLORS.textDim}
              />
              <Text style={gdStyles.label}>Nota (opcional)</Text>
              <TextInput
                style={gdStyles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Ej: Quincena, bono, regalo..."
                placeholderTextColor={COLORS.textDim}
              />
              <View style={gdStyles.formActions}>
                <TouchableOpacity onPress={() => setMode('list')} style={gdStyles.cancelBtn}>
                  <Text style={gdStyles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdd}
                  disabled={!Number(amount.replace(/\D/g, ''))}
                  style={[gdStyles.saveBtn, { backgroundColor: goal?.color ?? COLORS.primary },
                          !amount && gdStyles.saveBtnOff]}
                >
                  <Text style={gdStyles.saveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}


// ── Goal Form Modal ───────────────────────────────────────────────────────────

interface GoalModalProps { visible: boolean; goal: Goal | null; onSave: (g: Goal) => void; onClose: () => void; }

function GoalFormModal({ visible, goal, onSave, onClose }: GoalModalProps) {
  const [name, setName]         = useState('');
  const [target, setTarget]     = useState('');
  const [saved, setSaved]       = useState('');
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji]       = useState(GOAL_EMOJI_OPTIONS[0]);

  const COLORS = useColors();
  const gStyles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    title: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, marginBottom: 16 },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    emojiBtn: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card2, borderWidth: 1.5, borderColor: 'transparent' },
    emojiBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '18' },
    emojiText: { fontSize: 22 },
    preview: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.card2, borderRadius: 12, padding: 14, marginTop: 14 },
    previewEmoji: { fontSize: 26 },
    previewName: { color: COLORS.text, fontWeight: '600', fontSize: FONT.md },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  React.useEffect(() => {
    if (goal) {
      setName(goal.name); setTarget(String(goal.targetAmount));
      setSaved(String(goal.savedAmount)); setDeadline(goal.deadline ?? '');
      setEmoji(goal.emoji ?? GOAL_EMOJI_OPTIONS[0]);
    } else {
      setName(''); setTarget(''); setSaved('0'); setDeadline('');
      setEmoji(GOAL_EMOJI_OPTIONS[0]);
    }
  }, [goal, visible]);

  const valid = name.trim().length > 0 && Number(target.replace(/\D/g, '')) > 0;

  const handleSave = () => {
    if (!valid) return;
    const idx = GOAL_EMOJI_OPTIONS.indexOf(emoji);
    const autoColor = GOAL_COLORS[idx >= 0 ? idx % GOAL_COLORS.length : 0];
    onSave({
      id: goal?.id ?? `goal_${Date.now()}`,
      name: name.trim(),
      targetAmount: Number(target.replace(/\D/g, '')),
      savedAmount: Number(saved.replace(/\D/g, '')) || 0,
      color: autoColor,
      emoji,
      deadline: deadline.trim() || undefined,
      createdAt: goal?.createdAt ?? new Date().toISOString(),
      deposits: goal?.deposits,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={gStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={gStyles.sheet}>
          <View style={gStyles.handle} />
          <Text style={gStyles.title}>{goal ? 'Editar meta' : 'Nueva meta de ahorro'}</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={gStyles.label}>Nombre</Text>
            <TextInput style={gStyles.input} value={name} onChangeText={setName} placeholder="Ej: Viaje, Fondo emergencia" placeholderTextColor={COLORS.textDim} />
            <Text style={gStyles.label}>Monto objetivo (COP)</Text>
            <TextInput
              style={gStyles.input}
              value={target ? Number(target).toLocaleString('es-CO') : ''}
              onChangeText={v => setTarget(v.replace(/\D/g, ''))}
              placeholder="5.000.000"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />
            <Text style={gStyles.label}>Ya ahorrado (COP)</Text>
            <TextInput
              style={gStyles.input}
              value={saved ? Number(saved).toLocaleString('es-CO') : ''}
              onChangeText={v => setSaved(v.replace(/\D/g, ''))}
              placeholder="0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />
            <Text style={gStyles.label}>Fecha límite (opcional)</Text>
            <TextInput style={gStyles.input} value={deadline} onChangeText={setDeadline} placeholder="Ej: Diciembre 2025" placeholderTextColor={COLORS.textDim} />
            <Text style={gStyles.label}>Emoji</Text>
            <View style={gStyles.emojiGrid}>
              {GOAL_EMOJI_OPTIONS.map(e => (
                <TouchableOpacity key={e} onPress={() => setEmoji(e)} style={[gStyles.emojiBtn, emoji === e && gStyles.emojiBtnSelected]}>
                  <Text style={gStyles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={gStyles.preview}>
              <Text style={gStyles.previewEmoji}>{emoji}</Text>
              <Text style={gStyles.previewName}>{name || 'Nombre de la meta'}</Text>
            </View>
          </ScrollView>
          <View style={gStyles.actions}>
            <TouchableOpacity onPress={onClose} style={gStyles.cancelBtn}>
              <Text style={gStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={!valid} style={[gStyles.saveBtn, !valid && gStyles.saveBtnOff]}>
              <Text style={gStyles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────



