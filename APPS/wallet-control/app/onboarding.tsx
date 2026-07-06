import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  saveUserProfile, UserProfile, BudgetPeriod,
  addIncomes, addExpenses, getCurrentMonthKey,
} from '@/lib/storage';
import { scheduleRecurringReminder } from '@/lib/notifications';
import { formatThousands } from '@/lib/expenseParser';
import { trackSignup } from '@/lib/userTracking';
import { supabase } from '@/lib/supabase';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors, useThemeInfo } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

const AVATAR_COLORS = [
  '#6C5CE7', '#00C896', '#FF5C5C', '#FDCB6E',
  '#0984E3', '#E17055', '#A29BFE', '#00B894',
];

const DEFAULT_AVATAR_EMOJI = '💵';

const RECOMMENDED_EMOJIS = ['💵', '😀', '😎', '🚀', '🐱', '⭐', '🔥', '🎯'];

const EMOJI_ONLY_REGEX = /\p{Extended_Pictographic}/gu;
const filterEmojiOnly = (text: string) => (text.match(EMOJI_ONLY_REGEX) ?? []).join('');

type Step = 'welcome' | 'choice' | 'register' | 'login' | 'periodicity' | 'fixedIncome' | 'fixedExpense' | 'done';

const SUGGESTED_FIXED_EXPENSES = [
  'Arriendo', 'Servicios (luz/agua/gas)', 'Internet / Celular', 'Suscripciones', 'Transporte', 'Seguro',
];

function getPasswordStrength(pw: string): { label: string; pct: number; color: 'danger' | 'gold' | 'debit' } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { label: 'Débil', pct: 33, color: 'danger' };
  if (score <= 3) return { label: 'Media', pct: 66, color: 'gold' };
  return { label: 'Fuerte', pct: 100, color: 'debit' };
}

const PERIOD_OPTIONS: { value: BudgetPeriod; label: string; caption: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'weekly',   label: 'Semanal',   caption: 'Manejo mi plata semana a semana',        icon: 'calendar-outline' },
  { value: 'biweekly', label: 'Quincenal', caption: 'Me pagan o presupuesto cada 15 días',     icon: 'calendar-number-outline' },
  { value: 'monthly',  label: 'Mensual',   caption: 'Prefiero ver todo el mes de una vez',      icon: 'calendar-clear-outline' },
];

