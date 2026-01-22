import type { Goal } from "./types";

export function getCurrentMetric(goal: Goal, history: Record<string, any[]>) {
  const records = history?.[goal.exerciseName] || [];
  if (records.length === 0) return 0;

  if (goal.metric === "e1rm" || goal.metric === "top_set_weight") {
    const best = records.reduce((max, rec) => Math.max(max, rec.topE1RM || 0), 0);
    return best;
  }

  if (goal.metric === "volume") {
    const best = records.reduce((max, rec) => Math.max(max, rec.volume || 0), 0);
    return best;
  }

  return 0;
}
