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

export type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly';

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
  recurrenceDueDate?: string;
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
  hormigaThreshold?: number;
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

// Promesas de migración en curso por namespace — evita que dos llamadas
// concurrentes a getActiveNamespace() (típico en un load() con Promise.all)
// disparen la migración dos veces o vean el namespace "ya migrado" antes de
// que la copia real termine.
const migrationPromises = new Map<string, Promise<void>>();

// Mutex en memoria por llave de AsyncStorage — sin esto, dos guardados
// casi simultáneos sobre la MISMA llave (ej. dos "agregar gasto" seguidos
// antes de que el primero termine) leen el mismo estado viejo y el
// segundo en escribir pisa al primero. Cada mutator más abajo encola su
// lectura+escritura detrás de la anterior sobre esa llave específica;
// llaves distintas no se bloquean entre sí.
const keyLocks = new Map<string, Promise<unknown>>();

function withKeyLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = keyLocks.get(key) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  keyLocks.set(key, run.then(() => undefined, () => undefined));
  return run;
}

async function getActiveNamespace(): Promise<string> {
  const profile = await getUserProfile();
  const ns = profile?.id ?? 'anon';
  if (!migrationPromises.has(ns)) {
    migrationPromises.set(ns, migrateLegacyNamespaceData(ns).then(() => stripDefaultCategories(ns)));
  }
  await migrationPromises.get(ns);
  return ns;
}

/**
 * Ya no se siembran categorías predeterminadas para cuentas nuevas — esta
 * limpieza, una sola vez por namespace, quita las que ya estaban guardadas
 * de antes de este cambio (isDefault: true), dejando solo las que el
 * usuario creó él mismo. Los gastos que ya tenían una de esas categorías
 * quedan sin categoría asignada (mismo efecto que borrar cualquier
 * categoría a mano); las definiciones de recurrentes sin pagar ligadas a
 * ellas se eliminan, igual que ya hace deleteCategory.
 */
async function stripDefaultCategories(ns: string): Promise<void> {
  try {
    const flagKey = `@wc_stripped_defaults_${ns}`;
    if (await AsyncStorage.getItem(flagKey)) return;

    const raw = await AsyncStorage.getItem(K_CATEGORIES(ns));
    if (raw) {
      const cats: CustomCategory[] = JSON.parse(raw);
      const removedIds = new Set(cats.filter(c => c.isDefault).map(c => c.id));
      if (removedIds.size > 0) {
        await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(cats.filter(c => !c.isDefault)));

        const defsRaw = await AsyncStorage.getItem(K_RECURRING_DEFS(ns));
        if (defsRaw) {
          const defs: RecurringDefinition[] = JSON.parse(defsRaw);
          const remainingDefs = defs.filter(d => !removedIds.has(d.categoryId));
          if (remainingDefs.length !== defs.length) {
            await AsyncStorage.setItem(K_RECURRING_DEFS(ns), JSON.stringify(remainingDefs));
          }
        }
      }
    }

    await AsyncStorage.setItem(flagKey, 'true');
  } catch {
    // Best-effort: si falla, las categorías por defecto simplemente quedan como estaban.
  }
}

