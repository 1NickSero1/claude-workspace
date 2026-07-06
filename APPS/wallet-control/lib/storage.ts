import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Types ────────────────────────────────────────────────────────────────────

export interface CardEvent {
  type: 'deposit' | 'pay' | 'withdraw';
  amount: number;
  date: string;
  note?: string;
}

export interface Card {
  id: string;
  name: string;
  type: 'credit' | 'debit' | 'cash' | 'debt';
  bank: string;
  lastFour: string;
  color: string;
  emoji?: string;
  limit?: number;
  balance?: number;
  initialBalance?: number;
  dueDate?: string;
  notificationId?: string;
  events?: CardEvent[];
  createdAt: string;
}

export interface CustomCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  budget?: number;
  emoji?: string;
}

export type RecurrenceFrequency = 'weekly' | 'monthly';

export interface Expense {
  id: string;
  name: string;
  amount: number;
  categoryId: string;
  quincena: 1 | 2;
  cardId?: string;
  createdAt: string;
  monthKey: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  notificationId?: string;
}

export interface Income {
  id: string;
  description: string;
  amount: number;
  quincena: 1 | 2;
  createdAt: string;
  monthKey: string;
  isRecurring?: boolean;
  recurrenceFrequency?: RecurrenceFrequency;
  notificationId?: string;
}

export interface GoalDeposit {
  id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  color: string;
  emoji?: string;
  deadline?: string;
  createdAt: string;
  deposits?: GoalDeposit[];
}

export interface UserProfile {
  id?: string;
  name: string;
  nickname?: string;
  email: string;
  avatarColor: string;
  avatarEmoji?: string;
  isAnonymous?: boolean;
  createdAt: string;
}

export interface MonthData {
  monthKey: string;
  expenses: Expense[];
  incomes: Income[];
  budget: number | null;
  budgetNotified?: number;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

const K_CARDS      = 'wc_cards';
const K_CATEGORIES = 'wc_categories';
const K_GOALS      = 'wc_goals';
const K_PROFILE    = 'wc_profile';
const K_EXP        = (m: string) => `wc_exp_${m}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCurrentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(key: string): string {
  const [year, month] = key.split('-');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[parseInt(month) - 1]} ${year}`;
}

// ── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(K_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(K_PROFILE, JSON.stringify(profile));
}

export async function deleteUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(K_PROFILE);
}

// ── Cards ─────────────────────────────────────────────────────────────────────

export async function getCards(): Promise<Card[]> {
  try {
    const raw = await AsyncStorage.getItem(K_CARDS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveCard(card: Card): Promise<void> {
  const cards = await getCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) cards[idx] = card; else cards.push(card);
  await AsyncStorage.setItem(K_CARDS, JSON.stringify(cards));
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await getCards();
  await AsyncStorage.setItem(K_CARDS, JSON.stringify(cards.filter(c => c.id !== id)));
}

export async function appendCardEvent(cardId: string, event: CardEvent): Promise<void> {
  const cards = await getCards();
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx < 0) return;
  cards[idx] = { ...cards[idx], events: [...(cards[idx].events ?? []), event] };
  await AsyncStorage.setItem(K_CARDS, JSON.stringify(cards));
}

// ── Categories ────────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { id: 'vivienda',         name: 'Vivienda',         color: '#FF6B35', icon: 'home',                isDefault: true },
  { id: 'comida',           name: 'Comida',            color: '#00C853', icon: 'restaurant',          isDefault: true },
  { id: 'transporte',       name: 'Transporte',        color: '#2979FF', icon: 'car',                 isDefault: true },
  { id: 'entretenimiento',  name: 'Entretenimiento',   color: '#AA00FF', icon: 'musical-notes',       isDefault: true },
  { id: 'salud',            name: 'Salud',             color: '#FF4081', icon: 'fitness',             isDefault: true },
  { id: 'servicios',        name: 'Servicios',         color: '#00BCD4', icon: 'flash',               isDefault: true },
  { id: 'cuidado_personal', name: 'Cuidado Personal',  color: '#FFD740', icon: 'person',              isDefault: true },
  { id: 'mascotas',         name: 'Mascotas',          color: '#A1887F', icon: 'paw',                 isDefault: true },
  { id: 'mercado',          name: 'Mercado',           color: '#8BC34A', icon: 'basket',              isDefault: true },
  { id: 'otro',             name: 'Otro',              color: '#607D8B', icon: 'ellipsis-horizontal', isDefault: true },
];

