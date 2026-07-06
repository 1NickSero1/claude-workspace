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

export type BudgetPeriod = 'weekly' | 'biweekly' | 'monthly';

export interface UserProfile {
  id?: string;
  name: string;
  nickname?: string;
  email: string;
  avatarColor: string;
  avatarEmoji?: string;
  isAnonymous?: boolean;
  createdAt: string;
  budgetPeriod?: BudgetPeriod;
}

export interface MonthData {
  monthKey: string;
  expenses: Expense[];
  incomes: Income[];
  budget: number | null;
  budgetNotified?: number;
}

// ── Keys ─────────────────────────────────────────────────────────────────────
// Los datos financieros (tarjetas, categorías, metas, gastos/ingresos) se
// aíslan por cuenta con un namespace (profile.id, o 'anon' en modo anónimo)
// para que cambiar de cuenta en el mismo dispositivo no mezcle información
// entre usuarios. El perfil de auth no lleva namespace (solo hay uno activo).

const K_PROFILE    = 'wc_profile';
const K_CARDS      = (ns: string) => `wc_cards_${ns}`;
const K_CATEGORIES = (ns: string) => `wc_categories_${ns}`;
const K_GOALS      = (ns: string) => `wc_goals_${ns}`;
const K_EXP        = (ns: string, m: string) => `wc_exp_${ns}_${m}`;
const K_CARD_SNAP  = (ns: string, m: string) => `wc_card_snap_${ns}_${m}`;

const migratedNamespaces = new Set<string>();

async function getActiveNamespace(): Promise<string> {
  const profile = await getUserProfile();
  const ns = profile?.id ?? 'anon';
  if (!migratedNamespaces.has(ns)) {
    migratedNamespaces.add(ns);
    await migrateLegacyNamespaceData(ns);
  }
  return ns;
}

/**
 * Copia (sin borrar) los datos guardados antes de introducir el namespace por
 * cuenta hacia el bucket del namespace activo, una sola vez por namespace.
 * No destructivo: las claves viejas quedan huérfanas pero intactas.
 */
async function migrateLegacyNamespaceData(ns: string): Promise<void> {
  try {
    const flagKey = `@wc_migrated_${ns}`;
    if (await AsyncStorage.getItem(flagKey)) return;

    const pairs: [string, string][] = [
      ['wc_cards', K_CARDS(ns)],
      ['wc_categories', K_CATEGORIES(ns)],
      ['wc_goals', K_GOALS(ns)],
    ];
    for (const [legacyKey, newKey] of pairs) {
      if (await AsyncStorage.getItem(newKey)) continue;
      const legacyValue = await AsyncStorage.getItem(legacyKey);
      if (legacyValue) await AsyncStorage.setItem(newKey, legacyValue);
    }

    const allKeys = await AsyncStorage.getAllKeys();
    const legacyExpKeys = allKeys.filter(k => /^wc_exp_\d{4}-\d{2}$/.test(k));
    for (const legacyKey of legacyExpKeys) {
      const monthKey = legacyKey.replace('wc_exp_', '');
      const newKey = K_EXP(ns, monthKey);
      if (await AsyncStorage.getItem(newKey)) continue;
      const legacyValue = await AsyncStorage.getItem(legacyKey);
      if (legacyValue) await AsyncStorage.setItem(newKey, legacyValue);
    }

    await AsyncStorage.setItem(flagKey, 'true');
  } catch {
    // Migración best-effort: si falla, el usuario simplemente arranca en blanco
    // para este namespace en vez de crashear la app.
  }
}

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
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_CARDS(ns));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveCard(card: Card): Promise<void> {
  const ns = await getActiveNamespace();
  const cards = await getCards();
  const idx = cards.findIndex(c => c.id === card.id);
  if (idx >= 0) cards[idx] = card; else cards.push(card);
  await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
}

export async function deleteCard(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  const cards = await getCards();
  await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards.filter(c => c.id !== id)));
}

