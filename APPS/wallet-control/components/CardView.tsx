import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import { FONT, SPACING } from '@/constants/theme';
import { useResponsive, scaledSheet } from '@/constants/responsive';

interface Props {
  card: Card;
  totalSpent?: number;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  compact?: boolean;
}

export default function CardView({ card, totalSpent = 0, selected, onPress, onLongPress, compact }: Props) {
  const { width, moderateScale } = useResponsive();
  const CARD_W = Math.min(width * 0.72, 340);
  const CARD_H = CARD_W * 0.58;
  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    card: {
      borderRadius: 18,
      padding: 18,
      justifyContent: 'space-between',
      overflow: 'hidden',
      elevation: 6,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
    },
    selectedRing: {
      borderWidth: 2,
      borderColor: '#fff',
    },
    shine: {
      position: 'absolute',
      top: 0, left: 0, right: 0,
      height: '55%',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
    },
    circle1: {
      position: 'absolute',
      right: -20, top: -20,
      width: 120, height: 120,
      borderRadius: 60,
      backgroundColor: 'rgba(255,255,255,0.07)',
    },
    circle2: {
      position: 'absolute',
      right: 30, bottom: -30,
      width: 90, height: 90,
      borderRadius: 45,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    bankSlot: { height: 16, justifyContent: 'center' },
    bank: { color: 'rgba(255,255,255,0.75)', fontSize: FONT.sm, lineHeight: 16, fontWeight: '500' },
    cardName: { color: '#fff', fontSize: FONT.base, fontWeight: '700', marginTop: 2 },
    typeBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: SPACING.sm, paddingVertical: 3,
      borderRadius: 6,
    },
    typeText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
    chip: {
      width: 34, height: 26, borderRadius: 5,
      backgroundColor: 'rgba(255,220,100,0.7)',
      justifyContent: 'center', alignItems: 'center',
    },
    chipInner: {
      width: 20, height: 14, borderRadius: 3,
      borderWidth: 1, borderColor: 'rgba(255,180,0,0.6)',
    },
    bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    lastFour: { color: 'rgba(255,255,255,0.9)', fontSize: FONT.sm, fontWeight: '600', letterSpacing: 2 },
    balanceBox: { alignItems: 'flex-end' },
    balanceLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10 },
    balanceAmt: { color: '#fff', fontSize: FONT.base, fontWeight: '700' },
    spentText: { color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 },
  }, moderateScale)), [moderateScale]);

  // Estilos del selector compacto: a propósito NO pasan por scaledSheet/moderateScale —
  // en tablets (width grande) ese escalado casi duplicaba el tamaño y el selector de
  // "¿de dónde salió el dinero?" se veía enorme. Tamaño fijo en todos los dispositivos.
  // BLOQUEADO (2026-07-27): usuario confirmó que este tamaño quedó perfecto — no cambiar
  // ninguno de estos valores sin permiso explícito.
  const compactStyles = useMemo(() => StyleSheet.create({
    compact: {
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
      minWidth: 108, marginRight: SPACING.sm,
    },
    compactSelected: { borderWidth: 2, borderColor: '#fff' },
    compactTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    compactChip: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1 },
    compactText: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },
    compactLast: { color: 'rgba(255,255,255,0.7)', fontSize: 9, marginLeft: SPACING.xs },
    compactAmount: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '600', marginTop: 3 },
  }), []);

  // Lo que ya "cerró" en un corte anterior y sigue sin pagarse también resta
  // del cupo disponible, no solo lo gastado en el ciclo actual.
  const available = card.type === 'credit' && card.limit
    ? card.limit - totalSpent - (card.statementBalance ?? 0)
    : null;
  const balanceLeft = (card.type === 'debit' || card.type === 'cash') && card.balance != null ? card.balance - totalSpent : null;
  const typeLabel = card.type === 'credit' ? 'crédito' : card.type === 'debit' ? 'débito' : card.type === 'cash' ? 'efectivo' : 'préstamo';
  const amountLabel = available !== null
    ? `disponible ${formatCOP(Math.max(available, 0))}`
    : balanceLeft !== null
      ? `saldo ${formatCOP(Math.max(balanceLeft, 0))}`
      : '';

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[compactStyles.compact, { backgroundColor: card.color }, selected && compactStyles.compactSelected]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, ${typeLabel}${amountLabel ? ', ' + amountLabel : ''}${selected ? ', seleccionada' : ''}`}
      >
        <View style={compactStyles.compactTopRow}>
          <View style={compactStyles.compactChip}>
            {card.emoji
              ? <Text style={{ fontSize: 12 }}>{card.emoji}</Text>
              : <Ionicons name={card.type === 'credit' ? 'card' : 'card-outline'} size={12} color="#fff" />}
            <Text style={compactStyles.compactText} numberOfLines={1}>{card.name}</Text>
          </View>
          {card.type === 'credit' && <Text style={compactStyles.compactLast}>•••{card.lastFour}</Text>}
        </View>
        {!!amountLabel && <Text style={compactStyles.compactAmount} numberOfLines={1}>{amountLabel}</Text>}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.88}
      style={[styles.card, { width: CARD_W, height: CARD_H, backgroundColor: card.color },
              selected && styles.selectedRing]}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.bank}, ${typeLabel}${amountLabel ? ', ' + amountLabel : ''}`}
    >
      {/* Shine overlay */}
      <View style={styles.shine} />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View>
          <View style={styles.bankSlot}>
            {!!card.bank && <Text style={styles.bank} numberOfLines={1}>{card.bank}</Text>}
          </View>
          <Text style={styles.cardName}>{card.name}</Text>
        </View>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{card.type === 'credit' ? 'CRÉDITO' : 'DÉBITO'}</Text>
        </View>
      </View>

      {/* Chip */}
      <View style={styles.chip}>
        <View style={styles.chipInner} />
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        {card.type === 'credit' ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
            {card.emoji ? <Text style={{ fontSize: 18 }}>{card.emoji}</Text> : null}
            <Text style={styles.lastFour} numberOfLines={1}>•••• {card.lastFour}</Text>
          </View>
        ) : (
          card.emoji ? <Text style={{ fontSize: 20 }}>{card.emoji}</Text> : <View />
        )}
        <View style={styles.balanceBox}>
          {card.type === 'credit' && available !== null && (
            <>
              <Text style={styles.balanceLabel}>Disponible</Text>
              <Text style={styles.balanceAmt} numberOfLines={1} adjustsFontSizeToFit>{formatCOP(Math.max(available, 0))}</Text>
            </>
          )}
          {card.type === 'debit' && balanceLeft !== null && (
            <>
              <Text style={styles.balanceLabel}>Saldo</Text>
              <Text style={styles.balanceAmt} numberOfLines={1} adjustsFontSizeToFit>{formatCOP(Math.max(balanceLeft, 0))}</Text>
            </>
          )}
          {totalSpent > 0 && (
            <Text style={styles.spentText} numberOfLines={1} adjustsFontSizeToFit>Gastado: {formatCOP(totalSpent)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
