import type { Session } from "./types";
import { calcEntryTopE1RM, calcEntryVolume, calcTopSet } from "./log-helpers";
import { roundTo } from "./utils";

export type ExerciseHistoryRecord = {
  dateISO: string;
  templateName?: string;
  topSet: { weight: number; reps: number };
  topE1RM: number;
  volume: number;
};

export function buildExerciseHistory(sessions: Session[]) {
  const map: Record<string, ExerciseHistoryRecord[]> = {};

  for (const session of sessions || []) {
    for (const entry of session.entries || []) {
      const name = entry.exerciseName;
      const topSet = calcTopSet(entry);
      const volume = calcEntryVolume(entry);

      const record: ExerciseHistoryRecord = {
        dateISO: session.dateISO,
        templateName: session.templateName,
        topSet,
        topE1RM: calcEntryTopE1RM(entry),
        volume,
      };

      map[name] = map[name] ? [record, ...map[name]] : [record];
    }
  }

  for (const key of Object.keys(map)) {
    map[key] = map[key].sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  }

  return map;
}

export function computeSimpleTrend(values: number[]) {
  if (!values || values.length < 2) {
    return { label: "Not enough data", delta: 0 };
  }
  const oldest = values[values.length - 1];
  const newest = values[0];
  const delta = newest - oldest;
  const label = delta > 1e-6 ? "Up" : delta < -1e-6 ? "Down" : "Flat";
  return { label, delta: roundTo(delta, 0.5) };
}
