import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, deleteUserProfile, saveUserProfile, UserProfile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors, useThemeInfo } from '@/constants/ThemeContext';
import type { ThemeMode } from '@/lib/storage';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'system', label: 'Sistema', icon: '⚙️' },
  { id: 'light',  label: 'Claro',   icon: '☀️' },
  { id: 'dark',   label: 'Oscuro',  icon: '🌙' },
];

export default function PerfilScreen() {
  const COLORS = useColors();
  const { themeMode, setThemeMode } = useThemeInfo();
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [editModal, setEditModal]   = useState(false);
  const [editName, setEditName]     = useState('');

  useEffect(() => {
    getUserProfile().then(setProfile);
  }, []);

  const initials = profile?.name
    ? profile.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const avatarGlyph = profile?.avatarEmoji || initials;

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro? Tus datos guardados se mantendrán en el dispositivo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            if (profile?.id) await supabase.auth.signOut();
            await deleteUserProfile();
            router.replace('/onboarding');
          },
        },
      ],
    );
  };

  const handleSaveName = async () => {
    if (!profile || !editName.trim()) return;
    const updated = { ...profile, name: editName.trim() };
    await saveUserProfile(updated);
    setProfile(updated);
    setEditModal(false);
  };

  const styles = useMemo(() => StyleSheet.create({
    safe:        { flex: 1, backgroundColor: COLORS.bg },
    header:      { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl },
    scroll:      { paddingHorizontal: 20, paddingBottom: 40 },

    avatarCard: {
      backgroundColor: COLORS.card, borderRadius: 20, padding: 20,
      alignItems: 'center', gap: 6, marginBottom: 24,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
      borderWidth: 1, borderColor: COLORS.border,
    },
    avatar: {
      width: 72, height: 72, borderRadius: 36,
      alignItems: 'center', justifyContent: 'center', marginBottom: 4,
    },
    avatarText:   { color: '#fff', fontWeight: '800', fontSize: FONT.xl },
    profileName:  { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg },
    profileEmail: { color: COLORS.textMuted, fontSize: FONT.sm },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: COLORS.primaryBg, marginTop: 6,
    },
    editBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.sm },

    sectionLabel: {
      color: COLORS.textMuted, fontWeight: '700', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 4,
    },
    section: {
      backgroundColor: COLORS.card, borderRadius: 16, overflow: 'hidden',
      marginBottom: 20, borderWidth: 1, borderColor: COLORS.border,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12,
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    rowValue:  { color: COLORS.textMuted, fontSize: FONT.sm },

    themeRow: { flexDirection: 'row', gap: 8, flex: 1 },
    themeBtn: {
      flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 2,
      borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg, gap: 2,
    },
    themeBtnActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    themeBtnEmoji:      { fontSize: 18 },
    themeBtnText:       { color: COLORS.textMuted, fontWeight: '600', fontSize: 11 },
    themeBtnTextActive: { color: COLORS.primary },

    dangerBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      backgroundColor: COLORS.card, borderRadius: 16, padding: 16, marginBottom: 16,
      borderWidth: 1, borderColor: '#EF444430',
    },
    dangerText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT.base },

    overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: COLORS.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20,
    },
    handle: {
      width: 40, height: 4, backgroundColor: COLORS.border,
      borderRadius: 2, alignSelf: 'center', marginBottom: 16,
    },
    modalTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, marginBottom: 16 },
    modalLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6 },
    input: {
      backgroundColor: COLORS.bg, borderRadius: 10, padding: 12,
      color: COLORS.text, fontSize: FONT.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: 12, borderWidth: 1,
      borderColor: COLORS.border, alignItems: 'center',
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn:    { flex: 1, padding: 14, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveText:   { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }), [COLORS]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + nombre ──────────────────────────── */}
        {profile && (
          <View style={styles.avatarCard}>
            <View style={[styles.avatar, { backgroundColor: profile.avatarColor }]}>
              <Text style={styles.avatarText}>{avatarGlyph}</Text>
            </View>
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.isAnonymous ? (
              <Text style={styles.profileEmail}>Modo anónimo · Finando IA desactivada</Text>
            ) : (
              !!profile.email && <Text style={styles.profileEmail}>{profile.email}</Text>
            )}
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => { setEditName(profile.name); setEditModal(true); }}
            >
              <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Editar nombre</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Apariencia ───────────────────────────────── */}
        <Text style={styles.sectionLabel}>Apariencia</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="moon-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>Tema</Text>
          </View>
          <View style={[styles.row, styles.rowDivider, { paddingTop: 8 }]}>
            <View style={styles.themeRow}>
              {THEME_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setThemeMode(opt.id)}
                  style={[styles.themeBtn, themeMode === opt.id && styles.themeBtnActive]}
                >
                  <Text style={styles.themeBtnEmoji}>{opt.icon}</Text>
                  <Text style={[styles.themeBtnText, themeMode === opt.id && styles.themeBtnTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Idioma ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Idioma</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="language-outline" size={18} color={COLORS.primary} />
            </View>
            <Text style={styles.rowLabel}>Idioma</Text>
            <Text style={styles.rowValue}>Español 🇨🇴</Text>
          </View>
        </View>

        {/* ── Aplicación ───────────────────────────────── */}
        <Text style={styles.sectionLabel}>Aplicación</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.debitBg }]}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.debit} />
            </View>
            <Text style={styles.rowLabel}>Versión</Text>
            <Text style={styles.rowValue}>v0.6.0</Text>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.card2 }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
            </View>
            <Text style={styles.rowLabel}>Datos guardados localmente</Text>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.debit} />
          </View>
        </View>

        {/* ── Cerrar sesión ────────────────────────────── */}
        <TouchableOpacity style={styles.dangerBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.dangerText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal editar nombre */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>Editar nombre</Text>
            <Text style={styles.modalLabel}>Nombre</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              placeholderTextColor={COLORS.textDim}
              autoFocus
              autoCapitalize="words"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setEditModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                <Text style={styles.saveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
