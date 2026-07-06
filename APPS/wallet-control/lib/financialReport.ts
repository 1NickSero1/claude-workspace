import { Expense, Income, CustomCategory, Goal, formatMonthLabel } from './storage';
import { formatCOP, sumExpenses } from './expenseParser';

function sumIncomesList(incomes: Income[]): number {
  return incomes.reduce((s, i) => s + i.amount, 0);
}

function groupByCategory(
  expenses: Expense[],
  categories: CustomCategory[],
): { cat: CustomCategory; total: number; count: number }[] {
  const map: Record<string, number> = {};
  const cnt: Record<string, number> = {};
  for (const e of expenses) {
    map[e.categoryId] = (map[e.categoryId] || 0) + e.amount;
    cnt[e.categoryId] = (cnt[e.categoryId] || 0) + 1;
  }
  return Object.entries(map)
    .map(([id, total]) => ({
      cat: categories.find(c => c.id === id) ?? { id, name: id, color: '#6C5CE7', icon: 'ellipse', isDefault: false },
      total,
      count: cnt[id] ?? 0,
    }))
    .sort((a, b) => b.total - a.total);
}

// ── Estilos compartidos entre reportes PDF (reporte financiero + extracto) ──
const SHARED_REPORT_STYLES = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#fff; color:#1A1A2E; padding:36px; font-size:13px; line-height:1.5; }
  .cover { text-align:center; padding:40px 20px 32px; border-bottom:3px solid #6C5CE7; margin-bottom:36px; }
  .cover .logo { font-size:48px; margin-bottom:10px; }
  .cover h1 { font-size:30px; font-weight:900; color:#6C5CE7; }
  .cover .period { font-size:18px; color:#1A1A2E; font-weight:700; margin:6px 0 4px; }
  .cover .meta { font-size:12px; color:#B0B7C3; }
  h2 { font-size:16px; font-weight:800; color:#6C5CE7; margin:28px 0 12px; padding-bottom:6px; border-bottom:2px solid #EDE9FF; }
  .kpi-row { display:flex; gap:12px; margin-bottom:8px; }
  .kpi { flex:1; background:#F9FAFB; border-radius:10px; padding:14px 16px; border:1px solid #E4E7EF; text-align:center; }
  .kpi .label { font-size:11px; color:#6B7280; margin-bottom:6px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; }
  .kpi .val { font-size:20px; font-weight:900; }
  .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  table { width:100%; border-collapse:collapse; margin-bottom:4px; }
  th { background:#EDE9FF; color:#6C5CE7; padding:9px 12px; text-align:left; font-size:12px; }
  td { padding:8px 12px; border-bottom:1px solid #F3F4F6; font-size:12px; vertical-align:middle; }
  tr:last-child td { border-bottom:none; }
  .footer { margin-top:48px; padding-top:16px; border-top:1px solid #E4E7EF; text-align:center; color:#B0B7C3; font-size:11px; }
  .page-break { page-break-before:always; }
  .badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:700; }
  .mov-inc { color:#00C896; font-weight:700; }
  .mov-exp { color:#FF5C5C; font-weight:700; }
  .balance { font-weight:800; color:#1A1A2E; }
  .balance-neg { color:#FF5C5C; }
`;

function renderCoverHeader(title: string, monthLabel: string, generatedAt: string): string {
  return `
<div class="cover">
  <div class="logo">💼</div>
  <h1>Wallet Control</h1>
  <div class="period">${title} — ${monthLabel}</div>
  <div class="meta">Generado el ${generatedAt}</div>
</div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function buildFinancialReportHtml(
  monthKey: string,
  expenses: Expense[],
  incomes: Income[],
  categories: CustomCategory[],
  goals: Goal[],
): string {
  const monthLabel  = formatMonthLabel(monthKey);
  const totalExp    = sumExpenses(expenses);
  const totalInc    = sumIncomesList(incomes);
  const savings     = totalInc - totalExp;
  const savingsPct  = totalInc > 0 ? Math.round((savings / totalInc) * 100) : 0;
  const byCat       = groupByCategory(expenses, categories);
  const generatedAt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const catRows = byCat.map(({ cat, total, count }) => {
    const pct = totalExp > 0 ? Math.round((total / totalExp) * 100) : 0;
    return `
      <tr>
        <td><span class="dot" style="background:${cat.color}"></span>${cat.name}</td>
        <td style="text-align:center">${count}</td>
        <td style="text-align:right;font-weight:700;color:#1A1A2E">${formatCOP(total)}</td>
        <td style="text-align:right;color:#6B7280">${pct}%</td>
      </tr>
      <tr><td colspan="4" style="padding:0 0 6px">
        <div style="height:4px;background:#F3F4F6;border-radius:2px">
          <div style="width:${pct}%;height:100%;background:${cat.color};border-radius:2px"></div>
        </div>
      </td></tr>`;
  }).join('');

  const incomeRows = incomes.map(inc => `
    <tr>
      <td>${inc.description}</td>
      <td style="text-align:center;color:#6B7280">${inc.quincena === 1 ? '1ª quincena' : '2ª quincena'}</td>
      <td style="text-align:right;font-weight:700;color:#00C896">${formatCOP(inc.amount)}</td>
    </tr>`).join('') || '<tr><td colspan="3" style="color:#B0B7C3;text-align:center">Sin ingresos registrados</td></tr>';

  const goalRows = goals.map(g => {
    const pct = g.targetAmount > 0 ? Math.min(Math.round((g.savedAmount / g.targetAmount) * 100), 100) : 0;
    return `
      <tr>
        <td><span class="dot" style="background:${g.color}"></span>${g.name}</td>
        <td style="text-align:right">${formatCOP(g.savedAmount)} / ${formatCOP(g.targetAmount)}</td>
        <td style="text-align:right;font-weight:700;color:${pct >= 100 ? '#00C896' : '#6C5CE7'}">${pct}%</td>
      </tr>
      <tr><td colspan="3" style="padding:0 0 8px">
        <div style="height:6px;background:#F3F4F6;border-radius:3px">
          <div style="width:${pct}%;height:100%;background:${g.color};border-radius:3px"></div>
        </div>
      </td></tr>`;
  }).join('') || '<tr><td colspan="3" style="color:#B0B7C3;text-align:center">Sin metas creadas</td></tr>';

  const savingsColor = savings >= 0 ? '#00C896' : '#FF5C5C';
  const savingsLabel = savings >= 0 ? 'Ahorro' : 'Déficit';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${SHARED_REPORT_STYLES}</style>
</head>
<body>

${renderCoverHeader('Reporte Financiero', monthLabel, generatedAt)}

<h2>Resumen del mes</h2>
<div class="kpi-row">
  <div class="kpi">
    <div class="label">Ingresos</div>
    <div class="val" style="color:#00C896">${formatCOP(totalInc)}</div>
  </div>
  <div class="kpi">
    <div class="label">Gastos</div>
    <div class="val" style="color:#FF5C5C">${formatCOP(totalExp)}</div>
  </div>
  <div class="kpi">
    <div class="label">${savingsLabel}</div>
    <div class="val" style="color:${savingsColor}">${formatCOP(Math.abs(savings))}</div>
  </div>
</div>
<div class="kpi-row">
  <div class="kpi" style="flex:unset;width:100%;display:block">
    <div class="label" style="margin-bottom:8px">Porcentaje de ahorro</div>
    <div style="height:8px;background:#F3F4F6;border-radius:4px;overflow:hidden">
      <div style="width:${Math.max(0, savingsPct)}%;height:100%;background:${savingsColor};border-radius:4px"></div>
    </div>
    <div style="margin-top:6px;font-weight:700;color:${savingsColor};font-size:14px">${savingsPct}%</div>
  </div>
</div>

<div class="page-break"></div>
<h2>Gastos por categoría</h2>
${byCat.length > 0 ? `
<table>
  <tr>
    <th>Categoría</th>
    <th style="text-align:center">Mov.</th>
    <th style="text-align:right">Total</th>
    <th style="text-align:right">%</th>
  </tr>
  ${catRows}
</table>` : '<p style="color:#B0B7C3;padding:12px 0">Sin gastos registrados este mes.</p>'}

<h2>Ingresos del mes</h2>
<table>
  <tr>
    <th>Descripción</th>
    <th style="text-align:center">Quincena</th>
    <th style="text-align:right">Monto</th>
  </tr>
  ${incomeRows}
  ${incomes.length > 0 ? `<tr>
    <td colspan="2" style="font-weight:700;text-align:right">Total</td>
    <td style="font-weight:900;color:#00C896;text-align:right">${formatCOP(totalInc)}</td>
  </tr>` : ''}
</table>

<div class="page-break"></div>
<h2>Metas de ahorro</h2>
<table>
  <tr>
    <th>Meta</th>
    <th style="text-align:right">Progreso</th>
    <th style="text-align:right">%</th>
  </tr>
  ${goalRows}
</table>

<div class="footer">
  <p>Wallet Control · Reporte Financiero · ${monthLabel}</p>
  <p>Datos almacenados localmente en tu dispositivo</p>
</div>

</body>
</html>`;
}

// ── Extracto de tu cuenta ────────────────────────────────────────────────────

interface Movement {
  date: Date;
  description: string;
  categoryLabel: string;
  amount: number;
  isIncome: boolean;
}

function buildMovements(
  expenses: Expense[],
  incomes: Income[],
  categories: CustomCategory[],
): Movement[] {
  const catName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const expMovs: Movement[] = expenses.map(e => ({
    date: new Date(e.createdAt),
    description: e.name,
    categoryLabel: catName(e.categoryId),
    amount: e.amount,
    isIncome: false,
  }));

  const incMovs: Movement[] = incomes.map(i => ({
    date: new Date(i.createdAt),
    description: i.description,
    categoryLabel: 'Ingreso',
    amount: i.amount,
    isIncome: true,
  }));

  return [...expMovs, ...incMovs].sort((a, b) => a.date.getTime() - b.date.getTime());
}

function formatMovDate(d: Date): string {
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function buildBankStatementHtml(
  monthKey: string,
  expenses: Expense[],
  incomes: Income[],
  categories: CustomCategory[],
): string {
  const monthLabel  = formatMonthLabel(monthKey);
  const totalExp    = sumExpenses(expenses);
  const totalInc    = sumIncomesList(incomes);
  const generatedAt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

  const movements = buildMovements(expenses, incomes, categories);

  let running = 0;
  const rows = movements.map(m => {
    running += m.isIncome ? m.amount : -m.amount;
    return `
      <tr>
        <td>${formatMovDate(m.date)}</td>
        <td>${escapeHtml(m.description)}</td>
        <td style="color:#6B7280">${escapeHtml(m.categoryLabel)}</td>
        <td style="text-align:right" class="${m.isIncome ? 'mov-inc' : 'mov-exp'}">${m.isIncome ? '+' : '-'}${formatCOP(m.amount)}</td>
        <td style="text-align:right" class="${running < 0 ? 'balance-neg' : 'balance'}">${formatCOP(running)}</td>
      </tr>`;
  }).join('') || `<tr><td colspan="5" style="color:#B0B7C3;text-align:center">Sin movimientos registrados este mes</td></tr>`;

  const saldoFinal = totalInc - totalExp;
  const saldoColor = saldoFinal >= 0 ? '#00C896' : '#FF5C5C';

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${SHARED_REPORT_STYLES}</style>
</head>
<body>

${renderCoverHeader('Extracto de tu cuenta', monthLabel, generatedAt)}

<div class="kpi-row">
  <div class="kpi">
    <div class="label">Ingresos</div>
    <div class="val" style="color:#00C896">${formatCOP(totalInc)}</div>
  </div>
  <div class="kpi">
    <div class="label">Gastos</div>
    <div class="val" style="color:#FF5C5C">${formatCOP(totalExp)}</div>
  </div>
  <div class="kpi">
    <div class="label">Saldo final</div>
    <div class="val" style="color:${saldoColor}">${formatCOP(saldoFinal)}</div>
  </div>
</div>

<h2>Movimientos del mes (${movements.length})</h2>
<table>
  <tr>
    <th>Fecha</th>
    <th>Descripción</th>
    <th>Categoría</th>
    <th style="text-align:right">Monto</th>
    <th style="text-align:right">Saldo</th>
  </tr>
  ${rows}
</table>

<div class="footer">
  <p>Wallet Control · Extracto de tu cuenta · ${monthLabel}</p>
  <p>Datos almacenados localmente en tu dispositivo</p>
</div>

</body>
</html>`;
}