async function getMonthKeysForNamespace(ns: string): Promise<string[]> {
  const prefix = `wc_exp_${ns}_`;
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter(k => k.startsWith(prefix)).map(k => k.replace(prefix, ''));
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
      ['wc_recurring_defs', K_RECURRING_DEFS(ns)],
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
    const legacySnapKeys = allKeys.filter(k => /^wc_card_snap_\d{4}-\d{2}$/.test(k));
    for (const legacyKey of legacySnapKeys) {
      const monthKey = legacyKey.replace('wc_card_snap_', '');
      const newKey = K_CARD_SNAP(ns, monthKey);
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

/**
 * Copia (sin borrar el origen) los datos de un namespace hacia otro — usado
 * al crear una cuenta real desde modo anónimo, para que lo ya registrado no
 * desaparezca. No pisa datos que ya existan en el destino.
 */
export async function migrateNamespaceData(fromNs: string, toNs: string): Promise<void> {
  try {
    const pairs: [string, string][] = [
      [K_CARDS(fromNs), K_CARDS(toNs)],
      [K_CATEGORIES(fromNs), K_CATEGORIES(toNs)],
      [K_GOALS(fromNs), K_GOALS(toNs)],
      [K_RECURRING_DEFS(fromNs), K_RECURRING_DEFS(toNs)],
    ];
    for (const [fromKey, toKey] of pairs) {
      if (await AsyncStorage.getItem(toKey)) continue;
      const value = await AsyncStorage.getItem(fromKey);
      if (value) await AsyncStorage.setItem(toKey, value);
    }

    const months = await getMonthKeysForNamespace(fromNs);
    for (const m of months) {
      const expTo = K_EXP(toNs, m);
      if (!(await AsyncStorage.getItem(expTo))) {
        const expFrom = await AsyncStorage.getItem(K_EXP(fromNs, m));
        if (expFrom) await AsyncStorage.setItem(expTo, expFrom);
      }
      const snapTo = K_CARD_SNAP(toNs, m);
      if (!(await AsyncStorage.getItem(snapTo))) {
        const snapFrom = await AsyncStorage.getItem(K_CARD_SNAP(fromNs, m));
        if (snapFrom) await AsyncStorage.setItem(snapTo, snapFrom);
      }
    }
  } catch {
    // Best-effort: si falla, la cuenta nueva simplemente arranca sin los
    // datos del modo anónimo en vez de crashear el registro.
  }
}

/**
 * Borra todos los datos financieros de un namespace (usado al cerrar sesión
 * en modo anónimo, para que el próximo invitado en este dispositivo no
 * herede tarjetas/gastos de quien usó el modo anónimo antes).
 */
export async function wipeNamespaceData(ns: string): Promise<void> {
  try {
    const keys = [K_CARDS(ns), K_CATEGORIES(ns), K_GOALS(ns), K_RECURRING_DEFS(ns)];
    const months = await getMonthKeysForNamespace(ns);
    for (const m of months) keys.push(K_EXP(ns, m), K_CARD_SNAP(ns, m));
    await AsyncStorage.multiRemove(keys);
  } catch {
    // Best-effort: si falla, el namespace queda con datos viejos en vez de
    // interrumpir el flujo de cerrar sesión.
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
  return withKeyLock(K_CARDS(ns), async () => {
    const cards = await getCards();
    const idx = cards.findIndex(c => c.id === card.id);
    if (idx >= 0) cards[idx] = card; else cards.push(card);
    await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
  });
}

export async function deleteCard(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CARDS(ns), async () => {
    const cards = await getCards();
    await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards.filter(c => c.id !== id)));
  });
}

export async function appendCardEvent(cardId: string, event: CardEvent): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CARDS(ns), async () => {
    const cards = await getCards();
    const idx = cards.findIndex(c => c.id === cardId);
    if (idx < 0) return;
    cards[idx] = { ...cards[idx], events: [...(cards[idx].events ?? []), event] };
    await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
  });
}

// eventIndex es la posición dentro del array CardEvent[] tal como se guarda
// (orden cronológico, más viejo primero) — no el índice de una lista ya
// invertida/recortada para mostrar en pantalla.
export async function updateCardEvent(cardId: string, eventIndex: number, updates: Partial<CardEvent>): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CARDS(ns), async () => {
    const cards = await getCards();
    const idx = cards.findIndex(c => c.id === cardId);
    if (idx < 0) return;
    const events = [...(cards[idx].events ?? [])];
    if (!events[eventIndex]) return;
    events[eventIndex] = { ...events[eventIndex], ...updates };
    cards[idx] = { ...cards[idx], events };
    await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
  });
}

