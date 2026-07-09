import React from 'react';
import { Modal, View, KeyboardAvoidingView, Platform, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '@/constants/ThemeContext';

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
  radius = 24,
  maxHeight,
  showHandle = true,
  sheetStyle,
}: Props) {
  const COLORS = useColors();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.overlay, { backgroundColor: `rgba(0,0,0,${overlayOpacity})` }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: COLORS.card,
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              maxHeight,
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
  sheet: { padding: 20, overflow: 'hidden' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
});
