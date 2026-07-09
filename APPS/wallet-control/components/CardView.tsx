import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/lib/storage';
import { formatCOP } from '@/lib/expenseParser';
import { FONT } from '@/constants/theme';
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
  const CARD_W = width * 0.72;
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
    bank: { color: 'rgba(255,255,255,0.75)', fontSize: FONT.sm, fontWeight: '500' },
    cardName: { color: '#fff', fontSize: FONT.base, fontWeight: '700', marginTop: 2 },
    typeBadge: {
      backgroundColor: 'rgba(255,255,255,0.2)',
      paddingHorizontal: 8, paddingVertical: 3,
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
    compact: {
      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      minWidth: 110, marginRight: 8,
    },
    compactSelected: { borderWidth: 2, borderColor: '#fff' },
    compactChip: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
    compactText: { color: '#fff', fontSize: FONT.sm, fontWeight: '700', flex: 1 },
    compactLast: { color: 'rgba(255,255,255,0.7)', fontSize: 10, marginLeft: 4 },
  }, moderateScale)), [moderateScale]);

  const available = card.type === 'credit' && card.limit ? card.limit - totalSpent : null;
  const balanceLeft = card.type === 'debit' && card.balance != null ? card.balance - totalSpent : null;

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.compact, { backgroundColor: card.color }, selected && styles.compactSelected]}
        activeOpacity={0.8}
      >
        <View style={styles.compactChip}>
          <Ionicons name={card.type === 'credit' ? 'card' : 'card-outline'} size={14} color="#fff" />
          <Text style={styles.compactText} numberOfLines={1}>{card.name}</Text>
        </View>
        {card.type === 'credit' && <Text style={styles.compactLast}>•••{card.lastFour}</Text>}
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
    >
      {/* Shine overlay */}
      <View style={styles.shine} />
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {/* Top row */}
      <View style={styles.topRow}>
        <View>
          <Text style={styles.bank}>{card.bank}</Text>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {card.emoji ? <Text style={{ fontSize: 18 }}>{card.emoji}</Text> : null}
            <Text style={styles.lastFour}>•••• •••• •••• {card.lastFour}</Text>
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
