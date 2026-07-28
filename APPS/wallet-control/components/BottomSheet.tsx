import React from 'react';
import { Modal, View, TouchableOpacity, KeyboardAvoidingView, StyleSheet, ViewStyle, Platform } from 'react-native';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive } from '@/constants/responsive';
import { SPACING, RADIUS } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  overlayOpacity?: number;
  radius?: number;
  maxHeight?: ViewStyle['maxHeight'];
  showHandle?: boolean;
  sheetStyle?: ViewStyle;
}

export default function BottomSheet({
  visible,
  onClose,
  children,
  overlayOpacity = 0.5,
  radius = RADIUS.xl,
  maxHeight,
  showHandle = true,
  sheetStyle,
}: Props) {
  const COLORS = useColors();
  // maxHeight suele venir como porcentaje ("92%"). Dejar que Yoga lo
  // resuelva contra el padre dentro de un <Modal> + KeyboardAvoidingView no
  // siempre se re-calcula bien después de que Android encoge la ventana por
  // el teclado (windowSoftInputMode="adjustResize") y la vuelve a agrandar
  // al cerrarlo — quedaba una hoja más baja de lo que debía, dejando ver la
  // tab bar detrás. Se resuelve el porcentaje a mano contra useWindowDimensions
  // (que sí se recalcula de forma confiable en cada cambio de tamaño real).
  const { height: windowHeight } = useResponsive();
  const resolvedMaxHeight = typeof maxHeight === 'string' && maxHeight.trim().endsWith('%')
    ? windowHeight * (parseFloat(maxHeight) / 100)
    : maxHeight;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}
        // Intento #4 del bug de la tab bar visible detrás de esta hoja
        // (Android): windowSoftInputMode ya viene en "adjustResize" por
        // defecto en Expo, así que Android reduce la ventana de la app solo
        // con eso. Aplicar ADEMÁS el padding de KeyboardAvoidingView hace
        // que dos sistemas compensen el teclado a la vez — el resize nativo
        // y el padding animado de RN no siempre terminan sincronizados,
        // sobre todo al CERRAR el teclado, dejando un frame donde la hoja
        // queda más baja de lo que debería y la tab bar asoma detrás. En
        // Android alcanza con el resize nativo solo; el padding manual
        // queda solo para iOS, que no tiene un adjustResize equivalente.
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity
          style={styles.dismissArea}
          onPress={onClose}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: COLORS.card,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              maxHeight: resolvedMaxHeight,
            },
            sheetStyle,
          ]}
        >
          {showHandle && <View style={[styles.handle, { backgroundColor: COLORS.border }]} />}
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: { padding: SPACING.xl, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
});
