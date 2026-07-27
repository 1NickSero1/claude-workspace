import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import BottomSheet from './BottomSheet';

interface Props {
  visible: boolean;
  budget: number | null;
  onSave: (budget: number) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
  placeholder?: string;
  accessibilityLabel?: string;
}

const fmt = (n: number) => n.toLocaleString('es-CO');

export default function BudgetFormModal({
  visible, budget, onSave, onClose,
  title = 'Presupuesto mensual',
  hint = 'Te avisaremos al llegar al 80% y al 100%.',
  placeholder = 'Ej: 2.000.000',
  accessibilityLabel = 'Monto del presupuesto mensual',
}: Props) {
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) setAmount(budget ? String(budget) : '');
  }, [visible, budget]);

  const numeric = Number(amount.replace(/\D/g, ''));
  const valid = numeric > 0;

  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.xs },
    hint: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: SPACING.lg },
    input: {
      backgroundColor: COLORS.bg, borderRadius: RADIUS.md, padding: 14,
      color: COLORS.text, fontSize: FONT.xl, fontWeight: '700',
      borderWidth: 1, borderColor: COLORS.border, textAlign: 'center',
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xl },
    cancelBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight="70%" sheetStyle={{ paddingBottom: 28 }}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>{hint}</Text>
        <TextInput
          style={styles.input}
          value={amount ? fmt(numeric) : ''}
          onChangeText={v => setAmount(v.replace(/\D/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textDim}
          keyboardType="number-pad"
          autoFocus
          accessibilityLabel={accessibilityLabel}
        />
        <View style={styles.actions}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} accessibilityRole="button" accessibilityLabel="Cancelar">
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => valid && onSave(numeric)}
            disabled={!valid}
            style={[styles.saveBtn, !valid && styles.saveBtnOff]}
            accessibilityRole="button"
            accessibilityLabel="Guardar presupuesto"
            accessibilityState={{ disabled: !valid }}
          >
            <Text style={styles.saveText}>Guardar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
