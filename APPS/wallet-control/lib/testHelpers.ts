import { Card, Expense } from './storage';

// nextCutoffAfter/mostRecentCutoff (lib/creditCutoff.ts) construyen fechas
// con el constructor local (new Date(year, month, day, hora)), no en UTC —
// un literal ISO tipo '2026-07-15T09:00:00.000Z' escrito a mano NO
// corresponde al mismo instante que "15 de julio, 9am hora local" salvo que
// la máquina esté justo en UTC+0. Usar este helper para que las pruebas de
// corte de tarjeta den el mismo resultado sin importar la zona horaria de
// quien las corra.
export function localCutoffISO(year: number, monthIndex: number, day: number, hour = 9): string {
  return new Date(year, monthIndex, day, hour, 0, 0, 0).toISOString();
}

export function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card1',
    name: 'Visa Test',
    type: 'credit',
    bank: 'Banco Test',
    lastFour: '1234',
    color: '#6C5CE7',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: `exp_${Math.random().toString(36).slice(2)}`,
    name: 'Gasto',
    amount: 100000,
    categoryId: 'otro',
    quincena: 1,
    cardId: 'card1',
    createdAt: '2026-07-01T00:00:00.000Z',
    monthKey: '2026-07',
    ...overrides,
  };
}
