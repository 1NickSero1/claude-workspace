import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Card } from '@/lib/storage';
import { FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { CARD_COLORS } from '@/constants/categories';

interface Props {
  visible: boolean;
  card?: Card | null;
  allowedTypes: Card['type'][];
  onSave: (card: Card) => void;
  onClose: () => void;
}

const TYPE_META: Record<Card['type'], {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  caption: string;
  accent: 'debit' | 'credit' | 'cash' | 'debt';
  accentBg: 'debitBg' | 'creditBg' | 'cashBg' | 'debtBg';
}> = {
  debit:  { icon: 'business-outline',  label: 'Débito',    caption: 'Cuenta bancaria o ahorros',  accent: 'debit',  accentBg: 'debitBg' },
  credit: { icon: 'card-outline',      label: 'Crédito',   caption: 'Tarjeta con cupo',            accent: 'credit', accentBg: 'creditBg' },
  cash:   { icon: 'cash-outline',      label: 'Efectivo',  caption: 'Dinero en físico',            accent: 'cash',   accentBg: 'cashBg' },
  debt:   { icon: 'receipt-outline',   label: 'Préstamo',  caption: 'Préstamo o deuda informal',   accent: 'debt',   accentBg: 'debtBg' },
};

const fmt  = (n: number) => n.toLocaleString('es-CO');
const parse = (s: string) => Number(s.replace(/\./g, '').replace(/,/g, '').replace(/\D/g, ''));

const BLANK = (type: Card['type']) => ({
  name: '', type, bank: '', emoji: '', lastFour: '',
  color: CARD_COLORS[0],
  limit: undefined as number | undefined,
  balance: undefined as number | undefined,
  dueDate: '',
  notifyOnDue: false,
});

export default function CardFormModal({ visible, card, allowedTypes, onSave, onClose }: Props) {
  const [form, setForm] = useState(BLANK(card?.type ?? allowedTypes[0]));

  useEffect(() => {
    if (card) {
      setForm({
        name:        card.name     ?? '',
        type:        card.type,
        bank:        card.bank     ?? '',
        emoji:       card.emoji    ?? '',
        lastFour:    card.lastFour ?? '',
        color:       card.color    ?? CARD_COLORS[0],
        limit:       card.limit,
        balance:     card.balance,
        dueDate:     card.dueDate  ?? '',
        notifyOnDue: false,
      });
    } else {
      setForm(BLANK(allowedTypes[0]));
    }
  }, [card, visible, allowedTypes]);

  const set = (k: keyof ReturnType<typeof BLANK>, v: any) =>
    setForm(f => ({ ...f, [k]: v }));

  const parseDueDate = (raw: string): Date | null => {
    const parts = raw.trim().split('/');
    if (parts.length !== 3) return null;
    const [d, m, y] = parts.map(Number);
    if (!d || !m || !y || y < 2024) return null;
    const date = new Date(y, m - 1, d, 9, 0, 0);
    return isNaN(date.getTime()) ? null : date;
  };

  const handleSave = async () => {
    const name = (form.name ?? '').trim();
    if (!name) return;
    const isDebtType = form.type === 'debt';
    const newBalance = (form.type === 'debit' || form.type === 'cash' || isDebtType) && form.balance != null ? Number(form.balance) : undefined;

    let notificationId: string | undefined = card?.notificationId;

    if (isDebtType && form.dueDate && form.notifyOnDue) {
      const dueDate = parseDueDate(form.dueDate);
      if (dueDate && dueDate > new Date()) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          if (notificationId) {
            await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
          }
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: 'Recordatorio de pago',
              body: `Hoy vence el pago de: ${name}`,
              sound: true,
            },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueDate },
          });
        }
      }
    }

    onSave({
      id:             card?.id ?? `card_${Date.now()}`,
      name,
      type:           form.type,
      bank:           (form.bank ?? '').trim(),
      lastFour:       (form.lastFour?.trim().length === 4) ? form.lastFour.trim() : String(Math.floor(1000 + Math.random() * 9000)),
      color:          form.color,
      emoji:          form.emoji?.trim() || undefined,
      limit:          form.type === 'credit' && form.limit ? Number(form.limit) : undefined,
      balance:        newBalance,
      initialBalance: isDebtType ? (card?.initialBalance ?? newBalance) : undefined,
      dueDate:        isDebtType ? (form.dueDate.trim() || undefined) : undefined,
      notificationId: notificationId,
      events:         card?.events,
      createdAt:      card?.createdAt ?? new Date().toISOString(),
    });
  };

  const valid = (form.name ?? '').trim().length > 0;
  const isCredit = form.type === 'credit';
  const isCash   = form.type === 'cash';
  const isDebt   = form.type === 'debt';

  const effectiveTypes = card ? [card.type] : allowedTypes;
  const showSelector = effectiveTypes.length > 1;

  const COLORS = useColors();
  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 20, maxHeight: '92%',
    },
    handle: {
      width: 40, height: 4, backgroundColor: COLORS.border,
      borderRadius: 2, alignSelf: 'center', marginBottom: 16,
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: 16 },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 18, marginBottom: 6 },
    input: {
      backgroundColor: COLORS.bg, borderRadius: 10, padding: 12,
      color: COLORS.text, fontSize: FONT.md, borderWidth: 1, borderColor: COLORS.border,
    },
    typeChipRow: { flexDirection: 'row', gap: 8 },
    typeChip: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
      paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
      borderColor: COLORS.border, backgroundColor: COLORS.bg,
    },
    typeChipColumn: { alignItems: 'center', gap: 2 },
    typeChipLabel: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    typeChipLabelActive: { fontWeight: '700' },
    typeChipCaption: { color: COLORS.textDim, fontSize: 10 },
    typeChipCaptionActive: { opacity: 0.85 },
    typeChipLocked: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeChipLockedLabel: { fontWeight: '700', fontSize: FONT.md },
    colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    colorDotSelected: { borderWidth: 3, borderColor: COLORS.text },
    previewCard: {
      borderRadius: 18, padding: 18, marginBottom: 6, height: 110,
      justifyContent: 'space-between', overflow: 'hidden',
      elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2, shadowRadius: 6,
    },
    previewShine: {
      position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
      backgroundColor: 'rgba(255,255,255,0.15)',
    },
    previewCircle1: {
      position: 'absolute', right: -16, top: -16, width: 90, height: 90,
      borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.07)',
    },
    previewCircle2: {
      position: 'absolute', right: 24, bottom: -24, width: 70, height: 70,
      borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.05)',
    },
    previewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    previewBank: { color: 'rgba(255,255,255,0.8)', fontSize: FONT.sm },
    previewType: { color: 'rgba(255,255,255,0.9)', fontSize: FONT.sm, fontWeight: '600' },
    previewName: { color: '#fff', fontWeight: '700', fontSize: FONT.base },
    previewEmoji: {
      position: 'absolute', right: 16, top: '50%',
      transform: [{ translateY: -14 }], fontSize: 28,
    },
    actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
      borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg,
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.textDim },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
    notifyRow: {
      flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10,
      backgroundColor: COLORS.debtBg, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: COLORS.debt + '33',
    },
    notifyLabel: { color: COLORS.text, fontWeight: '600', fontSize: FONT.sm },
    notifyCaption: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  }), [COLORS]);

  const title = card
    ? `Editar ${form.type === 'credit' ? 'tarjeta de crédito' : TYPE_META[form.type].label.toLowerCase()}`
    : form.type === 'credit' ? 'Nueva tarjeta de crédito' : `Nuevo ${TYPE_META[form.type].label.toLowerCase()}`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>

            {/* ── Vista previa ─────────────────────────── */}
            <View style={[styles.previewCard, { backgroundColor: form.color }]}>
              <View style={styles.previewShine} />
              <View style={styles.previewCircle1} />
              <View style={styles.previewCircle2} />
              <View style={styles.previewTop}>
                <Text style={styles.previewBank}>
                  {isDebt ? (form.emoji || '💸') : (form.bank || 'Entidad')}
                </Text>
                <Text style={styles.previewType}>{TYPE_META[form.type].label}</Text>
              </View>
              <Text style={styles.previewName}>{form.name || 'Nombre'}</Text>
            </View>

            {/* ── Tipo de cuenta ───────────────────────── */}
            {showSelector ? (
              <>
                <Text style={styles.label}>Tipo de cuenta</Text>
                <View style={styles.typeChipRow}>
                  {effectiveTypes.map(t => {
                    const meta = TYPE_META[t];
                    const active = form.type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        onPress={() => set('type', t)}
                        style={[
                          styles.typeChip,
                          active && { borderColor: COLORS[meta.accent], backgroundColor: COLORS[meta.accentBg] },
                        ]}
                      >
                        <View style={styles.typeChipColumn}>
                          <Ionicons name={meta.icon} size={18} color={active ? COLORS[meta.accent] : COLORS.textMuted} />
                          <Text style={[styles.typeChipLabel, active && [styles.typeChipLabelActive, { color: COLORS[meta.accent] }]]}>
                            {meta.label}
                          </Text>
                          <Text style={[styles.typeChipCaption, active && styles.typeChipCaptionActive]}>
                            {meta.caption}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Tipo de cuenta</Text>
                <View style={[styles.typeChip, styles.typeChipLocked, {
                  borderColor: COLORS[TYPE_META[form.type].accent],
                  backgroundColor: COLORS[TYPE_META[form.type].accentBg],
                }]}>
                  <Ionicons name={TYPE_META[form.type].icon} size={18} color={COLORS[TYPE_META[form.type].accent]} />
                  <Text style={[styles.typeChipLockedLabel, { color: COLORS[TYPE_META[form.type].accent] }]}>
                    {TYPE_META[form.type].label}
                  </Text>
                </View>
              </>
            )}

            {/* ── Alias ──────────────────────────────── */}
            <Text style={styles.label}>Alias</Text>
            <TextInput
              style={styles.input}
              value={form.name}
              onChangeText={v => set('name', v)}
              placeholder={
                isCredit ? 'Ej: Visa Bancolombia' :
                isCash   ? 'Ej: Billetera, Efectivo casa' :
                isDebt   ? 'Ej: Préstamo a Juan, Crédito informal' :
                'Ej: Nequi, Bancolombia'
              }
              placeholderTextColor={COLORS.textDim}
            />

            {/* ── Banco (débito y crédito) ────────────── */}
            {!isCash && !isDebt && (
              <>
                <Text style={styles.label}>Banco / Entidad</Text>
                <TextInput
                  style={styles.input}
                  value={form.bank}
                  onChangeText={v => set('bank', v)}
                  placeholder={isCredit ? 'Ej: Bancolombia, Davivienda' : 'Ej: Nequi, Davivienda'}
                  placeholderTextColor={COLORS.textDim}
                />
              </>
            )}

            {/* ── Emoji opcional (todos los tipos) ─────── */}
            <>
              <Text style={styles.label}>Emoji (opcional)</Text>
              <TextInput
                style={styles.input}
                value={form.emoji}
                onChangeText={v => set('emoji', v)}
                placeholder={isDebt ? '💸' : isCredit ? '💳' : isCash ? '💵' : '🏦'}
                placeholderTextColor={COLORS.textDim}
                maxLength={2}
              />
            </>

            {/* ── Últimos 4 dígitos (solo crédito, opcional) ── */}
            {isCredit && (
              <>
                <Text style={styles.label}>Últimos 4 dígitos (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.lastFour ?? ''}
                  onChangeText={v => set('lastFour', v.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Ej: 4523"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </>
            )}

            {/* ── Límite (crédito) ────────────────────── */}
            {isCredit && (
              <>
                <Text style={styles.label}>Límite de crédito (COP)</Text>
                <TextInput
                  style={styles.input}
                  value={form.limit != null ? fmt(Number(form.limit)) : ''}
                  onChangeText={v => set('limit', parse(v) || undefined)}
                  placeholder="Ej: 5.000.000"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="number-pad"
                />
              </>
            )}

            {/* ── Saldo (débito, efectivo, préstamo) ──── */}
            {!isCredit && (
              <>
                <Text style={styles.label}>
                  {isCash ? 'Efectivo disponible (COP)' : isDebt ? 'Monto del préstamo (COP)' : 'Saldo actual (COP)'}
                </Text>
                <TextInput
                  style={styles.input}
                  value={form.balance != null ? fmt(Number(form.balance)) : ''}
                  onChangeText={v => set('balance', parse(v) || undefined)}
                  placeholder="Ej: 1.500.000"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="number-pad"
                />
              </>
            )}

            {/* ── Fecha límite + notificación (solo préstamos) ── */}
            {isDebt && (
              <>
                <Text style={styles.label}>Fecha límite de pago (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={form.dueDate}
                  onChangeText={v => set('dueDate', v)}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
                {form.dueDate.length > 0 && (
                  <View style={styles.notifyRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.notifyLabel}>Notificarme el día del vencimiento</Text>
                      <Text style={styles.notifyCaption}>Recibirás un aviso a las 9:00 AM</Text>
                    </View>
                    <Switch
                      value={form.notifyOnDue}
                      onValueChange={v => set('notifyOnDue', v)}
                      trackColor={{ false: COLORS.border, true: COLORS.debt + '88' }}
                      thumbColor={form.notifyOnDue ? COLORS.debt : COLORS.textDim}
                    />
                  </View>
                )}
              </>
            )}

            {/* ── Color ───────────────────────────────── */}
            <Text style={styles.label}>{isDebt ? 'Color de la tarjeta (opcional)' : 'Color de la tarjeta'}</Text>
            <View style={styles.colorRow}>
              {CARD_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => set('color', c)}
                  style={[styles.colorDot, { backgroundColor: c },
                          form.color === c && styles.colorDotSelected]}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { handleSave(); }}
              disabled={!valid}
              style={[styles.saveBtn, !valid && styles.saveBtnOff]}
            >
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
