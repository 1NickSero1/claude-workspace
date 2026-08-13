import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InfoModal from '@/components/InfoModal';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  saveUserProfile, getUserProfile, UserProfile, BudgetPeriod,
  addIncomes, getCurrentMonthKey, saveBudget, creditCashFromIncome,
  migrateNamespaceData, wipeNamespaceData,
  getCategories, saveCategory, CustomCategory, saveRecurringDefinition,
} from '@/lib/storage';
import { scheduleRecurringReminder } from '@/lib/notifications';
import { formatThousands, GASTO_HORMIGA_MAX } from '@/lib/expenseParser';
import { trackSignup } from '@/lib/userTracking';
import { supabase } from '@/lib/supabase';
import { COLORS as _COLORS, FONT, SPACING, RADIUS } from '@/constants/theme';
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

// Categoría genérica siempre disponible en este paso del onboarding, para que
// nunca falte una categoría a la que asignar un gasto fijo aunque el usuario
// no cree ninguna propia.
const RANDOM_CATEGORY: CustomCategory = {
  id: 'random', name: 'Random', color: '#8E8E93', icon: 'shuffle-outline', isDefault: false, emoji: '🎲',
};

type Step = 'welcome' | 'choice' | 'register' | 'login' | 'periodicity' | 'budget' | 'fixedIncome' | 'fixedExpense' | 'hormigaThreshold' | 'done';

const SUGGESTED_FIXED_EXPENSES = ['Arriendo', 'Servicios (luz/agua/gas)', 'Suscripciones'];

