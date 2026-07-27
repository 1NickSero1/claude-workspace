import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Card, RecurringTemplate } from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

interface Props {
  target: RecurringTemplate | null;
  cardId: string | undefined;
  payableCards: Card[];
  saving: boolean;
  onSelectCard: (id: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function PayRecurringModal({ target, cardId, payableCards, saving, onSelectCard, onConfirm, onCancel }: Props) {
  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    dismiss: { flex: 1 },
    sheet: { backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl },
    handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg, backgroundColor: COLORS.border },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    sub: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 4, marginBottom: SPACING.lg },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6 },
    hint: { color: COLORS.danger, fontSize: FONT.sm, marginTop: SPACING.xs },
    chip: {
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill,
      backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, marginRight: SPACING.sm,
    },
    chipActive: { borderColor: 'transparent' },
    chipText: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    actions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xl },
    cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  return (
    <Modal visible={!!target} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismiss} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Marcar como pagado</Text>
          <Text style={styles.sub}>{target?.name} · {target ? formatCOP(target.amount) : ''}</Text>
          <Text style={styles.label}>¿De dónde salió el dinero?</Text>
          {payableCards.length === 0 ? (
            <Text style={styles.hint}>No tienes cuentas con saldo disponible para pagar.</Text>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                {payableCards.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => onSelectCard(c.id)}
                    style={[styles.chip, cardId === c.id && styles.chipActive, cardId === c.id && { backgroundColor: c.color }]}
                  >
                    <Text style={[styles.chipText, cardId === c.id && { color: '#fff' }]}>{c.name}</Text>
                  </TouchableOpacity>
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
              onPress={onConfirm}
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
