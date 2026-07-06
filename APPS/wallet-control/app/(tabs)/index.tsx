import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { askAdvisor } from '@/lib/claude';
import { parseClaudeResponse, buildExpenses, buildIncomes, formatCOP } from '@/lib/expenseParser';
import {
  addExpenses, addIncomes, assignCardToExpenses, getCurrentMonthKey,
  getCards, getCategories, getMonthData, getUserProfile, sumIncomes,
  getRecurringTemplates, RecurringTemplate,
  Expense, Income, Card, CustomCategory,
} from '@/lib/storage';
import { sumExpenses } from '@/lib/expenseParser';
import ChatBubble from '@/components/ChatBubble';
import ExpenseExtractCard from '@/components/ExpenseExtractCard';
import CardView from '@/components/CardView';
import { COLORS as _COLORS, FONT } from '@/constants/theme';
import { useColors } from '@/constants/ThemeContext';
import { useResponsive, scaledSheet } from '@/constants/responsive';

interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  expenses?: Expense[];
  incomes?: Income[];
  askForCard?: boolean;
  displayOnly?: boolean;
}

const WELCOME: DisplayMessage = {
  id: 'welcome',
  role: 'assistant',
  content: '¡Hola! Soy Finando, tu asesor financiero 💳\n\nPuedo registrar tus gastos, ingresos y analizar tus finanzas.\n\nCuéntame un gasto o ingreso tuyo para empezar.',
};