export async function getCategories(): Promise<CustomCategory[]> {
  try {
    const raw = await AsyncStorage.getItem(K_CATEGORIES);
    if (!raw) {
      await AsyncStorage.setItem(K_CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_CATEGORIES; }
}

export async function saveCategory(cat: CustomCategory): Promise<void> {
  const cats = await getCategories();
  const idx = cats.findIndex(c => c.id === cat.id);
  if (idx >= 0) cats[idx] = cat; else cats.push(cat);
  await AsyncStorage.setItem(K_CATEGORIES, JSON.stringify(cats));
}

export async function deleteCategory(id: string): Promise<void> {
  const cats = await getCategories();
  await AsyncStorage.setItem(K_CATEGORIES, JSON.stringify(cats.filter(c => c.id !== id)));
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  try {
    const raw = await AsyncStorage.getItem(K_GOALS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveGoal(goal: Goal): Promise<void> {
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goal.id);
  if (idx >= 0) goals[idx] = goal; else goals.push(goal);
  await AsyncStorage.setItem(K_GOALS, JSON.stringify(goals));
}

export async function deleteGoal(id: string): Promise<void> {
  const goals = await getGoals();
  await AsyncStorage.setItem(K_GOALS, JSON.stringify(goals.filter(g => g.id !== id)));
}

export async function addGoalDeposit(goalId: string, deposit: Omit<GoalDeposit, 'id'>): Promise<void> {
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goalId);
  if (idx < 0) return;
  const goal = goals[idx];
  const newDeposit: GoalDeposit = { ...deposit, id: `dep_${Date.now()}` };
  const deposits = [...(goal.deposits ?? []), newDeposit];
  goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
  await AsyncStorage.setItem(K_GOALS, JSON.stringify(goals));
}

export async function deleteGoalDeposit(goalId: string, depositId: string): Promise<void> {
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goalId);
  if (idx < 0) return;
  const goal = goals[idx];
  const deposits = (goal.deposits ?? []).filter(d => d.id !== depositId);
  goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
  await AsyncStorage.setItem(K_GOALS, JSON.stringify(goals));
}

// ── Expenses & Incomes ────────────────────────────────────────────────────────

export async function getMonthData(monthKey: string): Promise<MonthData> {
  try {
    const raw = await AsyncStorage.getItem(K_EXP(monthKey));
    if (!raw) return { monthKey, expenses: [], incomes: [], budget: null };
    const data = JSON.parse(raw);
    // backward-compat: old data might not have incomes
    return {
      monthKey,
      expenses: data.expenses ?? [],
      incomes:  data.incomes  ?? [],
      budget:   data.budget   ?? null,
      budgetNotified: data.budgetNotified ?? 0,
    };
  } catch { return { monthKey, expenses: [], incomes: [], budget: null }; }
}

export async function addExpenses(monthKey: string, expenses: Expense[]): Promise<void> {
  const data = await getMonthData(monthKey);
  data.expenses = [...data.expenses, ...expenses];
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function addIncomes(monthKey: string, incomes: Income[]): Promise<void> {
  const data = await getMonthData(monthKey);
  data.incomes = [...data.incomes, ...incomes];
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function assignCardToExpenses(
  monthKey: string,
  expenseIds: string[],
  cardId: string,
): Promise<void> {
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.map(e =>
    expenseIds.includes(e.id) ? { ...e, cardId } : e,
  );
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function deleteExpense(monthKey: string, id: string): Promise<void> {
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.filter(e => e.id !== id);
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function updateExpense(monthKey: string, updated: Partial<Expense> & { id: string }): Promise<void> {
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.map(e => e.id === updated.id ? { ...e, ...updated } : e);
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function saveBudget(monthKey: string, budget: number): Promise<void> {
  const data = await getMonthData(monthKey);
  data.budget = budget;
  data.budgetNotified = 0;
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function saveBudgetNotified(monthKey: string, threshold: number): Promise<void> {
  const data = await getMonthData(monthKey);
  data.budgetNotified = threshold;
  await AsyncStorage.setItem(K_EXP(monthKey), JSON.stringify(data));
}

export async function getAllMonthKeys(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(k => k.startsWith('wc_exp_'))
               .map(k => k.replace('wc_exp_', ''))
               .sort().reverse();
  } catch { return []; }
}

export function getCardTotalSpent(expenses: Expense[], cardId: string): number {
  return expenses.filter(e => e.cardId === cardId).reduce((s, e) => s + e.amount, 0);
}

export function sumIncomes(incomes: Income[]): number {
  return incomes.reduce((s, i) => s + i.amount, 0);
}

// ── Theme Mode ────────────────────────────────────────────────────────────────

export type ThemeMode = 'system' | 'light' | 'dark';
const K_THEME_MODE = '@wc_theme_mode';

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const v = await AsyncStorage.getItem(K_THEME_MODE);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
    return 'system';
  } catch { return 'system'; }
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(K_THEME_MODE, mode);
}
