import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as _COLORS, FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import BottomSheet from './BottomSheet';
import {
  CustomCategory, Card, Expense, Income, RecurrenceFrequency,
  getCurrentMonthKey, addExpenses, addIncomes,
} from '@/lib/storage';
import { getPayableCards } from '@/lib/recurringPayments';
import { scheduleRecurringReminder } from '@/lib/notifications';
import { formatThousands } from '@/lib/expenseParser';

type EntryType = 'gasto' | 'ingreso';

interface Props {
  visible: boolean;
  categories: CustomCategory[];
  cards: Card[];
  expenses: Expense[];
  initialType?: EntryType;
  onSave: () => void;
  onClose: () => void;
}

export default function QuickEntryModal({ visible, categories, cards, expenses, initialType, onSave, onClose }: Props) {
  const [type, setType] = useState<EntryType>(initialType ?? 'gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');

  const payableCards = useMemo(() => getPayableCards(cards, expenses), [cards, expenses]);

  useEffect(() => {
    if (visible) {
      setType(initialType ?? 'gasto');
      setAmount('');
      setDescription('');
      setSelectedCategoryId(null);
      setSelectedCardId(null);
      setSaving(false);
      setIsRecurring(false);
      setFrequency('monthly');
    }
  }, [visible, initialType]);

  const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const canSave =
    numericAmount > 0 &&
    (type === 'ingreso' || (selectedCategoryId !== null && selectedCardId !== null));

  function handleAmountChange(text: string) {
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
  }

  async function handleSave() {
    if (!canSave || saving) return;
    setSaving(true);
    const monthKey = getCurrentMonthKey();
    const day = new Date().getDate();
    const quincena: 1 | 2 = day <= 15 ? 1 : 2;
    const now = new Date().toISOString();
    const finalAmount = parseInt(amount, 10);

    try {
      if (type === 'gasto') {
        const catName = categories.find(c => c.id === selectedCategoryId)?.name ?? 'Gasto';
        const expenseName = description.trim() || catName;
        const notificationId = isRecurring
          ? await scheduleRecurringReminder(expenseName, frequency, new Date())
          : undefined;
        const expense: Expense = {
          id: `exp_${Date.now()}`,
          name: expenseName,
          amount: finalAmount,
          categoryId: selectedCategoryId!,
          cardId: selectedCardId!,
          quincena,
          createdAt: now,
          monthKey,
          isRecurring: isRecurring || undefined,
          recurrenceFrequency: isRecurring ? frequency : undefined,
          notificationId,
        };
        await addExpenses(monthKey, [expense]);
      } else {
        const income: Income = {
          id: `inc_${Date.now()}`,
          description: description.trim() || 'Ingreso',
          amount: finalAmount,
          quincena,
          createdAt: now,
          monthKey,
        };
        await addIncomes(monthKey, [income]);
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: SPACING.lg,
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    closeBtn: {
      width: 32, height: 32, borderRadius: RADIUS.lg,
      backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
    },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.lg },
    toggleBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: RADIUS.md,
      borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    toggleText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    amountBox: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: RADIUS.lg, borderWidth: 1.5,
      paddingHorizontal: SPACING.xl, paddingVertical: 6,
      marginBottom: SPACING.md,
    },
    currencySymbol: {
      color: COLORS.textMuted, fontSize: FONT.xxl,
      fontWeight: '700', marginRight: SPACING.xs,
    },
    amountInput: {
      flex: 1, fontSize: FONT.xxl * 1.4, fontWeight: '800',
      textAlign: 'center', paddingVertical: SPACING.xs,
    },
    descInput: {
      backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: SPACING.md,
      color: COLORS.text, fontSize: FONT.md,
      borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    },
    categoryScroll: { maxHeight: 240, marginBottom: SPACING.md },
    fieldLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 8 },
    cardScroll: { marginBottom: SPACING.md },
    cardChipRow: { flexDirection: 'row', gap: SPACING.sm, paddingRight: SPACING.md },
    cardChip: {
      paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.pill,
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    cardChipText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    noFundsBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: COLORS.danger + '18', borderRadius: RADIUS.md, padding: SPACING.md,
      marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.danger + '40',
    },
    noFundsText: { color: COLORS.danger, fontSize: FONT.sm, flex: 1, lineHeight: 18 },
    categoryGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      gap: SPACING.sm, paddingBottom: SPACING.sm,
    },
    categoryCell: {
      width: '30.5%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: SPACING.xs,
      borderRadius: 14, borderWidth: 1.5, borderColor: COLORS.border,
      backgroundColor: COLORS.bg, position: 'relative',
    },
    catIconCircle: {
      width: 44, height: 44, borderRadius: 22,
      alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    },
    catName: { color: COLORS.textMuted, fontSize: 11, textAlign: 'center' },
    checkDot: {
      position: 'absolute', top: 6, right: 6,
      width: 16, height: 16, borderRadius: RADIUS.sm,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: {
      marginTop: SPACING.lg, paddingVertical: 16,
      borderRadius: RADIUS.lg, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT.base },
    recurringRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: SPACING.xs, marginBottom: 14,
      backgroundColor: COLORS.card2, borderRadius: RADIUS.md, padding: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border,
    },
    recurringLabel: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    recurringCaption: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    freqRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: -6, marginBottom: 14 },
    freqBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    freqBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    freqBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    freqBtnTextActive: { color: COLORS.primary },
  }), [COLORS]);

  const isGasto = type === 'gasto';
  const activeColor = isGasto ? COLORS.credit : COLORS.debit;
  const activeBg = isGasto ? COLORS.creditBg : COLORS.debitBg;

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      radius={28}
      maxHeight="92%"
      overlayOpacity={0.45}
      sheetStyle={{ paddingBottom: 32 }}
    >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Registrar</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Toggle Gasto / Ingreso */}
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[styles.toggleBtn, isGasto && { backgroundColor: COLORS.creditBg, borderColor: COLORS.credit }]}
              onPress={() => { setType('gasto'); setSelectedCategoryId(null); }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-down-circle" size={16} color={isGasto ? COLORS.credit : COLORS.textDim} />
              <Text style={[styles.toggleText, isGasto && { color: COLORS.credit }]}>Gasto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isGasto && { backgroundColor: COLORS.debitBg, borderColor: COLORS.debit }]}
              onPress={() => setType('ingreso')}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-up-circle" size={16} color={!isGasto ? COLORS.debit : COLORS.textDim} />
              <Text style={[styles.toggleText, !isGasto && { color: COLORS.debit }]}>Ingreso</Text>
            </TouchableOpacity>
          </View>

          {/* Category grid */}
          {isGasto && (
            <ScrollView
              style={styles.categoryScroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.categoryGrid}>
                {categories.map(cat => {
                  const selected = selectedCategoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryCell,
                        selected && { borderColor: cat.color, backgroundColor: cat.color + '18' },
                      ]}
                      onPress={() => setSelectedCategoryId(cat.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.catIconCircle, { backgroundColor: cat.color + '25' }]}>
                        <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                      </View>
                      <Text style={[styles.catName, selected && { color: cat.color, fontWeight: '700' }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      {selected && (
                        <View style={[styles.checkDot, { backgroundColor: cat.color }]}>
                          <Ionicons name="checkmark" size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          )}

          {/* De dónde sale el dinero — solo cuentas con saldo/cupo disponible */}
          {isGasto && (
            payableCards.length === 0 ? (
              <View style={styles.noFundsBox}>
                <Ionicons name="warning" size={16} color={COLORS.danger} />
                <Text style={styles.noFundsText}>
                  Ninguna cuenta tiene saldo disponible ahora mismo — usa otro medio de pago o agrega saldo antes de registrar este gasto.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>¿De dónde salió el dinero?</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardScroll}>
                  <View style={styles.cardChipRow}>
                    {payableCards.map(c => {
                      const selected = selectedCardId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => setSelectedCardId(c.id)}
                          style={[styles.cardChip, selected && { backgroundColor: c.color + '22', borderColor: c.color }]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.cardChipText, selected && { color: c.color }]}>{c.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )
          )}

          {/* Amount display */}
          <View style={[styles.amountBox, { borderColor: activeColor + '40', backgroundColor: activeBg }]}>
            <Text style={styles.currencySymbol}>$</Text>
            <TextInput
              style={[styles.amountInput, { color: activeColor }]}
              value={formatThousands(amount)}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={activeColor + '60'}
              keyboardType="number-pad"
              autoFocus={visible}
            />
          </View>

          {/* Description */}
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder={isGasto ? 'Descripción (opcional)' : 'Descripción'}
            placeholderTextColor={COLORS.textDim}
            returnKeyType="done"
          />

          {/* Gasto recurrente */}
          {isGasto && (
            <>
              <View style={styles.recurringRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recurringLabel}>Gasto recurrente</Text>
                  <Text style={styles.recurringCaption}>Recibirás un recordatorio automático</Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
                  thumbColor={isRecurring ? COLORS.primary : COLORS.textDim}
                />
              </View>
              {isRecurring && (
                <View style={styles.freqRow}>
                  {(['weekly', 'monthly'] as const).map(f => (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFrequency(f)}
                      style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}
                    >
                      <Text style={[styles.freqBtnText, frequency === f && styles.freqBtnTextActive]}>
                        {f === 'weekly' ? 'Semanal' : 'Mensual'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Save button */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              { backgroundColor: canSave ? activeColor : COLORS.textDim },
            ]}
            onPress={handleSave}
            disabled={!canSave || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
          </TouchableOpacity>
    </BottomSheet>
  );
}

