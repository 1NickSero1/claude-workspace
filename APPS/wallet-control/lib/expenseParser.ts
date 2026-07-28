import { Card, Expense, Income } from '@/lib/storage';

// Gasto hormiga: un gasto pequeño y frecuente (café, snacks, domicilios) que no
// es recurrente pero conviene señalar porque suele pasar desapercibido en la suma del mes.
export const GASTO_HORMIGA_MAX = 30000;

export interface RawExpense {
  name: string;
  amount: number;
  category: string;
  quincena: number;
  cardName?: string;
}

export interface RawIncome {
  description: string;
  amount: number;
  quincena: number;
}

export interface ClaudeRawResponse {
  message: string;
  expenses: RawExpense[];
  incomes: RawIncome[];
  askForCard?: boolean;
}

export function parseClaudeResponse(text: string): ClaudeRawResponse {
  try {
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
    const parsed = JSON.parse(cleaned);
    return {
      message:    parsed.message    ?? text,
      expenses:   Array.isArray(parsed.expenses) ? parsed.expenses : [],
      incomes:    Array.isArray(parsed.incomes)  ? parsed.incomes  : [],
      askForCard: parsed.askForCard ?? false,
    };
  } catch {
    return { message: text, expenses: [], incomes: [], askForCard: false };
  }
}

export function buildExpenses(rawExpenses: RawExpense[], monthKey: string, cards: Card[] = []): Expense[] {
  return rawExpenses.map((raw, i) => {
    const card = raw.cardName
      ? cards.find(c => c.name.trim().toLowerCase() === raw.cardName!.trim().toLowerCase())
      : undefined;
    return {
      id:         `${Date.now()}_${i}`,
      name:       String(raw.name ?? '').toUpperCase().trim(),
      amount:     Math.abs(Number(raw.amount) || 0),
      categoryId: String(raw.category ?? 'otro'),
      quincena:   raw.quincena === 2 ? 2 : 1,
      cardId:     card?.id,
      createdAt:  new Date().toISOString(),
      monthKey,
    };
  });
}

export function buildIncomes(rawIncomes: RawIncome[], monthKey: string): Income[] {
  return rawIncomes.map((raw, i) => ({
    id:          `inc_${Date.now()}_${i}`,
    description: String(raw.description ?? '').trim(),
    amount:      Math.abs(Number(raw.amount) || 0),
    quincena:    raw.quincena === 2 ? 2 : 1,
    createdAt:   new Date().toISOString(),
    monthKey,
  }));
}

export function formatCOP(amount: number): string {
  const sign = amount < 0 ? '-' : '';
  return sign + '$' + Math.round(Math.abs(amount)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** Formatea dígitos sueltos (string o number) con "." de miles, sin símbolo de moneda. */
export function formatThousands(value: string | number): string {
  const digits = typeof value === 'number' ? String(Math.round(value)) : value.replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('es-CO');
}

export function sumExpenses(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function groupByCategory(expenses: Expense[]): Record<string, number> {
  return expenses.reduce((acc, e) => {
    acc[e.categoryId] = (acc[e.categoryId] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);
}
