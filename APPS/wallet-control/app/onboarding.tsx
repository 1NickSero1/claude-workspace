import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/storage';
import { trackSignup } from '@/lib/userTracking';
import { supabase } from '@/lib/supabase';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors, useThemeInfo } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

const AVATAR_COLORS = [
  '#6C5CE7', '#00C896', '#FF5C5C', '#FDCB6E',
  '#0984E3', '#E17055', '#A29BFE', '#00B894',
];

type Step = 'welcome' | 'choice' | 'register' | 'login' | 'done';

export default function OnboardingScreen() {
  const [step, setStep]           = useState<Step>('welcome');
  const [name, setName]           = useState('');
  const [nickname, setNickname]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState('');
  const [loading, setLoading]     = useState(false);

  const [loginEmail, setLoginEmail]       = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading]   = useState(false);

  const nameInitials = name.trim()
    ? name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';
  const avatarGlyph = avatarEmoji.trim() || nameInitials;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canRegister = name.trim().length >= 2
    && nickname.trim().length >= 2
    && emailValid
    && password.length >= 6;

  const handleRegister = async () => {
    if (!canRegister) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
      if (!data.user) throw new Error('No se pudo crear la sesión.');

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name: name.trim(),
        nickname: nickname.trim(),
        avatar_color: avatarColor,
        avatar_emoji: avatarEmoji.trim() || null,
      });
      if (profileError) throw profileError;

      const profile: UserProfile = {
        id:          data.user.id,
        name:        name.trim(),
        nickname:    nickname.trim(),
        email:       email.trim().toLowerCase(),
        avatarColor,
        avatarEmoji: avatarEmoji.trim() || undefined,
        createdAt:   new Date().toISOString(),
      };
      await saveUserProfile(profile);
      trackSignup(profile);
      setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      if (error) throw error;

      const { data: profileRow, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).single();
      if (profileError) throw profileError;

      await saveUserProfile({
        id:          data.user.id,
        name:        profileRow.name,
        nickname:    profileRow.nickname,
        email:       data.user.email ?? '',
        avatarColor: profileRow.avatar_color,
        avatarEmoji: profileRow.avatar_emoji ?? undefined,
        createdAt:   profileRow.created_at,
      });
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('No pudimos iniciar sesión', e?.message ?? 'Revisa tu correo y contraseña.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAnonymous = async () => {
    const profile: UserProfile = {
      name: 'Invitado',
      email: '',
      avatarColor: AVATAR_COLORS[0],
      isAnonymous: true,
      createdAt: new Date().toISOString(),
    };
    await saveUserProfile(profile);
    trackSignup(profile);
    router.replace('/(tabs)');
  };

  const goToApp = () => router.replace('/(tabs)');

  const COLORS = useColors();
  const { isDark, setThemeMode } = useThemeInfo();
  const toggleTheme = () => setThemeMode(isDark ? 'light' : 'dark');
  const { moderateScale } = useResponsive();

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    flex: { flex: 1 },

    themeToggleBtn: {
      position: 'absolute', top: 16, right: 20, zIndex: 10,
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: COLORS.border,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3,
    },

    // Welcome
    welcomeContainer: {
      flex: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 36,
      alignItems: 'center', justifyContent: 'space-between',
    },
    topBlock: { width: '100%', alignItems: 'center' },
    midBlock: { width: '100%' },
    bottomBlock: { width: '100%' },
    logoWrap: {
      width: 88, height: 88, borderRadius: 44,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 20,
      elevation: 4, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25, shadowRadius: 10,
    },
    logoMonogram: { color: '#fff', fontWeight: '900', fontSize: 40 },
    welcomeTitle: { color: COLORS.text, fontWeight: '900', fontSize: 32, marginBottom: 10 },
    welcomeSub: {
      color: COLORS.textMuted, fontSize: FONT.base, textAlign: 'center',
      lineHeight: 24,
    },
    featureList: { width: '100%', gap: 14 },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    featureIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    featureText: { flex: 1, color: COLORS.text, fontSize: FONT.md, lineHeight: 20 },

    // Choice
    choiceContainer: { flex: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
    optionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: COLORS.card, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    },
    optionIcon: {
      width: 44, height: 44, borderRadius: 12,
      alignItems: 'center', justifyContent: 'center',
    },
    optionTextWrap: { flex: 1 },
    optionTitle: { color: COLORS.text, fontWeight: '700', fontSize: FONT.base, marginBottom: 2 },
    optionSub: { color: COLORS.textMuted, fontSize: FONT.sm, lineHeight: 18 },

    // Done
    doneContainer: {
      flex: 1, paddingHorizontal: 28, paddingTop: 80, paddingBottom: 40,
      alignItems: 'center',
    },
    avatarLarge: {
      width: 100, height: 100, borderRadius: 30,
      alignItems: 'center', justifyContent: 'center', marginBottom: 24,
      elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 8,
    },
    avatarInitialsLarge: { color: '#fff', fontWeight: '900', fontSize: 36 },
    doneTitle: { color: COLORS.text, fontWeight: '900', fontSize: 28, marginBottom: 12 },
    doneSub: {
      color: COLORS.textMuted, fontSize: FONT.base, textAlign: 'center',
      lineHeight: 24, marginBottom: 48,
    },

    // Form
    formScroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },
    backBtn: {
      width: 40, height: 40, borderRadius: 12,
      backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: 24, borderWidth: 1, borderColor: COLORS.border,
    },
    formTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl, marginBottom: 4 },
    formSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 24 },

    // Avatar picker
    avatarSection: { alignItems: 'center', marginBottom: 24, gap: 12 },
    avatarPreview: {
      width: 72, height: 72, borderRadius: 20,
      alignItems: 'center', justifyContent: 'center',
      elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2, shadowRadius: 6,
    },
    avatarInitials: { color: '#fff', fontWeight: '800', fontSize: 24 },
    colorPicker: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' },
    colorDot: { width: 28, height: 28, borderRadius: 14 },
    colorDotSelected: { borderWidth: 3, borderColor: COLORS.text },
    emojiRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    emojiLabel: { color: COLORS.textMuted, fontSize: FONT.sm },
    emojiInput: {
      width: 56, height: 44, borderRadius: 12,
      backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.border,
      textAlign: 'center', fontSize: 22, color: COLORS.text,
    },

    // Inputs
    label: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: 6, marginTop: 14 },
    inputWrap: { position: 'relative' },
    input: {
      backgroundColor: COLORS.card, borderRadius: 12, padding: 14,
      color: COLORS.text, fontSize: FONT.md,
      borderWidth: 1.5, borderColor: COLORS.border,
      paddingRight: 44,
    },
    inputError: { borderColor: COLORS.credit },
    inputIcon: { position: 'absolute', right: 14, top: 14 },
    errorText: { color: COLORS.credit, fontSize: FONT.sm, marginTop: 4 },
    privacyNote: {
      color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center',
      marginTop: 20, marginBottom: 8, lineHeight: 20,
      backgroundColor: COLORS.primaryBg, borderRadius: 12, padding: 12,
    },

    // Buttons
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 8, backgroundColor: COLORS.primary,
      borderRadius: 16, padding: 16,
      elevation: 4, shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    primaryBtnSpaced: { marginTop: 20 },
    primaryBtnOff: { backgroundColor: COLORS.textDim, elevation: 0, shadowOpacity: 0 },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT.base },
  }, moderateScale)), [COLORS, moderateScale]);

  // ── WELCOME ─────────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <View style={styles.welcomeContainer}>
          <View style={styles.topBlock}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDim]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoWrap}
            >
              <Text style={styles.logoMonogram}>W</Text>
            </LinearGradient>
            <Text style={styles.welcomeTitle}>Wallet Control</Text>
            <Text style={styles.welcomeSub}>
              La plata se cuida sola{'\n'}cuando Finando te acompaña.
            </Text>
          </View>

          <View style={styles.midBlock}>
            <View style={styles.featureList}>
              {[
                { icon: 'hardware-chip-outline', text: 'Finando IA registra tus gastos en lenguaje natural' },
                { icon: 'card-outline',          text: 'Gestiona cuentas débito y tarjetas de crédito' },
                { icon: 'bar-chart-outline',     text: 'Resumen visual de tus finanzas del mes' },
                { icon: 'flag-outline',          text: 'Metas de ahorro con historial de aportes' },
              ].map(f => (
                <View key={f.icon} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity onPress={() => setStep('choice')} style={styles.primaryBtn}>
              <Text style={styles.primaryBtnText}>Únete a la comunidad 🚀</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── CHOICE ──────────────────────────────────────────────────────────────────
  if (step === 'choice') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.choiceContainer}>
          <TouchableOpacity onPress={() => setStep('welcome')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.formTitle}>¿Cómo quieres empezar?</Text>
          <Text style={styles.formSub}>Elige la opción que más te acomode</Text>

          <TouchableOpacity onPress={() => setStep('register')} style={styles.optionCard}>
            <View style={[styles.optionIcon, { backgroundColor: COLORS.primaryBg }]}>
              <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Crear cuenta nueva</Text>
              <Text style={styles.optionSub}>Guarda tus datos y desbloquea a Finando IA</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep('login')} style={styles.optionCard}>
            <View style={[styles.optionIcon, { backgroundColor: COLORS.debitBg }]}>
              <Ionicons name="log-in-outline" size={22} color={COLORS.debit} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Iniciar sesión</Text>
              <Text style={styles.optionSub}>Ya tengo una cuenta en este dispositivo</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleAnonymous} style={styles.optionCard}>
            <View style={[styles.optionIcon, { backgroundColor: COLORS.card2 }]}>
              <Ionicons name="eye-off-outline" size={22} color={COLORS.textMuted} />
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionTitle}>Modo anónimo</Text>
              <Text style={styles.optionSub}>Sin registro — la IA de Finando estará desactivada</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── LOGIN ───────────────────────────────────────────────────────────────────
  if (step === 'login') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <TouchableOpacity onPress={() => setStep('choice')} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={20} color={COLORS.text} />
            </TouchableOpacity>

            <Text style={styles.formTitle}>Inicia sesión</Text>
            <Text style={styles.formSub}>Usa el correo y contraseña de tu cuenta</Text>

            <Text style={styles.label}>Correo electrónico</Text>
            <TextInput
              style={styles.input}
              value={loginEmail}
              onChangeText={setLoginEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={COLORS.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={loginPassword}
              onChangeText={setLoginPassword}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry
            />

            <TouchableOpacity
              onPress={handleLogin}
              disabled={!loginEmail || !loginPassword || loginLoading}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, (!loginEmail || !loginPassword || loginLoading) && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{loginLoading ? 'Verificando...' : 'Entrar'}</Text>
              {!loginLoading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.doneContainer}>
          <View style={[styles.avatarLarge, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarInitialsLarge}>{avatarGlyph}</Text>
          </View>
          <Text style={styles.doneTitle}>¡Listo, {name.split(' ')[0]}!</Text>
          <Text style={styles.doneSub}>
            Tu cuenta está creada y guardada en este dispositivo.{'\n'}
            Empieza diciéndole a Finando tus gastos del mes.
          </Text>
          <TouchableOpacity onPress={goToApp} style={[styles.primaryBtn, styles.primaryBtnSpaced]}>
            <Text style={styles.primaryBtnText}>Ir a Wallet Control</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── REGISTER ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity onPress={() => setStep('choice')} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>

          <Text style={styles.formTitle}>Crea tu cuenta</Text>
          <Text style={styles.formSub}>Úsala para entrar desde cualquier dispositivo</Text>

          {/* Avatar preview */}
          <View style={styles.avatarSection}>
            <View style={[styles.avatarPreview, { backgroundColor: avatarColor }]}>
              <Text style={styles.avatarInitials}>{avatarGlyph}</Text>
            </View>
            <View style={styles.colorPicker}>
              {AVATAR_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setAvatarColor(c)}
                  style={[styles.colorDot, { backgroundColor: c },
                          avatarColor === c && styles.colorDotSelected]}
                />
              ))}
            </View>
            <View style={styles.emojiRow}>
              <Text style={styles.emojiLabel}>o un emoji:</Text>
              <TextInput
                style={styles.emojiInput}
                value={avatarEmoji}
                onChangeText={setAvatarEmoji}
                placeholder="😀"
                placeholderTextColor={COLORS.textDim}
                maxLength={8}
              />
            </View>
          </View>

          {/* Nombre */}
          <Text style={styles.label}>Nombre completo</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Ej: Juan García"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="words"
          />

          {/* Nickname */}
          <Text style={styles.label}>¿Cómo quieres que te llame Finando?</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ej: Juanito"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="words"
          />

          {/* Email */}
          <Text style={styles.label}>Correo electrónico</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, email && !emailValid && styles.inputError]}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@correo.com"
              placeholderTextColor={COLORS.textDim}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {email.length > 0 && (
              <Ionicons
                name={emailValid ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={emailValid ? COLORS.debit : COLORS.credit}
                style={styles.inputIcon}
              />
            )}
          </View>

          {/* Password */}
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 6 caracteres"
            placeholderTextColor={COLORS.textDim}
            secureTextEntry
          />

          <Text style={styles.privacyNote}>
            🔒 Tu cuenta se guarda de forma segura en la nube. Tus gastos, tarjetas y metas siguen solo en este dispositivo.
          </Text>

          <TouchableOpacity
            onPress={handleRegister}
            disabled={!canRegister || loading}
            style={[styles.primaryBtn, styles.primaryBtnSpaced, (!canRegister || loading) && styles.primaryBtnOff]}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? 'Guardando...' : 'Crear cuenta'}
            </Text>
            {!loading && <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