export async function deleteCardEvent(cardId: string, eventIndex: number): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CARDS(ns), async () => {
    const cards = await getCards();
    const idx = cards.findIndex(c => c.id === cardId);
    if (idx < 0) return;
    const events = (cards[idx].events ?? []).filter((_, i) => i !== eventIndex);
    cards[idx] = { ...cards[idx], events };
    await AsyncStorage.setItem(K_CARDS(ns), JSON.stringify(cards));
  });
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
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export async function saveCategory(cat: CustomCategory): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CATEGORIES(ns), async () => {
    const cats = await getCategories();
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) cats[idx] = cat; else cats.push(cat);
    await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(cats));
  });
}

export async function deleteCategory(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_CATEGORIES(ns), async () => {
    const cats = await getCategories();
    await AsyncStorage.setItem(K_CATEGORIES(ns), JSON.stringify(cats.filter(c => c.id !== id)));
    // Los gastos recurrentes que todavía no se han pagado ni una vez (sin
    // historial real) quedarían huérfanos apuntando a una categoría borrada —
    // los recurrentes derivados del historial se filtran aparte en
    // getRecurringTemplates() por categoryId inexistente, ya que esos sí
    // deben conservar los gastos ya registrados intactos.
    const defs = await getRecurringDefinitions();
    const remaining = defs.filter(d => d.categoryId !== id);
    if (remaining.length !== defs.length) {
      await AsyncStorage.setItem(K_RECURRING_DEFS(ns), JSON.stringify(remaining));
    }
  });
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
  return withKeyLock(K_GOALS(ns), async () => {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.id === goal.id);
    if (idx >= 0) goals[idx] = goal; else goals.push(goal);
    await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
  });
}

export async function deleteGoal(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_GOALS(ns), async () => {
    const goals = await getGoals();
    await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals.filter(g => g.id !== id)));
  });
}

export async function addGoalDeposit(goalId: string, deposit: Omit<GoalDeposit, 'id'>): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_GOALS(ns), async () => {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.id === goalId);
    if (idx < 0) return;
    const goal = goals[idx];
    const newDeposit: GoalDeposit = { ...deposit, id: `dep_${Date.now()}` };
    const deposits = [...(goal.deposits ?? []), newDeposit];
    goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
    await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
  });
}

export async function deleteGoalDeposit(goalId: string, depositId: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_GOALS(ns), async () => {
    const goals = await getGoals();
    const idx = goals.findIndex(g => g.id === goalId);
    if (idx < 0) return;
    const goal = goals[idx];
    const deposits = (goal.deposits ?? []).filter(d => d.id !== depositId);
    goals[idx] = { ...goal, deposits, savedAmount: deposits.reduce((s, d) => s + d.amount, 0) };
    await AsyncStorage.setItem(K_GOALS(ns), JSON.stringify(goals));
  });
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
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.expenses = [...data.expenses, ...expenses];
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function addIncomes(monthKey: string, incomes: Income[]): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.incomes = [...data.incomes, ...incomes];
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function updateIncome(monthKey: string, updated: Partial<Income> & { id: string }): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.incomes = data.incomes.map(i => i.id === updated.id ? { ...i, ...updated } : i);
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function deleteIncome(monthKey: string, id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.incomes = data.incomes.filter(i => i.id !== id);
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function assignCardToExpenses(
  monthKey: string,
  expenseIds: string[],
  cardId: string,
): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.expenses = data.expenses.map(e =>
      expenseIds.includes(e.id) ? { ...e, cardId } : e,
    );
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function deleteExpense(monthKey: string, id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.expenses = data.expenses.filter(e => e.id !== id);
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function updateExpense(monthKey: string, updated: Partial<Expense> & { id: string }): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.expenses = data.expenses.map(e => e.id === updated.id ? { ...e, ...updated } : e);
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

export async function saveBudget(monthKey: string, budget: number): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.budget = budget;
    data.budgetNotified = 0;
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
}

// Si el mes consultado no tiene presupuesto propio, muestra el del mes
// anterior como referencia (sin guardarlo) — para que un mes nuevo no
// vuelva a aparecer como "Sin configurar" si el usuario ya lo definió
// antes. Solo para mostrar: el aviso de 80%/100% (checkBudgetThreshold)
// sigue mirando exclusivamente el presupuesto explícito de ese mes.
export async function getEffectiveBudget(monthKey: string): Promise<number | null> {
  const data = await getMonthData(monthKey);
  if (data.budget != null) return data.budget;
  const prevData = await getMonthData(getPreviousMonthKey(monthKey));
  return prevData.budget ?? null;
}

export async function saveBudgetNotified(monthKey: string, threshold: number): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_EXP(ns, monthKey), async () => {
    const data = await getMonthData(monthKey);
    data.budgetNotified = threshold;
    await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
  });
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

