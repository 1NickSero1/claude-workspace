export type Difficulty = "basico" | "intermedio" | "avanzado";

export type Scenario = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  systemPrompt: string;
};

export type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
};

export type SessionRecord = {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  date: string;
  turnCount: number;
  feedback: string;
};

export type ProgressData = {
  streak: number;
  lastPracticeDate: string | null;
  scenariosCompleted: string[];
  sessions: SessionRecord[];
};
