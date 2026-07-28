import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import BottomSheet from '@/components/BottomSheet';
import InfoModal from '@/components/InfoModal';
import { FONT, SPACING, RADIUS } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

type ConfirmKind = 'email' | 'password' | null;

export default function CuentaScreen() {
  const COLORS = useColors();
  const { moderateScale } = useResponsive();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [nickname, setNickname] = useState('');
  const [savingNickname, setSavingNickname] = useState(false);

  const [emailModal, setEmailModal]       = useState(false);
  const [newEmail, setNewEmail]           = useState('');
  const [passwordModal, setPasswordModal] = useState(false);
  const [newPassword, setNewPassword]     = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [saving, setSaving] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant?: 'success' | 'error' } | null>(null);

  useEffect(() => {
    getUserProfile().then(async p => {
      setProfile(p);
      setNickname(p?.nickname ?? p?.name ?? '');
      // Cambiar el correo exige confirmarlo por enlace antes de tomar
      // efecto — así que no se actualiza profiles.email en el momento del
      // cambio (mostraría el correo nuevo antes de confirmarse). En vez de
      // eso, cada vez que se entra a esta pantalla se revisa si Supabase ya
      // tiene un correo distinto al guardado (o sea, que el enlace ya se
      // confirmó) y, si es así, se sincroniza solo.
      if (p?.id && !p.isAnonymous) {
        const { data } = await supabase.auth.getUser();
        const confirmedEmail = data.user?.email;
        if (confirmedEmail && confirmedEmail !== p.email) {
          await supabase.from('profiles').update({ email: confirmedEmail }).eq('id', p.id);
          const updated = { ...p, email: confirmedEmail };
          await saveUserProfile(updated);
          setProfile(updated);
        }
      }
    });
  }, []);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim());
  const passwordValid = newPassword.length >= 8 && newPassword === repeatPassword;

  const handleSaveNickname = async () => {
    if (!profile || !nickname.trim() || savingNickname) return;
    setSavingNickname(true);
    try {
      const trimmed = nickname.trim();
      if (profile.id) {
        const { error } = await supabase.from('profiles')
          .update({ name: trimmed, nickname: trimmed }).eq('id', profile.id);
        if (error) throw error;
      }
      const updated = { ...profile, name: trimmed, nickname: trimmed };
      await saveUserProfile(updated);
      setProfile(updated);
      setInfoModal({ title: 'Listo', message: 'Así te llamará Finando de ahora en adelante.', variant: 'success' });
    } catch (e: any) {
      setInfoModal({ title: 'No se pudo guardar', message: e?.message ?? 'Intenta de nuevo.', variant: 'error' });
    } finally {
      setSavingNickname(false);
    }
  };

  const openEmailConfirm = () => {
    if (!emailValid) return;
    setEmailModal(false);
    setConfirmKind('email');
  };

  const openPasswordConfirm = () => {
    if (!passwordValid) return;
    setPasswordModal(false);
    setConfirmKind('password');
  };

  const handleConfirm = async () => {
    if (!profile || saving) return;
    setSaving(true);
    try {
      if (confirmKind === 'email') {
        const trimmed = newEmail.trim().toLowerCase();
        const { error } = await supabase.auth.updateUser({ email: trimmed });
        if (error) throw error;
        setInfoModal({
          title: 'Revisa tu correo',
          message: 'Te enviamos un enlace de confirmación a tu correo actual y al nuevo. El cambio se aplica cuando lo confirmes desde ahí.',
        });
        setNewEmail('');
      } else if (confirmKind === 'password') {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        setInfoModal({ title: 'Contraseña actualizada', message: 'Tu contraseña se cambió correctamente.', variant: 'success' });
        setNewPassword('');
        setRepeatPassword('');
      }
    } catch (e: any) {
      setInfoModal({ title: 'No se pudo cambiar', message: e?.message ?? 'Intenta de nuevo.', variant: 'error' });
    } finally {
      setSaving(false);
      setConfirmKind(null);
    }
  };

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md,
      backgroundColor: COLORS.card, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg },
    scroll: { padding: SPACING.xl, paddingBottom: 40 },

    sectionLabel: {
      color: COLORS.textMuted, fontWeight: '700', fontSize: 11,
      textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.sm, marginTop: 4,
    },
    section: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.lg, overflow: 'hidden',
      marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
    },
    row: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg, gap: SPACING.md },
    rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rowLabel: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: FONT.base },
    rowHint: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },

    hint: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: SPACING.md, lineHeight: 18 },
    input: {
      backgroundColor: COLORS.bg, borderRadius: 10, padding: SPACING.md,
      color: COLORS.text, fontSize: FONT.base, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md,
    },
    saveRowBtn: {
      alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
      paddingVertical: 10, paddingHorizontal: 18,
    },
    saveRowBtnDisabled: { opacity: 0.5 },
    saveRowBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },

    modalTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.lg, marginBottom: SPACING.lg },
    modalLabel: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: {
      flex: 1, padding: 14, borderRadius: RADIUS.md, borderWidth: 1,
      borderColor: COLORS.border, alignItems: 'center',
    },
    cancelText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.md },
    saveBtn: { flex: 1, padding: 14, borderRadius: RADIUS.md, backgroundColor: COLORS.primary, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.5 },
    saveText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },

    upgradeCard: {
      backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.primary + '30', marginBottom: SPACING.xl,
    },
    upgradeTitle: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.base, marginBottom: 4 },
    upgradeSub: { color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18, marginBottom: SPACING.md },
    upgradeBtn: {
      backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: 'center',
    },
    upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT.sm },

    confirmOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 28 },
    confirmCard: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl, width: '100%',
      alignItems: 'center', borderWidth: 2, borderColor: COLORS.warning + '44',
      elevation: 10, shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 12,
    },
    confirmIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: COLORS.warning + '18', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    confirmTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, marginBottom: SPACING.sm, textAlign: 'center' },
    confirmText: { color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center', marginBottom: SPACING.xl },
    confirmActions: { flexDirection: 'row', gap: 10, width: '100%' },
    confirmCancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.bg },
    confirmCancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT.md },
    confirmOkBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: COLORS.warning },
    confirmOkText: { color: '#fff', fontWeight: '700', fontSize: FONT.md },
  }, moderateScale)), [COLORS, moderateScale]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modificar tu cuenta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Nombre / nickname ─────────────────────────── */}
        <Text style={styles.sectionLabel}>Cómo te llama Finando</Text>
        <View style={styles.section}>
          <Text style={styles.hint}>¿Cómo quieres que te llame Finando y cómo se te ve en la app?</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ej: Juanito"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.saveRowBtn, (!nickname.trim() || savingNickname) && styles.saveRowBtnDisabled]}
            onPress={handleSaveNickname}
            disabled={!nickname.trim() || savingNickname}
          >
            <Text style={styles.saveRowBtnText}>Guardar</Text>
          </TouchableOpacity>
        </View>

        {profile?.isAnonymous ? (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeTitle}>Correo y contraseña</Text>
            <Text style={styles.upgradeSub}>
              Estás en modo anónimo, así que todavía no tienes correo ni contraseña. Crea una cuenta
              para poder configurarlos sin perder tus datos.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => router.push('/onboarding?step=register')}>
              <Text style={styles.upgradeBtnText}>Crear cuenta y guardar mis datos</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Correo electrónico ───────────────────────── */}
            <Text style={styles.sectionLabel}>Correo electrónico</Text>
            <TouchableOpacity style={styles.section} onPress={() => { setNewEmail(''); setEmailModal(true); }}>
              <View style={[styles.row, { padding: 0 }]}>
                <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{profile?.email || 'Sin correo'}</Text>
                  <Text style={styles.rowHint}>Toca para cambiarlo</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
              </View>
            </TouchableOpacity>

            {/* ── Contraseña ───────────────────────────────── */}
            <Text style={styles.sectionLabel}>Contraseña</Text>
            <TouchableOpacity style={styles.section} onPress={() => { setNewPassword(''); setRepeatPassword(''); setPasswordModal(true); }}>
              <View style={[styles.row, { padding: 0 }]}>
                <View style={[styles.rowIcon, { backgroundColor: COLORS.primaryBg }]}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>••••••••</Text>
                  <Text style={styles.rowHint}>Toca para cambiarla</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Sheet: nuevo correo */}
      <BottomSheet visible={emailModal} onClose={() => setEmailModal(false)} maxHeight="70%">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Cambiar correo</Text>
          <Text style={styles.modalLabel}>Correo nuevo</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder="tu@correo.com"
            placeholderTextColor={COLORS.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setEmailModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openEmailConfirm}
              style={[styles.saveBtn, !emailValid && styles.saveBtnDisabled]}
              disabled={!emailValid}
            >
              <Text style={styles.saveText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Sheet: nueva contraseña */}
      <BottomSheet visible={passwordModal} onClose={() => setPasswordModal(false)} maxHeight="70%">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={styles.modalTitle}>Cambiar contraseña</Text>
          <Text style={styles.modalLabel}>Contraseña nueva (mínimo 8 caracteres)</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textDim}
            secureTextEntry
            autoFocus
          />
          <Text style={styles.modalLabel}>Repetir contraseña</Text>
          <TextInput
            style={styles.input}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder="••••••••"
            placeholderTextColor={COLORS.textDim}
            secureTextEntry
          />
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={() => setPasswordModal(false)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openPasswordConfirm}
              style={[styles.saveBtn, !passwordValid && styles.saveBtnDisabled]}
              disabled={!passwordValid}
            >
              <Text style={styles.saveText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </BottomSheet>

      {/* Confirmación para correo/contraseña — datos sensibles */}
      <Modal visible={confirmKind !== null} animationType="fade" transparent statusBarTranslucent onRequestClose={() => setConfirmKind(null)}>
        <TouchableOpacity style={styles.confirmOverlay} activeOpacity={1} onPress={() => setConfirmKind(null)}>
          <TouchableOpacity style={styles.confirmCard} activeOpacity={1} onPress={() => {}}>
            <View style={styles.confirmIcon}>
              <Ionicons name="alert-circle-outline" size={26} color={COLORS.warning} />
            </View>
            <Text style={styles.confirmTitle}>
              {confirmKind === 'email' ? 'Cambiar tu correo' : 'Cambiar tu contraseña'}
            </Text>
            <Text style={styles.confirmText}>
              {confirmKind === 'email'
                ? `¿Seguro que quieres cambiar tu correo a ${newEmail.trim()}? Te llegará un enlace de confirmación.`
                : '¿Seguro que quieres cambiar tu contraseña? La nueva contraseña quedará activa de inmediato.'}
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setConfirmKind(null)}>
                <Text style={styles.confirmCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmOkBtn} onPress={handleConfirm} disabled={saving}>
                <Text style={styles.confirmOkText}>{saving ? 'Guardando...' : 'Confirmar'}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {infoModal && (
        <InfoModal
          visible
          title={infoModal.title}
          message={infoModal.message}
          variant={infoModal.variant}
          onClose={() => setInfoModal(null)}
        />
      )}
    </SafeAreaView>
  );
}
