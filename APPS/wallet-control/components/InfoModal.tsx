import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';

type Variant = 'info' | 'success' | 'warning' | 'error';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  variant?: Variant;
  onClose: () => void;
}

const VARIANT_ICON: Record<Variant, keyof typeof Ionicons.glyphMap> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  error: 'close-circle',
};

// Reemplaza Alert.alert nativo (popup blanco/negro de Android) por un modal
// con el tema de la app — mismo patrón visual usado en CardFormModal,
// CategoryDetailModal, categorias.tsx, perfil.tsx, etc. Para mensajes
// simples de "título + texto + OK" en vez de duplicar el mismo modal en
// cada pantalla.
export default function InfoModal({ visible, title, message, variant = 'info', onClose }: Props) {
  const COLORS = useColors();
  const accent = variant === 'success' ? COLORS.debit
    : variant === 'error' ? COLORS.danger
    : variant === 'warning' ? COLORS.warning
    : COLORS.primary;

  const styles = useMemo(() => StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 28 },
    card: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, width: '100%',
      alignItems: 'center', borderWidth: 2, borderColor: accent + '44',
      elevation: 10, shadowColor: accent, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12,
    },
    icon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: accent + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    title: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.sm, textAlign: 'center' },
    message: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 20 },
    btn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: accent, width: '100%' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS, accent]);

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <View style={styles.icon}>
            <Ionicons name={VARIANT_ICON[variant]} size={26} color={accent} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>OK</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
