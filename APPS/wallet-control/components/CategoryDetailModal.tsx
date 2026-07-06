import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomCategory, Expense, Card, updateExpense, addExpenses, deleteExpense } from '@/lib/storage';
import { cancelNotification } from '@/lib/notifications';
import { formatCOP, formatThousands } from '@/lib/expenseParser';
import { FONT } from '@/constants/theme';
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
        await cancelNotification(e.notificationId);
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
                value={formatThousands(amount)}
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
