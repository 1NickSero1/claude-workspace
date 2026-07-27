import {
  Card, Expense, RecurringTemplate, BudgetPeriod,
  addExpenses, deleteExpense, getCardTotalSpent,
} from '@/lib/storage';
import { cancelNotification, scheduleRecurringReminder } from '@/lib/notifications';

export function currentQuincena(date: Date = new Date()): 1 | 2 {
  return date.getDate() <= 15 ? 1 : 2;
}

// Nombres (normalizados) de los gastos ya registrados en el periodo activo
// según profile.budgetPeriod — misma ventana que ya usaba Resumen.
function loggedNamesInPeriod(expenses: Expense[], period: BudgetPeriod, quincena: 1 | 2): Set<string> {
  const today = new Date();
  const dow = today.getDay();
  const mondayIndex = dow === 0 ? 6 : dow - 1;
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayIndex);

  const windowExpenses = period === 'weekly'
    ? expenses.filter(e => new Date(e.createdAt).getTime() >= weekStart.getTime())
    : period === 'monthly'
    ? expenses
    : expenses.filter(e => e.quincena === quincena);

  return new Set(windowExpenses.map(e => e.name.trim().toLowerCase()));
}

// Separa los gastos fijos/recurrentes en pendientes/pagados del periodo activo,
// comparando por nombre contra los gastos reales ya registrados.
export function splitRecurringByPaid(
  templates: RecurringTemplate[],
  expenses: Expense[],
  period: BudgetPeriod,
  quincena: 1 | 2,
): { pending: RecurringTemplate[]; paid: RecurringTemplate[] } {
  const logged = loggedNamesInPeriod(expenses, period, quincena);
  return {
    pending: templates.filter(t => !logged.has(t.name.trim().toLowerCase())),
    paid: templates.filter(t => logged.has(t.name.trim().toLowerCase())),
  };
}

// Cuentas con plata real disponible para pagar un gasto fijo — sin préstamos
// (no son una fuente de dinero) y sin cuentas en $0.
export function getPayableCards(cards: Card[], expenses: Expense[]): Card[] {
  return cards.filter(c => {
    if (c.type === 'debt') return false;
    if (c.type === 'credit') return (c.limit ?? 0) - getCardTotalSpent(expenses, c.id) > 0;
    return (c.balance ?? 0) - getCardTotalSpent(expenses, c.id) > 0;
  });
}

// Registra el gasto real de un gasto fijo pendiente — mismo efecto que
// loggearlo a mano, pero en un paso. No lleva fecha de pago: al marcarlo
// pagado ya se confirma que se pagó, así que cuenta de inmediato en
// "Gastos del mes" (a diferencia de uno con fecha de pago configurada).
export async function payRecurringTemplate(
  monthKey: string,
  quincena: 1 | 2,
  template: RecurringTemplate,
  cardId: string,
): Promise<void> {
  const notificationId = await scheduleRecurringReminder(template.name, template.frequency, new Date());
  await addExpenses(monthKey, [{
    id: `${Date.now()}_paid`,
    name: template.name,
    amount: template.amount,
    categoryId: template.categoryId,
    quincena,
    cardId,
    createdAt: new Date().toISOString(),
    monthKey,
    isRecurring: true,
    recurrenceFrequency: template.frequency,
    notificationId,
  }]);
}

// Deshace el pago de un gasto fijo: borra el/los gasto(s) reales que
// coincidan por nombre en el periodo activo y cancela sus notificaciones.
export async function unpayRecurringTemplate(
  monthKey: string,
  quincena: 1 | 2,
  template: RecurringTemplate,
  expenses: Expense[],
): Promise<void> {
  const key = template.name.trim().toLowerCase();
  const matches = expenses.filter(e => e.quincena === quincena && e.name.trim().toLowerCase() === key);
  for (const m of matches) {
    if (m.notificationId) await cancelNotification(m.notificationId);
    await deleteExpense(monthKey, m.id);
  }
}
