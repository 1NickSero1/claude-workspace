import type { ProgressData, SessionRecord } from "../types";

type LastResult = {
  session: SessionRecord;
  progress: ProgressData;
};

let lastResult: LastResult | null = null;

export function setLastSessionResult(result: LastResult): void {
  lastResult = result;
}

export function getLastSessionResult(): LastResult | null {
  return lastResult;
}
