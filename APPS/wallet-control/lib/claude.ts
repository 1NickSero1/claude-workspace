import { SYSTEM_PROMPT } from '@/constants/systemPrompt';

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-sonnet-4-6';
const PLACEHOLDER_KEY = 'your-api-key-here';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── Demo mode ─────────────────────────────────────────────────────────────────

function demoResponse(lastMsg: string): string {
  const m = lastMsg.toLowerCase();

  if (m.includes('analiz') || m.includes('resumen financiero') || m.includes('cómo estoy')) {
    return JSON.stringify({
      message: '📊 *ANÁLISIS DEMO*\n\n**Ingresos:** $2.000.000\n**Gastos:** $755.000\n**Ahorro:** $1.245.000 (62%)\n\n✅ Excelente tasa de ahorro. Vivienda representa el 63% del gasto — dentro del límite saludable del 50-60%.\n\n💡 Recomendación: destina al menos $300.000 del ahorro a un CDT o fondo de inversión para que rinda.',
      expenses: [], incomes: [], askForCard: false,
    });
  }

  if (m.match(/sueldo|salario|pago.*recib|me.*pagaron|cobr[eé]|ingreso|honorario/)) {
    const match = m.match(/\$?\s*([\d.,]+)/);
    const amount = match ? parseInt(match[1].replace(/[.,]/g, '')) : 2000000;
    const normalAmount = amount > 100000000 ? amount / 1000 : amount || 2000000;
    return JSON.stringify({
      message: `*MODO DEMO* — Registré un ingreso de $${normalAmount.toLocaleString('es-CO')}. ¡Bien! ¿Tienes gastos que registrar también?`,
      expenses: [],
      incomes: [{ description: 'Ingreso registrado', amount: normalAmount, quincena: 1 }],
      askForCard: false,
    });
  }

  if (m.match(/\$[\d.]+/) || ['arriendo','spotify','internet','gym','mercado',
    'comida','parqueadero','peluq','servicios','arena','netflix','gas','luz'].some(k => m.includes(k))) {
    const expenses = extractDemoExpenses(lastMsg);
    const total = expenses.reduce((s: number, e: any) => s + e.amount, 0);
    const fmt = (n: number) => '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const lista = expenses.map((e: any) => `• ${e.name}: ${fmt(e.amount)}`).join('\n');
    return JSON.stringify({
      message: `*MODO DEMO* — Registré ${expenses.length} gasto${expenses.length !== 1 ? 's' : ''} — total ${fmt(total)}:\n\n${lista}\n\n¿Con qué tarjeta pagaste?`,
      expenses,
      incomes: [],
      askForCard: true,
    });
  }

  return JSON.stringify({
    message: '¡Hola! *Modo demo activo*\n\nCuéntame tus gastos o ingresos:\n• "Pagué arriendo $475.000, Spotify $30.000"\n• "Me pagaron el sueldo $2.000.000"\n• "Analiza mis finanzas"',
    expenses: [], incomes: [], askForCard: false,
  });
}

function extractDemoExpenses(text: string) {
  const known = [
    { kw: ['arriendo','renta','alquiler'],    name: 'ARRIENDO',    cat: 'vivienda',        def: 475000 },
    { kw: ['spotify'],                         name: 'SPOTIFY',     cat: 'entretenimiento', def: 30000  },
    { kw: ['netflix'],                         name: 'NETFLIX',     cat: 'entretenimiento', def: 45000  },
    { kw: ['internet','wifi'],                 name: 'INTERNET',    cat: 'servicios',       def: 50000  },
    { kw: ['gym','gimnasio'],                  name: 'GYM',         cat: 'salud',           def: 100000 },
    { kw: ['mercado','supermercado'],          name: 'MERCADO',     cat: 'mercado',         def: 200000 },
    { kw: ['parqueadero','parking'],           name: 'PARQUEADERO', cat: 'transporte',      def: 30000  },
    { kw: ['comida','almuerzo','restaurante'], name: 'COMIDA',      cat: 'comida',          def: 20000  },
    { kw: ['peluq','corte','barber'],          name: 'PELUQUERÍA',  cat: 'cuidado_personal',def: 20000  },
    { kw: ['servicios','agua','luz','gas'],    name: 'SERVICIOS',   cat: 'servicios',       def: 50000  },
    { kw: ['arena','tony'],                    name: 'ARENA TONY',  cat: 'mascotas',        def: 15000  },
  ];
  const lower = text.toLowerCase();
  const found: any[] = [];
  for (const item of known) {
    if (item.kw.some(k => lower.includes(k))) {
      const match = text.match(new RegExp(`(?:${item.kw.join('|')}).*?\\$?([\\d]{2,7}[.,]?[\\d]{0,3})`, 'i'));
      const raw = match ? parseInt(match[1].replace(/[.,]/g, ''), 10) : item.def;
      found.push({
        name: item.name,
        amount: raw > 100000000 ? raw / 1000 : raw || item.def,
        category: item.cat,
        quincena: lower.includes('segunda') ? 2 : 1,
      });
    }
  }
  if (!found.length) found.push({ name: 'GASTO', amount: 50000, category: 'otro', quincena: 1 });
  return found;
}

// ── Real API ──────────────────────────────────────────────────────────────────

export async function askAdvisor(history: ChatMessage[]): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

  if (!apiKey || apiKey === PLACEHOLDER_KEY) {
    const last = history[history.length - 1]?.content ?? '';
    await new Promise(r => setTimeout(r, 700));
    return demoResponse(last);
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: history,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message ?? `Error ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}
