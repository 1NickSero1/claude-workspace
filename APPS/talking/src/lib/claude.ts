import type { ConversationTurn, LevelProfile } from "../types";

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

const FEEDBACK_SYSTEM = `You are SPEAKY, a demanding but encouraging English coach reviewing a practice conversation a Spanish-speaking learner just had. You will receive the full transcript, and — when available — the learner's level, self-reported main weakness and goal from an earlier diagnostic test. Write your feedback IN SPANISH, brief and direct:
1. Una frase de lo que hizo bien.
2. 2-3 errores concretos y específicos (gramática, vocabulario o fluidez) con la corrección — cita la frase exacta que dijo mal y cómo se dice bien. Si no hubo errores notables, dilo.
3. Si te dieron su debilidad conocida, decí explícitamente si en ESTA conversación mostró progreso en ese punto puntual o si sigue cometiendo el mismo tipo de error — esto es lo más valioso para él, no lo omitas.
4. Una frase corta motivándolo a seguir practicando mañana — si te dieron su objetivo, conectá la motivación con eso.
Sin rodeos, sin relleno. Máximo 140 palabras.`;

const ASSESS_SYSTEM = `You are SPEAKY, an honest English-level assessor for a Spanish-speaking learner. You will receive: (1) how they introduced themselves in English, (2) how they handled a short "order a coffee" roleplay, (3) what they said in Spanish is their biggest struggle, (4) their goal for learning English. Judge their REAL fluency, vocabulary and functional grammar from (1) and (2) — do not inflate or deflate the level to be nice.

Respond with ONLY a JSON object, no other text, in this exact shape:
{"level":"basico"|"intermedio"|"avanzado","weakness":"<one honest sentence in Spanish naming their main gap>","goalSummary":"<their goal, rewritten as one short sentence in Spanish>"}`;

export type LevelAssessment = { level: "basico" | "intermedio" | "avanzado"; weakness: string; goalSummary: string };

export async function assessLevel(
  introduction: string,
  miniScenarioResponse: string,
  selfReportedStruggle: string,
  goal: string,
): Promise<LevelAssessment> {
  const raw = await callClaude(ASSESS_SYSTEM, [
    {
      role: "user",
      content: `Presentación (en inglés): "${introduction}"\n\nRespuesta al mini escenario "You're ordering coffee, go ahead" (en inglés): "${miniScenarioResponse}"\n\nEn qué siente que más falla (en español, dicho por el usuario): "${selfReportedStruggle}"\n\nObjetivo del usuario (en español, dicho por el usuario): "${goal}"`,
    },
  ]);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No se pudo interpretar el resultado del test de nivel.");
  const parsed = JSON.parse(match[0]);
  if (parsed.level !== "basico" && parsed.level !== "intermedio" && parsed.level !== "avanzado") {
    throw new Error("El test de nivel devolvió un resultado inválido.");
  }
  return parsed as LevelAssessment;
}

export async function generateFeedback(
  scenarioTitle: string,
  history: ConversationTurn[],
  levelProfile: LevelProfile | null,
): Promise<string> {
  const transcript = history
    .map((turn) => `${turn.role === "user" ? "Learner" : "Character"}: ${turn.text}`)
    .join("\n");
  const profileContext = levelProfile
    ? `\n\nNivel del alumno (de un test anterior): ${levelProfile.level}\nSu debilidad conocida: "${levelProfile.weakness}"\nSu objetivo: "${levelProfile.goal}"`
    : "";
  return callClaude(FEEDBACK_SYSTEM, [
    {
      role: "user",
      content: `Escenario: ${scenarioTitle}\n\nTranscripción:\n${transcript}${profileContext}`,
    },
  ]);
}