export async function appendCardEvent(cardId: string, event: CardEvent): Promise<void> {
  const ns = await getActiveNamespace();
  const cards = await getCards();
  const idx = cards.findIndex(c => c.id === cardId);
  if (idx < 0) return;
  cards[idx] = { ...cards[idx], events: [...(cards[idx].events ?? []), event] };
  await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
}

// Guarda el estado de las tarjetas (saldo/límite) bajo la clave del mes
// activo cada vez que se llama — mientras ese mes sigue siendo el actual esto
// se sobreescribe con el saldo más reciente; en cuanto el mes cambia, se deja
// de tocar esa clave y queda como "último saldo conocido" de ese mes, sin
// necesidad de un mecanismo de cierre de mes explícito.
export async function syncCardBalanceSnapshot(monthKey: string, cards: Card[]): Promise<void> {
  const ns = await getActiveNamespace();
  await AsyncStorage.setItem(K_CARD_SNAP(ns, monthKey), JSON.stringify(cards));
}

// Devuelve el snapshot de tarjetas de ese mes si existe (meses anteriores a
// que se agregara esta función no tendrán snapshot — null, para que el
// caller decida el fallback).
export async function getCardBalanceSnapshot(monthKey: string): Promise<Card[] | null> {
  try {
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_CARD_SNAP(ns, monthKey));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
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
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_CATEGORIES(ns));
    if (!raw) {
      await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch { return DEFAULT_CATEGORIES; }
}

export async function saveCategory(cat: CustomCategory): Promise<void> {
  const ns = await getActiveNamespace();
  const cats = await getCategories();
  const idx = cats.findIndex(c => c.id === cat.id);
  if (idx >= 0) cats[idx] = cat; else cats.push(cat);
  await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(cats));
}

export async function deleteCategory(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  const cats = await getCategories();
  await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(cats.filter(c => c.id !== id)));
}

// ── Goals ─────────────────────────────────────────────────────────────────────

export async function getGoals(): Promise<Goal[]> {
  try {
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_GOALS(ns));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveGoal(goal: Goal): Promise<void> {
  const ns = await getActiveNamespace();
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goal.id);
  if (idx >= 0) goals[idx] = goal; else goals.push(goal);
  await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
}

export async function deleteGoal(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  const goals = await getGoals();
  await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals.filter(g => g.id !== id)));
}

export async function addGoalDeposit(goalId: string, deposit: Omit<GoalDeposit, 'id'>): Promise<void> {
  const ns = await getActiveNamespace();
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goalId);
  if (idx < 0) return;
  const goal = goals[idx];
  const newDeposit: GoalDeposit = { ...deposit, id: `dep_${Date.now()}` };
  const deposits = [...(goal.deposits ?? []), newDeposit];
  goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
  await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
}

export async function deleteGoalDeposit(goalId: string, depositId: string): Promise<void> {
  const ns = await getActiveNamespace();
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === goalId);
  if (idx < 0) return;
  const goal = goals[idx];
  const deposits = (goal.deposits ?? []).filter(d => d.id !== depositId);
  goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
  await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
}

// ── Expenses & Incomes ────────────────────────────────────────────────────────

