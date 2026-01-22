"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { Units, WorkingEntry, SetType } from "../types";
import { SUPERSET_TAGS, formatNumber, formatRepRange } from "../utils";
import { calcEntryTopE1RM, calcEntryVolume } from "../log-helpers";

export function ExerciseLogger({
  entry,
  onChange,
  units,
  suggestion,
  index,
  variant = "card",
}: {
  entry: WorkingEntry;
  onChange: (next: WorkingEntry) => void;
  units: Units;
  suggestion?: { next?: { weight: number; reps: number }; reason: string };
  index: number;
  variant?: "card" | "plain";
}) {
  const templateHint = entry?.templateHint;
  const [dismissed, setDismissed] = useState(false);
  const canSuperset =
    templateHint?.timeUnit !== "seconds" &&
    templateHint?.timeUnit !== "minutes" &&
    templateHint?.setType !== "dropset";
  const currentPairingType =
    templateHint?.setType === "superset" ||
    templateHint?.setType === "triset" ||
    templateHint?.setType === "circuit"
      ? templateHint?.setType
      : "off";
  const currentSupersetTag =
    templateHint?.setType === "superset" ||
    templateHint?.setType === "triset" ||
    templateHint?.setType === "circuit"
      ? templateHint?.supersetTag || "A"
      : "A";
  const repsLabel =
    templateHint?.timeUnit === "seconds"
      ? "Seconds"
      : templateHint?.timeUnit === "minutes"
      ? "Minutes"
      : "Reps";

  const header = (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="opacity-70">{index + 1}.</span> {entry.exerciseName}
        </CardTitle>
        <CardDescription>
          {templateHint ? (
            <span>
              Target: {templateHint.defaultSets} sets • {formatRepRange(templateHint.repRange)}{" "}
              {templateHint.timeUnit === "seconds"
                ? "sec"
                : templateHint.timeUnit === "minutes"
                ? "min"
                : "reps"}{" "}
              • Rest {Math.round(templateHint.restSec / 60)} min
              {templateHint.setType === "superset"
                ? ` • Superset ${templateHint.supersetTag || ""}`.trim()
                : templateHint.setType === "triset"
                ? ` • Triset ${templateHint.supersetTag || ""}`.trim()
                : templateHint.setType === "circuit"
                ? ` • Circuit ${templateHint.supersetTag || ""}`.trim()
                : templateHint.setType === "dropset"
                ? " • Dropset"
                : ""}
            </span>
          ) : (
            ""
          )}
        </CardDescription>
      </div>

      <div className="text-left sm:text-right space-y-2">
        {canSuperset ? (
          <div className="flex items-center justify-start sm:justify-end gap-2">
            <span className="ff-caption text-muted-foreground">Pairing</span>
            <Select
              value={currentPairingType}
              onValueChange={(v) => {
                if (v === "off") {
                  onChange({
                    ...entry,
                    templateHint: {
                      ...(entry.templateHint || {
                        defaultSets: 3,
                        repRange: { min: 8, max: 12 },
                        restSec: 120,
                        weightStep: 5,
                        autoProgress: true,
                      }),
                      setType: "normal",
                      supersetTag: "",
                    },
                    sets: entry.sets.map((s) => ({ ...s, setType: "normal", supersetTag: "" })),
                  });
                  return;
                }

                onChange({
                  ...entry,
                  templateHint: {
                    ...(entry.templateHint || {
                      defaultSets: 3,
                      repRange: { min: 8, max: 12 },
                      restSec: 120,
                      weightStep: 5,
                      autoProgress: true,
                    }),
                    setType: v as SetType,
                    supersetTag: currentSupersetTag,
                  },
                  sets: entry.sets.map((s) => ({
                    ...s,
                    setType: v as SetType,
                    supersetTag: currentSupersetTag,
                  })),
                });
              }}
            >
              <SelectTrigger className="h-8 w-[96px] rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off</SelectItem>
                <SelectItem value="superset">Superset</SelectItem>
                <SelectItem value="triset">Triset</SelectItem>
                <SelectItem value="circuit">Circuit</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={currentSupersetTag}
              onValueChange={(v) => {
                onChange({
                  ...entry,
                  templateHint: {
                    ...(entry.templateHint || {
                      defaultSets: 3,
                      repRange: { min: 8, max: 12 },
                      restSec: 120,
                      weightStep: 5,
                      autoProgress: true,
                    }),
                    setType: currentPairingType === "off" ? "superset" : (currentPairingType as SetType),
                    supersetTag: v,
                  },
                  sets: entry.sets.map((s) => ({
                    ...s,
                    setType: currentPairingType === "off" ? "superset" : (currentPairingType as SetType),
                    supersetTag: v,
                  })),
                });
              }}
            >
              <SelectTrigger className="h-8 w-[64px] rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPERSET_TAGS.map((tag) => (
                  <SelectItem key={tag} value={tag}>
                    {tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {suggestion?.next && !dismissed ? (
          <div className="text-right">
            <Badge variant="secondary" className="rounded-xl">
              Coach suggests: {suggestion.next.weight}
              {units} × {suggestion.next.reps}
            </Badge>
            <div className="ff-caption text-muted-foreground mt-1 max-w-[240px]">
              {suggestion.reason}
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  const first = entry.sets[0];
                  if (!first) return;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((s, i) =>
                      i === 0
                        ? {
                            ...s,
                            weight: String(suggestion.next!.weight),
                            reps: String(suggestion.next!.reps),
                          }
                        : s
                    ),
                  });
                }}
              >
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setDismissed(true)}
              >
                Not today
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const content = (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-12 gap-2 ff-caption text-muted-foreground px-1">
        <div className="col-span-1">Set</div>
        <div className="col-span-2">Weight ({units})</div>
        <div className="col-span-2">{repsLabel}</div>
        <div className="col-span-2">RPE</div>
        <div className="col-span-3">Type</div>
        <div className="col-span-2"></div>
      </div>

      {entry.sets.map((s, i) => (
        <div key={i}>
          <div className="hidden sm:grid group grid-cols-12 gap-2 items-center">
            <div className="col-span-1 text-sm font-medium">{i + 1}</div>

            <div className="col-span-2">
              <Input
                className="w-full"
                inputMode="decimal"
                value={s.weight}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, weight: v } : x)),
                  });
                }}
                placeholder="0"
              />
            </div>

            <div className="col-span-2">
              <Input
                className="w-full"
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, reps: v } : x)),
                  });
                }}
                placeholder="0"
              />
            </div>

            <div className="col-span-2">
              <Input
                className="w-full"
                inputMode="decimal"
                value={s.rpe}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, rpe: v } : x)),
                  });
                }}
                placeholder=""
              />
            </div>

            <div className="col-span-3">
              <div className="flex items-center gap-2">
                <Select
                  value={s.setType || "normal"}
                  onValueChange={(v) =>
                    onChange({
                      ...entry,
                      templateHint: {
                        ...(entry.templateHint || {
                          defaultSets: 3,
                          repRange: { min: 8, max: 12 },
                          restSec: 120,
                          weightStep: 5,
                          autoProgress: true,
                        }),
                        setType: v as SetType,
                        supersetTag:
                          v === "superset" || v === "triset" || v === "circuit"
                            ? entry.templateHint?.supersetTag || "A"
                            : "",
                      },
                      sets: entry.sets.map((x, xi) =>
                        xi === i
                          ? {
                              ...x,
                              setType: v as SetType,
                              supersetTag:
                                v === "superset" || v === "triset" || v === "circuit"
                                  ? entry.templateHint?.supersetTag || "A"
                                  : "",
                            }
                          : x
                      ),
                    })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="dropset">Dropset</SelectItem>
                    <SelectItem value="superset">Superset</SelectItem>
                    <SelectItem value="triset">Triset</SelectItem>
                    <SelectItem value="circuit">Circuit</SelectItem>
                  </SelectContent>
                </Select>
                {s.setType === "superset" || s.setType === "triset" || s.setType === "circuit" ? (
                  <Input
                    className="w-16"
                    value={s.supersetTag || entry.templateHint?.supersetTag || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange({
                        ...entry,
                        sets: entry.sets.map((x, xi) =>
                          xi === i ? { ...x, supersetTag: v } : x
                        ),
                      });
                    }}
                    placeholder={entry.templateHint?.supersetTag || "A"}
                  />
                ) : null}
              </div>
            </div>

            <div className="col-span-2 flex items-center justify-end gap-2">
              <Button
                size="icon"
                variant="outline"
                className="opacity-0 group-hover:opacity-100 transition"
                onClick={() => {
                  onChange({
                    ...entry,
                    sets: entry.sets.filter((_, xi) => xi !== i),
                  });
                }}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="col-span-12">
              <Input
                className="w-full"
                value={s.notes || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, notes: v } : x)),
                  });
                }}
                placeholder="Notes (optional)"
              />
            </div>
          </div>

          <div className="sm:hidden rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Set {i + 1}</div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => {
                  onChange({
                    ...entry,
                    sets: entry.sets.filter((_, xi) => xi !== i),
                  });
                }}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                inputMode="decimal"
                value={s.weight}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, weight: v } : x)),
                  });
                }}
                placeholder={`Weight (${units})`}
              />
              <Input
                inputMode="numeric"
                value={s.reps}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, reps: v } : x)),
                  });
                }}
                placeholder={repsLabel}
              />
              <Input
                className="col-span-2"
                inputMode="decimal"
                value={s.rpe}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, rpe: v } : x)),
                  });
                }}
                placeholder="RPE"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={s.setType || "normal"}
                onValueChange={(v) =>
                  onChange({
                    ...entry,
                    templateHint: {
                      ...(entry.templateHint || {
                        defaultSets: 3,
                        repRange: { min: 8, max: 12 },
                        restSec: 120,
                        weightStep: 5,
                        autoProgress: true,
                      }),
                      setType: v as SetType,
                      supersetTag:
                        v === "superset" || v === "triset" || v === "circuit"
                          ? entry.templateHint?.supersetTag || "A"
                          : "",
                    },
                    sets: entry.sets.map((x, xi) =>
                      xi === i
                        ? {
                            ...x,
                            setType: v as SetType,
                            supersetTag:
                              v === "superset" || v === "triset" || v === "circuit"
                                ? entry.templateHint?.supersetTag || "A"
                                : "",
                          }
                        : x
                    ),
                  })
                }
              >
                <SelectTrigger className="h-9 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="dropset">Dropset</SelectItem>
                  <SelectItem value="superset">Superset</SelectItem>
                  <SelectItem value="triset">Triset</SelectItem>
                  <SelectItem value="circuit">Circuit</SelectItem>
                </SelectContent>
              </Select>
              {s.setType === "superset" || s.setType === "triset" || s.setType === "circuit" ? (
                <Input
                  className="w-16"
                  value={s.supersetTag || entry.templateHint?.supersetTag || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) =>
                        xi === i ? { ...x, supersetTag: v } : x
                      ),
                    });
                  }}
                  placeholder={entry.templateHint?.supersetTag || "A"}
                />
              ) : null}
            </div>
            <Input
              value={s.notes || ""}
              onChange={(e) => {
                const v = e.target.value;
                onChange({
                  ...entry,
                  sets: entry.sets.map((x, xi) => (xi === i ? { ...x, notes: v } : x)),
                });
              }}
              placeholder="Notes (optional)"
            />
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          className="rounded-2xl"
          onClick={() =>
            onChange({
              ...entry,
              sets: [
                ...entry.sets,
                { reps: "", weight: "", rpe: "", notes: "", setType: "normal", supersetTag: "" },
              ],
            })
          }
        >
          <Plus className="h-4 w-4 mr-2" /> Add set
        </Button>

        <div className="ff-caption text-muted-foreground text-right">
          <div>Top set e1RM: {formatNumber(calcEntryTopE1RM(entry as any))}</div>
          <div>Session volume: {formatNumber(calcEntryVolume(entry as any))}</div>
        </div>
      </div>
    </div>
  );

  if (variant === "plain") {
    return (
      <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
        <div className="pb-2">{header}</div>
        {content}
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">{header}</CardHeader>
      <CardContent className="space-y-3">{content}</CardContent>
    </Card>
  );
}

