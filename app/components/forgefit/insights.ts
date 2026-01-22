import type { Settings, Template } from "./types";
import { clamp, roundTo } from "./utils";

export function computeInsights({
  template,
  history,
  settings,
}: {
  template: Template | undefined;
  history: Record<string, any[]>;
  settings: Settings;
}) {
  const suggestions: Record<
    string,
    { last: any; next: { weight: number; reps: number }; reason: string }
  > = {};

  for (const ex of template?.exercises || []) {
    if (!ex.autoProgress) continue;

    const h = history[ex.name];
    if (!h || h.length === 0) continue;

    const last = h[0];
    const repMin = ex.repRange?.min ?? 8;
    const repMax = ex.repRange?.max ?? 12;
    const step = ex.weightStep ?? 5;

    const lastW = Number(last.topSet.weight) || 0;
    const lastR = Number(last.topSet.reps) || 0;

    let nextW = lastW;
    let nextR = lastR;
    let reason = "";

    if (settings.strictRepRangeForProgress) {
      if (lastR >= repMax) {
        nextW = roundTo(lastW + step, step);
        nextR = repMin;
        reason = `You hit the top of your rep range (${repMax}). Add ${step} and restart at ${repMin}.`;
      } else {
        nextW = lastW;
        nextR = clamp(lastR + 1, 1, repMax);
        reason = `Stay at ${lastW} and add a rep (working toward ${repMax}).`;
      }
    } else {
      if (lastR < repMax) {
        nextW = lastW;
        nextR = lastR + 1;
        reason = `Add 1 rep at the same weight until you reach ${repMax}.`;
      } else {
        nextW = roundTo(lastW + step, step);
        nextR = repMin;
        reason = `Then add ${step} and cycle back to ${repMin} reps.`;
      }
    }

    suggestions[ex.name] = {
      last,
      next: { weight: nextW, reps: nextR },
      reason,
    };
  }

  return { suggestions };
}
