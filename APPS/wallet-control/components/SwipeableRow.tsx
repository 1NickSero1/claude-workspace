import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/constants/ThemeContext';

const ACTION_WIDTH = 72;

interface Props {
  rowId: string;
  openRowId: string | null;
  onOpenChange: (id: string | null) => void;
  onDelete: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}

// Swipe a la derecha revela "eliminar" (panel a la izquierda), swipe a la
// izquierda revela "editar" (panel a la derecha) — el swipe solo revela el
// botón, nunca ejecuta la acción por sí solo; hace falta el tap explícito.
export default function SwipeableRow({ rowId, openRowId, onOpenChange, onDelete, onEdit, children }: Props) {
  const COLORS = useColors();
  const ref = useRef<Swipeable>(null);

  // Cierra esta fila si se abrió otra distinta (solo una abierta a la vez).
  useEffect(() => {
    if (openRowId !== rowId) ref.current?.close();
  }, [openRowId, rowId]);

  const renderLeftActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [0, ACTION_WIDTH], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.actionPanel, { backgroundColor: COLORS.danger, transform: [{ scale }] }]}>
        <TouchableOpacity
          onPress={() => { ref.current?.close(); onDelete(); }}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Eliminar gasto"
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({ inputRange: [-ACTION_WIDTH, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <Animated.View style={[styles.actionPanel, { backgroundColor: COLORS.primary, transform: [{ scale }] }]}>
        <TouchableOpacity
          onPress={() => { ref.current?.close(); onEdit(); }}
          style={styles.actionBtn}
          accessibilityRole="button"
          accessibilityLabel="Editar gasto"
        >
          <Ionicons name="pencil" size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={ref}
      leftThreshold={ACTION_WIDTH / 2}
      rightThreshold={ACTION_WIDTH / 2}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => onOpenChange(rowId)}
      onSwipeableClose={() => { if (openRowId === rowId) onOpenChange(null); }}
      containerStyle={styles.container}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, overflow: 'hidden', marginBottom: 10 },
  actionPanel: { width: ACTION_WIDTH, alignItems: 'center', justifyContent: 'center' },
  actionBtn: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
