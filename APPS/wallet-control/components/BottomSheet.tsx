import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, KeyboardAvoidingView, StyleSheet, ViewStyle, Platform, Keyboard } from 'react-native';
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

  // Con el teclado abierto, una hoja con contenido corto (ej. formulario de
  // Ingreso, sin categorías ni tarjetas) no llega a tocar el tope de
  // maxHeight, así que se queda con su alto natural (chico) mientras sigue
  // "pegada al fondo" (justifyContent: flex-end) del contenedor ya encogido
  // por el teclado — en Android eso deja a la hoja fuera del área visible
  // en vez de simplemente más pequeña. Forzar un alto exacto (no solo un
  // tope) mientras el teclado está abierto la mantiene siempre dentro del
  // área visible sin importar qué tan corto sea el contenido; al cerrar el
  // teclado se vuelve al alto natural de siempre.
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

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
              ...(keyboardVisible && typeof resolvedMaxHeight === 'number' ? { height: resolvedMaxHeight } : null),
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
