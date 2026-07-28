import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getMonthData, getCategories, getCards, getUserProfile, getRecurringTemplates,
  saveRecurringDefinition, deleteRecurringDefinition, getRecurringDefinitions,
  getCurrentMonthKey, CustomCategory, Expense, Card, RecurringTemplate, RecurrenceFrequency, UserProfile,
} from '@/lib/storage';
import { splitRecurringByPaid, paidInQuincena, getPayableCards, getSpendableCards, payRecurringTemplate, unpayRecurringTemplate } from '@/lib/recurringPayments';
import { scheduleRecurringReminder, cancelNotification } from '@/lib/notifications';
import { formatCOP, formatThousands } from '@/lib/expenseParser';
import PayRecurringModal from '@/components/PayRecurringModal';
import BottomSheet from '@/components/BottomSheet';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

export default function GastosRecurrentesScreen() {
  const COLORS = useColors();
  const monthKey = getCurrentMonthKey();
  const quincena: 1 | 2 = new Date().getDate() <= 15 ? 1 : 2;

  const [expenses, setExpenses]     = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [cards, setCards]           = useState<Card[]>([]);
  const [templates, setTemplates]   = useState<RecurringTemplate[]>([]);
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payTarget, setPayTarget]   = useState<RecurringTemplate | null>(null);
  const [payCardId, setPayCardId]   = useState<string | undefined>(undefined);
  const [paySaving, setPaySaving]   = useState(false);
  const [addModal, setAddModal]         = useState(false);
  const [newName, setNewName]           = useState('');
  const [newAmount, setNewAmount]       = useState('');
  const [newCategoryId, setNewCategoryId] = useState<string | undefined>(undefined);
  const [newFrequency, setNewFrequency] = useState<RecurrenceFrequency>('monthly');
  const [newSaving, setNewSaving]       = useState(false);

  const load = useCallback(async () => {
    const [d, cats, c, t, p] = await Promise.all([
      getMonthData(monthKey), getCategories(), getCards(), getRecurringTemplates(), getUserProfile(),
    ]);
    setExpenses(d.expenses);
    setCategories(cats);
    setCards(c);
    setTemplates(t);
    setProfile(p);
  }, [monthKey]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const period = profile?.budgetPeriod ?? 'biweekly';
  const { pending, paid: paidAll } = splitRecurringByPaid(templates, expenses, quincena);
  // "Pagados" solo debe listar lo que se pagó de verdad en esta quincena —
  // no todo lo que ya cuenta como pagado en el mes (ver paidInQuincena).
  const paid = paidInQuincena(paidAll, expenses, quincena);
  const payableCards = getPayableCards(cards, expenses);
  const spendableCards = getSpendableCards(cards);
  const periodLabel = period === 'weekly' ? 'esta semana' : period === 'monthly' ? 'este mes' : `la quincena ${quincena}`;

  const getCat = (id: string) => categories.find(c => c.id === id);

  const groupByCategory = (list: RecurringTemplate[]) => {
    const map = new Map<string, RecurringTemplate[]>();
    for (const t of list) {
      const arr = map.get(t.categoryId) ?? [];
      arr.push(t);
      map.set(t.categoryId, arr);
    }
    return [...map.entries()]
      .map(([categoryId, items]) => ({ categoryId, cat: getCat(categoryId), items }))
      .sort((a, b) => (a.cat?.name ?? '').localeCompare(b.cat?.name ?? ''));
  };

  const pendingGroups = groupByCategory(pending);
  const paidGroups = groupByCategory(paid);

  const openPay = (t: RecurringTemplate) => {
    setPayTarget(t);
    setPayCardId(t.lastCardId && payableCards.some(c => c.id === t.lastCardId) ? t.lastCardId : undefined);
  };

  const confirmPay = async () => {
    if (!payTarget || !payCardId || paySaving) return;
    setPaySaving(true);
    try {
      await payRecurringTemplate(monthKey, quincena, payTarget, payCardId);
      setPayTarget(null);
      await load();
    } finally {
      setPaySaving(false);
    }
  };

  const unpay = async (t: RecurringTemplate) => {
    await unpayRecurringTemplate(monthKey, quincena, t, expenses);
    await load();
  };

  const removeDefinition = async (t: RecurringTemplate) => {
    if (!t.defId) return;
    const def = (await getRecurringDefinitions()).find(d => d.id === t.defId);
    if (def?.notificationId) await cancelNotification(def.notificationId);
    await deleteRecurringDefinition(t.defId);
    await load();
  };

  const openAdd = () => {
    setNewName(''); setNewAmount(''); setNewFrequency('monthly');
    setNewCategoryId(categories[0]?.id);
    setAddModal(true);
  };

  const newAmountNum = Number(newAmount.replace(/\D/g, ''));
  const isDuplicateNewName = !!newCategoryId && templates.some(t =>
    t.categoryId === newCategoryId && t.name.trim().toLowerCase() === newName.trim().toLowerCase(),
  );
  const canSaveNew = !!newName.trim() && !!newAmountNum && !!newCategoryId && !isDuplicateNewName;

  const confirmAddNew = async () => {
    if (!canSaveNew || newSaving) return;
    setNewSaving(true);
    try {
      const notificationId = await scheduleRecurringReminder(newName.trim().toUpperCase(), newFrequency, new Date());
      await saveRecurringDefinition({
        id: `${Date.now()}_def`,
        name: newName.trim().toUpperCase(),
        categoryId: newCategoryId!,
        amount: newAmountNum,
        frequency: newFrequency,
        createdAt: new Date().toISOString(),
        notificationId,
      });
      setAddModal(false);
      await load();
    } finally {
      setNewSaving(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    headerSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    scroll: { padding: SPACING.lg, paddingBottom: 40 },
    emptyState: { alignItems: 'center', paddingVertical: 60, gap: 10 },
    emptyText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    emptyHint: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', marginTop: SPACING.xs },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.lg, marginBottom: SPACING.sm },
    sectionTitle: { fontWeight: '800', fontSize: FONT.md },
    sectionCount: { fontWeight: '700', fontSize: FONT.sm },
    catGroup: { marginBottom: SPACING.md },
    catGroupTitle: { color: COLORS.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: SPACING.xs },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
      borderWidth: 1, borderColor: COLORS.border,
    },
    rowPending: { borderStyle: 'dashed', borderColor: COLORS.warning + '88', backgroundColor: COLORS.warning + '0D' },
    rowName: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    rowMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    rowAmt: { fontWeight: '700', fontSize: FONT.sm, marginRight: SPACING.sm },
    payBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: COLORS.debitBg, borderRadius: RADIUS.pill,
      paddingHorizontal: SPACING.md, paddingVertical: 7,
    },
    payBtnText: { color: COLORS.debit, fontWeight: '700', fontSize: 12 },
    undoBtn: {
      width: 30, height: 30, borderRadius: 15,
      backgroundColor: COLORS.card2, alignItems: 'center', justifyContent: 'center',
    },
    fab: {
      position: 'absolute', bottom: 24, right: 24,
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      elevation: 6, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 1, shadowRadius: 8,
    },
    sheetTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.xs },
    sheetHint: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: SPACING.lg },
    dupHint: { color: COLORS.danger, fontSize: FONT.xs, marginTop: 6 },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 14, marginBottom: 6 },
    input: {
      backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md,
      color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    catChip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    catChipActive: { borderColor: 'transparent' },
    catChipText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    freqRow: { flexDirection: 'row', gap: SPACING.sm },
    freqBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    freqBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    freqBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    freqBtnTextActive: { color: COLORS.primary },
    formActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xl },
    cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Gastos recurrentes</Text>
          <Text style={styles.headerSub}>{pending.length} pendientes · {paid.length} pagados en {periodLabel}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {templates.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={40} color={COLORS.textDim} />
            <Text style={styles.emptyText}>Sin gastos fijos configurados</Text>
            <Text style={styles.emptyHint}>Actívalos con el toggle "Gasto recurrente" al registrar un gasto</Text>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Pendientes</Text>
              <Text style={[styles.sectionCount, { color: COLORS.warning }]}>{pending.length}</Text>
            </View>
            {pendingGroups.length === 0 ? (
              <Text style={styles.emptyHint}>¡Al día! No tienes gastos fijos pendientes en {periodLabel}.</Text>
            ) : pendingGroups.map(({ categoryId, cat, items }) => (
              <View key={categoryId} style={styles.catGroup}>
                <Text style={styles.catGroupTitle}>{cat?.emoji ?? '💸'} {cat?.name ?? 'Sin categoría'}</Text>
                {items.map(t => (
                  <View key={t.name} style={[styles.row, styles.rowPending]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{t.name}</Text>
                      <Text style={styles.rowMeta}>
                        {t.frequency === 'weekly' ? 'Semanal' : t.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                        {t.dueDate ? ` · vence ${t.dueDate}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.rowAmt, { color: COLORS.credit }]}>{formatCOP(t.amount)}</Text>
                    {!!t.defId && (
                      <TouchableOpacity
                        onPress={() => removeDefinition(t)}
                        style={styles.undoBtn}
                        accessibilityRole="button"
                        accessibilityLabel={`Reversar ${t.name}`}
                      >
                        <Ionicons name="close" size={15} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => openPay(t)}
                      style={styles.payBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Marcar ${t.name} como pagado`}
                    >
                      <Ionicons name="checkmark" size={16} color={COLORS.debit} />
                      <Text style={styles.payBtnText}>Pagar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}

            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={16} color={COLORS.debit} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Pagados</Text>
              <Text style={[styles.sectionCount, { color: COLORS.debit }]}>{paid.length}</Text>
            </View>
            {paidGroups.length === 0 ? (
              <Text style={styles.emptyHint}>Todavía no marcas ninguno como pagado en {periodLabel}.</Text>
            ) : paidGroups.map(({ categoryId, cat, items }) => (
              <View key={categoryId} style={styles.catGroup}>
                <Text style={styles.catGroupTitle}>{cat?.emoji ?? '💸'} {cat?.name ?? 'Sin categoría'}</Text>
                {items.map(t => (
                  <View key={t.name} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowName}>{t.name}</Text>
                      <Text style={styles.rowMeta}>
                        {t.frequency === 'weekly' ? 'Semanal' : t.frequency === 'biweekly' ? 'Quincenal' : 'Mensual'}
                      </Text>
                    </View>
                    <Text style={[styles.rowAmt, { color: COLORS.textMuted }]}>{formatCOP(t.amount)}</Text>
                    <TouchableOpacity
                      onPress={() => unpay(t)}
                      style={styles.undoBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Marcar ${t.name} como no pagado`}
                    >
                      <Ionicons name="arrow-undo-outline" size={16} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={openAdd}
        accessibilityRole="button"
        accessibilityLabel="Nuevo gasto recurrente"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <PayRecurringModal
        target={payTarget}
        cardId={payCardId}
        cards={spendableCards}
        expenses={expenses}
        saving={paySaving}
        onSelectCard={setPayCardId}
        onConfirm={confirmPay}
        onCancel={() => setPayTarget(null)}
        onRecharge={() => { setPayTarget(null); router.push('/tarjetas'); }}
      />

      <BottomSheet visible={addModal} onClose={() => setAddModal(false)} maxHeight="88%">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.sheetTitle}>Nuevo gasto recurrente</Text>
          <Text style={styles.sheetHint}>Se agrega como pendiente — lo marcas pagado cuando lo pagues de verdad.</Text>

          <Text style={styles.label}>Nombre del gasto</Text>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Ej: NETFLIX, ARRIENDO"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="characters"
          />
          {isDuplicateNewName && (
            <Text style={styles.dupHint}>Ya tienes un gasto recurrente con ese nombre en esta categoría.</Text>
          )}

          <Text style={styles.label}>Monto (COP)</Text>
          <TextInput
            style={styles.input}
            value={formatThousands(newAmount)}
            onChangeText={v => setNewAmount(v.replace(/\D/g, '').slice(0, 12))}
            placeholder="0"
            placeholderTextColor={COLORS.textDim}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>Categoría</Text>
          <View style={styles.chipRow}>
            {categories.map(c => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setNewCategoryId(c.id)}
                style={[styles.catChip, newCategoryId === c.id && styles.catChipActive,
                        newCategoryId === c.id && { backgroundColor: c.color + '22', borderColor: c.color }]}
              >
                <Text style={[styles.catChipText, newCategoryId === c.id && { color: c.color }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Frecuencia</Text>
          <View style={styles.freqRow}>
            {(['weekly', 'biweekly', 'monthly'] as const).map(f => (
              <TouchableOpacity
                key={f}
                onPress={() => setNewFrequency(f)}
                style={[styles.freqBtn, newFrequency === f && styles.freqBtnActive]}
              >
                <Text style={[styles.freqBtnText, newFrequency === f && styles.freqBtnTextActive]}>
                  {f === 'weekly' ? 'Semanal' : f === 'biweekly' ? 'Quincenal' : 'Mensual'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formActions}>
            <TouchableOpacity onPress={() => setAddModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirmAddNew}
              disabled={!canSaveNew || newSaving}
              style={[styles.saveBtn, (!canSaveNew || newSaving) && styles.saveBtnOff]}
            >
              <Text style={styles.saveText}>{newSaving ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}
