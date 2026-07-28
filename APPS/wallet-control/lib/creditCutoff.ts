import { Card, Expense } from './storage';

// Plazo fijo de pago después del corte (confirmado con el usuario — típico
// en Colombia). No es configurable por tarjeta, a propósito, para mantener
// esto simple.
export const STATEMENT_DUE_DAYS = 15;

// Día de corte más alto permitido — 28 evita el problema de "31 de febrero".
const MAX_CUTOFF_DAY = 28;

// Primer corte que ocurre DESPUÉS de `after` (estrictamente posterior) para
// el día de corte configurado. Se usa tanto para "cuál es el próximo corte
// que hay que procesar" como, en cadena, para ponerse al día si pasó más de
// un corte desde la última vez que se abrió la app.
export function nextCutoffAfter(cutoffDay: number, after: Date): Date {
  const day = Math.min(Math.max(Math.trunc(cutoffDay), 1), MAX_CUTOFF_DAY);
  const next = new Date(after.getFullYear(), after.getMonth(), day, 9, 0, 0, 0);
  if (next.getTime() <= after.getTime()) next.setMonth(next.getMonth() + 1);
  return next;
}

// El corte más reciente que ya pasó (o está pasando hoy) — se usa solo para
// la activación por primera vez del día de corte sobre una tarjeta existente.
export function mostRecentCutoff(cutoffDay: number, today: Date = new Date()): Date {
  const day = Math.min(Math.max(Math.trunc(cutoffDay), 1), MAX_CUTOFF_DAY);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), day, 9, 0, 0, 0);
  return thisMonth.getTime() <= today.getTime()
    ? thisMonth
    : new Date(today.getFullYear(), today.getMonth() - 1, day, 9, 0, 0, 0);
}

export function computeStatementDueDate(cutoffDate: Date): Date {
  const due = new Date(cutoffDate);
  due.setDate(due.getDate() + STATEMENT_DUE_DAYS);
  return due;
}

// Suma los gastos de una tarjeta dentro de (desde, hasta] — recibe los
// gastos ya cargados de los meses que toquen (normalmente el actual y el
// anterior, porque el corte casi nunca cae justo fin de mes).
export function sumCardExpensesInWindow(
  cardId: string,
  expenseBuckets: Expense[][],
  fromExclusive: Date,
  uptoInclusive: Date,
): number {
  let total = 0;
  for (const bucket of expenseBuckets) {
    for (const e of bucket) {
      if (e.cardId !== cardId) continue;
      const t = new Date(e.createdAt).getTime();
      if (t > fromExclusive.getTime() && t <= uptoInclusive.getTime()) total += e.amount;
    }
  }
  return total;
}

// ¿Hay al menos un corte pendiente de procesar para esta tarjeta? (falso
// para tarjetas sin día de corte configurado, o que nunca se activaron).
export function hasPendingCutoff(card: Card, today: Date = new Date()): boolean {
  if (card.type !== 'credit' || !card.cutoffDay || !card.lastCutoffAt) return false;
  return nextCutoffAfter(card.cutoffDay, new Date(card.lastCutoffAt)).getTime() <= today.getTime();
}

// Aplica todos los cortes vencidos desde lastCutoffAt hasta hoy, uno por uno
// (por si la app estuvo cerrada más de un ciclo) — devuelve la tarjeta
// actualizada o null si no había nada que procesar. No hace I/O: quien
// llama decide si guarda el resultado.
export function applyPendingCutoffs(
  card: Card,
  expenseBuckets: Expense[][],
  today: Date = new Date(),
): Card | null {
  if (!hasPendingCutoff(card, today)) return null;
  let cursor = new Date(card.lastCutoffAt!);
  let statementBalance = card.statementBalance ?? 0;
  let statementDueDate = card.statementDueDate;
  let lastCutoffAt = card.lastCutoffAt!;
  let iterations = 0;
  while (iterations < 24) {
    const next = nextCutoffAfter(card.cutoffDay!, cursor);
    if (next.getTime() > today.getTime()) break;
    statementBalance += sumCardExpensesInWindow(card.id, expenseBuckets, cursor, next);
    statementDueDate = computeStatementDueDate(next).toISOString();
    lastCutoffAt = next.toISOString();
    cursor = next;
    iterations++;
  }
  if (iterations === 0) return null;
  return { ...card, statementBalance, statementDueDate, lastCutoffAt };
}
