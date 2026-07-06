import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import {
  CustomCategory, Expense, Income, RecurrenceFrequency,
  getCurrentMonthKey, addExpenses, addIncomes,
} from '@/lib/storage';
import { scheduleRecurringReminder } from '@/lib/notifications';
import { formatThousands } from '@/lib/expenseParser';

interface Props {
  visible: boolean;
  categories: CustomCategory[];
  onSave: () => void;
  onClose: () => void;
}

type EntryType = 'gasto' | 'ingreso';

export default function QuickEntryModal({ visible, categories, onSave, onClose }: Props) {
  const [type, setType] = useState<EntryType>('gasto');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');

  useEffect(() => {
    if (!visible) {
      setType('gasto');
      setAmount('');
      setDescription('');
      setSelectedCategoryId(null);
      setSaving(false);
      setIsRecurring(false);
      setFrequency('monthly');
    }
  }, [visible]);

  const numericAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
  const canSave =
    numericAmount > 0 &&
    (type === 'ingreso' || selectedCategoryId !== null);

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
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 20,
      paddingBottom: 32,
      maxHeight: '92%',
    },
    handle: {
      width: 40, height: 4, backgroundColor: COLORS.border,
      borderRadius: 2, alignSelf: 'center', marginBottom: 16,
    },
    header: {
      flexDirection: 'row', alignItems: 'center',
      justifyContent: 'space-between', marginBottom: 16,
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
    },
    toggleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    toggleBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 10, borderRadius: 12,
      borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    toggleText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    amountBox: {
      flexDirection: 'row', alignItems: 'center',
      borderRadius: 16, borderWidth: 1.5,
      paddingHorizontal: 20, paddingVertical: 6,
      marginBottom: 12,
    },
    currencySymbol: {
      color: COLORS.textMuted, fontSize: FONT.xxl,
      fontWeight: '700', marginRight: 4,
    },
    amountInput: {
      flex: 1, fontSize: FONT.xxl * 1.4, fontWeight: '800',
      textAlign: 'center', paddingVertical: 4,
    },
    descInput: {
      backgroundColor: COLORS.bg, borderRadius: 12, padding: 12,
      color: COLORS.text, fontSize: FONT.md,
      borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    },
    categoryScroll: { maxHeight: 240 },
    categoryGrid: {
      flexDirection: 'row', flexWrap: 'wrap',
      gap: 8, paddingBottom: 8,
    },
    categoryCell: {
      width: '30.5%', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4,
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
      width: 16, height: 16, borderRadius: 8,
      alignItems: 'center', justifyContent: 'center',
    },
    saveBtn: {
      marginTop: 16, paddingVertical: 16,
      borderRadius: 16, alignItems: 'center',
    },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT.base },
    recurringRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, marginBottom: 14,
      backgroundColor: COLORS.card2, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: COLORS.border,
    },
    recurringLabel: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    recurringCaption: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    freqRow: { flexDirection: 'row', gap: 8, marginTop: -6, marginBottom: 14 },
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
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.sheet}
        >
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Registrar</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
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
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

