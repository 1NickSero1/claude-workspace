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
  getMonthData, getCategories, getCards, saveCategory, deleteCategory,
  getGoals, saveGoal, deleteGoal, addGoalDeposit, deleteGoalDeposit,
  addExpenses, updateExpense, deleteExpense,
  getCurrentMonthKey, formatMonthLabel,
  CustomCategory, Expense, Card, Goal, GoalDeposit, Income,
  getCardTotalSpent, sumIncomes,
} from '@/lib/storage';
import { sumExpenses, formatCOP } from '@/lib/expenseParser';
import CategoryFormModal from '@/components/CategoryFormModal';
import DonutChart, { DonutSlice } from '@/components/DonutChart';
import QuickEntryModal from '@/components/QuickEntryModal';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { buildFinancialReportHtml } from '@/lib/financialReport';

const GOAL_COLORS = ['#6C5CE7','#00C896','#FF5C5C','#FDCB6E','#0984E3','#A29BFE','#00B894','#E17055'];
const INCOME_COLORS = ['#00C896','#0984E3','#6C5CE7','#FDCB6E','#00B894','#A29BFE','#E17055','#FF5C5C'];
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
  const [refreshing, setRefreshing] = useState(false);
  const [catModal, setCatModal]     = useState(false);
  const [editingCat, setEditingCat] = useState<CustomCategory | null>(null);
  const [goalModal, setGoalModal]   = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Category detail modal
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailCat, setDetailCat]         = useState<CustomCategory | null>(null);

  // Goal detail modal
  const [goalDetailVisible, setGoalDetailVisible] = useState(false);
  const [goalDetailTarget, setGoalDetailTarget]   = useState<Goal | null>(null);

  // Quick entry modal
  const [quickEntry, setQuickEntry]         = useState(false);
  const [summaryModal, setSummaryModal]     = useState(false);
  const [exporting, setExporting]           = useState(false);
  const [registrarSheet, setRegistrarSheet] = useState(false);
  const [helpSheet, setHelpSheet]           = useState(false);
  const [patrimonioModal, setPatrimonioModal] = useState(false);
  const [activeDot, setActiveDot]           = useState(0);
  const [catView, setCatView]               = useState<'grid' | 'list'>('grid');

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

  const monthKey = getCurrentMonthKey();

  const load = useCallback(async () => {
    const [d, cats, c, gs] = await Promise.all([
      getMonthData(monthKey), getCategories(), getCards(), getGoals(),
    ]);
    setExpenses(d.expenses);
    setIncomes(d.incomes);
    setCategories(cats);
    setCards(c);
    setGoals(gs);
  }, [monthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleSaveCat = async (cat: CustomCategory) => {
    await saveCategory(cat); setCatModal(false); setEditingCat(null); await load();
  };
  const handleDeleteCat = (cat: CustomCategory) =>
    Alert.alert('Eliminar categoría', `¿Eliminar "${cat.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive',
        onPress: async () => { await deleteCategory(cat.id); await load(); } },
    ]);

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
  let debitSpent = 0, creditSpent = 0;
  for (const e of expenses) {
    const type = e.cardId ? cardTypeMap.get(e.cardId) : 'debit';
    if (type === 'credit') creditSpent += e.amount;
    else debitSpent += e.amount;
  }

  const totalSpent  = sumExpenses(expenses);
  const totalIncome = sumIncomes(incomes);
  const savings     = totalIncome - totalSpent;
  const savingsPct  = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

  const debitAvailable = cards
    .filter(c => c.type === 'debit' && c.balance != null)
    .reduce((s, c) => s + Math.max(c.balance! - getCardTotalSpent(expenses, c.id), 0), 0);
  const creditLimit = cards.filter(c => c.type === 'credit' && c.limit != null)
    .reduce((s, c) => s + c.limit!, 0);
  const hasDebitCards  = cards.some(c => c.type === 'debit');
  const hasCreditCards = cards.some(c => c.type === 'credit');

  // Patrimonio Neto
  const cashAvailable  = cards.filter(c => c.type === 'cash')
    .reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const debtTotal      = cards.filter(c => c.type === 'debt')
    .reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalActivos   = debitAvailable + cashAvailable;
  const totalPasivos   = creditSpent + debtTotal;
  const patrimonioNeto = totalActivos - totalPasivos;

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

  const openDetail = (cat: CustomCategory) => {
    setDetailCat(cat);
    setDetailVisible(true);
  };

  // Donut chart slices: one per category with expenses
  const donutData: DonutSlice[] = catRows
    .filter(r => r.total > 0)
    .map(r => ({ id: r.cat.id, color: r.cat.color, amount: r.total }));

  const donutSize = Math.min(Math.floor((SCREEN_W - 32) * 0.55), 200);
  const cardWidth = SCREEN_W - 32;

  const activoItems = [
    ...cards.filter(c => c.type === 'debit').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '🏦', value: Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0) })),
    ...cards.filter(c => c.type === 'cash').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💵', value: Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0) })),
  ];
  const pasivoItems = [
    ...cards.filter(c => c.type === 'credit').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💳', value: getCardTotalSpent(expenses, c.id) })),
    ...cards.filter(c => c.type === 'debt').map(c => ({ id: c.id, name: c.name, emoji: c.emoji ?? '💸', value: c.balance ?? 0 })),
  ];

  const goalsDonutData: DonutSlice[] = goals
    .filter(g => g.savedAmount > 0 && g.targetAmount > 0)
    .map(g => ({ id: g.id, color: g.color, amount: g.savedAmount }));

  const incomesDonutData: DonutSlice[] = incomes.map((inc, i) => ({
    id: inc.id, color: INCOME_COLORS[i % INCOME_COLORS.length], amount: inc.amount,
  }));

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
    catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catCell: {
      width: '30.5%', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6,
      backgroundColor: COLORS.card, borderRadius: 18,
      borderWidth: 1.5, borderColor: COLORS.border,
      elevation: 1, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 2,
      position: 'relative',
    },
    catCellWarning: { borderColor: COLORS.warning },
    catCellIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    catCellName: { color: COLORS.textMuted, fontSize: 11, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
    catCellAmt: { fontSize: FONT.sm, fontWeight: '800', textAlign: 'center' },
    catCellBadge: { position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.warning, alignItems: 'center', justifyContent: 'center' },
    viewToggle: { flexDirection: 'row', backgroundColor: COLORS.card2, borderRadius: 10, padding: 3, gap: 2 },
    viewToggleBtn: { width: 26, height: 26, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
    viewToggleBtnActive: { backgroundColor: COLORS.primary },
    catList: { gap: 8 },
    catListRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 12, borderWidth: 1.5, borderColor: COLORS.border },
    catListIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, flexShrink: 0 },
    catListBody: { flex: 1 },
    catListTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    catListName: { color: COLORS.text, fontSize: FONT.base, fontWeight: '700', flex: 1, marginRight: 8 },
    catListAmt: { fontSize: FONT.base, fontWeight: '800' },
    catListTrack: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'hidden', marginBottom: 3 },
    catListFill: { height: '100%', borderRadius: 2 },
    catListPct: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },
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
              <Text style={styles.pillValue}>{formatCOP(totalIncome)}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: COLORS.credit }]}>
              <View style={styles.pillIconRow}>
                <Ionicons name="arrow-down-circle" size={12} color="rgba(255,255,255,0.8)" />
                <Text style={styles.pillLabel}>Gastos</Text>
              </View>
              <Text style={styles.pillValue}>{formatCOP(totalSpent)}</Text>
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
          </ScrollView>

          {/* Pagination dots */}
          <View style={styles.dotRow}>
            <View style={[styles.dot, activeDot === 0 && styles.dotActive]} />
            <View style={[styles.dot, activeDot === 1 && styles.dotActive]} />
            <View style={[styles.dot, activeDot === 2 && styles.dotActive]} />
          </View>
        </View>

        {/* ── Patrimonio Neto ──────────────────────────── */}
        {(totalActivos > 0 || totalPasivos > 0) && (() => {
          const netoColor = patrimonioNeto >= 0 ? COLORS.debit : COLORS.danger;
          return (
            <TouchableOpacity activeOpacity={0.82} onPress={() => setPatrimonioModal(true)} style={[styles.patrimonioCard, {
              borderLeftColor: netoColor,
              backgroundColor: patrimonioNeto >= 0 ? COLORS.debit + '0D' : COLORS.danger + '0D',
            }]}>
              <View style={styles.patrimonioHeader}>
                <Ionicons
                  name={patrimonioNeto >= 0 ? 'trending-up' : 'trending-down'}
                  size={18} color={netoColor}
                />
                <Text style={styles.patrimonioTitle}>Patrimonio Neto</Text>
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
            </TouchableOpacity>
          );
        })()}

        {/* ── Débito / Crédito ─────────────────────────── */}
        <View style={styles.summaryRow}>
          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: COLORS.debit }]}
            onPress={() => router.push({ pathname: '/(tabs)/tarjetas', params: { tab: 'cuentas' } })}
            activeOpacity={0.85}
          >
            <View style={styles.summaryCardTop}>
              <View style={styles.summaryCardIcon}>
                <Ionicons name="business" size={13} color={COLORS.debit} />
              </View>
              <Text style={styles.summaryCardType}>Débito</Text>
            </View>
            <Text style={styles.summaryLabel}>Gastado</Text>
            <Text style={styles.summaryAmount}>{formatCOP(debitSpent)}</Text>
            <Text style={styles.summaryLabel2}>Disponible</Text>
            <Text style={styles.summaryAvailable}>
              {hasDebitCards ? formatCOP(Math.max(debitAvailable, 0)) : '—'}
            </Text>
            {!hasDebitCards && <Text style={styles.summaryHint}>Agrega cuentas en Balance</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard, { backgroundColor: COLORS.credit }]}
            onPress={() => router.push({ pathname: '/(tabs)/tarjetas', params: { tab: 'tarjetas' } })}
            activeOpacity={0.85}
          >
            <View style={styles.summaryCardTop}>
              <View style={styles.summaryCardIcon}>
                <Ionicons name="card" size={13} color={COLORS.credit} />
              </View>
              <Text style={styles.summaryCardType}>Crédito</Text>
            </View>
            <Text style={styles.summaryLabel}>Gastado</Text>
            <Text style={styles.summaryAmount}>{formatCOP(creditSpent)}</Text>
            <Text style={styles.summaryLabel2}>
              {hasCreditCards && creditLimit > 0 ? 'Disponible' : 'Deuda total'}
            </Text>
            <Text style={styles.summaryAvailable}>
              {hasCreditCards && creditLimit > 0
                ? formatCOP(Math.max(creditLimit - creditSpent, 0))
                : hasCreditCards ? formatCOP(creditSpent) : '—'}
            </Text>
            {!hasCreditCards && <Text style={styles.summaryHint}>Agrega tarjetas en Balance</Text>}
          </TouchableOpacity>
        </View>

        {/* ── Categorías (grid estilo Monefy) ──────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={styles.viewToggle}>
                <TouchableOpacity onPress={() => setCatView('grid')} style={[styles.viewToggleBtn, catView === 'grid' && styles.viewToggleBtnActive]}>
                  <Ionicons name="grid" size={13} color={catView === 'grid' ? '#fff' : COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setCatView('list')} style={[styles.viewToggleBtn, catView === 'list' && styles.viewToggleBtnActive]}>
                  <Ionicons name="menu" size={13} color={catView === 'list' ? '#fff' : COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => { setEditingCat(null); setCatModal(true); }} style={styles.sectionAddBtn}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {catRows.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="apps-outline" size={40} color={COLORS.textDim} />
              <Text style={styles.emptyText}>Sin gastos este mes</Text>
              <Text style={styles.emptyHint}>Toca + para registrar un gasto</Text>
            </View>
          ) : catView === 'grid' ? (
            <View style={styles.catGrid}>
              {catRows.map(({ cat, total: catTotal }) => {
                const budget = cat.budget ?? 0;
                const overBudget = budget > 0 && catTotal > budget;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catCell, overBudget && styles.catCellWarning]}
                    onPress={() => openDetail(cat)}
                    onLongPress={() =>
                      Alert.alert(cat.name, '', [
                        { text: 'Editar categoría', onPress: () => { setEditingCat(cat); setCatModal(true); } },
                        ...(!cat.isDefault ? [{
                          text: 'Eliminar', style: 'destructive' as const,
                          onPress: () => handleDeleteCat(cat),
                        }] : []),
                        { text: 'Cancelar', style: 'cancel' },
                      ])
                    }
                    activeOpacity={0.75}
                  >
                    <View style={[styles.catCellIcon, { backgroundColor: cat.color + '22' }]}>
                      {cat.emoji
                        ? <Text style={{ fontSize: 26 }}>{cat.emoji}</Text>
                        : <Ionicons name={cat.icon as any} size={26} color={cat.color} />}
                    </View>
                    <Text style={styles.catCellName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={[styles.catCellAmt, { color: catTotal > 0 ? cat.color : COLORS.textDim }]}>
                      {catTotal > 0 ? formatCOP(catTotal) : '$0'}
                    </Text>
                    {overBudget && (
                      <View style={styles.catCellBadge}>
                        <Ionicons name="warning" size={10} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.catList}>
              {catRows.map(({ cat, total: catTotal }) => {
                const budget = cat.budget ?? 0;
                const overBudget = budget > 0 && catTotal > budget;
                const pct = totalSpent > 0 ? Math.min((catTotal / totalSpent) * 100, 100) : 0;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catListRow, overBudget && styles.catCellWarning]}
                    onPress={() => openDetail(cat)}
                    onLongPress={() =>
                      Alert.alert(cat.name, '', [
                        { text: 'Editar categoría', onPress: () => { setEditingCat(cat); setCatModal(true); } },
                        ...(!cat.isDefault ? [{
                          text: 'Eliminar', style: 'destructive' as const,
                          onPress: () => handleDeleteCat(cat),
                        }] : []),
                        { text: 'Cancelar', style: 'cancel' },
                      ])
                    }
                    activeOpacity={0.78}
                  >
                    <View style={[styles.catListIcon, { backgroundColor: cat.color + '22' }]}>
                      {cat.emoji
                        ? <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                        : <Ionicons name={cat.icon as any} size={20} color={cat.color} />}
                    </View>
                    <View style={styles.catListBody}>
                      <View style={styles.catListTopRow}>
                        <Text style={styles.catListName} numberOfLines={1}>{cat.name}</Text>
                        <Text style={[styles.catListAmt, { color: catTotal > 0 ? cat.color : COLORS.textDim }]}>
                          {catTotal > 0 ? formatCOP(catTotal) : '$0'}
                        </Text>
                      </View>
                      <View style={styles.catListTrack}>
                        <View style={[styles.catListFill, { width: `${pct}%`, backgroundColor: cat.color }]} />
                      </View>
                      <Text style={styles.catListPct}>{Math.round(pct)}% del gasto total</Text>
                    </View>
                    {overBudget && (
                      <Ionicons name="warning" size={14} color={COLORS.warning} style={{ marginLeft: 8 }} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

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
                    <Text style={styles.goalsTotalSaved}>{formatCOP(totalSaved)}</Text>
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

      <CategoryFormModal
        visible={catModal}
        category={editingCat}
        onSave={handleSaveCat}
        onClose={() => { setCatModal(false); setEditingCat(null); }}
      />

      <GoalFormModal
        visible={goalModal}
        goal={editingGoal}
        onSave={handleSaveGoal}
        onClose={() => { setGoalModal(false); setEditingGoal(null); }}
      />

      <CategoryDetailModal
        visible={detailVisible}
        cat={detailCat}
        expenses={expenses.filter(e => detailCat ? e.categoryId === detailCat.id : false)}
        cards={cards}
        categories={categories}
        monthKey={monthKey}
        onRefresh={load}
        onClose={() => setDetailVisible(false)}
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
                <Text style={styles.summaryStatVal}>{formatCOP(totalIncome)}</Text>
              </View>
              <View style={[styles.summaryStatBox, { backgroundColor: COLORS.credit }]}>
                <Text style={styles.summaryStatEmoji}>💸</Text>
                <Text style={styles.summaryStatLabel}>Gastos</Text>
                <Text style={styles.summaryStatVal}>{formatCOP(totalSpent)}</Text>
              </View>
              <View style={[styles.summaryStatBox, { backgroundColor: savings >= 0 ? COLORS.primary : COLORS.danger }]}>
                <Text style={styles.summaryStatEmoji}>{savings >= 0 ? '📈' : '📉'}</Text>
                <Text style={styles.summaryStatLabel}>Balance</Text>
                <Text style={styles.summaryStatVal}>{formatCOP(Math.abs(savings))}</Text>
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
              <Text style={styles.patModalTitle}>Patrimonio Neto</Text>
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
                <Text style={styles.patNetLabel}>Patrimonio Neto</Text>
                <Text style={styles.patNetVal}>{patrimonioNeto >= 0 ? '+' : ''}{formatCOP(patrimonioNeto)}</Text>
              </View>
            </ScrollView>
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

// ── Category Detail Modal ─────────────────────────────────────────────────────

interface CatDetailProps {
  visible: boolean;
  cat: CustomCategory | null;
  expenses: Expense[];
  cards: Card[];
  categories: CustomCategory[];
  monthKey: string;
  onRefresh: () => void;
  onClose: () => void;
}

function CategoryDetailModal({ visible, cat, expenses, cards, monthKey, onRefresh, onClose }: CatDetailProps) {
  type Mode = 'list' | 'add' | 'edit';
  const [mode, setMode]         = useState<Mode>('list');
  const [editExp, setEditExp]   = useState<Expense | null>(null);
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [cardId, setCardId]     = useState<string | undefined>(undefined);

  const COLORS = useColors();
  const dStyles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '88%' },
    handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    catIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    catName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg },
    catTotal: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    list: { maxHeight: 360 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: FONT.sm },
    expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 8 },
    expLeft: { flex: 1 },
    expName: { color: COLORS.text, fontWeight: '600', fontSize: FONT.md },
    expMeta: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    expAmt: { color: COLORS.text, fontWeight: '700', fontSize: FONT.md },
    editBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.creditBg, alignItems: 'center', justifyContent: 'center' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, marginTop: 16 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    qRow: { flexDirection: 'row', gap: 10 },
    qBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    qBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    qBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    qBtnTextActive: { color: COLORS.primary },
    cardChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, marginRight: 8, backgroundColor: COLORS.bg },
    cardChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    cardChipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 8 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  const reset = () => { setMode('list'); setEditExp(null); setName(''); setAmount(''); setQuincena(1); setCardId(undefined); };

  const startEdit = (e: Expense) => {
    setEditExp(e);
    setName(e.name);
    setAmount(String(e.amount));
    setQuincena(e.quincena);
    setCardId(e.cardId);
    setMode('edit');
  };

  const startAdd = () => { setName(''); setAmount(''); setQuincena(1); setCardId(undefined); setMode('add'); };

  const handleSave = async () => {
    const amt = Number(amount.replace(/\D/g, ''));
    if (!name.trim() || !amt) return;

    if (mode === 'edit' && editExp) {
      await updateExpense(monthKey, { id: editExp.id, name: name.trim().toUpperCase(), amount: amt, quincena, cardId });
    } else if (mode === 'add' && cat) {
      await addExpenses(monthKey, [{
        id: `${Date.now()}_manual`,
        name: name.trim().toUpperCase(),
        amount: amt,
        categoryId: cat.id,
        quincena,
        cardId,
        createdAt: new Date().toISOString(),
        monthKey,
      }]);
    }
    await onRefresh();
    reset();
  };

  const handleDelete = (e: Expense) => {
    Alert.alert('Eliminar gasto', `¿Eliminar "${e.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteExpense(monthKey, e.id);
        await onRefresh();
      }},
    ]);
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const getCard = (id?: string) => id ? cards.find(c => c.id === id) : undefined;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={dStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={dStyles.sheet}>
          <View style={dStyles.handle} />

          {/* Header */}
          <View style={dStyles.header}>
            {mode !== 'list' ? (
              <TouchableOpacity onPress={reset} style={dStyles.backBtn}>
                <Ionicons name="arrow-back" size={20} color={COLORS.text} />
              </TouchableOpacity>
            ) : (
              <View style={[dStyles.catIcon, { backgroundColor: (cat?.color ?? COLORS.primary) + '22' }]}>
                {cat?.emoji
                  ? <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                  : <Ionicons name={(cat?.icon ?? 'apps') as any} size={20} color={cat?.color ?? COLORS.primary} />}
              </View>
            )}
            <View style={dStyles.headerInfo}>
              <Text style={dStyles.catName}>{cat?.name ?? ''}</Text>
              {mode === 'list' && <Text style={dStyles.catTotal}>{formatCOP(total)} este mes</Text>}
              {mode === 'add' && <Text style={dStyles.catTotal}>Agregar gasto</Text>}
              {mode === 'edit' && <Text style={dStyles.catTotal}>Editar gasto</Text>}
            </View>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={dStyles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* List mode */}
          {mode === 'list' && (
            <>
              <ScrollView style={dStyles.list} showsVerticalScrollIndicator={false}>
                {expenses.length === 0 ? (
                  <View style={dStyles.emptyState}>
                    <Ionicons name="receipt-outline" size={36} color={COLORS.textDim} />
                    <Text style={dStyles.emptyText}>Sin gastos en esta categoría</Text>
                  </View>
                ) : (
                  expenses.map(e => {
                    const card = getCard(e.cardId);
                    return (
                      <View key={e.id} style={dStyles.expRow}>
                        <View style={dStyles.expLeft}>
                          <Text style={dStyles.expName}>{e.name}</Text>
                          <Text style={dStyles.expMeta}>
                            {e.quincena === 1 ? '1ª Quincena' : '2ª Quincena'}
                            {card ? ` · ${card.name}` : ''}
                          </Text>
                        </View>
                        <Text style={dStyles.expAmt}>{formatCOP(e.amount)}</Text>
                        <TouchableOpacity onPress={() => startEdit(e)} style={dStyles.editBtn}>
                          <Ionicons name="pencil" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDelete(e)} style={dStyles.deleteBtn}>
                          <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              <TouchableOpacity onPress={startAdd} style={dStyles.addBtn}>
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={dStyles.addBtnText}>Agregar gasto</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Add / Edit mode */}
          {(mode === 'add' || mode === 'edit') && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={dStyles.label}>Nombre del gasto</Text>
              <TextInput
                style={dStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: ARRIENDO, SPOTIFY"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="characters"
                autoFocus
              />

              <Text style={dStyles.label}>Monto (COP)</Text>
              <TextInput
                style={dStyles.input}
                value={amount}
                onChangeText={v => setAmount(v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="number-pad"
              />

              <Text style={dStyles.label}>Quincena</Text>
              <View style={dStyles.qRow}>
                {([1, 2] as const).map(q => (
                  <TouchableOpacity
                    key={q}
                    onPress={() => setQuincena(q)}
                    style={[dStyles.qBtn, quincena === q && dStyles.qBtnActive]}
                  >
                    <Text style={[dStyles.qBtnText, quincena === q && dStyles.qBtnTextActive]}>
                      {q === 1 ? '1ª Quincena' : '2ª Quincena'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {cards.length > 0 && (
                <>
                  <Text style={dStyles.label}>Tarjeta (opcional)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                    <TouchableOpacity
                      onPress={() => setCardId(undefined)}
                      style={[dStyles.cardChip, !cardId && dStyles.cardChipActive]}
                    >
                      <Text style={[dStyles.cardChipText, !cardId && { color: '#fff' }]}>Sin tarjeta</Text>
                    </TouchableOpacity>
                    {cards.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCardId(c.id)}
                        style={[dStyles.cardChip, cardId === c.id && dStyles.cardChipActive,
                                cardId === c.id && { backgroundColor: c.color }]}
                      >
                        <Text style={[dStyles.cardChipText, cardId === c.id && { color: '#fff' }]}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <View style={dStyles.formActions}>
                <TouchableOpacity onPress={reset} style={dStyles.cancelBtn}>
                  <Text style={dStyles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={!name.trim() || !Number(amount.replace(/\D/g, ''))}
                  style={[dStyles.saveBtn, (!name.trim() || !amount) && dStyles.saveBtnOff]}
                >
                  <Text style={dStyles.saveText}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
                value={amount}
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



