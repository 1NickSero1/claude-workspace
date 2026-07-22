import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, ScrollView, Modal, Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomSheet from './BottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { CustomCategory, Expense, Card, RecurrenceFrequency, updateExpense, addExpenses, deleteExpense } from '@/lib/storage';
import { cancelNotification, scheduleRecurringReminder } from '@/lib/notifications';
import { formatCOP, formatThousands } from '@/lib/expenseParser';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

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

export default function CategoryDetailModal({ visible, cat, expenses, cards, monthKey, onRefresh, onClose }: CatDetailProps) {
  type Mode = 'list' | 'add' | 'edit';
  const [mode, setMode]         = useState<Mode>('list');
  const [editExp, setEditExp]   = useState<Expense | null>(null);
  const [name, setName]         = useState('');
  const [amount, setAmount]     = useState('');
  const [quincena, setQuincena] = useState<1 | 2>(1);
  const [cardId, setCardId]     = useState<string | undefined>(undefined);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency]     = useState<RecurrenceFrequency>('monthly');
  const [dueDate, setDueDate]         = useState('');
  const [dueDateObj, setDueDateObj]   = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmDeleteExp, setConfirmDeleteExp] = useState<Expense | null>(null);

  const COLORS = useColors();
  const dStyles = useMemo(() => StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: SPACING.lg },
    backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    catIcon: { width: 40, height: 40, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { flex: 1 },
    catName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg },
    catTotal: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    list: { maxHeight: 360 },
    emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
    emptyText: { color: COLORS.textMuted, fontSize: FONT.sm },
    expRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.sm },
    expLeft: { flex: 1 },
    expName: { color: COLORS.text, fontWeight: '600', fontSize: FONT.md },
    expMeta: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    expAmt: { color: COLORS.text, fontWeight: '700', fontSize: FONT.md },
    editBtn: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: COLORS.creditBg, alignItems: 'center', justifyContent: 'center' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: 14, padding: 14, marginTop: SPACING.lg },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md, color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border },
    recurringRow: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginTop: 14,
      backgroundColor: COLORS.card2, borderRadius: RADIUS.md, padding: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border,
    },
    recurringLabel: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    recurringCaption: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
    freqRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
    freqBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
      borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    freqBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    freqBtnText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    freqBtnTextActive: { color: COLORS.primary },
    dateField: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md,
      borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.sm,
    },
    dateFieldText: { fontSize: FONT.sm },
    formActions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xl, marginBottom: SPACING.sm },
    cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    confirmOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 28 },
    confirmCard: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, width: '100%',
      alignItems: 'center', borderWidth: 2, borderColor: COLORS.danger + '44',
      elevation: 10, shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12,
    },
    confirmIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.danger + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    confirmTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.sm, textAlign: 'center' },
    confirmText: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', marginBottom: SPACING.xl },
    confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
    confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    confirmCancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.danger },
    confirmDeleteText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  const reset = () => {
    setMode('list'); setEditExp(null); setName(''); setAmount(''); setQuincena(1); setCardId(undefined);
    setIsRecurring(false); setFrequency('monthly'); setDueDate(''); setDueDateObj(null); setShowDatePicker(false);
  };

  const startEdit = (e: Expense) => {
    setEditExp(e);
    setName(e.name);
    setAmount(String(e.amount));
    setQuincena(e.quincena);
    setCardId(e.cardId);
    setIsRecurring(!!e.isRecurring);
    setFrequency(e.recurrenceFrequency ?? 'monthly');
    setDueDate(e.recurrenceDueDate ?? '');
    setMode('edit');
  };

  const startAdd = () => {
    const autoQuincena: 1 | 2 = new Date().getDate() <= 15 ? 1 : 2;
    setName(''); setAmount(''); setQuincena(autoQuincena); setCardId(undefined);
    setIsRecurring(false); setFrequency('monthly'); setDueDate(''); setDueDateObj(null); setMode('add');
  };

  const handleDueDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    setDueDateObj(selected);
    setDueDate(selected.toLocaleDateString('es-CO'));
  };

  const handleSave = async () => {
    const amt = Number(amount.replace(/\D/g, ''));
    if (!name.trim() || !amt) return;
    const trimmedName = name.trim().toUpperCase();

    if (mode === 'edit' && editExp) {
      let notificationId = editExp.notificationId;
      const wasRecurring = !!editExp.isRecurring;
      if (isRecurring && (!wasRecurring || frequency !== editExp.recurrenceFrequency)) {
        if (notificationId) await cancelNotification(notificationId);
        notificationId = await scheduleRecurringReminder(trimmedName, frequency, new Date());
      } else if (!isRecurring && wasRecurring) {
        if (notificationId) await cancelNotification(notificationId);
        notificationId = undefined;
      }
      await updateExpense(monthKey, {
        id: editExp.id, name: trimmedName, amount: amt, quincena, cardId,
        isRecurring: isRecurring || undefined,
        recurrenceFrequency: isRecurring ? frequency : undefined,
        recurrenceDueDate: isRecurring && dueDate ? dueDate : undefined,
        notificationId,
      });
    } else if (mode === 'add' && cat) {
      const notificationId = isRecurring
        ? await scheduleRecurringReminder(trimmedName, frequency, new Date())
        : undefined;
      await addExpenses(monthKey, [{
        id: `${Date.now()}_manual`,
        name: trimmedName,
        amount: amt,
        categoryId: cat.id,
        quincena,
        cardId,
        createdAt: new Date().toISOString(),
        monthKey,
        isRecurring: isRecurring || undefined,
        recurrenceFrequency: isRecurring ? frequency : undefined,
        recurrenceDueDate: isRecurring && dueDate ? dueDate : undefined,
        notificationId,
      }]);
    }
    await onRefresh();
    reset();
  };

  const handleDelete = (e: Expense) => setConfirmDeleteExp(e);

  const confirmDelete = async () => {
    if (!confirmDeleteExp) return;
    await cancelNotification(confirmDeleteExp.notificationId);
    await deleteExpense(monthKey, confirmDeleteExp.id);
    setConfirmDeleteExp(null);
    await onRefresh();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const getCard = (id?: string) => id ? cards.find(c => c.id === id) : undefined;

  return (
    <>
    <BottomSheet visible={visible} onClose={() => { reset(); onClose(); }} maxHeight="88%">
          {/* Header */}
          <View style={dStyles.header}>
            {mode !== 'list' ? (
              <TouchableOpacity
                onPress={reset}
                style={dStyles.backBtn}
                accessibilityRole="button"
                accessibilityLabel="Volver"
              >
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
            <TouchableOpacity
              onPress={() => { reset(); onClose(); }}
              style={dStyles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
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
                            {e.isRecurring
                              ? (e.recurrenceFrequency === 'weekly' ? 'Semanal' : e.recurrenceFrequency === 'biweekly' ? 'Quincenal' : 'Mensual')
                              : (e.quincena === 1 ? '1ª Quincena' : '2ª Quincena')}
                            {e.isRecurring && e.recurrenceDueDate ? ` · vence ${e.recurrenceDueDate}` : ''}
                            {card ? ` · ${card.name}` : ''}
                          </Text>
                        </View>
                        <Text style={dStyles.expAmt}>{formatCOP(e.amount)}</Text>
                        <TouchableOpacity
                          onPress={() => startEdit(e)}
                          style={dStyles.editBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Editar ${e.name}`}
                        >
                          <Ionicons name="pencil" size={14} color={COLORS.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(e)}
                          style={dStyles.deleteBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Eliminar ${e.name}`}
                        >
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
                value={formatThousands(amount)}
                onChangeText={v => setAmount(v.replace(/\D/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textDim}
                keyboardType="number-pad"
              />

              <View style={dStyles.recurringRow}>
                <View style={{ flex: 1 }}>
                  <Text style={dStyles.recurringLabel}>Gasto recurrente</Text>
                  <Text style={dStyles.recurringCaption}>Recibirás un recordatorio automático</Text>
                </View>
                <Switch
                  value={isRecurring}
                  onValueChange={setIsRecurring}
                  trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
                  thumbColor={isRecurring ? COLORS.primary : COLORS.textDim}
                />
              </View>
              {isRecurring && (
                <>
                  <View style={dStyles.freqRow}>
                    {(['weekly', 'biweekly', 'monthly'] as const).map(f => (
                      <TouchableOpacity
                        key={f}
                        onPress={() => setFrequency(f)}
                        style={[dStyles.freqBtn, frequency === f && dStyles.freqBtnActive]}
                      >
                        <Text style={[dStyles.freqBtnText, frequency === f && dStyles.freqBtnTextActive]}>
                          {f === 'weekly' ? 'Semanal' : f === 'biweekly' ? 'Quincenal' : 'Mensual'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={dStyles.label}>¿Qué día lo tienes que pagar? (opcional)</Text>
                  <TouchableOpacity style={dStyles.dateField} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                    <Text style={[dStyles.dateFieldText, { color: dueDate ? COLORS.text : COLORS.textDim }]}>
                      {dueDate || 'Selecciona una fecha'}
                    </Text>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={dueDateObj ?? new Date()}
                      mode="date"
                      display="default"
                      onChange={handleDueDateChange}
                    />
                  )}
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
    </BottomSheet>

    {/* Confirmación de eliminar (reemplaza Alert.alert nativo) */}
    <Modal visible={!!confirmDeleteExp} animationType="fade" transparent onRequestClose={() => setConfirmDeleteExp(null)}>
      <TouchableOpacity style={dStyles.confirmOverlay} activeOpacity={1} onPress={() => setConfirmDeleteExp(null)}>
        <TouchableOpacity style={dStyles.confirmCard} activeOpacity={1} onPress={() => {}}>
          <View style={dStyles.confirmIcon}>
            <Ionicons name="trash" size={26} color={COLORS.danger} />
          </View>
          <Text style={dStyles.confirmTitle}>Eliminar gasto</Text>
          <Text style={dStyles.confirmText}>
            ¿Eliminar "{confirmDeleteExp?.name}"?
          </Text>
          <View style={dStyles.confirmActions}>
            <TouchableOpacity style={dStyles.confirmCancelBtn} onPress={() => setConfirmDeleteExp(null)}>
              <Text style={dStyles.confirmCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dStyles.confirmDeleteBtn} onPress={confirmDelete}>
              <Text style={dStyles.confirmDeleteText}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
    </>
  );
}
