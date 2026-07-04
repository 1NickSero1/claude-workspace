import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getCards, saveCard, deleteCard, getMonthData, getCurrentMonthKey,
  getCardTotalSpent, getCategories, updateExpense, deleteExpense,
  appendCardEvent,
  Card, Expense, CustomCategory,
} from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import CardView from '@/components/CardView';
import CardFormModal from '@/components/CardFormModal';
import { FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

type SubTab = 'cuentas' | 'tarjetas';

const fmt = (n: number) => n.toLocaleString('es-CO');

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function TarjetasScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();

  const [activeTab, setActiveTab]       = useState<SubTab>('cuentas');
  const [cards, setCards]               = useState<Card[]>([]);
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [categories, setCategories]     = useState<CustomCategory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCard, setEditingCard]   = useState<Card | null>(null);
  const [pendingTypes, setPendingTypes] = useState<Card['type'][]>(['debit', 'cash']);

  const [actionCard, setActionCard]     = useState<Card | null>(null);
  const [actionStep, setActionStep]     = useState<'menu' | 'money'>('menu');
  const [actionAmount, setActionAmount] = useState('');
  const [actionNote, setActionNote]     = useState('');
  const [debtHistModal, setDebtHistModal] = useState(false);
  const [overflowModal, setOverflowModal] = useState(false);
  const [overflowInfo, setOverflowInfo]   = useState({ entered: 0, pending: 0 });

  const [expModal, setExpModal]         = useState(false);
  const [editingExp, setEditingExp]     = useState<Expense | null>(null);
  const [expName, setExpName]           = useState('');
  const [expAmount, setExpAmount]       = useState('');

  const monthKey = getCurrentMonthKey();

  useFocusEffect(useCallback(() => {
    if (params.tab === 'tarjetas' || params.tab === 'cuentas') {
      setActiveTab(params.tab as SubTab);
    }
  }, [params.tab]));

  const load = useCallback(async () => {
    const [c, d, cats] = await Promise.all([
      getCards(),
      getMonthData(monthKey),
      getCategories(),
    ]);
    setCards(c);
    setExpenses(d.expenses);
    setCategories(cats);
  }, [monthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const COLORS = useColors();

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, backgroundColor: COLORS.bg },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl },
    subTabBar: {
      flexDirection: 'row', marginHorizontal: 16, marginBottom: 16,
      backgroundColor: COLORS.card, borderRadius: 14, padding: 4,
      elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    subTab: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
    subTabInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subTabText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    subTabTextActive: { color: '#fff', fontWeight: '700' },
    subTabBadge: {
      minWidth: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.25)',
      alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    },
    subTabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    scroll: { paddingBottom: 40 },
    creditSummaryRow: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12 },
    creditSummaryBox: {
      flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12,
      alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    creditSummaryLabel: { color: COLORS.textMuted, fontSize: 11, marginBottom: 4 },
    creditSummaryVal: { fontWeight: '700', fontSize: FONT.base },
    emptyState: { paddingHorizontal: 20, paddingVertical: 32, alignItems: 'center', gap: 20 },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20 },
    addDashedBtn: {
      borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
      borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, width: '100%', alignItems: 'center',
    },
    addDashedText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.md },
    listSection: { paddingHorizontal: 16 },
    addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
    addMoreText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.sm },
    cardScroll: { paddingHorizontal: 16, paddingBottom: 16, gap: 14 },
    sectionDivider: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginHorizontal: 16, marginTop: 24, marginBottom: 14,
      paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    sectionDividerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.base },
    sectionDividerAmt: { color: COLORS.debt, fontWeight: '700', fontSize: FONT.base },
    debtSummaryCard: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: 16, marginBottom: 14, backgroundColor: COLORS.debtBg,
      borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.debt + '33',
    },
    debtSummaryLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 2 },
    debtSummaryVal: { fontWeight: '800', fontSize: FONT.lg },
    debtSummaryBadge: {
      backgroundColor: COLORS.debt + '22', borderRadius: 10,
      paddingHorizontal: 10, paddingVertical: 5,
    },
    debtSummaryBadgeText: { color: COLORS.debt, fontWeight: '700', fontSize: FONT.sm },
    balanceFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginHorizontal: 16, marginTop: 20, marginBottom: 4,
      backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    balanceFooterLabel: { color: COLORS.textMuted, fontSize: FONT.sm },
    balanceFooterAmount: { color: COLORS.debit, fontWeight: '800', fontSize: FONT.lg },
  }), [COLORS]);

  const actStyles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: {
      backgroundColor: COLORS.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
      paddingBottom: 32, overflow: 'hidden', maxHeight: '85%',
    },
    handle: {
      width: 40, height: 4, backgroundColor: COLORS.border,
      borderRadius: 2, alignSelf: 'center', marginTop: 14,
    },
    preview: {
      marginHorizontal: 20, marginTop: 16, borderRadius: 18, padding: 18, height: 92,
      justifyContent: 'space-between', overflow: 'hidden',
      elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 5,
    },
    previewShine: {
      position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
      backgroundColor: 'rgba(255,255,255,0.13)',
    },
    previewCircle: {
      position: 'absolute', right: -14, top: -14, width: 80, height: 80,
      borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.07)',
    },
    previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewMeta: { color: 'rgba(255,255,255,0.75)', fontSize: FONT.sm },
    previewType: { color: 'rgba(255,255,255,0.9)', fontSize: FONT.sm, fontWeight: '600' },
    previewName: { color: '#fff', fontWeight: '800', fontSize: FONT.lg },
    balanceRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginHorizontal: 20, marginTop: 16,
    },
    balanceLabel: { color: COLORS.textMuted, fontSize: FONT.sm },
    balanceVal: { fontWeight: '800', fontSize: FONT.xl },
    statsRow: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 12, marginBottom: 6 },
    statBox: {
      flex: 1, backgroundColor: COLORS.bg, borderRadius: 10, padding: 10,
      alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
    },
    statLabel: { color: COLORS.textMuted, fontSize: 10, marginBottom: 3 },
    statVal: { color: COLORS.text, fontWeight: '700', fontSize: FONT.sm },
    progressTrack: {
      height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden',
      marginHorizontal: 20, marginBottom: 4,
    },
    progressFill: { height: '100%', borderRadius: 3 },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 20, marginVertical: 12 },
    histSection: { marginHorizontal: 20, marginBottom: 4 },
    histTitle: {
      color: COLORS.textMuted, fontSize: 11, fontWeight: '700',
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
    },
    histRow: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    histLabel: { flex: 1, color: COLORS.text, fontSize: FONT.sm },
    histAmt: { fontWeight: '700', fontSize: FONT.sm },
    histDate: { color: COLORS.textDim, fontSize: 10 },
    histNote: { color: COLORS.textDim, fontSize: 10, marginTop: 1 },
    optionsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 4 },
    optBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
      backgroundColor: COLORS.bg, borderRadius: 14, paddingVertical: 14,
      borderWidth: 1, borderColor: COLORS.border,
    },
    optBtnDanger: { borderColor: COLORS.danger + '55', backgroundColor: COLORS.danger + '11' },
    optBtnText: { fontWeight: '700', fontSize: FONT.sm, color: COLORS.text },
    optBtnTextDanger: { color: COLORS.danger },
    addMoneyBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginHorizontal: 20, marginTop: 10, paddingVertical: 16, borderRadius: 16,
    },
    addMoneyBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 20, marginTop: 16, marginBottom: 4 },
    backBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    moneyTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginHorizontal: 20, marginTop: 6 },
    moneyInput: {
      backgroundColor: COLORS.bg, borderRadius: 14, padding: 16,
      color: COLORS.text, fontSize: FONT.xxl, fontWeight: '700',
      borderWidth: 1.5, borderColor: COLORS.border,
      marginHorizontal: 20, marginTop: 16, textAlign: 'center',
    },
    noteInput: {
      backgroundColor: COLORS.bg, borderRadius: 12, padding: 14,
      color: COLORS.text, fontSize: FONT.base,
      borderWidth: 1, borderColor: COLORS.border,
      marginHorizontal: 20, marginTop: 10,
    },
    confirmBtn: { marginHorizontal: 20, marginTop: 14, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    debtModalTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginHorizontal: 20, marginTop: 12, marginBottom: 2 },
    debtModalTotal: { color: COLORS.textMuted, fontSize: FONT.sm, marginHorizontal: 20, marginBottom: 12 },
    debtModalEmpty: { color: COLORS.textMuted, textAlign: 'center', marginVertical: 28, fontSize: FONT.sm },
    overflowOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 28 },
    overflowCard: {
      backgroundColor: COLORS.card, borderRadius: 24, padding: 28, width: '100%',
      alignItems: 'center', borderWidth: 2, borderColor: COLORS.danger + '44',
      elevation: 10, shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12,
    },
    overflowIcon: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: COLORS.danger + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    },
    overflowTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: 8, textAlign: 'center' },
    overflowRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 },
    overflowRowLabel: { color: COLORS.textMuted, fontSize: FONT.sm },
    overflowRowVal: { fontWeight: '700', fontSize: FONT.sm },
    overflowDivider: { width: '100%', height: 1, backgroundColor: COLORS.border, marginVertical: 12 },
    overflowHint: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    overflowBtn: { backgroundColor: COLORS.danger, borderRadius: 14, paddingVertical: 14, width: '100%', alignItems: 'center' },
    overflowBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  const expStyles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
    handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    title: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, marginBottom: 4 },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: { flex: 1, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  const debitCards = cards.filter(c => c.type === 'debit');
  const cashCards  = cards.filter(c => c.type === 'cash');
  const cuentas    = [...debitCards, ...cashCards];
  const tarjetas   = cards.filter(c => c.type === 'credit');
  const debts      = cards.filter(c => c.type === 'debt');

  const totalBalance     = cuentas.reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const totalCash        = cashCards.reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const totalDebt        = debts.reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalCreditUsed  = tarjetas.reduce((s, c) => s + getCardTotalSpent(expenses, c.id), 0);
  const totalCreditAvail = tarjetas.reduce((s, c) => s + Math.max((c.limit ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const totalDebitSpent  = debitCards.reduce((s, c) => s + getCardTotalSpent(expenses, c.id), 0);
  const totalDebitAvail  = debitCards.reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const totalCuentasSpent = cuentas.reduce((s, c) => s + getCardTotalSpent(expenses, c.id), 0);

  const allDebtPayments = debts
    .flatMap(c =>
      (c.events ?? [])
        .filter(e => e.type === 'pay')
        .map(e => ({ ...e, cardName: c.name, cardColor: c.color, cardEmoji: c.emoji }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getCatColor = (id: string) => categories.find(c => c.id === id)?.color ?? COLORS.textDim;

  const handleSaveCard = async (card: Card) => {
    await saveCard(card);
    setModalVisible(false);
    setEditingCard(null);
    await load();
  };

  const openAdd = (types?: Card['type'][]) => {
    const defaults: Card['type'][] = activeTab === 'tarjetas' ? ['credit', 'debt'] : ['debit', 'cash'];
    setEditingCard(null);
    setPendingTypes(types ?? defaults);
    setModalVisible(true);
  };

  const openAction = (card: Card) => {
    setActionCard(card);
    setActionStep('menu');
    setActionAmount('');
    setActionNote('');
  };

  const closeAction = () => {
    setActionCard(null);
    setActionStep('menu');
    setActionAmount('');
    setActionNote('');
  };

  const handleAddMoney = async () => {
    if (!actionCard) return;
    const amount = Number(actionAmount);
    if (!amount) return;
    const isDebt = actionCard.type === 'debt';
    if (isDebt && amount > (actionCard.balance ?? 0)) {
      setOverflowInfo({ entered: amount, pending: actionCard.balance ?? 0 });
      setOverflowModal(true);
      return;
    }
    await saveCard({
      ...actionCard,
      balance: isDebt
        ? Math.max((actionCard.balance ?? 0) - amount, 0)
        : (actionCard.balance ?? 0) + amount,
    });
    await appendCardEvent(actionCard.id, {
      type: isDebt ? 'pay' : 'deposit',
      amount,
      date: new Date().toISOString(),
      note: actionNote.trim() || undefined,
    });
    closeAction();
    await load();
  };

  const handleDeleteCard = (card: Card) => {
    Alert.alert('Eliminar', `¿Eliminar "${card.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        await deleteCard(card.id);
        closeAction();
        await load();
      }},
    ]);
  };

  const openExpenseEdit = (exp: Expense) => {
    closeAction();
    setTimeout(() => {
      setEditingExp(exp);
      setExpName(exp.name);
      setExpAmount(String(exp.amount));
      setExpModal(true);
    }, 350);
  };

  const handleSaveExp = async () => {
    if (!editingExp) return;
    const amount = Number(expAmount.replace(/\D/g, '').replace(/\./g, ''));
    if (!expName.trim() || !amount) return;
    await updateExpense(monthKey, { id: editingExp.id, name: expName.trim().toUpperCase(), amount });
    setExpModal(false);
    setEditingExp(null);
    await load();
  };

  const subTabColor = (tab: SubTab) => tab === 'cuentas' ? COLORS.debit : COLORS.credit;

  const actionExpenses = actionCard
    ? expenses.filter(e => e.cardId === actionCard.id).slice(-3).reverse()
    : [];
  const actionEvents   = actionCard?.events?.slice().reverse().slice(0, 3) ?? [];
  const actionTotal    = actionCard ? getCardTotalSpent(expenses, actionCard.id) : 0;
  const actionLimitPct = actionCard?.type === 'credit' && actionCard.limit
    ? Math.min((actionTotal / actionCard.limit) * 100, 100)
    : 0;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Balance</Text>
      </View>

      <View style={styles.subTabBar}>
        {(['cuentas', 'tarjetas'] as SubTab[]).map(tab => {
          const isActive = activeTab === tab;
          const count = tab === 'cuentas' ? cuentas.length : tarjetas.length + debts.length;
          const icon: keyof typeof Ionicons.glyphMap = tab === 'cuentas' ? 'business-outline' : 'card-outline';
          const label = tab === 'cuentas' ? 'DÉBITO' : 'CRÉDITO';
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.subTab, isActive && { backgroundColor: subTabColor(tab) }]}
            >
              <View style={styles.subTabInner}>
                <Ionicons name={icon} size={13} color={isActive ? '#fff' : COLORS.textMuted} />
                <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                  {label}
                </Text>
                {isActive && count > 0 && (
                  <View style={styles.subTabBadge}>
                    <Text style={styles.subTabBadgeText}>{count}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {activeTab === 'cuentas' && (
          <>
            {/* ── Sección Débito ── */}
            {debitCards.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyHint}>Agrega tus cuentas bancarias o tarjetas débito</Text>
                <TouchableOpacity onPress={() => openAdd(['debit'])} style={styles.addDashedBtn}>
                  <Text style={styles.addDashedText}>+ Agregar débito</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {cuentas.length > 1 && (
                  <View style={styles.creditSummaryRow}>
                    <View style={styles.creditSummaryBox}>
                      <Text style={styles.creditSummaryLabel}>Total gastado</Text>
                      <Text style={[styles.creditSummaryVal, { color: COLORS.credit }]}>{formatCOP(totalCuentasSpent)}</Text>
                    </View>
                    <View style={styles.creditSummaryBox}>
                      <Text style={styles.creditSummaryLabel}>Total disponible</Text>
                      <Text style={[styles.creditSummaryVal, { color: COLORS.debit }]}>{formatCOP(totalBalance)}</Text>
                    </View>
                  </View>
                )}
                <View style={[styles.sectionDivider, { marginTop: 8 }]}>
                  <Text style={styles.sectionDividerTitle}>Tarjetas de débito</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardScroll}
                >
                  {debitCards.map(card => (
                    <CardView
                      key={card.id}
                      card={card}
                      totalSpent={getCardTotalSpent(expenses, card.id)}
                      selected={false}
                      onPress={() => openAction(card)}
                      onLongPress={() => openAction(card)}
                    />
                  ))}
                </ScrollView>
                <View style={{ paddingHorizontal: 16 }}>
                  <TouchableOpacity onPress={() => openAdd(['debit'])} style={styles.addMoreBtn}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.addMoreText}>Agregar débito</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* ── Sección Efectivo ── */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerTitle}>Efectivo</Text>
              {totalCash > 0 && <Text style={[styles.sectionDividerAmt, { color: COLORS.debit }]}>{formatCOP(totalCash)}</Text>}
            </View>

            {cashCards.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={[styles.emptyHint, { marginBottom: 16 }]}>
                  Registra tu dinero en efectivo o billetera
                </Text>
                <TouchableOpacity
                  onPress={() => openAdd(['cash'])}
                  style={[styles.addDashedBtn, { borderColor: COLORS.cash }]}
                >
                  <Text style={[styles.addDashedText, { color: COLORS.cash }]}>+ Agregar efectivo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listSection}>
                {cashCards.map(card => (
                  <TouchableOpacity key={card.id} onPress={() => openAction(card)} activeOpacity={0.85}>
                    <AccountRow card={card} spent={getCardTotalSpent(expenses, card.id)} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => openAdd(['cash'])} style={styles.addMoreBtn}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.cash} />
                  <Text style={[styles.addMoreText, { color: COLORS.cash }]}>Agregar efectivo</Text>
                </TouchableOpacity>
              </View>
            )}

          </>
        )}

        {activeTab === 'tarjetas' && (
          <>
            {tarjetas.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyHint}>Agrega tus tarjetas de crédito</Text>
                <TouchableOpacity onPress={() => openAdd(['credit', 'debt'])} style={styles.addDashedBtn}>
                  <Text style={styles.addDashedText}>+ Agregar tarjeta de crédito</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {tarjetas.length > 1 && (
                  <View style={styles.creditSummaryRow}>
                    <View style={styles.creditSummaryBox}>
                      <Text style={styles.creditSummaryLabel}>Total gastado</Text>
                      <Text style={[styles.creditSummaryVal, { color: COLORS.credit }]}>{formatCOP(totalCreditUsed)}</Text>
                    </View>
                    <View style={styles.creditSummaryBox}>
                      <Text style={styles.creditSummaryLabel}>Total disponible</Text>
                      <Text style={[styles.creditSummaryVal, { color: COLORS.debit }]}>{formatCOP(totalCreditAvail)}</Text>
                    </View>
                  </View>
                )}
                <View style={[styles.sectionDivider, { marginTop: 8 }]}>
                  <Text style={styles.sectionDividerTitle}>Tarjetas de crédito</Text>
                  {totalCreditUsed > 0 && (
                    <Text style={[styles.sectionDividerAmt, { color: COLORS.credit }]}>{formatCOP(totalCreditUsed)}</Text>
                  )}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.cardScroll}
                >
                  {tarjetas.map(card => (
                    <CardView
                      key={card.id}
                      card={card}
                      totalSpent={getCardTotalSpent(expenses, card.id)}
                      selected={false}
                      onPress={() => openAction(card)}
                      onLongPress={() => openAction(card)}
                    />
                  ))}
                </ScrollView>

                <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
                  <TouchableOpacity onPress={() => openAdd(['credit', 'debt'])} style={styles.addMoreBtn}>
                    <Ionicons name="add-circle-outline" size={16} color={COLORS.primary} />
                    <Text style={styles.addMoreText}>Agregar tarjeta</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.sectionDivider}>
              <Text style={styles.sectionDividerTitle}>Préstamos</Text>
              {totalDebt > 0 && <Text style={[styles.sectionDividerAmt, { color: COLORS.danger }]}>{formatCOP(totalDebt)}</Text>}
            </View>

            {debts.length > 0 && (
              <TouchableOpacity style={styles.debtSummaryCard} onPress={() => setDebtHistModal(true)} activeOpacity={0.8}>
                <View>
                  <Text style={styles.debtSummaryLabel}>Total deuda</Text>
                  <Text style={[styles.debtSummaryVal, { color: COLORS.danger }]}>{formatCOP(totalDebt)}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.debtSummaryBadge}>
                    <Text style={styles.debtSummaryBadgeText}>
                      {debts.length} {debts.length === 1 ? 'préstamo' : 'préstamos'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.debt} />
                </View>
              </TouchableOpacity>
            )}

            {debts.length === 0 ? (
              <View style={{ paddingHorizontal: 20 }}>
                <Text style={[styles.emptyHint, { marginBottom: 16 }]}>
                  Registra préstamos o deudas informales
                </Text>
                <TouchableOpacity
                  onPress={() => openAdd(['debt', 'credit'])}
                  style={[styles.addDashedBtn, { borderColor: COLORS.debt }]}
                >
                  <Text style={[styles.addDashedText, { color: COLORS.debt }]}>+ Agregar préstamo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.listSection}>
                {debts.map(card => (
                  <TouchableOpacity key={card.id} onPress={() => openAction(card)} activeOpacity={0.85}>
                    <AccountRow card={card} spent={0} />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity onPress={() => openAdd(['debt', 'credit'])} style={styles.addMoreBtn}>
                  <Ionicons name="add-circle-outline" size={16} color={COLORS.debt} />
                  <Text style={[styles.addMoreText, { color: COLORS.debt }]}>Agregar préstamo</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>

      <CardFormModal
        visible={modalVisible}
        card={editingCard}
        allowedTypes={pendingTypes}
        onSave={handleSaveCard}
        onClose={() => { setModalVisible(false); setEditingCard(null); }}
      />

      {/* Action bottom sheet */}
      <Modal visible={!!actionCard} animationType="slide" transparent onRequestClose={closeAction}>
        <KeyboardAvoidingView
          style={actStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity style={{ flex: 1 }} onPress={closeAction} activeOpacity={1} />
          <View style={actStyles.sheet}>
            <View style={actStyles.handle} />

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {actionStep === 'menu' && actionCard && (() => {
                const isDebt   = actionCard.type === 'debt';
                const isCash   = actionCard.type === 'cash';
                const isCredit = actionCard.type === 'credit';
                const accentColor = isDebt ? COLORS.danger : isCredit ? COLORS.credit : COLORS.debit;

                return (
                  <>
                    <View style={[actStyles.preview, { backgroundColor: actionCard.color }]}>
                      <View style={actStyles.previewShine} />
                      <View style={actStyles.previewCircle} />
                      <View style={actStyles.previewTop}>
                        <Text style={actStyles.previewMeta}>
                          {actionCard.emoji
                            ? actionCard.emoji
                            : isCash ? 'Efectivo'
                            : isCredit ? (actionCard.bank || 'Crédito')
                            : (actionCard.bank || 'Débito')}
                        </Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={actStyles.previewType}>
                            {isDebt ? 'Préstamo' : isCash ? 'Efectivo' : isCredit ? 'Crédito' : 'Débito'}
                          </Text>
                          {isDebt && actionCard.initialBalance != null && (
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600', marginTop: 3 }}>
                              {formatCOP(actionCard.initialBalance)}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text style={actStyles.previewName}>{actionCard.name}</Text>
                    </View>

                    {isCredit ? (
                      <>
                        <View style={actStyles.statsRow}>
                          <View style={actStyles.statBox}>
                            <Text style={actStyles.statLabel}>Gastado</Text>
                            <Text style={[actStyles.statVal, { color: COLORS.credit }]}>{formatCOP(actionTotal)}</Text>
                          </View>
                          {actionCard.limit ? (
                            <View style={actStyles.statBox}>
                              <Text style={actStyles.statLabel}>Disponible</Text>
                              <Text style={[actStyles.statVal, { color: COLORS.debit }]}>
                                {formatCOP(Math.max(actionCard.limit - actionTotal, 0))}
                              </Text>
                            </View>
                          ) : null}
                          <View style={actStyles.statBox}>
                            <Text style={actStyles.statLabel}>Límite</Text>
                            <Text style={actStyles.statVal}>{actionCard.limit ? formatCOP(actionCard.limit) : '—'}</Text>
                          </View>
                        </View>
                        {actionCard.limit ? (
                          <View style={actStyles.progressTrack}>
                            <View style={[actStyles.progressFill, {
                              width: `${actionLimitPct}%`,
                              backgroundColor: actionLimitPct > 85 ? COLORS.danger : COLORS.primary,
                            }]} />
                          </View>
                        ) : null}
                      </>
                    ) : (
                      <>
                        {isDebt && actionCard.initialBalance != null && (
                          <View style={actStyles.balanceRow}>
                            <Text style={actStyles.balanceLabel}>Deuda inicial</Text>
                            <Text style={[actStyles.balanceVal, { color: COLORS.textMuted, fontSize: FONT.base }]}>
                              {formatCOP(actionCard.initialBalance)}
                            </Text>
                          </View>
                        )}
                        {actionCard.balance != null && (
                          <View style={actStyles.balanceRow}>
                            <Text style={actStyles.balanceLabel}>
                              {isDebt ? 'Pendiente por pagar' : 'Saldo disponible'}
                            </Text>
                            <Text style={[actStyles.balanceVal, { color: accentColor }]}>
                              {formatCOP(isDebt
                                ? (actionCard.balance ?? 0)
                                : Math.max((actionCard.balance ?? 0) - getCardTotalSpent(expenses, actionCard.id), 0)
                              )}
                            </Text>
                          </View>
                        )}
                        {isDebt && actionCard.dueDate && (
                          <View style={[actStyles.balanceRow, { marginTop: 8 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name="calendar-outline" size={14} color={COLORS.textMuted} />
                              <Text style={actStyles.balanceLabel}>Fecha límite</Text>
                            </View>
                            <Text style={[actStyles.balanceVal, { fontSize: FONT.sm, color: COLORS.textMuted }]}>
                              {actionCard.dueDate}
                            </Text>
                          </View>
                        )}
                      </>
                    )}

                    {(actionEvents.length > 0 || actionExpenses.length > 0) && (
                      <>
                        <View style={actStyles.divider} />
                        <View style={actStyles.histSection}>
                          <Text style={actStyles.histTitle}>Historial reciente</Text>
                          {actionEvents.map((ev, i) => (
                            <View key={`ev-${i}`} style={actStyles.histRow}>
                              <Ionicons
                                name={ev.type === 'pay' ? 'arrow-down-circle-outline' : 'add-circle-outline'}
                                size={14}
                                color={ev.type === 'pay' ? COLORS.debt : COLORS.debit}
                              />
                              <View style={{ flex: 1 }}>
                                <Text style={[actStyles.histLabel, { flex: 0 }]}>
                                  {ev.type === 'pay' ? 'Abono' : 'Depósito'}
                                </Text>
                                {ev.note ? <Text style={actStyles.histNote}>{ev.note}</Text> : null}
                              </View>
                              <Text style={[actStyles.histAmt, { color: ev.type === 'pay' ? COLORS.debt : COLORS.debit }]}>
                                {formatCOP(ev.amount)}
                              </Text>
                              <Text style={actStyles.histDate}>{fmtDate(ev.date)}</Text>
                            </View>
                          ))}
                          {actionExpenses.map(e => (
                            <TouchableOpacity key={`exp-${e.id}`} style={actStyles.histRow} onPress={() => openExpenseEdit(e)}>
                              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getCatColor(e.categoryId) }} />
                              <Text style={actStyles.histLabel}>{e.name}</Text>
                              <Text style={[actStyles.histAmt, { color: getCatColor(e.categoryId) }]}>
                                {formatCOP(e.amount)}
                              </Text>
                              <Ionicons name="pencil-outline" size={10} color={COLORS.textDim} />
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}

                    <View style={actStyles.divider} />

                    <View style={actStyles.optionsRow}>
                      <TouchableOpacity
                        style={actStyles.optBtn}
                        onPress={() => {
                          const card = actionCard;
                          closeAction();
                          setTimeout(() => {
                            setEditingCard(card);
                            setPendingTypes([card.type]);
                            setModalVisible(true);
                          }, 350);
                        }}
                      >
                        <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                        <Text style={[actStyles.optBtnText, { color: COLORS.primary }]}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[actStyles.optBtn, actStyles.optBtnDanger]}
                        onPress={() => handleDeleteCard(actionCard)}
                      >
                        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                        <Text style={[actStyles.optBtnText, actStyles.optBtnTextDanger]}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>

                    {!isCredit && (
                      <TouchableOpacity
                        style={[actStyles.addMoneyBtn, { backgroundColor: accentColor, marginBottom: 4 }]}
                        onPress={() => setActionStep('money')}
                      >
                        <Ionicons
                          name={isDebt ? 'arrow-down-circle-outline' : 'add-circle-outline'}
                          size={20} color="#fff"
                        />
                        <Text style={actStyles.addMoneyBtnText}>
                          {isDebt ? 'Abonar al préstamo' : 'Agregar dinero'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                );
              })()}

              {actionStep === 'money' && actionCard && (
                <>
                  <TouchableOpacity style={actStyles.backBtn} onPress={() => setActionStep('menu')}>
                    <Ionicons name="arrow-back" size={16} color={COLORS.textMuted} />
                    <Text style={actStyles.backBtnText}>Volver</Text>
                  </TouchableOpacity>
                  <Text style={actStyles.moneyTitle}>
                    {actionCard.type === 'debt' ? '¿Cuánto abonaste?' : '¿Cuánto quieres agregar?'}
                  </Text>
                  <TextInput
                    style={actStyles.moneyInput}
                    value={actionAmount ? fmt(Number(actionAmount)) : ''}
                    onChangeText={v => setActionAmount(v.replace(/\D/g, '').replace(/\./g, ''))}
                    placeholder="$0"
                    placeholderTextColor={COLORS.textDim}
                    keyboardType="number-pad"
                    autoFocus
                  />
                  <TextInput
                    style={actStyles.noteInput}
                    value={actionNote}
                    onChangeText={setActionNote}
                    placeholder="Observación (opcional)"
                    placeholderTextColor={COLORS.textDim}
                    maxLength={80}
                  />
                  <TouchableOpacity
                    style={[actStyles.confirmBtn, {
                      backgroundColor: actionCard.type === 'debt' ? COLORS.debt : COLORS.debit,
                      marginBottom: 8,
                    }]}
                    onPress={handleAddMoney}
                  >
                    <Text style={actStyles.confirmBtnText}>
                      {actionCard.type === 'debt' ? 'Registrar abono' : 'Agregar dinero'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Expense edit modal */}
      <Modal visible={expModal} animationType="slide" transparent onRequestClose={() => setExpModal(false)}>
        <KeyboardAvoidingView
          style={expStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={expStyles.sheet}>
            <View style={expStyles.handle} />
            <Text style={expStyles.title}>Editar gasto</Text>
            <Text style={expStyles.label}>Nombre</Text>
            <TextInput
              style={expStyles.input}
              value={expName}
              onChangeText={setExpName}
              placeholder="Nombre del gasto"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="characters"
            />
            <Text style={expStyles.label}>Monto (COP)</Text>
            <TextInput
              style={expStyles.input}
              value={expAmount ? fmt(Number(expAmount)) : ''}
              onChangeText={v => setExpAmount(v.replace(/\D/g, '').replace(/\./g, ''))}
              placeholder="0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />
            <View style={expStyles.actions}>
              <TouchableOpacity onPress={() => { setExpModal(false); setEditingExp(null); }} style={expStyles.cancelBtn}>
                <Text style={expStyles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveExp} style={expStyles.saveBtn}>
                <Text style={expStyles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Overflow warning modal */}
      <Modal visible={overflowModal} animationType="fade" transparent onRequestClose={() => setOverflowModal(false)}>
        <View style={actStyles.overflowOverlay}>
          <View style={actStyles.overflowCard}>
            <View style={actStyles.overflowIcon}>
              <Ionicons name="alert-circle" size={34} color={COLORS.danger} />
            </View>
            <Text style={actStyles.overflowTitle}>Abono mayor a la deuda</Text>
            <View style={actStyles.overflowRow}>
              <Text style={actStyles.overflowRowLabel}>Monto ingresado</Text>
              <Text style={[actStyles.overflowRowVal, { color: COLORS.danger }]}>{formatCOP(overflowInfo.entered)}</Text>
            </View>
            <View style={actStyles.overflowRow}>
              <Text style={actStyles.overflowRowLabel}>Pendiente por pagar</Text>
              <Text style={[actStyles.overflowRowVal, { color: COLORS.debit }]}>{formatCOP(overflowInfo.pending)}</Text>
            </View>
            <View style={actStyles.overflowDivider} />
            <Text style={actStyles.overflowHint}>
              No puedes abonar más de lo que debes. Modifica el monto para continuar.
            </Text>
            <TouchableOpacity style={actStyles.overflowBtn} onPress={() => setOverflowModal(false)}>
              <Text style={actStyles.overflowBtnText}>Entendido, voy a corregirlo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Debt payments history modal */}
      <Modal visible={debtHistModal} animationType="slide" transparent onRequestClose={() => setDebtHistModal(false)}>
        <KeyboardAvoidingView style={actStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setDebtHistModal(false)} activeOpacity={1} />
          <View style={actStyles.sheet}>
            <View style={actStyles.handle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={actStyles.debtModalTitle}>Historial de abonos</Text>
              {allDebtPayments.length > 0 ? (
                <>
                  <Text style={actStyles.debtModalTotal}>
                    Total abonado: {formatCOP(allDebtPayments.reduce((s, e) => s + e.amount, 0))}
                  </Text>
                  <View style={actStyles.histSection}>
                    {allDebtPayments.map((ev, i) => (
                      <View key={i} style={actStyles.histRow}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.cardColor }} />
                        <View style={{ flex: 1 }}>
                          <Text style={[actStyles.histLabel, { flex: 0 }]}>
                            {ev.cardEmoji ? `${ev.cardEmoji} ` : ''}{ev.cardName}
                          </Text>
                          {ev.note ? <Text style={actStyles.histNote}>{ev.note}</Text> : null}
                        </View>
                        <Text style={[actStyles.histAmt, { color: COLORS.danger }]}>{formatCOP(ev.amount)}</Text>
                        <Text style={actStyles.histDate}>{fmtDate(ev.date)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <Text style={actStyles.debtModalEmpty}>Aún no hay abonos registrados</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function AccountRow({ card, spent }: { card: Card; spent: number }) {
  const COLORS = useColors();
  const s = useMemo(() => StyleSheet.create({
    row: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: COLORS.card, borderRadius: 16, padding: 14, marginBottom: 10,
      elevation: 2, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 1, shadowRadius: 4,
    },
    icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    info: { flex: 1 },
    name: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base },
    sub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    right: { alignItems: 'flex-end' },
    balance: { fontWeight: '700', fontSize: FONT.base },
    spentText: { color: COLORS.credit, fontSize: FONT.sm, marginTop: 2 },
  }), [COLORS]);

  const isCash = card.type === 'cash';
  const isDebt = card.type === 'debt';
  const available = isDebt
    ? (card.balance ?? 0)
    : Math.max((card.balance ?? 0) - spent, 0);
  const icon: keyof typeof Ionicons.glyphMap =
    isCash ? 'cash-outline' : isDebt ? 'receipt-outline' : 'business-outline';
  const subtitle = isCash ? 'Efectivo'
    : isDebt ? (card.dueDate ? `Vence: ${card.dueDate}` : 'Préstamo pendiente')
    : (card.bank || 'Débito');

  return (
    <View style={s.row}>
      <View style={[s.icon, { backgroundColor: card.color + '22' }]}>
        {card.emoji ? (
          <Text style={{ fontSize: 22 }}>{card.emoji}</Text>
        ) : (
          <Ionicons name={icon} size={20} color={card.color} />
        )}
      </View>
      <View style={s.info}>
        <Text style={s.name}>{card.name}</Text>
        <Text style={s.sub}>{subtitle}</Text>
      </View>
      <View style={s.right}>
        <Text style={[s.balance, { color: isDebt ? COLORS.danger : COLORS.debit }]}>{formatCOP(available)}</Text>
        {!isDebt && spent > 0 && <Text style={s.spentText}>-{formatCOP(spent)} gastado</Text>}
      </View>
    </View>
  );
}
