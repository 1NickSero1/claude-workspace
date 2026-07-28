import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, Expense, RecurringTemplate, getCardTotalSpent } from '@/lib/storage';
import { getCardAvailable } from '@/lib/recurringPayments';
import { formatCOP } from '@/lib/expenseParser';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import CardView from './CardView';

interface Props {
  target: RecurringTemplate | null;
  cardId: string | undefined;
  cards: Card[];
  expenses: Expense[];
  saving: boolean;
  onSelectCard: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRecharge: () => void;
}

export default function PayRecurringModal({
  target, cardId, cards, expenses, saving, onSelectCard, onConfirm, onCancel, onRecharge,
}: Props) {
  const COLORS = useColors();
  const [insufficient, setInsufficient] = useState(false);

  useEffect(() => {
    if (!target) setInsufficient(false);
  }, [target]);

  const selectedCard = cardId ? cards.find(c => c.id === cardId) : undefined;
  const available = selectedCard ? getCardAvailable(selectedCard, expenses) : 0;

  const handleConfirmPress = () => {
    if (!cardId || !target || saving) return;
    if (available < target.amount) {
      setInsufficient(true);
      return;
    }
    onConfirm();
  };

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    dismiss: { flex: 1 },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg, backgroundColor: COLORS.border },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    sub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 4, marginBottom: SPACING.lg },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6 },
    hint: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.xs },
    actions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xl },
    cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    insufIcon: {
      width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.danger + '18',
      alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: SPACING.md,
    },
    insufTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, textAlign: 'center', marginBottom: SPACING.xs },
    insufText: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', lineHeight: 20, marginBottom: SPACING.xl },
    rechargeBtn: { padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center', marginBottom: 10 },
    rechargeText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    changeBtn: { padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
    changeText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.md },
  }), [COLORS]);

  if (target && insufficient) {
    return (
      <Modal visible animationType="slide" transparent statusBarTranslucent onRequestClose={onCancel}>
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onCancel} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.insufIcon}>
              <Ionicons name="alert-circle" size={28} color={COLORS.danger} />
            </View>
            <Text style={styles.insufTitle}>Fondos insuficientes</Text>
            <Text style={styles.insufText}>
              {selectedCard?.name} tiene {formatCOP(available)} disponible, pero {target.name} cuesta{' '}
              {formatCOP(target.amount)}. ¿Quieres recargar la cuenta o cambiar el método de pago?
            </Text>
            <TouchableOpacity style={styles.rechargeBtn} onPress={onRecharge}>
              <Text style={styles.rechargeText}>Recargar cuenta</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeBtn} onPress={() => setInsufficient(false)}>
              <Text style={styles.changeText}>Cambiar método de pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={!!target} animationType="slide" transparent statusBarTranslucent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Marcar como pagado</Text>
          <Text style={styles.sub}>{target?.name} · {target ? formatCOP(target.amount) : ''}</Text>
          <Text style={styles.label}>¿De dónde salió el dinero?</Text>
          {cards.length === 0 ? (
            <Text style={styles.hint}>Primero crea una cuenta o tarjeta en Balance.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {cards.map(c => (
                  <CardView
                    key={c.id}
                    card={c}
                    compact
                    selected={cardId === c.id}
                    totalSpent={getCardTotalSpent(expenses, c.id)}
                    onPress={() => onSelectCard(c.id)}
                  />
                ))}
              </ScrollView>
              {!cardId && <Text style={styles.hint}>Elige de dónde salió el dinero.</Text>}
            </>
          )}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmPress}
              disabled={!cardId || saving}
              style={[styles.saveBtn, (!cardId || saving) && styles.saveBtnOff]}
            >
              <Text style={styles.saveText}>{saving ? 'Guardando...' : 'Confirmar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