export function SupersetLogger({
  entries,
  units,
  suggestions,
  onChange,
}: {
  entries: [WorkingEntry, WorkingEntry];
  units: Units;
  suggestions: Record<string, { next?: { weight: number; reps: number }; reason: string }>;
  onChange: (id: string, next: WorkingEntry) => void;
}) {
  const [a, b] = entries;
  const maxSets = Math.max(a.sets.length, b.sets.length, 1);
  const displayA = "A";
  const displayB = "B";

  const updateSet = (entry: WorkingEntry, idx: number, patch: Partial<typeof entry.sets[number]>) => {
    const nextSets = [...entry.sets];
    while (nextSets.length <= idx) {
      nextSets.push({ reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: entry.templateHint?.supersetTag || "" });
    }
    nextSets[idx] = { ...nextSets[idx], ...patch, setType: "superset", supersetTag: entry.templateHint?.supersetTag || "" };
    onChange(entry.exerciseId, { ...entry, sets: nextSets });
  };

  const removeSet = (idx: number) => {
    onChange(a.exerciseId, { ...a, sets: a.sets.filter((_, i) => i !== idx) });
    onChange(b.exerciseId, { ...b, sets: b.sets.filter((_, i) => i !== idx) });
  };

  const addSet = () => {
    onChange(a.exerciseId, {
      ...a,
      sets: [...a.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: a.templateHint?.supersetTag || "" }],
    });
    onChange(b.exerciseId, {
      ...b,
      sets: [...b.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: b.templateHint?.supersetTag || "" }],
    });
  };

  const renderExercise = (label: string, entry: WorkingEntry, set: any, idx: number) => (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-foreground">
          {label}
        </span>
        <div className="text-sm font-semibold">{entry.exerciseName}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input
          inputMode="decimal"
          value={set.weight}
          onChange={(e) => updateSet(entry, idx, { weight: e.target.value })}
          placeholder={`Wt (${units})`}
        />
        <Input
          inputMode="numeric"
          value={set.reps}
          onChange={(e) => updateSet(entry, idx, { reps: e.target.value })}
          placeholder="Reps"
        />
        <Input
          className="col-span-2 sm:col-span-1"
          inputMode="decimal"
          value={set.rpe}
          onChange={(e) => updateSet(entry, idx, { rpe: e.target.value })}
          placeholder="RPE"
        />
      </div>
      <Input
        className="mt-2"
        value={set.notes || ""}
        onChange={(e) => updateSet(entry, idx, { notes: e.target.value })}
        placeholder={`Notes (${label})`}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {Array.from({ length: maxSets }).map((_, i) => {
        const setA = a.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setB = b.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        return (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Set {i + 1}</div>
              <div className="ff-caption text-muted-foreground">Order: {displayA} -&gt; {displayB}</div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => removeSet(i)}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {renderExercise(displayA, a, setA, i)}
              {renderExercise(displayB, b, setB, i)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-2xl" onClick={addSet}>
          <Plus className="h-4 w-4 mr-2" /> Add superset set
        </Button>
        <div className="ff-caption text-muted-foreground">
          {suggestions?.[a.exerciseName]?.reason || suggestions?.[b.exerciseName]?.reason || ""}
        </div>
      </div>
    </div>
  );
}

export function TrisetLogger({
  entries,
  units,
  suggestions,
  onChange,
}: {
  entries: [WorkingEntry, WorkingEntry, WorkingEntry];
  units: Units;
  suggestions: Record<string, { next?: { weight: number; reps: number }; reason: string }>;
  onChange: (id: string, next: WorkingEntry) => void;
}) {
  const [a, b, c] = entries;
  const maxSets = Math.max(a.sets.length, b.sets.length, c.sets.length, 1);

  const updateSet = (entry: WorkingEntry, idx: number, patch: Partial<typeof entry.sets[number]>) => {
    const nextSets = [...entry.sets];
    while (nextSets.length <= idx) {
      nextSets.push({ reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: entry.templateHint?.supersetTag || "" });
    }
    nextSets[idx] = { ...nextSets[idx], ...patch, setType: "triset", supersetTag: entry.templateHint?.supersetTag || "" };
    onChange(entry.exerciseId, { ...entry, sets: nextSets });
  };

  const removeSet = (idx: number) => {
    onChange(a.exerciseId, { ...a, sets: a.sets.filter((_, i) => i !== idx) });
    onChange(b.exerciseId, { ...b, sets: b.sets.filter((_, i) => i !== idx) });
    onChange(c.exerciseId, { ...c, sets: c.sets.filter((_, i) => i !== idx) });
  };

  const addSet = () => {
    onChange(a.exerciseId, {
      ...a,
      sets: [...a.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: a.templateHint?.supersetTag || "" }],
    });
    onChange(b.exerciseId, {
      ...b,
      sets: [...b.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: b.templateHint?.supersetTag || "" }],
    });
    onChange(c.exerciseId, {
      ...c,
      sets: [...c.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: c.templateHint?.supersetTag || "" }],
    });
  };

  const renderBlock = (label: string, entry: WorkingEntry, set: any, idx: number) => (
    <div className="rounded-lg border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-foreground">
          {label}
        </span>
        <div className="text-sm font-semibold">{entry.exerciseName}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input
          inputMode="decimal"
          value={set.weight}
          onChange={(e) => updateSet(entry, idx, { weight: e.target.value })}
          placeholder={`Wt (${units})`}
        />
        <Input
          inputMode="numeric"
          value={set.reps}
          onChange={(e) => updateSet(entry, idx, { reps: e.target.value })}
          placeholder="Reps"
        />
        <Input
          className="col-span-2 sm:col-span-1"
          inputMode="decimal"
          value={set.rpe}
          onChange={(e) => updateSet(entry, idx, { rpe: e.target.value })}
          placeholder="RPE"
        />
      </div>
      <Input
        className="mt-2"
        value={set.notes || ""}
        onChange={(e) => updateSet(entry, idx, { notes: e.target.value })}
        placeholder={`Notes (${label})`}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {Array.from({ length: maxSets }).map((_, i) => {
        const setA = a.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setB = b.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setC = c.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        return (
          <div key={i} className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Set {i + 1}</div>
              <div className="ff-caption text-muted-foreground">Order: A -&gt; B -&gt; C</div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => removeSet(i)}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {renderBlock("A", a, setA, i)}
              {renderBlock("B", b, setB, i)}
              {renderBlock("C", c, setC, i)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-2xl" onClick={addSet}>
          <Plus className="h-4 w-4 mr-2" /> Add triset set
        </Button>
        <div className="ff-caption text-muted-foreground">
          {suggestions?.[a.exerciseName]?.reason ||
            suggestions?.[b.exerciseName]?.reason ||
            suggestions?.[c.exerciseName]?.reason ||
            ""}
        </div>
      </div>
    </div>
  );
}
