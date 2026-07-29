import { getCardCurrentCycleSpent, getCardTotalSpent } from '../storage';
import { makeCard, makeExpense } from '../testHelpers';

// getCardCurrentCycleSpent es el arreglo del hallazgo #1/#4 de la auditoría
// del 28-jul-2026 (doble conteo de deuda al activar el corte de tarjeta).
// Estas pruebas son la red de seguridad para que ese bug no vuelva a pasar
// sin que nadie se dé cuenta antes de que un usuario real lo vea.
describe('getCardCurrentCycleSpent', () => {
  it('sin corte activado, es igual al total gastado de la tarjeta', () => {
    const card = makeCard();
    const expenses = [makeExpense({ amount: 300000 })];
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(300000);
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(getCardTotalSpent(expenses, card.id));
  });

  it('con corte activado, no vuelve a contar lo que ya quedó congelado en statementBalance (regresión del doble conteo)', () => {
    const card = makeCard({ lastCutoffAt: '2026-07-15T09:00:00.000Z', statementBalance: 300000 });
    const expenses = [
      makeExpense({ id: 'exp_old', amount: 300000, createdAt: '2026-07-01T00:00:00.000Z' }), // anterior al corte
      makeExpense({ id: 'exp_new', amount: 50000, createdAt: '2026-07-20T00:00:00.000Z' }),   // ciclo nuevo
    ];
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(50000);
  });

  it('un gasto justo en el instante del corte no cuenta para el ciclo nuevo (límite exclusivo)', () => {
    const card = makeCard({ lastCutoffAt: '2026-07-15T09:00:00.000Z' });
    const expenses = [makeExpense({ createdAt: '2026-07-15T09:00:00.000Z', amount: 100000 })];
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(0);
  });

  it('ignora gastos de otras tarjetas', () => {
    const card = makeCard();
    const expenses = [makeExpense({ cardId: 'otra-tarjeta', amount: 999999 })];
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(0);
  });

  it('tarjetas que no son de crédito siempre usan el total histórico, aunque tengan lastCutoffAt', () => {
    const card = makeCard({ type: 'debit', lastCutoffAt: '2026-07-15T09:00:00.000Z' });
    const expenses = [makeExpense({ amount: 200000, createdAt: '2026-01-01T00:00:00.000Z' })];
    expect(getCardCurrentCycleSpent(card, expenses)).toBe(200000);
  });
});
