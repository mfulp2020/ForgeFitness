import { formatNumber } from "./utils";
import type { Goal, GoalMetric, Units } from "./types";

export function metricLabel(metric: GoalMetric, units: Units) {
  if (metric === "e1rm") return `Estimated 1RM (${units})`;
  if (metric === "top_set_weight") return `Top set weight (${units})`;
  if (metric === "volume") return `Session volume (${units}×reps)`;
  return "Metric";
}

export function formatMetricValue(metric: GoalMetric, value: number, units: Units) {
  if (metric === "volume") return `${formatNumber(value)} ${units}×reps`;
  return `${formatNumber(value)} ${units}`;
}

export function formatGoalValue(goal: Goal, units: Units) {
  if (goal.metric === "volume") return `${formatNumber(goal.targetValue)} ${units}×reps`;
  return `${formatNumber(goal.targetValue)} ${units}`;
}