export default function ChatScreen() {
  const [messages, setMessages] = useState<DisplayMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [categories, setCategories] = useState<CustomCategory[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nickname, setNickname] = useState<string | undefined>(undefined);
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringTemplate[]>([]);
  const [recurringIncomeAmount, setRecurringIncomeAmount] = useState<number | null>(null);
  const [recentExpense, setRecentExpense] = useState<RecurringTemplate | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<{ msgId: string; expenses: Expense[] } | null>(null);
  const listRef = useRef<FlatList>(null);
  const monthKey = getCurrentMonthKey();

  useFocusEffect(useCallback(() => {
    Promise.all([
      getCards(), getCategories(), getUserProfile(), getRecurringTemplates(), getMonthData(monthKey),
    ]).then(([c, cats, profile, recurring, monthData]) => {
      setCards(c);
      setCategories(cats);
      setIsAnonymous(!!profile?.isAnonymous);
      setNickname(profile?.nickname);
      setRecurringExpenses(recurring);
      const recurringIncome = monthData.incomes.find(i => i.isRecurring);
      setRecurringIncomeAmount(recurringIncome?.amount ?? null);
      const lastExpense = [...monthData.expenses].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      setRecentExpense(lastExpense
        ? { name: lastExpense.name, categoryId: lastExpense.categoryId, amount: lastExpense.amount }
        : null);
    });
  }, [monthKey]));

  // Ejemplos de bienvenida y chips personalizados con los datos reales de
  // esta cuenta (gastos fijos/recurrentes o el último gasto que registró) en
  // vez de una data ficticia (475.000, sueldo 2.000.000) igual para todos.
  const firstName = nickname?.split(' ')[0];
  const exampleExpense = recurringExpenses[0] ?? recentExpense;

  const welcomeContent = useMemo(() => {
    const greeting = firstName ? `¡Hola ${firstName}! ` : '¡Hola! ';
    const expenseLine = exampleExpense
      ? `"Pagué ${exampleExpense.name.toLowerCase()} ${formatCOP(exampleExpense.amount)}"`
      : '"Pagué arriendo y Spotify este mes"';
    const incomeLine = recurringIncomeAmount
      ? `"Me pagaron el sueldo ${formatCOP(recurringIncomeAmount)}"`
      : '"Me pagaron el sueldo"';
    return `${greeting}Soy Finando, tu asesor financiero 💳\n\nPuedo registrar tus gastos, ingresos y analizar tus finanzas.\n\nEjemplos:\n• ${expenseLine}\n• ${incomeLine}\n• "Analiza mis finanzas del mes"`;
  }, [firstName, exampleExpense, recurringIncomeAmount]);

  const suggestionChips = useMemo(() => {
    const expenseChip = exampleExpense
      ? `Pagué ${exampleExpense.name.toLowerCase()} ${formatCOP(exampleExpense.amount)}`
      : categories[0] ? `Gasto en ${categories[0].name.toLowerCase()}` : 'Registra un gasto';
    const incomeChip = recurringIncomeAmount
      ? `Me pagaron el sueldo ${formatCOP(recurringIncomeAmount)}`
      : 'Me pagaron el sueldo';
    return [expenseChip, incomeChip, 'Analiza mis finanzas'];
  }, [exampleExpense, recurringIncomeAmount, categories]);

  // Personaliza el saludo inicial una vez llegan los datos reales de la
  // cuenta, solo si el usuario aún no empezó a chatear.
  React.useEffect(() => {
    setMessages(prev =>
      prev.length === 1 && prev[0].id === 'welcome' && prev[0].content !== welcomeContent
        ? [{ ...prev[0], content: welcomeContent }]
        : prev,
    );
  }, [welcomeContent]);

  const COLORS = useColors();
  const { moderateScale } = useResponsive();

  const styles = useMemo(() => StyleSheet.create(scaledSheet({
    safe: { flex: 1, backgroundColor: COLORS.bg },
    flex: { flex: 1 },
    topBar: {
      flexDirection: 'row', alignItems: 'center', gap: 10,
      paddingHorizontal: 16, paddingVertical: 12,
      backgroundColor: COLORS.card,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3,
    },
    aiAvatar: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: COLORS.primaryBg,
      alignItems: 'center', justifyContent: 'center',
    },
    topInfo: { flex: 1 },
    topTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.base },
    topSub: { color: COLORS.textMuted, fontSize: FONT.sm, textTransform: 'capitalize' },
    analysisBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: COLORS.primaryBg, borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 6,
    },
    analysisBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: FONT.sm },
    helpBtn: { padding: 4, marginLeft: 4 },
    list: { paddingTop: 12, paddingBottom: 8 },
    typing: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      paddingHorizontal: 16, paddingVertical: 6,
    },
    typingText: { color: COLORS.textMuted, fontSize: FONT.sm },
    chips: { paddingHorizontal: 12, paddingVertical: 8, flexGrow: 0 },
    chip: {
      backgroundColor: COLORS.primaryBg, borderRadius: 20,
      paddingHorizontal: 12, paddingVertical: 7, marginRight: 8,
      borderWidth: 1, borderColor: COLORS.primary + '44',
    },
    chipText: { color: COLORS.primary, fontSize: FONT.sm, fontWeight: '600' },
    inputBar: {
      flexDirection: 'row', alignItems: 'flex-end', padding: 10, gap: 8,
      backgroundColor: COLORS.card,
      borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    input: {
      flex: 1, backgroundColor: COLORS.bg, borderRadius: 20,
      paddingHorizontal: 14, paddingVertical: 10, color: COLORS.text,
      fontSize: FONT.md, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    },
    sendOff: { backgroundColor: COLORS.textDim },
    incomeCard: {
      marginHorizontal: 12, marginVertical: 4,
      backgroundColor: COLORS.debitBg, borderRadius: 12,
      padding: 12, borderWidth: 1, borderColor: COLORS.debit + '55',
    },
    incomeHeader: {
      color: COLORS.debit, fontWeight: '700', fontSize: FONT.sm,
      marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
    },
    incomeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    incomeDesc: { color: COLORS.text, fontSize: FONT.md, flex: 1 },
    incomeAmt: { color: COLORS.debit, fontWeight: '700', fontSize: FONT.md },
    cardPicker: {
      marginHorizontal: 12, marginVertical: 6,
      backgroundColor: COLORS.card, borderRadius: 14,
      padding: 12, borderWidth: 1, borderColor: COLORS.border,
      elevation: 2, shadowColor: COLORS.shadow,
      shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3,
    },
    cardPickerLabel: {
      color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '700',
      marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
    },
    noCardBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: COLORS.bg, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
      borderWidth: 1, borderColor: COLORS.border,
    },
    noCardText: { color: COLORS.textMuted, fontSize: FONT.sm, fontWeight: '600' },
    lockedWrap: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: 32, gap: 12,
    },
    lockedTitle: { color: COLORS.text, fontWeight: '800', fontSize: FONT.lg, textAlign: 'center' },
    lockedSub: { color: COLORS.textMuted, fontSize: FONT.base, textAlign: 'center', lineHeight: 22 },
  }, moderateScale)), [COLORS, moderateScale]);

  const buildHistory = (msgs: DisplayMessage[]) =>
    msgs
      .filter(m => m.id !== 'welcome' && !m.displayOnly)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: DisplayMessage = { id: `u_${Date.now()}`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);

    try {
      const rawText = await askAdvisor(buildHistory(next), nickname, categories);
      const { message, expenses: rawExp, incomes: rawInc, askForCard } = parseClaudeResponse(rawText);

      const expenses = buildExpenses(rawExp, monthKey);
      const incomes  = buildIncomes(rawInc,  monthKey);

      if (expenses.length > 0) await addExpenses(monthKey, expenses);
      if (incomes.length  > 0) await addIncomes(monthKey, incomes);

      const aiMsg: DisplayMessage = {
        id:         `a_${Date.now()}`,
        role:       'assistant',
        content:    message,
        expenses:   expenses.length > 0 ? expenses  : undefined,
        incomes:    incomes.length  > 0 ? incomes   : undefined,
        askForCard: askForCard && expenses.length > 0 && cards.length > 0,
      };
      setMessages(prev => [...prev, aiMsg]);

      if (askForCard && expenses.length > 0 && cards.length > 0) {
        setPendingExpenses({ msgId: aiMsg.id, expenses });
      }
    } catch (err: any) {
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`, role: 'assistant',
        content: `⚠️ ${err.message ?? 'Error al conectar.'}`,
        displayOnly: true,
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
    }
  };

  const handleSend = () => sendMessage(input);

  const handleAnalysis = async () => {
    const d = await getMonthData(monthKey);
    const totalExp = sumExpenses(d.expenses);
    const totalInc = sumIncomes(d.incomes);
    const prompt = `Analiza mis finanzas de este mes: ingresos ${formatCOP(totalInc)}, gastos ${formatCOP(totalExp)}, ahorro ${formatCOP(totalInc - totalExp)}. Dame un análisis detallado y recomendaciones concretas.`;
    sendMessage(prompt);
  };

  const assignCard = async (card: Card) => {
    if (!pendingExpenses) return;
    await assignCardToExpenses(monthKey, pendingExpenses.expenses.map(e => e.id), card.id);
    setMessages(prev => prev.map(m =>
      m.id === pendingExpenses.msgId ? { ...m, askForCard: false } : m,
    ));
    setMessages(prev => [...prev, {
      id: `a_card_${Date.now()}`, role: 'assistant',
      content: `✅ Gastos asignados a *${card.name}*.`,
      displayOnly: true,
    }]);
    setPendingExpenses(null);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const skipCard = () => {
    if (!pendingExpenses) return;
    setMessages(prev => prev.map(m =>
      m.id === pendingExpenses.msgId ? { ...m, askForCard: false } : m,
    ));
    setPendingExpenses(null);
  };

  const renderItem = ({ item }: { item: DisplayMessage }) => (
    <View>
      <ChatBubble role={item.role} content={item.content} />

      {item.expenses && item.expenses.length > 0 && (
        <ExpenseExtractCard expenses={item.expenses} categories={categories} />
      )}

      {item.incomes && item.incomes.length > 0 && (
        <View style={styles.incomeCard}>
          <Text style={styles.incomeHeader}>💰 Ingresos registrados</Text>
          {item.incomes.map(inc => (
            <View key={inc.id} style={styles.incomeRow}>
              <Text style={styles.incomeDesc}>{inc.description}</Text>
              <Text style={styles.incomeAmt}>{formatCOP(inc.amount)}</Text>
            </View>
          ))}
        </View>
      )}

      {item.askForCard && pendingExpenses?.msgId === item.id && cards.length > 0 && (
        <View style={styles.cardPicker}>
          <Text style={styles.cardPickerLabel}>¿Con qué tarjeta?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity onPress={skipCard} style={styles.noCardBtn}>
              <Ionicons name="close-circle-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.noCardText}>Sin tarjeta</Text>
            </TouchableOpacity>
            {cards.map(c => (
              <CardView key={c.id} card={c} compact onPress={() => assignCard(c)} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );

  if (isAnonymous) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.aiAvatar}>
            <Ionicons name="lock-closed" size={18} color={COLORS.textMuted} />
          </View>
          <View style={styles.topInfo}>
            <Text style={styles.topTitle}>Finando</Text>
            <Text style={styles.topSub}>No disponible en modo anónimo</Text>
          </View>
        </View>
        <View style={styles.lockedWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={COLORS.textDim} />
          <Text style={styles.lockedTitle}>Finando IA está desactivada</Text>
          <Text style={styles.lockedSub}>
            En modo anónimo no guardamos correo ni contraseña, así que el asesor de IA no está disponible.{'\n\n'}
            Cierra sesión desde tu Perfil y crea una cuenta para activarla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.aiAvatar}>
          <Ionicons name="hardware-chip" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.topInfo}>
          <Text style={styles.topTitle}>Finando</Text>
          <Text style={styles.topSub}>
            Asesor IA · {new Date().toLocaleString('es-CO', { month: 'long', year: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity onPress={handleAnalysis} style={styles.analysisBtn}>
          <Ionicons name="analytics-outline" size={16} color={COLORS.primary} />
          <Text style={styles.analysisBtnText}>Analizar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/ayuda')} style={styles.helpBtn}>
          <Ionicons name="help-circle-outline" size={22} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onLayout={() => listRef.current?.scrollToEnd()}
          showsVerticalScrollIndicator={false}
        />

        {loading && (
          <View style={styles.typing}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.typingText}>Analizando...</Text>
          </View>
        )}

        {/* Quick action chips */}
        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
            {suggestionChips.map(chip => (
              <TouchableOpacity
                key={chip}
                onPress={() => sendMessage(chip)}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Gastos, ingresos o pregunta..."
            placeholderTextColor={COLORS.textDim}
            multiline
            maxLength={600}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendOff]}
            activeOpacity={0.75}
          >
            <Ionicons name="arrow-up" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

