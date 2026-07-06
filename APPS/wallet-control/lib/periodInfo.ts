export interface PeriodInfo {
  label: string;
  daysRemaining: number;
  progressPct: number;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getWeeklyPeriodInfo(date = new Date()): PeriodInfo {
  // Semana lunes–domingo. getDay(): 0=domingo..6=sábado.
  const dow = date.getDay();
  const mondayIndex = dow === 0 ? 6 : dow - 1; // 0=lunes..6=domingo
  const daysRemaining = 6 - mondayIndex;
  const progressPct = ((mondayIndex + 1) / 7) * 100;
  return { label: 'Esta semana', daysRemaining, progressPct };
}

export function getBiweeklyPeriodInfo(date = new Date()): PeriodInfo {
  const day = date.getDate();
  if (day <= 15) {
    return {
      label: 'Quincena 1',
      daysRemaining: 15 - day,
      progressPct: (day / 15) * 100,
    };
  }
  const lastDay = daysInMonth(date);
  const total = lastDay - 15;
  return {
    label: 'Quincena 2',
    daysRemaining: lastDay - day,
    progressPct: ((day - 15) / total) * 100,
  };
}

export function getMonthlyPeriodInfo(date = new Date()): PeriodInfo {
  const lastDay = daysInMonth(date);
  const day = date.getDate();
  return {
    label: 'Este mes',
    daysRemaining: lastDay - day,
    progressPct: (day / lastDay) * 100,
  };
}
