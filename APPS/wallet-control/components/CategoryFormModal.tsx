import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView,
} from 'react-native';
import BottomSheet from './BottomSheet';
import { CustomCategory } from '@/lib/storage';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { CATEGORY_COLOR_OPTIONS } from '@/constants/categories';

const EMOJI_OPTIONS = [
  '🏠','🍔','🚗','🎵','💊','⚡','💈','🐾','🛒','💼',
  '✈️','📚','🎮','👗','💻','🎁','🏋️','🍕','☕','🎬',
  '💰','🔧','🌿','💳','🏖️','🎭','🐕','🍺','💄','🏥',
];

// Dos colores de la paleta pueden ser distintos como string y aun así verse
// "iguales" (dos rojos, dos naranjas) — se compara el matiz real, con un
// mínimo de separación, en vez de solo != .
const MIN_HUE_SEPARATION_DEG = 30;
function hexToHueDeg(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return h < 0 ? h + 360 : h;
}
function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

interface Props {
  visible: boolean;
  category?: CustomCategory | null;
  categories: CustomCategory[];
  onSave: (cat: CustomCategory) => void;
  onClose: () => void;
}

export default function CategoryFormModal({ visible, category, categories, onSave, onClose }: Props) {
  const [name, setName]   = useState('');
  const [emoji, setEmoji] = useState(EMOJI_OPTIONS[0]);

  const COLORS = useColors();
  // El color sigue naciendo del emoji elegido (para que cambiar de emoji se
  // sienta como elegir un color), pero si ese color ya lo tiene otra
  // categoría se busca el siguiente libre de la paleta — así dos categorías
  // nunca terminan indistinguibles en los diagramas por casualidad del
  // módulo (30 emojis, 15 colores → sin esto, emoji #3 y #18 se pisaban).
  const usedHues = useMemo(
    () => categories.filter(c => c.id !== category?.id).map(c => hexToHueDeg(c.color)),
    [categories, category],
  );
  const autoColor = useMemo(() => {
    const idx = EMOJI_OPTIONS.indexOf(emoji);
    const start = idx >= 0 ? idx % CATEGORY_COLOR_OPTIONS.length : 0;
    for (let i = 0; i < CATEGORY_COLOR_OPTIONS.length; i++) {
      const candidate = CATEGORY_COLOR_OPTIONS[(start + i) % CATEGORY_COLOR_OPTIONS.length];
      const candidateHue = hexToHueDeg(candidate);
      if (!usedHues.some(h => hueDistance(h, candidateHue) < MIN_HUE_SEPARATION_DEG)) return candidate;
    }
    return CATEGORY_COLOR_OPTIONS[start];
  }, [emoji, usedHues]);

  const styles = useMemo(() => StyleSheet.create({
    hero: {
      alignItems: 'center', paddingVertical: 24, paddingHorizontal: SPACING.xl,
      borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    heroEmoji: { fontSize: 52, marginBottom: SPACING.sm },
    heroName: { color: '#fff', fontWeight: '800', fontSize: FONT.lg, opacity: 0.95 },
    heroSub: { color: 'rgba(255,255,255,0.65)', fontSize: FONT.sm, marginTop: 2 },
    handle: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.35)', borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg },
    body: { padding: SPACING.xl },
    label: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '700', marginTop: 14, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: COLORS.card2, borderRadius: RADIUS.md, padding: 14,
      color: COLORS.text, fontSize: FONT.md, borderWidth: 1.5, borderColor: COLORS.border,
    },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
    emojiBtn: {
      width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.card2, borderWidth: 2, borderColor: 'transparent',
    },
    emojiBtnSelected: {
      borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22',
      transform: [{ scale: 1.1 }],
    },
    emojiText: { fontSize: 22 },
    actions: { flexDirection: 'row', gap: 10, marginTop: SPACING.xxl },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5,
      borderColor: COLORS.border, alignItems: 'center',
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center' },
    saveBtnOff: { backgroundColor: COLORS.border },
    saveText: { color: '#fff', fontWeight: '800', fontSize: FONT.md },
    dupHint: { color: COLORS.danger, fontSize: FONT.xs, marginTop: 6 },
  }), [COLORS]);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setEmoji(category.emoji ?? EMOJI_OPTIONS[0]);
    } else {
      setName('');
      setEmoji(EMOJI_OPTIONS[0]);
    }
  }, [category, visible]);

  const isDuplicate = categories.some(c =>
    c.id !== category?.id && c.name.trim().toLowerCase() === name.trim().toLowerCase(),
  );

  const handleSave = () => {
    if (!name.trim() || isDuplicate) return;
    onSave({
      id: category?.id ?? `cat_${Date.now()}`,
      name: name.trim(),
      color: autoColor,
      icon: category?.icon ?? 'ellipsis-horizontal',
      isDefault: category?.isDefault ?? false,
      emoji,
    });
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      overlayOpacity={0.65}
      radius={28}
      maxHeight="88%"
      showHandle={false}
      sheetStyle={{ padding: 0 }}
    >
          {/* Hero header con color dinámico */}
          <View style={[styles.hero, { backgroundColor: autoColor }]}>
            <View style={styles.handle} />
            <Text style={styles.heroEmoji}>{emoji}</Text>
            <Text style={styles.heroName}>{name || (category ? 'Editar categoría' : 'Nueva categoría')}</Text>
            <Text style={styles.heroSub}>{category ? 'Editando categoría' : 'Toca un emoji para personalizar'}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.body}>
            <Text style={styles.label}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Trabajo, Casa, Viajes..."
              placeholderTextColor={COLORS.textDim}
              autoFocus
              maxLength={24}
            />
            {isDuplicate && (
              <Text style={styles.dupHint}>Ya tienes una categoría con ese nombre.</Text>
            )}

            <Text style={styles.label}>Emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(e => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEmoji(e)}
                  style={[styles.emojiBtn, emoji === e && styles.emojiBtnSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Elegir emoji ${e}`}
                >
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.actions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!name.trim() || isDuplicate}
                style={[styles.saveBtn, { backgroundColor: name.trim() && !isDuplicate ? autoColor : COLORS.border }]}
              >
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
    </BottomSheet>
  );
}