export async function getMonthData(monthKey: string): Promise<MonthData> {
  try {
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_EXP(ns, monthKey));
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
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.expenses = [...data.expenses, ...expenses];
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function addIncomes(monthKey: string, incomes: Income[]): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.incomes = [...data.incomes, ...incomes];
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function assignCardToExpenses(
  monthKey: string,
  expenseIds: string[],
  cardId: string,
): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.map(e =>
    expenseIds.includes(e.id) ? { ...e, cardId } : e,
  );
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function deleteExpense(monthKey: string, id: string): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.filter(e => e.id !== id);
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function updateExpense(monthKey: string, updated: Partial<Expense> & { id: string }): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.expenses = data.expenses.map(e => e.id === updated.id ? { ...e, ...updated } : e);
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function saveBudget(monthKey: string, budget: number): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.budget = budget;
  data.budgetNotified = 0;
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function saveBudgetNotified(monthKey: string, threshold: number): Promise<void> {
  const ns = await getActiveNamespace();
  const data = await getMonthData(monthKey);
  data.budgetNotified = threshold;
  await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
}

export async function getAllMonthKeys(): Promise<string[]> {
  try {
    const ns = await getActiveNamespace();
    const prefix = `wc_exp_${ns}_`;
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter(k => k.startsWith(prefix))
               .map(k => k.replace(prefix, ''))
               .sort().reverse();
  } catch { return []; }
}

export function getPreviousMonthKey(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const year  = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function getCardTotalSpent(expenses: Expense[], cardId: string): number {
  return expenses.filter(e => e.cardId === cardId).reduce((s, e) => s + e.amount, 0);
}

export function sumIncomes(incomes: Income[]): number {
  return incomes.reduce((s, i) => s + i.amount, 0);
}

export function computeNetWorth(expenses: Expense[], cards: Card[]): {
  totalActivos: number; totalPasivos: number; patrimonioNeto: number;
} {
  const cardTypeMap = new Map(cards.map(c => [c.id, c.type]));
  let creditSpent = 0;
  for (const e of expenses) {
    const type = e.cardId ? cardTypeMap.get(e.cardId) : 'debit';
    if (type === 'credit') creditSpent += e.amount;
  }
  const debitAvailable = cards.filter(c => c.type === 'debit' && c.balance != null)
    .reduce((s, c) => s + Math.max(c.balance! - getCardTotalSpent(expenses, c.id), 0), 0);
  const cashAvailable = cards.filter(c => c.type === 'cash')
    .reduce((s, c) => s + Math.max((c.balance ?? 0) - getCardTotalSpent(expenses, c.id), 0), 0);
  const debtTotal = cards.filter(c => c.type === 'debt').reduce((s, c) => s + (c.balance ?? 0), 0);
  const totalActivos = debitAvailable + cashAvailable;
  const totalPasivos = creditSpent + debtTotal;
  return { totalActivos, totalPasivos, patrimonioNeto: totalActivos - totalPasivos };
}

export interface ExpenseSearchOptions {
  query?: string;
  categoryId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function searchExpenses(
  opts: ExpenseSearchOptions,
): Promise<Expense[]> {
  const keys = await getAllMonthKeys();
  const allData = await Promise.all(keys.map(k => getMonthData(k)));

  const q    = opts.query?.trim().toLowerCase();
  const from = opts.fromDate ? new Date(opts.fromDate).getTime() : undefined;
  const to   = opts.toDate   ? new Date(opts.toDate).getTime()   : undefined;

  const results: Expense[] = [];
  for (const data of allData) {
    for (const e of data.expenses) {
      if (q && !e.name.toLowerCase().includes(q)) continue;
      if (opts.categoryId && e.categoryId !== opts.categoryId) continue;
      const created = new Date(e.createdAt).getTime();
      if (from !== undefined && created < from) continue;
      if (to   !== undefined && created > to)   continue;
      results.push(e);
    }
  }
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface RecurringTemplate {
  name: string;
  categoryId: string;
  amount: number;
}

// Gastos fijos/recurrentes que el usuario ha registrado alguna vez (onboarding
// o toggle "Gasto recurrente" en QuickEntryModal), deduplicados por nombre
// quedándose con la ocurrencia más reciente.
export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const keys = await getAllMonthKeys();
  const allData = await Promise.all(keys.map(k => getMonthData(k)));

  const byName = new Map<string, Expense>();
  for (const data of allData) {
    for (const e of data.expenses) {
      if (!e.isRecurring) continue;
      const key = e.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing || existing.createdAt < e.createdAt) byName.set(key, e);
    }
  }
  return [...byName.values()].map(e => ({ name: e.name, categoryId: e.categoryId, amount: e.amount }));
}

// ── Balance Notification Toggle ─────────────────────────────────────────────

const K_SHOW_BALANCE_NOTIF = '@wc_show_balance_notification';

export async function getShowBalanceNotification(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(K_SHOW_BALANCE_NOTIF);
    return v === 'true';
  } catch { return false; }
}

export async function saveShowBalanceNotification(value: boolean): Promise<void> {
  await AsyncStorage.setItem(K_SHOW_BALANCE_NOTIF, value ? 'true' : 'false');
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