function getPasswordStrength(pw: string): { label: string; pct: number; color: 'danger' | 'gold' | 'debit' } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
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
  // Perfil (modo anónimo) puede mandar a esta pantalla con ?step=register
  // para "Crear cuenta y guardar mis datos" sin pasar por welcome/choice.
  const params = useLocalSearchParams<{ step?: string }>();
  const [step, setStep]           = useState<Step>(params.step === 'register' ? 'register' : 'welcome');
  const [nickname, setNickname]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [avatarEmoji, setAvatarEmoji] = useState(DEFAULT_AVATAR_EMOJI);
  const [showEmojiSuggestions, setShowEmojiSuggestions] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; message: string; variant?: 'error' | 'info' } | null>(null);
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
  const [budgetAmount, setBudgetAmount]       = useState('');
  const [fixedIncomeAmount, setFixedIncomeAmount] = useState('');
  const [fixedExpenseItems, setFixedExpenseItems] = useState<{ name: string; amount: number; categoryId: string }[]>([]);
  const [newExpenseName, setNewExpenseName]   = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [expenseCategories, setExpenseCategories] = useState<CustomCategory[]>([RANDOM_CATEGORY]);
  const [selectedExpenseCategoryId, setSelectedExpenseCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingExpense, setAddingExpense] = useState(false);
  const [hormigaThreshold, setHormigaThreshold] = useState(String(GASTO_HORMIGA_MAX));
  const [setupSaving, setSetupSaving]         = useState(false);

  const avatarGlyph = avatarEmoji.trim() || '🙂';

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canRegister = nickname.trim().length >= 2
    && emailValid
    && password.length >= 8
    && avatarEmoji.trim().length > 0;

  const handleRegister = async () => {
    if (!canRegister) return;
    setLoading(true);
    try {
      // Si ya venía en modo anónimo con datos reales (tarjetas, gastos, etc.),
      // esto es una migración a cuenta real, no un setup desde cero — hay que
      // conservar sus preferencias y saltar el wizard de periodicidad/
      // presupuesto/ingreso fijo para no duplicar lo que ya tiene guardado.
      const previousProfile = await getUserProfile();
      const wasAnonymousUpgrade = previousProfile?.isAnonymous === true;

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
        setInfoModal({
          title: 'Confirma tu correo',
          message: 'Te enviamos un enlace de confirmación a tu correo. Ábrelo y luego vuelve aquí para iniciar sesión.',
        });
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
        createdAt:   previousProfile?.createdAt ?? new Date().toISOString(),
        budgetPeriod:      previousProfile?.budgetPeriod,
        hormigaThreshold:  previousProfile?.hormigaThreshold,
      };
      await saveUserProfile(profile);
      // Si el usuario venía probando en modo anónimo, sus tarjetas/gastos/
      // metas ya cargados no deben desaparecer al crear la cuenta real —
      // se copian a la cuenta nueva y LUEGO se borran del namespace 'anon',
      // para que el próximo invitado en este dispositivo no los herede.
      await migrateNamespaceData('anon', data.user.id);
      await wipeNamespaceData('anon');
      trackSignup(profile);
      if (wasAnonymousUpgrade) {
        goToApp();
      } else {
        setCreatedProfile(profile);
        setStep('periodicity');
      }
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo crear tu cuenta. Intenta de nuevo.', variant: 'error' });
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
          setInfoModal({ title: 'No encontramos tu cuenta', message: 'Revisa tu nombre de usuario o correo.', variant: 'error' });
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
      // Red de seguridad: si el registro había quedado pendiente de
      // confirmar correo (con modo anónimo activo mientras tanto), la
      // migración de datos no se pudo hacer en handleRegister — se
      // intenta aquí también. migrateNamespaceData ya es seguro llamarlo
      // de más (no pisa datos si el destino ya los tiene). El borrado del
      // namespace 'anon' después es igual de seguro llamarlo de más (queda
      // vacío si ya se había borrado antes).
      await migrateNamespaceData('anon', data.user.id);
      await wipeNamespaceData('anon');
      router.replace('/(tabs)');
    } catch (e: any) {
      setInfoModal({ title: 'No pudimos iniciar sesión', message: e?.message ?? 'Revisa tu correo y contraseña.', variant: 'error' });
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
    try {
      const updated: UserProfile = { ...createdProfile, budgetPeriod };
      await saveUserProfile(updated);
      setCreatedProfile(updated);
      setStep('budget');
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo guardar. Intenta de nuevo.', variant: 'error' });
    }
  };

  const handleBudgetContinue = async (skip: boolean) => {
    setSetupSaving(true);
    try {
      const amount = Number(budgetAmount.replace(/\D/g, ''));
      if (!skip && amount > 0) {
        await saveBudget(getCurrentMonthKey(), amount);
      }
      setStep('fixedIncome');
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo guardar. Intenta de nuevo.', variant: 'error' });
    } finally {
      setSetupSaving(false);
    }
  };

  const handleFixedIncomeContinue = async (skip: boolean) => {
    setSetupSaving(true);
    try {
      const amount = Number(fixedIncomeAmount.replace(/\D/g, ''));
      if (!skip && amount > 0) {
        const monthKey = getCurrentMonthKey();
        const day = new Date().getDate();
        const quincena: 1 | 2 = day <= 15 ? 1 : 2;
        const notificationId = await scheduleRecurringReminder('Sueldo', 'monthly', new Date());
        const incomeId = `inc_${Date.now()}`;
        const fundedCardId = await creditCashFromIncome(amount, 'Sueldo', incomeId);
        await addIncomes(monthKey, [{
          id: incomeId,
          description: 'Sueldo',
          amount,
          quincena,
          createdAt: new Date().toISOString(),
          monthKey,
          isRecurring: true,
          recurrenceFrequency: 'monthly',
          notificationId,
          fundedCardId,
        }]);
      }
      setStep('fixedExpense');
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo guardar. Intenta de nuevo.', variant: 'error' });
    } finally {
      setSetupSaving(false);
    }
  };

  // A esta altura del onboarding el usuario todavía no ha pasado por la
  // pantalla de Categorías — sin la genérica "Random" siempre disponible no
  // tendría a qué categoría asignar un gasto fijo si no crea una propia.
  useEffect(() => {
    if (step !== 'fixedExpense') return;
    (async () => {
      const existing = await getCategories();
      const hasRandom = existing.some(c => c.id === RANDOM_CATEGORY.id || c.name.trim().toLowerCase() === 'random');
      if (!hasRandom) await saveCategory(RANDOM_CATEGORY);
      const cats = hasRandom ? existing : [...existing, RANDOM_CATEGORY];
      setExpenseCategories(cats);
    })();
  }, [step]);

  const addFixedExpenseItem = async () => {
    const amount = Number(newExpenseAmount.replace(/\D/g, ''));
    const name = newExpenseName.trim().toUpperCase();
    const typedCatName = newCategoryName.trim();
    if (!name || amount <= 0 || (!selectedExpenseCategoryId && !typedCatName) || addingExpense) return;
    setAddingExpense(true);
    try {
      // Si el usuario escribió una categoría nueva en vez de tocar un pill,
      // se crea recién ahora (y aparece como pill) — reutilizando una ya
      // existente con el mismo nombre en vez de duplicarla.
      let categoryId = selectedExpenseCategoryId;
      if (typedCatName) {
        const existing = expenseCategories.find(c => c.name.trim().toLowerCase() === typedCatName.toLowerCase());
        if (existing) {
          categoryId = existing.id;
        } else {
          const cat: CustomCategory = {
            id: `cat_${Date.now()}`,
            name: typedCatName,
            color: AVATAR_COLORS[expenseCategories.length % AVATAR_COLORS.length],
            icon: 'pricetag-outline',
            isDefault: false,
          };
          await saveCategory(cat);
          setExpenseCategories(prev => [...prev, cat]);
          categoryId = cat.id;
        }
      }
      setFixedExpenseItems(items => [...items, { name, amount, categoryId: categoryId! }]);
      // La categoría NO queda preseleccionada para el próximo gasto — el
      // usuario elige a propósito cada vez, en vez de heredar en silencio
      // la última que usó.
      setSelectedExpenseCategoryId(null);
      setNewExpenseName('');
      setNewExpenseAmount('');
      setNewCategoryName('');
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo agregar. Intenta de nuevo.', variant: 'error' });
    } finally {
      setAddingExpense(false);
    }
  };

  const removeFixedExpenseItem = (index: number) => {
    setFixedExpenseItems(items => items.filter((_, i) => i !== index));
  };

  const handleFixedExpenseFinish = async (skip: boolean) => {
    setSetupSaving(true);
    try {
      if (!skip && fixedExpenseItems.length > 0) {
        // Se crean como gastos fijos PENDIENTES (RecurringDefinition), no
        // como gastos ya pagados — el usuario los marca pagados de verdad
        // desde "Gastos recurrentes", igual que cualquier otro gasto
        // recurrente creado desde ahí. Antes se guardaban directo como
        // Expense y aparecían todos como ya gastados desde el día 1.
        await Promise.all(fixedExpenseItems.map(async (item, i) => {
          const notificationId = await scheduleRecurringReminder(item.name, 'monthly', new Date());
          await saveRecurringDefinition({
            id: `${Date.now()}_${i}_def`,
            name: item.name,
            categoryId: item.categoryId,
            amount: item.amount,
            frequency: 'monthly',
            createdAt: new Date().toISOString(),
            notificationId,
          });
        }));
      }
      if (pendingAnonymous) {
        goToApp();
      } else {
        setStep('hormigaThreshold');
      }
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo guardar. Intenta de nuevo.', variant: 'error' });
    } finally {
      setSetupSaving(false);
    }
  };

  const handleHormigaThresholdContinue = async () => {
    if (!createdProfile) return;
    setSetupSaving(true);
    try {
      const amount = Number(hormigaThreshold.replace(/\D/g, '')) || GASTO_HORMIGA_MAX;
      const updated: UserProfile = { ...createdProfile, hormigaThreshold: amount };
      await saveUserProfile(updated);
      setCreatedProfile(updated);
      setStep('done');
    } catch (e: any) {
      setInfoModal({ title: 'Error', message: e?.message ?? 'No se pudo guardar. Intenta de nuevo.', variant: 'error' });
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
    bgGlowTop: {
      position: 'absolute', top: -80, right: -60,
      width: 260, height: 260, borderRadius: 130,
      backgroundColor: COLORS.primary, opacity: 0.18,
    },
    bgGlowBottom: {
      position: 'absolute', bottom: -100, left: -80,
      width: 300, height: 300, borderRadius: 150,
      backgroundColor: COLORS.debit, opacity: 0.10,
    },
    welcomeScroll: { flexGrow: 1 },
    welcomeContainer: {
      flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 36,
      alignItems: 'center', justifyContent: 'space-between',
    },
    topBlock: { width: '100%', alignItems: 'center' },
    midBlock: { width: '100%' },
    bottomBlock: { width: '100%', alignItems: 'center' },
    logoWrap: {
      width: 88, height: 88, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.xl,
      elevation: 6, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35, shadowRadius: 14,
    },
    welcomeTitle: { color: COLORS.text, fontWeight: '900', fontSize: 32, marginBottom: 10 },
    welcomeSub: {
      color: COLORS.textMuted, fontSize: FONT.base, textAlign: 'center',
      lineHeight: 24,
    },
    featureCard: {
      width: '100%', backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
      borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg,
      elevation: 3, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12,
    },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: 12 },
    featureRowDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
    featureIcon: {
      width: 36, height: 36, borderRadius: 10,
      backgroundColor: COLORS.primaryBg, alignItems: 'center', justifyContent: 'center',
    },
    featureText: { flex: 1, color: COLORS.text, fontSize: FONT.md, lineHeight: 20 },
    welcomeFooterNote: { color: COLORS.textDim, fontSize: FONT.xs, marginTop: 12, textAlign: 'center' },

    // Choice
    choiceContainer: { flexGrow: 1, paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xl, paddingBottom: SPACING.xxl },
    optionCard: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg,
      borderWidth: 1, borderColor: COLORS.border, marginBottom: 14,
    },
    optionIcon: {
      width: 44, height: 44, borderRadius: RADIUS.md,
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
      alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xxl,
      elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2, shadowRadius: 8,
    },
    avatarInitialsLarge: { color: '#fff', fontWeight: '900', fontSize: 36 },
    doneTitle: { color: COLORS.text, fontWeight: '900', fontSize: 28, marginBottom: SPACING.md },
    doneSub: {
      color: COLORS.textMuted, fontSize: FONT.base, textAlign: 'center',
      lineHeight: 24, marginBottom: 48,
    },

    // Form
    formScroll: { flexGrow: 1, justifyContent: 'flex-start', paddingHorizontal: SPACING.xxl, paddingTop: SPACING.xl, paddingBottom: 40 },
    backBtn: {
      width: 40, height: 40, borderRadius: RADIUS.md,
      backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center',
      marginBottom: SPACING.xxl, borderWidth: 1, borderColor: COLORS.border,
    },
    formTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.xl, marginBottom: SPACING.xs },
    formSub: { color: COLORS.textMuted, fontSize: FONT.sm, marginBottom: SPACING.xxl },

    // Avatar picker
    avatarSection: { alignItems: 'center', marginBottom: SPACING.xxl, gap: SPACING.md },
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
    emojiSuggestRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, justifyContent: 'center' },
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
    nicknameHint: { color: COLORS.textDim, fontSize: FONT.xs, marginTop: 6 },
    inputWrap: { position: 'relative' },
    input: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: 14,
      color: COLORS.text, fontSize: FONT.md,
      borderWidth: 1.5, borderColor: COLORS.border,
      paddingRight: 44,
    },
    inputError: { borderColor: COLORS.credit },
    inputIcon: { position: 'absolute', right: 14, top: 14 },
    errorText: { color: COLORS.credit, fontSize: FONT.sm, marginTop: SPACING.xs },
    privacyNote: {
      color: COLORS.textMuted, fontSize: FONT.sm, textAlign: 'center',
      marginTop: SPACING.xl, marginBottom: SPACING.sm, lineHeight: 20,
      backgroundColor: COLORS.primaryBg, borderRadius: RADIUS.md, padding: SPACING.md,
    },

    // Buttons
    primaryBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: SPACING.sm, backgroundColor: COLORS.primary,
      borderRadius: RADIUS.lg, padding: SPACING.lg,
      elevation: 4, shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    },
    primaryBtnSpaced: { marginTop: SPACING.xl },
    primaryBtnOff: { backgroundColor: COLORS.textDim, elevation: 0, shadowOpacity: 0 },
    primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT.base },

    // Gastos fijos (onboarding)
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xs },
    chip: {
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: 20,
      backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    },
    chipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm },
    categoryBox: {
      backgroundColor: COLORS.card, borderRadius: RADIUS.md,
      borderWidth: 1.5, borderColor: COLORS.border, overflow: 'hidden',
    },
    categoryChipRow: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 6,
      paddingHorizontal: 14, paddingTop: 10, paddingBottom: 8,
    },
    miniChip: {
      paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14,
      backgroundColor: COLORS.card2, borderWidth: 1, borderColor: COLORS.border,
    },
    miniChipText: { color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.xs },
    categoryDivider: { height: 1, backgroundColor: COLORS.border },
    categoryInput: { padding: 14, color: COLORS.text, fontSize: FONT.md },
    secondaryAddBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
      borderRadius: RADIUS.lg, borderWidth: 1.5, borderColor: COLORS.primary,
      paddingVertical: 14, marginTop: SPACING.lg,
    },
    secondaryAddBtnOff: { borderColor: COLORS.border },
    secondaryAddBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.base },
    expenseItemRow: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      backgroundColor: COLORS.card, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
      borderWidth: 1, borderColor: COLORS.border,
    },
    expenseItemName: { color: COLORS.text, fontWeight: '700', fontSize: FONT.md },
    expenseItemAmount: { color: COLORS.textMuted, fontSize: FONT.sm, marginTop: 2 },
    expenseItemDelete: {
      width: 32, height: 32, borderRadius: RADIUS.sm, backgroundColor: COLORS.creditBg,
      alignItems: 'center', justifyContent: 'center',
    },

    // Password
    strengthTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden', marginTop: SPACING.sm },
    strengthFill: { height: '100%', borderRadius: 3 },
    strengthLabel: { fontSize: FONT.sm, fontWeight: '700', marginTop: 6 },
  }, moderateScale)), [COLORS, moderateScale]);

  // ── WELCOME ─────────────────────────────────────────────────────────────────
  if (step === 'welcome') {
    return (
      <SafeAreaView style={styles.safe}>
        {/* Resplandores de fondo — antes era un bg plano; le dan profundidad
            sin depender de ningún asset/imagen externa. */}
        <View style={styles.bgGlowTop} pointerEvents="none" />
        <View style={styles.bgGlowBottom} pointerEvents="none" />

        <TouchableOpacity
          onPress={toggleTheme}
          style={styles.themeToggleBtn}
          accessibilityRole="button"
          accessibilityLabel="Cambiar tema"
        >
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
              <Ionicons name="wallet" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.welcomeTitle}>Wallet Control</Text>
            <Text style={styles.welcomeSub}>
              La plata se cuida sola{'\n'}cuando Finando te acompaña.
            </Text>
          </View>

          <View style={styles.midBlock}>
            <View style={styles.featureCard}>
              {[
                { icon: 'hardware-chip-outline', text: 'Le cuentas a Finando lo que gastaste, como a un amigo, y él lo anota' },
                { icon: 'card-outline',          text: 'Todas tus cuentas y tarjetas, en un solo lugar' },
                { icon: 'bar-chart-outline',     text: 'Gráficas claras para saber en qué se te va la plata' },
                { icon: 'flag-outline',          text: 'Metas de ahorro que sí puedes seguir de cerca' },
              ].map((f, i, arr) => (
                <View key={f.icon} style={[styles.featureRow, i < arr.length - 1 && styles.featureRowDivider]}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={f.icon as any} size={18} color={COLORS.primary} />
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomBlock}>
            <TouchableOpacity onPress={() => setStep('choice')} style={styles.primaryBtn} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Vamos a organizar tu plata</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.welcomeFooterNote}>Gratis, sin tarjeta y tus datos se quedan en tu celular</Text>
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
        <ScrollView style={styles.flex} contentContainerStyle={styles.choiceContainer} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setStep('welcome')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
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
            <TouchableOpacity
              onPress={() => setStep('choice')}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Volver"
            >
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
              <TouchableOpacity
                onPress={() => setShowLoginPassword(v => !v)}
                style={styles.inputIcon}
                accessibilityRole="button"
                accessibilityLabel={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
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
        <InfoModal
          visible={!!infoModal}
          title={infoModal?.title ?? ''}
          message={infoModal?.message ?? ''}
          variant={infoModal?.variant ?? 'info'}
          onClose={() => setInfoModal(null)}
        />
      </SafeAreaView>
    );
  }

  // ── PERIODICIDAD ────────────────────────────────────────────────────────────
  if (step === 'periodicity') {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView style={styles.flex} contentContainerStyle={styles.choiceContainer} showsVerticalScrollIndicator={false}>
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

  // ── PRESUPUESTO MENSUAL ──────────────────────────────────────────────────────
  if (step === 'budget') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Cuál es tu presupuesto mensual?</Text>
            <Text style={styles.formSub}>Te avisamos cuando te acerques al límite — puedes cambiarlo cuando quieras desde Perfil, y puedes omitir este paso</Text>

            <Text style={styles.label}>Presupuesto mensual (COP, opcional)</Text>
            <TextInput
              style={styles.input}
              value={formatThousands(budgetAmount)}
              onChangeText={v => setBudgetAmount(v.replace(/\D/g, '').slice(0, 12))}
              placeholder="Ej: 1.500.000"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              onPress={() => handleBudgetContinue(false)}
              disabled={setupSaving}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, setupSaving && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{setupSaving ? 'Guardando...' : 'Continuar'}</Text>
              {!setupSaving && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleBudgetContinue(true)} disabled={setupSaving} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm }}>Omitir</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── INGRESO FIJO ─────────────────────────────────────────────────────────────
  if (step === 'fixedIncome') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Tienes un ingreso fijo mensual?</Text>
            <Text style={styles.formSub}>Por ejemplo tu salario. Lo registramos automáticamente cada mes — puedes omitir este paso</Text>

            <Text style={styles.label}>Monto mensual (COP, opcional)</Text>
            <TextInput
              style={styles.input}
              value={formatThousands(fixedIncomeAmount)}
              onChangeText={v => setFixedIncomeAmount(v.replace(/\D/g, '').slice(0, 12))}
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
    const canAddExpense = !!newExpenseName.trim() && Number(newExpenseAmount.replace(/\D/g, '')) > 0
      && (!!selectedExpenseCategoryId || !!newCategoryName.trim()) && !addingExpense;
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Cuánto gastas en cosas fijas al mes?</Text>
            <Text style={[styles.formSub, { marginBottom: SPACING.sm }]}>Arriendo, servicios, suscripciones, etc. — agrega los que quieras, puedes omitir este paso</Text>

            <Text style={[styles.label, { marginTop: 0 }]}>Sugerencias</Text>
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
              placeholder="Ej: ARRIENDO"
              placeholderTextColor={COLORS.textDim}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>Categoría</Text>
            <View style={styles.categoryBox}>
              <View style={styles.categoryChipRow}>
                {expenseCategories.map(cat => {
                  const active = selectedExpenseCategoryId === cat.id && !newCategoryName.trim();
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => { setSelectedExpenseCategoryId(cat.id); setNewCategoryName(''); }}
                      style={[styles.miniChip, active && { backgroundColor: cat.color + '22', borderColor: cat.color }]}
                    >
                      <Text style={[styles.miniChipText, active && { color: cat.color }]}>
                        {cat.emoji ? `${cat.emoji} ` : ''}{cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.categoryDivider} />
              <TextInput
                style={styles.categoryInput}
                value={newCategoryName}
                onChangeText={t => { setNewCategoryName(t); if (t.trim()) setSelectedExpenseCategoryId(null); }}
                placeholder="O escribe una categoría nueva"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="words"
              />
            </View>

            <Text style={styles.label}>Monto mensual (COP)</Text>
            <TextInput
              style={styles.input}
              value={formatThousands(newExpenseAmount)}
              onChangeText={v => setNewExpenseAmount(v.replace(/\D/g, '').slice(0, 12))}
              placeholder="Ej: 1.200.000"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              onPress={addFixedExpenseItem}
              disabled={!canAddExpense}
              style={[styles.secondaryAddBtn, !canAddExpense && styles.secondaryAddBtnOff]}
              accessibilityRole="button"
              accessibilityLabel="Añadir gasto fijo"
            >
              <Ionicons name="add-circle-outline" size={20} color={canAddExpense ? COLORS.primary : COLORS.textDim} />
              <Text style={[styles.secondaryAddBtnText, !canAddExpense && { color: COLORS.textDim }]}>
                {addingExpense ? 'Añadiendo...' : 'Añadir gasto fijo'}
              </Text>
            </TouchableOpacity>

            {fixedExpenseItems.length > 0 && (
              <View style={{ marginTop: 18 }}>
                <Text style={styles.label}>Gastos creados</Text>
                {fixedExpenseItems.map((item, i) => {
                  const itemCat = expenseCategories.find(c => c.id === item.categoryId);
                  return (
                  <View key={`${item.name}_${i}`} style={styles.expenseItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.expenseItemName}>{item.name}</Text>
                      <Text style={styles.expenseItemAmount}>
                        ${formatThousands(item.amount)} COP/mes
                        {itemCat ? ` · ${itemCat.emoji ? `${itemCat.emoji} ` : ''}${itemCat.name}` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeFixedExpenseItem(i)}
                      style={styles.expenseItemDelete}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${item.name}`}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.credit} />
                    </TouchableOpacity>
                  </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={() => handleFixedExpenseFinish(false)}
              disabled={setupSaving}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, setupSaving && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{setupSaving ? 'Guardando...' : 'Continuar'}</Text>
              {!setupSaving && <Ionicons name="arrow-forward" size={18} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleFixedExpenseFinish(true)} disabled={setupSaving} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: COLORS.textMuted, fontWeight: '600', fontSize: FONT.sm }}>Omitir</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── GASTO HORMIGA ────────────────────────────────────────────────────────────
  if (step === 'hormigaThreshold') {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.formScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.formTitle}>¿Desde cuánto es un gasto hormiga para ti?</Text>
            <Text style={styles.formSub}>
              Gastos pequeños como café, snacks o domicilios que no son fijos pero se acumulan.
              Los marcamos con "🐜 Hormiga" para que los identifiques fácil — puedes cambiar este
              monto cuando quieras desde Perfil.
            </Text>

            <Text style={styles.label}>Monto máximo (COP)</Text>
            <TextInput
              style={styles.input}
              value={formatThousands(hormigaThreshold)}
              onChangeText={v => setHormigaThreshold(v.replace(/\D/g, '').slice(0, 12))}
              placeholder="Ej: 30.000"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
            />

            <TouchableOpacity
              onPress={handleHormigaThresholdContinue}
              disabled={setupSaving}
              style={[styles.primaryBtn, styles.primaryBtnSpaced, setupSaving && styles.primaryBtnOff]}
            >
              <Text style={styles.primaryBtnText}>{setupSaving ? 'Guardando...' : 'Finalizar'}</Text>
              {!setupSaving && <Ionicons name="checkmark" size={18} color="#fff" />}
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
          <TouchableOpacity
            onPress={() => setStep('choice')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
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
              accessibilityRole="button"
              accessibilityLabel="Cambiar avatar"
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
                    accessibilityRole="button"
                    accessibilityLabel={`Elegir avatar ${e}`}
                  >
                    <Text style={styles.emojiSuggestText}>{e}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => { setShowEmojiSuggestions(false); emojiInputRef.current?.focus(); }}
                  style={styles.emojiSuggestBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Escribir emoji personalizado"
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
                  accessibilityRole="button"
                  accessibilityLabel="Elegir color de avatar"
                />
              ))}
            </View>
          </View>

          {/* Nickname / nombre de usuario */}
          <Text style={styles.label}>¿Cómo te llamamos?</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ej: Juanito"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="words"
          />
          <Text style={styles.nicknameHint}>Así te va a llamar Finando, tu asesor financiero con IA, cuando lo necesites.</Text>

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
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor={COLORS.textDim}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(v => !v)}
              style={styles.inputIcon}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
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
      <InfoModal
        visible={!!infoModal}
        title={infoModal?.title ?? ''}
        message={infoModal?.message ?? ''}
        variant={infoModal?.variant ?? 'info'}
        onClose={() => setInfoModal(null)}
      />
    </SafeAreaView>
  );
}
