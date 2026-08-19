import type { ConversationTurn } from "../types";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      "Falta EXPO_PUBLIC_ANTHROPIC_API_KEY. Copia .env.example a .env.local y pon tu API key real.",
    );
    this.name = "MissingApiKeyError";
  }
}

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!key) throw new MissingApiKeyError();
  return key;
}

async function callClaude(system: string, messages: { role: "user" | "assistant"; content: string }[]): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": getApiKey(),
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system,
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  const textBlock = (data.content as Array<{ type: string; text?: string }> | undefined)?.find(
    (block) => block.type === "text",
  );
  return textBlock?.text ?? "";
}

export async function startScenario(systemPrompt: string): Promise<string> {
  return callClaude(systemPrompt, [
    {
      role: "user",
      content: "(The learner has just walked into the scene. Stay in character and open the conversation naturally, the way the real scenario would start.)",
    },
  ]);
}

export async function continueScenario(
  systemPrompt: string,
  history: ConversationTurn[],
  userMessage: string,
): Promise<string> {
  const messages = [
    ...history.map((turn) => ({ role: turn.role, content: turn.text })),
    { role: "user" as const, content: userMessage },
  ];
  return callClaude(systemPrompt, messages);
}

const FEEDBACK_SYSTEM = `You are SPEAKY, a demanding but encouraging English coach reviewing a practice conversation a Spanish-speaking learner just had. You will receive the full transcript. Write your feedback IN SPANISH, brief and direct:
1. Una frase de lo que hizo bien.
2. 2-3 errores concretos y específicos (gramática, vocabulario o fluidez) con la corrección — cita la frase exacta que dijo mal y cómo se dice bien. Si no hubo errores notables, dilo.
3. Una frase corta motivándolo a seguir practicando mañana.
Sin rodeos, sin relleno. Máximo 120 palabras.`;

export async function generateFeedback(scenarioTitle: string, history: ConversationTurn[]): Promise<string> {
  const transcript = history
    .map((turn) => `${turn.role === "user" ? "Learner" : "Character"}: ${turn.text}`)
    .join("\n");
  return callClaude(FEEDBACK_SYSTEM, [
    {
      role: "user",
      content: `Escenario: ${scenarioTitle}\n\nTranscripción:\n${transcript}`,
    },
  ]);
}