export default function OnboardingScreen() {
  const [step, setStep]           = useState<Step>('welcome');
  const [nickname, setNickname]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(DEFAULT_AVATAR_EMOJI);
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [loading, setLoading]     = useState(false);
  const emojiInputRef = useRef<TextInput>(null);

  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword]     = useState('');
  const [loginLoading, setLoginLoading]       = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPassword, setShowPassword]       = useState(false);

  // Setup posterior a la creación de cuenta (periodicidad + ingreso/gasto fijo)
  const [createdProfile, setCreatedProfile]   = useState<UserProfile | null>(null);
  const [pendingAnonymous, setPendingAnonymous] = useState(false);
  const [budgetPeriod, setBudgetPeriod]       = useState<BudgetPeriod>('biweekly');
  const [fixedIncomeAmount, setFixedIncomeAmount] = useState('');
  const [fixedExpenseItems, setFixedExpenseItems] = useState<{ name: string; amount: number }[]>([]);
  const [newExpenseName, setNewExpenseName]   = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [setupSaving, setSetupSaving]         = useState(false);

  const avatarGlyph = avatarEmoji.trim() || '🙂';

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canRegister = nickname.trim().length >= 2
    && emailValid
    && password.length >= 6
    && avatarEmoji.trim().length > 0;

  const handleRegister = async () => {
    if (!canRegister) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nickname: nickname.trim(),
            avatar_color: avatarColor,
            avatar_emoji: avatarEmoji.trim(),
          },
        },
      });
      if (error) throw error;
      if (!data.user) throw new Error('No se pudo crear la cuenta.');

      if (!data.session) {
        Alert.alert(
          'Confirma tu correo',
          'Te enviamos un enlace de confirmación a tu correo. Ábrelo y luego vuelve aquí para iniciar sesión.',
        );
        setStep('login');
        return;
      }

      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        name: nickname.trim(),
        nickname: nickname.trim(),
        email: email.trim().toLowerCase(),
        avatar_color: avatarColor,
        avatar_emoji: avatarEmoji.trim(),
      });
      if (profileError) throw profileError;

      const profile: UserProfile = {
        id:          data.user.id,
        name:        nickname.trim(),
        nickname:    nickname.trim(),
        email:       email.trim().toLowerCase(),
        avatarColor,
        avatarEmoji: avatarEmoji.trim(),
        createdAt:   new Date().toISOString(),
      };
      await saveUserProfile(profile);
      trackSignup(profile);
      setCreatedProfile(profile);
      setStep('periodicity');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'No se pudo crear tu cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoginLoading(true);
    try {
      const identifier = loginIdentifier.trim();
      let resolvedEmail = identifier.toLowerCase();

      if (!identifier.includes('@')) {
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_nickname', { p_nickname: identifier });
        if (lookupError || !foundEmail) {
          Alert.alert('No encontramos tu cuenta', 'Revisa tu nombre de usuario o correo.');
          setLoginLoading(false);
          return;
        }
        resolvedEmail = foundEmail;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: resolvedEmail,
        password: loginPassword,
      });
      if (error) throw error;

      let { data: profileRow, error: profileError } = await supabase
        .from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (profileError) throw profileError;

      if (!profileRow) {
        // Primera vez que inicia sesión tras confirmar el correo: el signUp
        // original no pudo insertar en profiles (sin sesión aún, RLS lo
        // bloquea), así que se crea recién ahora con los datos guardados
        // en user_metadata desde el registro.
        const meta = data.user.user_metadata ?? {};
        const nickFromMeta = meta.nickname ?? data.user.email?.split('@')[0] ?? 'Usuario';
        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            name: nickFromMeta,
            nickname: nickFromMeta,
            email: data.user.email ?? '',
            avatar_color: meta.avatar_color ?? AVATAR_COLORS[0],
            avatar_emoji: meta.avatar_emoji ?? DEFAULT_AVATAR_EMOJI,
          })
          .select()
          .single();
        if (insertError) throw insertError;
        profileRow = inserted;
      }

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
    setCreatedProfile(profile);
    setPendingAnonymous(true);
    setStep('periodicity');
  };

  const goToApp = () => router.replace('/(tabs)');

  const handlePeriodicityContinue = async () => {
    if (!createdProfile) return;
    const updated: UserProfile = { ...createdProfile, budgetPeriod };
    await saveUserProfile(updated);
    setCreatedProfile(updated);
    setStep('fixedIncome');
  };

  const handleFixedIncomeContinue = async (skip: boolean) => {
    setSetupSaving(true);
    try {
      const amount = Number(fixedIncomeAmount.replace(/\D/g, ''));
      if (!skip && amount > 0) {
        const monthKey = getCurrentMonthKey();
        const day = new Date().getDate();
        const quincena: 1 | 2 = day <= 15 ? 1 : 2;
        const notificationId = await scheduleRecurringReminder('Ingreso fijo mensual', 'monthly', new Date());
        await addIncomes(monthKey, [{
          id: `inc_${Date.now()}`,
          description: 'Ingreso fijo mensual',
          amount,
          quincena,
          createdAt: new Date().toISOString(),
          monthKey,
          isRecurring: true,
          recurrenceFrequency: 'monthly',
          notificationId,
        }]);
      }
      setStep('fixedExpense');
    } finally {
      setSetupSaving(false);
    }
  };

  const addFixedExpenseItem = () => {
    const amount = Number(newExpenseAmount.replace(/\D/g, ''));
    const name = newExpenseName.trim();
    if (!name || amount <= 0) return;
    setFixedExpenseItems(items => [...items, { name, amount }]);
    setNewExpenseName('');
    setNewExpenseAmount('');
  };

  const removeFixedExpenseItem = (index: number) => {
    setFixedExpenseItems(items => items.filter((_, i) => i !== index));
  };

  const handleFixedExpenseFinish = async (skip: boolean) => {
    setSetupSaving(true);
    try {
      if (!skip && fixedExpenseItems.length > 0) {
        const monthKey = getCurrentMonthKey();
        const day = new Date().getDate();
        const quincena: 1 | 2 = day <= 15 ? 1 : 2;
        const expenses = await Promise.all(fixedExpenseItems.map(async (item, i) => {
          const notificationId = await scheduleRecurringReminder(item.name, 'monthly', new Date());
          return {
            id: `exp_${Date.now()}_${i}`,
            name: item.name,
            amount: item.amount,
            categoryId: 'otro',
            quincena,
            createdAt: new Date().toISOString(),
            monthKey,
            isRecurring: true,
            recurrenceFrequency: 'monthly' as const,
            notificationId,
          };
        }));
        await addExpenses(monthKey, expenses);
      }
      if (pendingAnonymous) {
        goToApp();
      } else {
        setStep('done');
      }
    } finally {
      setSetupSaving(false);
    }
  };

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
    welcomeScroll: { flexGrow: 1 },
    welcomeContainer: {
      flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 36,
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
    choiceContainer: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 24 },
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
    hiddenEmojiInput: { height: 0, width: 0, opacity: 0 },
    emojiSuggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    emojiSuggestBtn: {
      width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
      backgroundColor: COLORS.card2, borderWidth: 2, borderColor: 'transparent',
    },
    emojiSuggestBtnSelected: {
      borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22',
    },
    emojiSuggestText: { fontSize: 20 },

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

    // Gastos fijos (onboarding)
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    chip: {
      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
      backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    },
    chipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    addRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    addBtn: {
      width: 48, height: 48, borderRadius: 12, backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    expenseItemRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 8,
      borderWidth: 1, borderColor: COLORS.border,
    },
    expenseItemName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.md },
    expenseItemAmount: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    expenseItemDelete: {
      width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.creditBg,
      alignItems: 'center', justifyContent: 'center',
    },

    // Password
    strengthTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginTop: 8 },
    strengthFill: { height: '100%', borderRadius: 3 },
    strengthLabel: { fontSize: FONT.sm, fontWeight: '700', marginTop: 6 },
  }, moderateScale)), [COLORS, moderateScale]);

  // ── WELCOME ─────────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity onPress={toggleTheme} style={styles.themeToggleBtn}>
          <Ionicons name={isDark ? 'sunny' : 'moon'} size={20} color={COLORS.primary} />
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.welcomeScroll} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHOICE ──────────────────────────────────────────────────────────────────
  if (step === 'choice') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.choiceContainer} showsVerticalScrollIndicator={false}>
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
        </ScrollView>
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
            <Text style={styles.formSub}>Usa tu correo o tu nombre de usuario</Text>

            <Text style={styles.label}>Correo o nombre de usuario</Text>
            <TextInput
              style={styles.input}
              value={loginIdentifier}
              onChangeText={setLoginIdentifier}
              placeholder="tu@correo.com o Juanito"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textDim}
                secureTextEntry={!showLoginPassword}
              />
              <TouchableOpacity onPress={() => setShowLoginPassword(v => !v)} style={styles.inputIcon}>
                <Ionicons name={showLoginPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={!loginIdentifier || !loginPassword || loginLoading}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, (!loginIdentifier || !loginPassword || loginLoading) && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{loginLoading ? 'Verificando...' : 'Entrar'}</Text>
              {!loginLoading && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── PERIODICIDAD ────────────────────────────────────────────────────────────
  if (step === 'periodicity') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.choiceContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.formTitle}>¿Cómo manejas tu dinero?</Text>
          <Text style={styles.formSub}>Así te mostramos la información en el periodo que prefieras</Text>

          {PERIOD_OPTIONS.map(opt => {
            const active = budgetPeriod === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setBudgetPeriod(opt.value)}
                style={[styles.optionCard, active && { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg }]}
              >
                <View style={[styles.optionIcon, { backgroundColor: active ? COLORS.primary : COLORS.card2 }]}>
                  <Ionicons name={opt.icon} size={22} color={active ? '#fff' : COLORS.textMuted} />
                </View>
                <View style={styles.optionTextWrap}>
                  <Text style={styles.optionTitle}>{opt.label}</Text>
                  <Text style={styles.optionSub}>{opt.caption}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity onPress={handlePeriodicityContinue} style={[styles.primaryBtn, styles.primaryBtnSpaced]}>
            <Text style={styles.primaryBtnText}>Continuar</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── INGRESO FIJO ─────────────────────────────────────────────────────────────
  if (step === 'fixedIncome') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Tienes un ingreso fijo mensual?</Text>
            <Text style={styles.formSub}>Por ejemplo tu salario. Lo registramos automáticamente cada mes — puedes omitir este paso</Text>

            <Text style={styles.label}>Monto mensual (COP, opcional)</Text>
            <TextInput
              style={styles.input}
              value={formatThousands(fixedIncomeAmount)}
              onChangeText={v => setFixedIncomeAmount(v.replace(/\D/g, ''))}
              placeholder="Ej: 2.500.000"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              onPress={() => handleFixedIncomeContinue(false)}
              disabled={setupSaving}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, setupSaving && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{setupSaving ? 'Guardando...' : 'Continuar'}</Text>
              {!setupSaving && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFixedIncomeContinue(true)} disabled={setupSaving} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm }}>Omitir</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── GASTO FIJO ───────────────────────────────────────────────────────────────
  if (step === 'fixedExpense') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Cuánto gastas en cosas fijas al mes?</Text>
            <Text style={styles.formSub}>Arriendo, servicios, suscripciones, etc. — agrega los que quieras, puedes omitir este paso</Text>

            <Text style={styles.label}>Sugerencias</Text>
            <View style={styles.chipRow}>
              {SUGGESTED_FIXED_EXPENSES.map(label => (
                <TouchableOpacity key={label} onPress={() => setNewExpenseName(label)} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Nombre del gasto fijo</Text>
            <TextInput
              style={styles.input}
              value={newExpenseName}
              onChangeText={setNewExpenseName}
              placeholder="Ej: Arriendo"
              placeholderTextColor={COLORS.textDim}
            />

            <Text style={styles.label}>Monto mensual (COP)</Text>
            <View style={styles.addRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={formatThousands(newExpenseAmount)}
                onChangeText={v => setNewExpenseAmount(v.replace(/\D/g, ''))}
                placeholder="Ej: 1.200.000"
                placeholderTextColor={COLORS.textDim}
                keyboardType="number-pad"
              />
              <TouchableOpacity onPress={addFixedExpenseItem} style={styles.addBtn}>
                <Ionicons name="add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {fixedExpenseItems.length > 0 && (
              <View style={{ marginTop: 18 }}>
                {fixedExpenseItems.map((item, i) => (
                  <View key={`${item.name}_${i}`} style={styles.expenseItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseItemName}>{item.name}</Text>
                      <Text style={styles.expenseItemAmount}>${formatThousands(item.amount)} COP/mes</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeFixedExpenseItem(i)} style={styles.expenseItemDelete}>
                      <Ionicons name="trash-outline" size={16} color={COLORS.credit} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleFixedExpenseFinish(false)}
              disabled={setupSaving}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, setupSaving && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{setupSaving ? 'Guardando...' : 'Finalizar'}</Text>
              {!setupSaving && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFixedExpenseFinish(true)} disabled={setupSaving} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm }}>Omitir</Text>
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
          <Text style={styles.doneTitle}>¡Listo, {nickname.split(' ')[0]}!</Text>
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

          {/* Avatar preview — toca para ver recomendados o escribir el tuyo */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowEmojiSuggestions(v => !v)}
              style={[styles.avatarPreview, { backgroundColor: avatarColor }]}
            >
              <Text style={styles.avatarInitials}>{avatarGlyph}</Text>
            </TouchableOpacity>

            {showEmojiSuggestions && (
              <View style={styles.emojiSuggestRow}>
                {RECOMMENDED_EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => { setAvatarEmoji(e); setShowEmojiSuggestions(false); }}
                    style={[styles.emojiSuggestBtn, avatarEmoji === e && styles.emojiSuggestBtnSelected]}
                  >
                    <Text style={styles.emojiSuggestText}>{e}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => { setShowEmojiSuggestions(false); emojiInputRef.current?.focus(); }}
                  style={styles.emojiSuggestBtn}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <TextInput
              ref={emojiInputRef}
              style={styles.hiddenEmojiInput}
              value={avatarEmoji}
              onChangeText={(t) => setAvatarEmoji(filterEmojiOnly(t))}
              maxLength={4}
            />

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
          </View>

          {/* Nickname / nombre de usuario */}
          <Text style={styles.label}>¿Cómo quieres que te llame Finando? (tu nombre de usuario)</Text>
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
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.inputIcon}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          {password.length > 0 && (() => {
            const strength = getPasswordStrength(password);
            return (
              <>
                <View style={styles.strengthTrack}>
                  <View style={[styles.strengthFill, { width: `${strength.pct}%`, backgroundColor: COLORS[strength.color] }]} />
                </View>
                <Text style={[styles.strengthLabel, { color: COLORS[strength.color] }]}>{strength.label}</Text>
              </>
            );
          })()}

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
