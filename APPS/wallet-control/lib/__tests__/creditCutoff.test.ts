import {
  nextCutoffAfter, mostRecentCutoff, hasPendingCutoff, applyPendingCutoffs,
} from '../creditCutoff';
import { makeCard, makeExpense, localCutoffISO } from '../testHelpers';

describe('nextCutoffAfter', () => {
  it('devuelve el corte del mismo mes si todavía no ha pasado', () => {
    const next = nextCutoffAfter(15, new Date(2026, 6, 10)); // 10 de julio
    expect(next.getMonth()).toBe(6);
    expect(next.getDate()).toBe(15);
  });

  it('pasa al mes siguiente si el día de corte ya pasó', () => {
    const next = nextCutoffAfter(15, new Date(2026, 6, 20)); // 20 de julio
    expect(next.getMonth()).toBe(7);
    expect(next.getDate()).toBe(15);
  });

  it('limita el día de corte a 28 para evitar el problema de "31 de febrero"', () => {
    const next = nextCutoffAfter(31, new Date(2026, 0, 1));
    expect(next.getDate()).toBe(28);
  });
});

describe('mostRecentCutoff', () => {
  it('devuelve el corte de este mes si ya pasó', () => {
    const cutoff = mostRecentCutoff(15, new Date(2026, 6, 20));
    expect(cutoff.getMonth()).toBe(6);
    expect(cutoff.getDate()).toBe(15);
  });

  it('devuelve el corte del mes anterior si todavía no llega el de este mes', () => {
    const cutoff = mostRecentCutoff(15, new Date(2026, 6, 10));
    expect(cutoff.getMonth()).toBe(5);
    expect(cutoff.getDate()).toBe(15);
  });
});

describe('hasPendingCutoff', () => {
  it('false si la tarjeta no es de crédito', () => {
    const card = makeCard({ type: 'debit', cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 5, 15) });
    expect(hasPendingCutoff(card, new Date(2026, 6, 20))).toBe(false);
  });

  it('false si el corte nunca se activó (sin lastCutoffAt)', () => {
    const card = makeCard({ cutoffDay: 15 });
    expect(hasPendingCutoff(card, new Date(2026, 6, 20))).toBe(false);
  });

  it('true si ya pasó la fecha del próximo corte', () => {
    const card = makeCard({ cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 5, 15) });
    expect(hasPendingCutoff(card, new Date(2026, 6, 20))).toBe(true);
  });

  it('false si todavía no llega el próximo corte', () => {
    const card = makeCard({ cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 6, 15) });
    expect(hasPendingCutoff(card, new Date(2026, 6, 20))).toBe(false);
  });
});

describe('applyPendingCutoffs', () => {
  it('congela solo lo gastado en la ventana del corte, no el histórico completo (regresión del hallazgo #1)', () => {
    const card = makeCard({ cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 5, 15), statementBalance: 0 });
    const expenses = [
      makeExpense({ id: 'e1', amount: 300000, createdAt: localCutoffISO(2026, 6, 10, 12) }), // dentro de la ventana jun15→jul15
      makeExpense({ id: 'e2', amount: 999999, createdAt: localCutoffISO(2026, 4, 1, 12) }),  // anterior a la ventana, no debe contar
    ];
    const result = applyPendingCutoffs(card, [expenses], new Date(2026, 6, 20));
    expect(result).not.toBeNull();
    expect(result!.statementBalance).toBe(300000);
  });

  it('devuelve null si no hay ningún corte pendiente', () => {
    const card = makeCard({ cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 6, 15) });
    const result = applyPendingCutoffs(card, [[]], new Date(2026, 6, 20));
    expect(result).toBeNull();
  });

  it('se pone al día con varios cortes seguidos sin duplicar nada, si la app estuvo cerrada varios meses', () => {
    const card = makeCard({ cutoffDay: 15, lastCutoffAt: localCutoffISO(2026, 4, 15), statementBalance: 0 });
    const expenses = [
      makeExpense({ id: 'e1', amount: 100000, createdAt: localCutoffISO(2026, 4, 20, 12) }), // ciclo may15→jun15
      makeExpense({ id: 'e2', amount: 200000, createdAt: localCutoffISO(2026, 5, 20, 12) }), // ciclo jun15→jul15
    ];
    const result = applyPendingCutoffs(card, [expenses], new Date(2026, 6, 20)); // hoy: 20 de julio
    expect(result).not.toBeNull();
    expect(result!.statementBalance).toBe(300000);
    expect(new Date(result!.lastCutoffAt!).getMonth()).toBe(6); // corte de julio, el más reciente ya procesado
  });
});