// Cuántos gastos quedarían sin cuenta asignada si se elimina esta tarjeta —
// para avisar antes de confirmar el borrado.
export async function countExpensesForCard(cardId: string): Promise<number> {
  const keys = await getAllMonthKeys();
  const allData = await Promise.all(keys.map(k => getMonthData(k)));
  return allData.reduce((sum, d) => sum + d.expenses.filter(e => e.cardId === cardId).length, 0);
}

// Desvincula una tarjeta eliminada de sus gastos ya registrados, en vez de
// dejarlos con una cardId huérfana apuntando a nada — el gasto se mantiene
// en el historial del mes (no cambia el total gastado), solo queda sin
// cuenta asignada.
export async function clearCardFromExpenses(cardId: string): Promise<void> {
  const ns = await getActiveNamespace();
  const keys = await getAllMonthKeys();
  for (const monthKey of keys) {
    await withKeyLock(K_EXP(ns, monthKey), async () => {
      const data = await getMonthData(monthKey);
      if (!data.expenses.some(e => e.cardId === cardId)) return;
      data.expenses = data.expenses.map(e => e.cardId === cardId ? { ...e, cardId: undefined } : e);
      await AsyncStorage.setItem(K_EXP(ns, monthKey), JSON.stringify(data));
    });
  }
}

export async function getCategoryIdsWithExpenses(): Promise<Set<string>> {
  const keys = await getAllMonthKeys();
  const allData = await Promise.all(keys.map(k => getMonthData(k)));
  const ids = new Set<string>();
  for (const data of allData) {
    for (const e of data.expenses) ids.add(e.categoryId);
  }
  return ids;
}

export interface RecurringTemplate {
  name: string;
  categoryId: string;
  amount: number;
  frequency: RecurrenceFrequency;
  dueDate?: string;
  lastCardId?: string;
  // Presente SOLO si esta plantilla todavía no se ha pagado ni una vez —
  // "Reversar" en el hub de Gastos recurrentes borra la definición completa,
  // algo seguro solo cuando no hay historial real detrás todavía.
  defId?: string;
  // true si esta plantilla (pagada o no) fue creada desde la pantalla
  // "Gastos recurrentes" — a diferencia de defId, se conserva después de
  // pagarla por primera vez. Solo para conteos (ver Resumen), nunca para
  // decidir si se puede borrar la definición.
  fromRecurringScreen?: boolean;
}

// ── Definiciones de gastos recurrentes sin pagar todavía ────────────────────
// Un gasto fijo nuevo que el usuario define desde "Gastos recurrentes" antes
// de haberlo pagado ni una sola vez — no existe como Expense real (no tiene
// cuenta ni quincena asignada), así que no puede inferirse del historial
// como el resto de RecurringTemplate. Vive aparte hasta la primera vez que
// se marca "Pagado", momento en el que el historial de gastos toma el
// control normal (ver getRecurringTemplates).
export interface RecurringDefinition {
  id: string;
  name: string;
  categoryId: string;
  amount: number;
  frequency: RecurrenceFrequency;
  createdAt: string;
  notificationId?: string;
}

