import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  getUserProfile, deleteUserProfile, saveUserProfile, UserProfile,
  getShowBalanceNotification, saveShowBalanceNotification,
  wipeNamespaceData,
} from '@/lib/storage';
import { requestNotificationPermission, cancelBalanceNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';
import BottomSheet from '@/components/BottomSheet';
import { COLORS as _COLORS, FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors, useThemeInfo } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';
import type { ThemeMode } from '@/lib/storage';

const THEME_OPTIONS: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'system', label: 'Sistema', icon: '⚙️' },
  { id: 'light',  label: 'Claro',   icon: '☀️' },
  { id: 'dark',   label: 'Oscuro',  icon: '🌙' },
];

export default function PerfilScreen() {
  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const { themeMode, setThemeMode } = useThemeInfo();
  const [profile, setProfile]       = useState<UserProfile | null>(null);
  const [editModal, setEditModal]   = useState(false);
  const [editName, setEditName]     = useState('');
  const [showBalanceNotif, setShowBalanceNotif] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  useEffect(() => {
    getUserProfile().then(setProfile);
    getShowBalanceNotification().then(setShowBalanceNotif);
  }, []);

  const handleToggleBalanceNotif = async (value: boolean) => {
    setShowBalanceNotif(value);
    await saveShowBalanceNotification(value);
    if (value) {
      await requestNotificationPermission();
    } else {
      await cancelBalanceNotification();
    }
  };

  const initials = profile?.name
    ? profile.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const avatarGlyph = profile?.avatarEmoji || initials;

  const handleLogout = () => {
    setConfirmLogout(true);
  };

  const confirmLogoutNow = async () => {
    setConfirmLogout(false);
    await cancelBalanceNotification();
    if (profile?.id) {
      await supabase.auth.signOut();
      await deleteUserProfile();
      // La navegación a /onboarding ya la dispara app/_layout.tsx al detectar
      // SIGNED_OUT — no hace falta duplicarla aquí.
    } else {
      // Modo anónimo: limpiar el namespace 'anon' para que el próximo
      // invitado en este dispositivo empiece en blanco, no herede estos datos.
      // No hay signOut() real en este caso, así que SIGNED_OUT nunca dispara
      // — la navegación sí hay que hacerla a mano.
      await wipeNamespaceData('anon');
      await deleteUserProfile();
      router.replace('/onboarding');
    }
  };

  const handleSaveName = async () => {
    if (!profile || !editName.trim()) return;
    const updated = { ...profile, name: editName.trim() };
    await saveUserProfile(updated);
    setProfile(updated);
    setEditModal(false);
  };

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe:        { flex: 1, backgroundColor: COLORS.bg },
    header:      { paddingHorizontal: SPACING.xl, paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl },
    scroll:      { paddingHorizontal: SPACING.xl, paddingBottom: 40 },

    avatarCard: {
      backgroundColor: COLORS.card, borderRadius: 20, padding: SPACING.xl,
      alignItems: 'center', gap: 6, marginBottom: SPACING.xxl,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 8,
      borderWidth: 1, borderColor: COLORS.border,
    },
    avatar: {
      width: 72, height: 72, borderRadius: 36,
      alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs,
    },
    avatarText:   { color: '#fff', fontWeight: '800', fontSize: FONT.xl },
    profileName:  { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg },
    profileEmail: { color: COLORS.textMuted, fontSize: FONT.sm },
    editBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      paddingHorizontal: 14, paddingVertical: SPACING.sm, borderRadius: 20,
      backgroundColor: COLORS.primaryBg, marginTop: 6,
    },
    editBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: FONT.sm },

    sectionLabel: {
      color: COLORS.textMuted, fontWeight: '700', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: 4,
    },
    section: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden',
      marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md,
    },
    rowDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
    rowIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    rowLabel: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    rowValue:  { color: COLORS.textMuted, fontSize: FONT.sm },

    themeRow: { flexDirection: 'row', gap: SPACING.sm, flex: 1 },
    themeBtn: {
      flex: 1, paddingVertical: 10, borderRadius: RADIUS.md, borderWidth: 2,
      borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg, gap: 2,
    },
    themeBtnActive:     { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    themeBtnEmoji:      { fontSize: FONT.lg },
    themeBtnText:       { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.xs },
    themeBtnTextActive: { color: COLORS.primary },

    dangerBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.danger + '30',
    },
    dangerText: { color: COLORS.danger, fontWeight: '700', fontSize: FONT.base },

    upgradeBtn: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
      backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.primary + '30',
    },
    upgradeText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.base },
    upgradeSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },

    modalTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, marginBottom: SPACING.lg },
    modalLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6 },
    input: {
      backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md,
      color: COLORS.text, fontSize: FONT.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.xl,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1,
      borderColor: COLORS.border, alignItems: 'center',
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn:    { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveText:   { color: '#fff', fontWeight: '700', fontSize: FONT.md },

    confirmOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 28 },
    confirmCard: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, width: '100%',
      alignItems: 'center', borderWidth: 2, borderColor: COLORS.danger + '44',
      elevation: 10, shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12,
    },
    confirmIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.danger + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    confirmTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.sm, textAlign: 'center' },
    confirmText: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', marginBottom: SPACING.xl },
    confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
    confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    confirmCancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    confirmDeleteBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.danger },
    confirmDeleteText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }, moderateScale)), [COLORS, moderateScale]);

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

        {/* ── Personalización financiera ───────────────── */}
        <Text style={styles.sectionLabel}>Tu experiencia</Text>
        <TouchableOpacity style={styles.section} onPress={() => router.push('/personalizacion')}>
          <View style={styles.row}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="sparkles-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Personaliza tu vida financiera</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                Periodicidad, presupuesto y gasto hormiga
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </View>
        </TouchableOpacity>

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
            <Text style={styles.rowValue}>v{Constants.expoConfig?.version ?? '1.0.0'}</Text>
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.card2 }]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
            </View>
            <Text style={styles.rowLabel}>Datos guardados localmente</Text>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.debit} />
          </View>
          <View style={[styles.row, styles.rowDivider]}>
            <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="notifications-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Notificación de saldo</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11, marginTop: 2 }}>
                Muestra tu balance general en una notificación fija
              </Text>
            </View>
            <Switch
              value={showBalanceNotif}
              onValueChange={handleToggleBalanceNotif}
              trackColor={{ false: COLORS.border, true: COLORS.primary + '88' }}
              thumbColor={showBalanceNotif ? COLORS.primary : COLORS.textDim}
            />
          </View>
        </View>

        {/* ── Crear cuenta (solo modo anónimo) ─────────── */}
        {profile?.isAnonymous && (
          <TouchableOpacity
            style={styles.upgradeBtn}
            onPress={() => router.push('/onboarding?step=register')}
            accessibilityRole="button"
            accessibilityLabel="Crear cuenta y guardar mis datos"
          >
            <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.upgradeText}>Crear cuenta y guardar mis datos</Text>
              <Text style={styles.upgradeSub}>Tus tarjetas, gastos y metas se conservan tal cual</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </TouchableOpacity>
        )}

        {/* ── Cerrar sesión ────────────────────────────── */}
        <TouchableOpacity
          style={styles.dangerBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.dangerText}>Cerrar sesión</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* Modal editar nombre */}
      <BottomSheet visible={editModal} onClose={() => setEditModal(false)} maxHeight="70%">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
        </ScrollView>
      </BottomSheet>

      {/* Confirmación de cerrar sesión (reemplaza Alert.alert nativo) */}
      <Modal visible={confirmLogout} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setConfirmLogout(false)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setConfirmLogout(false)}>
          <TouchableOpacity style={styles.confirmCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.confirmIcon}>
              <Ionicons name="log-out-outline" size={26} color={COLORS.danger} />
            </View>
            <Text style={styles.confirmTitle}>Cerrar sesión</Text>
            <Text style={styles.confirmText}>
              {profile?.isAnonymous
                ? 'Estás en modo anónimo: al cerrar sesión se borran tus tarjetas, gastos y metas de este dispositivo. Si quieres conservarlos, crea una cuenta primero.'
                : '¿Seguro? Tus datos guardados se mantendrán en el dispositivo.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmLogout(false)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={confirmLogoutNow}>
                <Text style={styles.confirmDeleteText}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
