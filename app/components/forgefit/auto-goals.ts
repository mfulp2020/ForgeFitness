import type { Goal, Settings } from "./types";
import { clamp, roundTo } from "./utils";

export function buildAutoGoals({
  history,
  settings,
}: {
  history: Record<string, any[]>;
  settings: Settings;
}) {
  const horizonWeeks = clamp(Number(settings.autoGoalHorizonWeeks) || 6, 2, 24);
  const goals: Array<Omit<Goal, "id" | "status">> = [];

  for (const [name, items] of Object.entries(history || {})) {
    if (!items || items.length < 3) continue;
    const window = items.slice(0, 6);
    const newest = window[0];
    const oldest = window[window.length - 1];

    const newestDate = new Date(newest.dateISO);
    const oldestDate = new Date(oldest.dateISO);
    const days = Math.max(
      7,
      Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const weeks = days / 7;

    const delta = newest.topE1RM - oldest.topE1RM;
    const perWeek = delta / weeks;

    const base = Math.max(...window.map((x) => x.topE1RM));
    let projected = base + perWeek * horizonWeeks;

    const minPct = 0.02;
    const maxPct = 0.1;
    const pct = clamp(projected / (base || 1) - 1, minPct, maxPct);
    projected = base * (1 + pct);

    projected = roundTo(projected, 0.5);

    const due = new Date();
    due.setDate(due.getDate() + horizonWeeks * 7);

    goals.push({
      exerciseName: name,
      metric: "e1rm",
      targetValue: projected,
      dueDateISO: due.toISOString().slice(0, 10),
    });
  }

  goals.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  return goals;
}