const K_RECURRING_DEFS = (ns: string) => `wc_recurring_defs_${ns}`;

export async function getRecurringDefinitions(): Promise<RecurringDefinition[]> {
  try {
    const ns = await getActiveNamespace();
    const raw = await AsyncStorage.getItem(K_RECURRING_DEFS(ns));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export async function saveRecurringDefinition(def: RecurringDefinition): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_RECURRING_DEFS(ns), async () => {
    const defs = await getRecurringDefinitions();
    defs.push(def);
    await AsyncStorage.setItem(K_RECURRING_DEFS(ns), JSON.stringify(defs));
  });
}

export async function deleteRecurringDefinition(id: string): Promise<void> {
  const ns = await getActiveNamespace();
  return withKeyLock(K_RECURRING_DEFS(ns), async () => {
    const defs = await getRecurringDefinitions();
    await AsyncStorage.setItem(K_RECURRING_DEFS(ns), JSON.stringify(defs.filter(d => d.id !== id)));
  });
}

// Gastos fijos/recurrentes que el usuario ha registrado alguna vez (onboarding
// o toggle "Gasto recurrente" en QuickEntryModal), deduplicados por nombre
// quedándose con la ocurrencia más reciente. Incluye además las definiciones
// nuevas que todavía no se han pagado ni una vez (ver RecurringDefinition) —
// si un nombre ya tiene historial real, el historial manda.
export async function getRecurringTemplates(): Promise<RecurringTemplate[]> {
  const keys = await getAllMonthKeys();
  const [allData, defs, categories] = await Promise.all([
    Promise.all(keys.map(k => getMonthData(k))),
    getRecurringDefinitions(),
    getCategories(),
  ]);
  const validCategoryIds = new Set(categories.map(c => c.id));

  // Llave compuesta categoría+nombre (no solo nombre): dos gastos recurrentes
  // distintos que comparten nombre en categorías distintas ya no se
  // fusionan en uno solo. Además se descarta cualquier plantilla cuya
  // categoría ya no exista (categoría eliminada) — así "Pagar" deja de
  // poder escribir gastos nuevos contra una categoría borrada.
  const byKey = new Map<string, Expense>();
  for (const data of allData) {
    for (const e of data.expenses) {
      if (!e.isRecurring) continue;
      if (!validCategoryIds.has(e.categoryId)) continue;
      const key = `${e.categoryId}::${e.name.trim().toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing || existing.createdAt < e.createdAt) byKey.set(key, e);
    }
  }
  // Marca qué plantillas derivadas del historial corresponden a una
  // RecurringDefinition (creada solo desde "Gastos recurrentes"), aunque ya
  // se hayan pagado alguna vez — para poder distinguir "creado en Gastos
  // recurrentes" de un gasto marcado recurrente desde otro lado (ej. dentro
  // de una categoría) incluso después de que ambos vivan como historial
  // real. No confundir con defId (solo para las nunca pagadas, ver abajo).
  const defsByKey = new Map(defs.map(d => [`${d.categoryId}::${d.name.trim().toLowerCase()}`, d]));
  const fromHistory: RecurringTemplate[] = [...byKey.values()].map(e => ({
    name: e.name, categoryId: e.categoryId, amount: e.amount,
    frequency: e.recurrenceFrequency ?? 'monthly',
    dueDate: e.recurrenceDueDate,
    lastCardId: e.cardId,
    fromRecurringScreen: defsByKey.has(`${e.categoryId}::${e.name.trim().toLowerCase()}`),
  }));
  const fromDefsOnly: RecurringTemplate[] = defs
    .filter(d => validCategoryIds.has(d.categoryId) && !byKey.has(`${d.categoryId}::${d.name.trim().toLowerCase()}`))
    .map(d => ({ name: d.name, categoryId: d.categoryId, amount: d.amount, frequency: d.frequency, defId: d.id, fromRecurringScreen: true }));
  return [...fromHistory, ...fromDefsOnly];
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
