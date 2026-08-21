import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ProgressData, SessionRecord } from "../types";

const STORAGE_KEY = "@talking/progress";

const EMPTY_PROGRESS: ProgressData = {
  streak: 0,
  lastPracticeDate: null,
  scenariosCompleted: [],
  sessions: [],
};

function todayLocalDate(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function isYesterday(dateStr: string, todayStr: string): boolean {
  const date = new Date(`${dateStr}T00:00:00`);
  const today = new Date(`${todayStr}T00:00:00`);
  const diffDays = Math.round((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export async function getProgress(): Promise<ProgressData> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...EMPTY_PROGRESS };
  try {
    return { ...EMPTY_PROGRESS, ...JSON.parse(raw) };
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

async function saveProgress(data: ProgressData): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function recordSession(session: SessionRecord): Promise<ProgressData> {
  const progress = await getProgress();
  const today = todayLocalDate();

  let streak = progress.streak;
  if (progress.lastPracticeDate === today) {
    // ya practicó hoy, la racha no cambia
  } else if (progress.lastPracticeDate && isYesterday(progress.lastPracticeDate, today)) {
    streak += 1;
  } else {
    streak = 1;
  }

  const scenariosCompleted = progress.scenariosCompleted.includes(session.scenarioId)
    ? progress.scenariosCompleted
    : [...progress.scenariosCompleted, session.scenarioId];

  const updated: ProgressData = {
    streak,
    lastPracticeDate: today,
    scenariosCompleted,
    sessions: [session, ...progress.sessions].slice(0, 50),
  };

  await saveProgress(updated);
  return updated;
}
