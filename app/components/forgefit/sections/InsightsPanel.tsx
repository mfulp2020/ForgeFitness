"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dumbbell, Plus, Target, TrendingUp, Trophy } from "lucide-react";
import type { Goal, Units } from "../types";
import { clamp, formatDate } from "../utils";
import { formatGoalValue, formatMetricValue, metricLabel } from "../goal-utils";
import { getCurrentMetric } from "../goal-metrics";
import { PageShell } from "../layout/PageShell";

export function InsightsPanel({
  powerliftingMode,
  big3Stats,
  exerciseHistory,
  goals,
  units,
  onAddGoal,
  onAutoGoals,
  onDoneGoal,
  onArchiveGoal,
}: {
  powerliftingMode: boolean;
  big3Stats: { squat: Stat | null; bench: Stat | null; deadlift: Stat | null };
  exerciseHistory: Record<string, any[]>;
  goals: Goal[];
  units: Units;
  onAddGoal: () => void;
  onAutoGoals: () => void;
  onDoneGoal: (goalId: string) => void;
  onArchiveGoal: (goalId: string) => void;
}) {
  return (
    <PageShell title="Insights" subtitle="Progress, goals, and big lifts.">
      {powerliftingMode ? (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
              <Dumbbell className="h-5 w-5" /> Big 3 1RM
            </CardTitle>
            <CardDescription className="ff-body-sm text-foreground/80">
              Best estimated 1RM from your logged top sets.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                ["Squat", big3Stats.squat],
                ["Bench", big3Stats.bench],
                ["Deadlift", big3Stats.deadlift],
              ] as Array<[string, Stat | null]>
            ).map(([label, data]) => (
              <div key={label} className="rounded-xl border p-3">
                <div className="ff-kicker text-muted-foreground">{label}</div>
                <div className="text-2xl font-display">
                  {data ? Math.round(data.value).toLocaleString() : "—"}
                </div>
                <div className="ff-caption text-muted-foreground">
                  {data ? `${formatDate(data.date)} • ${data.name}` : "Log a top set"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
            <TrendingUp className="h-5 w-5" /> Progress overview
          </CardTitle>
          <CardDescription className="ff-body-sm text-foreground/80">
            Quick glance at strength trends and recent PRs.
          </CardDescription>
        </CardHeader>
        <CardContent className="ff-body-sm text-muted-foreground">
          Log more sessions to populate this area.
        </CardContent>
      </Card>

      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
            <Target className="h-5 w-5" /> Goals
          </CardTitle>
          <CardDescription className="ff-body-sm text-foreground/80">
            Track targets and let ForgeFit propose new ones.
          </CardDescription>
        </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button className="rounded-xl" onClick={onAddGoal}>
                <Plus className="h-4 w-4 mr-2" /> Add goal
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={onAutoGoals}>
                Auto goals
              </Button>
            </div>

            <GoalsPanel
              goals={goals}
              history={exerciseHistory}
              units={units}
              onDone={onDoneGoal}
              onArchive={onArchiveGoal}
            />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

type Stat = { name: string; value: number; date: string };

type GoalRowProps = {
  goal: Goal;
  history: Record<string, any[]>;
  units: Units;
  onDone: null | (() => void);
  onArchive: () => void;
};

type GoalsPanelProps = {
  goals: Goal[];
  history: Record<string, any[]>;
  units: Units;
  onDone: (goalId: string) => void;
  onArchive: (goalId: string) => void;
};

function GoalsPanel({ goals, history, units, onDone, onArchive }: GoalsPanelProps) {
  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "done");

  if (goals.length === 0) {
    return <div className="ff-body-sm text-muted-foreground">No goals yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="font-medium mb-2">Active</div>
        <div className="space-y-2">
          {active.length === 0 ? (
            <div className="ff-body-sm text-muted-foreground">None.</div>
          ) : (
            active.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                history={history}
                units={units}
                onDone={() => onDone(goal.id)}
                onArchive={() => onArchive(goal.id)}
              />
            ))
          )}
        </div>
      </div>

      <div>
        <div className="font-medium mb-2">Completed</div>
        <div className="space-y-2">
          {done.length === 0 ? (
            <div className="ff-body-sm text-muted-foreground">None.</div>
          ) : (
            done.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                history={history}
                units={units}
                onDone={null}
                onArchive={() => onArchive(goal.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function GoalRow({ goal, history, units, onDone, onArchive }: GoalRowProps) {
  const cur = getCurrentMetric(goal, history);
  const pct = goal.targetValue > 0 ? clamp((cur / goal.targetValue) * 100, 0, 200) : 0;
  const isDone = goal.status === "done";

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{goal.exerciseName}</div>
          <div className="ff-body-sm text-muted-foreground">
            {metricLabel(goal.metric, units)} → Target {formatGoalValue(goal, units)}
            {goal.dueDateISO ? ` • Due ${formatDate(goal.dueDateISO)}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDone ? (
            <Button size="sm" className="rounded-xl" onClick={onDone}>
              Done
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="rounded-xl" onClick={onArchive}>
            Archive
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between ff-caption text-muted-foreground">
          <span>Current: {formatMetricValue(goal.metric, cur, units)}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${clamp(pct, 0, 100)}%` }} />
        </div>
        {isDone ? (
          <div className="ff-caption text-muted-foreground mt-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Completed
          </div>
        ) : null}
      </div>
    </div>
  );
}
