import { Expense, Income } from '@/lib/storage';

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

export function buildExpenses(rawExpenses: RawExpense[], monthKey: string): Expense[] {
  return rawExpenses.map((raw, i) => ({
    id:         `${Date.now()}_${i}`,
    name:       String(raw.name ?? '').toUpperCase().trim(),
    amount:     Math.abs(Number(raw.amount) || 0),
    categoryId: String(raw.category ?? 'otro'),
    quincena:   raw.quincena === 2 ? 2 : 1,
    cardId:     undefined,
    createdAt:  new Date().toISOString(),
    monthKey,
  }));
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
  return '$' + Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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
