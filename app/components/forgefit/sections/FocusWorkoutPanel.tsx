import React from "react";

import { Button } from "@/components/ui/button";

export function FocusWorkoutPanel({ ctx }: { ctx: any }) {
  const {
    gymStepIndex,
    gymSteps,
    currentGymEntry,
    currentGymSet,
    sessionProgress,
    restPresetSec,
    restRunning,
    restSeconds,
    setRestRunning,
    setRestSeconds,
    setAutoAdvanceAfterRest,
    updateGymSet,
    addGymSet,
    setGymStepIndex,
    setRestPresetSec,
    formatRepRange,
    lastLoggedSetByExercise,
    lastWorkoutByExercise,
    insights,
    formatDecimal,
    formatNumber,
    toNumber,
    setWorkingEntries,
    state,
  } = ctx;

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full rounded-3xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] shadow-[0_18px_40px_rgba(0,0,0,0.22)] overflow-hidden">
        <div className="h-full p-4 flex flex-col">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="ff-kicker text-muted-foreground">
                Set {gymStepIndex + 1} of {Math.max(gymSteps.length, 1)}
              </div>
              <div className="ff-h2 truncate">
                {currentGymEntry?.exerciseName || "No set selected"}
              </div>
              {currentGymEntry?.templateHint ? (
                <div className="ff-body-sm text-muted-foreground">
                  Target {formatRepRange(currentGymEntry.templateHint.repRange)}{" "}
                  {currentGymEntry.templateHint.timeUnit === "seconds"
                    ? "sec"
                    : currentGymEntry.templateHint.timeUnit === "minutes"
                      ? "min"
                      : "reps"}{" "}
                  • Rest {Math.round(((restPresetSec || currentGymEntry.templateHint.restSec) || 0) / 60)} min
                </div>
              ) : null}
            </div>
            <div className="text-right">
              <div className="ff-kicker text-muted-foreground">
                Progress
              </div>
              <div className="ff-h3">
                {sessionProgress.completed}/{sessionProgress.planned}
              </div>
            </div>
          </div>

          <div className="mt-4 flex-1 flex flex-col justify-between gap-4 overflow-hidden">
            {restRunning ? (
              <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="ff-kicker text-muted-foreground">
                  Rest
                </div>
                <div className="mt-2 ff-h1">
                  {String(Math.floor(restSeconds / 60)).padStart(2, "0")}:
                  {String(restSeconds % 60).padStart(2, "0")}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="secondary"
                    className="rounded-2xl"
                    onClick={() => setRestRunning((v: boolean) => !v)}
                  >
                    {restRunning ? "Pause" : "Start"}
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => {
                      setRestRunning(false);
                      setRestSeconds(0);
                      setAutoAdvanceAfterRest(false);
                    }}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {currentGymEntry?.templateHint?.timeUnit ? null : (
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
                    {(() => {
                      const last = currentGymEntry
                        ? lastLoggedSetByExercise.get(currentGymEntry.exerciseName)
                        : undefined;
                      const lastWorkout = currentGymEntry
                        ? lastWorkoutByExercise.get(currentGymEntry.exerciseName)
                        : undefined;
                      const suggested = currentGymEntry
                        ? insights.suggestions?.[currentGymEntry.exerciseName]?.next
                        : undefined;
                      return last || lastWorkout || (suggested?.weight && suggested?.reps) ? (
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {last ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() =>
                                updateGymSet({
                                  weight: formatDecimal(last.weight, 1),
                                  reps: String(last.reps),
                                })
                              }
                            >
                              Use last ({formatNumber(last.weight)}×{last.reps})
                            </Button>
                          ) : null}
                          {lastWorkout ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => {
                                if (!currentGymEntry) return;
                                const setsToApply = lastWorkout.sets;

                                setWorkingEntries((prev: any[]) =>
                                  prev.map((entry: any) => {
                                    const setType = currentGymEntry.templateHint?.setType;
                                    const supersetTag = currentGymEntry.templateHint?.supersetTag;

                                    const isGrouped =
                                      setType === "superset" ||
                                      setType === "triset" ||
                                      setType === "circuit";
                                    const shouldApply = isGrouped
                                      ? entry.templateHint?.setType === setType &&
                                        entry.templateHint?.supersetTag === supersetTag
                                      : entry.exerciseId === currentGymEntry.exerciseId;

                                    if (!shouldApply) return entry;

                                    const nextSets = [...entry.sets];
                                    while (nextSets.length < setsToApply.length) {
                                      nextSets.push({
                                        reps: "",
                                        weight: "",
                                        rpe: "",
                                        notes: "",
                                        setType: entry.templateHint?.setType || "normal",
                                        supersetTag: entry.templateHint?.supersetTag || "",
                                      });
                                    }

                                    const count = Math.min(nextSets.length, setsToApply.length);

                                    for (let i = 0; i < count; i += 1) {
                                      const existing = nextSets[i];
                                      const repsFilled = (existing?.reps || "").trim().length > 0;
                                      const weightFilled =
                                        (existing?.weight || "").trim().length > 0;
                                      if (repsFilled || weightFilled) continue;

                                      nextSets[i] = {
                                        ...existing,
                                        reps: String(setsToApply[i].reps),
                                        weight: formatDecimal(setsToApply[i].weight, 1),
                                        rpe:
                                          typeof setsToApply[i].rpe === "number" &&
                                          Number.isFinite(setsToApply[i].rpe)
                                            ? formatDecimal(setsToApply[i].rpe as number, 1)
                                            : existing?.rpe,
                                      };
                                    }

                                    return { ...entry, sets: nextSets };
                                  })
                                );
                              }}
                            >
                              Use last workout
                            </Button>
                          ) : null}
                          {suggested?.weight && suggested?.reps ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() =>
                                updateGymSet({
                                  weight: formatDecimal(suggested.weight, 1),
                                  reps: String(suggested.reps),
                                })
                              }
                            >
                              Use suggested ({formatNumber(suggested.weight)}×{suggested.reps})
                            </Button>
                          ) : null}
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center justify-between gap-3">
                      <div className="ff-kicker text-muted-foreground">
                        Weight ({state.settings.units})
                      </div>
                      <div className="text-lg font-display">
                        {formatNumber(toNumber(currentGymSet?.weight || ""))}
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          const step =
                            currentGymEntry?.templateHint?.weightStep ??
                            (state.settings.units === "kg" ? 2.5 : 5);
                          const next =
                            Math.max(0, toNumber(currentGymSet?.weight || "") - step);
                          updateGymSet({ weight: formatDecimal(next, 1) });
                        }}
                      >
                        −
                      </Button>
                      <Button
                        variant="secondary"
                        className="rounded-2xl"
                        onClick={() => {
                          const step =
                            currentGymEntry?.templateHint?.weightStep ??
                            (state.settings.units === "kg" ? 2.5 : 5);
                          const next = toNumber(currentGymSet?.weight || "") + step;
                          updateGymSet({ weight: formatDecimal(next, 1) });
                        }}
                      >
                        +
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => updateGymSet({ weight: "" })}
                      >
                        Clear
                      </Button>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {[1, 5, 10, 20].map((mult) => {
                        const step =
                          currentGymEntry?.templateHint?.weightStep ??
                          (state.settings.units === "kg" ? 2.5 : 5);
                        const delta = step * mult;
                        return (
                          <Button
                            key={mult}
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              const next =
                                toNumber(currentGymSet?.weight || "") + delta;
                              updateGymSet({ weight: formatDecimal(next, 1) });
                            }}
                          >
                            +{formatDecimal(delta, 1)}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ff-kicker text-muted-foreground">
                      {currentGymEntry?.templateHint?.timeUnit === "seconds"
                        ? "Seconds"
                        : currentGymEntry?.templateHint?.timeUnit === "minutes"
                          ? "Minutes"
                          : "Reps"}
                    </div>
                    <div className="text-lg font-display">
                      {Math.max(
                        0,
                        Math.round(toNumber(currentGymSet?.reps || ""))
                      ) || "0"}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        const step = currentGymEntry?.templateHint?.timeUnit ? 5 : 1;
                        const next = Math.max(
                          0,
                          Math.round(toNumber(currentGymSet?.reps || "")) - step
                        );
                        updateGymSet({ reps: String(next) });
                      }}
                    >
                      −
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-2xl"
                      onClick={() => {
                        const step = currentGymEntry?.templateHint?.timeUnit ? 5 : 1;
                        const next = Math.max(
                          0,
                          Math.round(toNumber(currentGymSet?.reps || "")) + step
                        );
                        updateGymSet({ reps: String(next) });
                      }}
                    >
                      +
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => updateGymSet({ reps: "" })}
                    >
                      Clear
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="ff-kicker text-muted-foreground">
                      RPE
                    </div>
                    <div className="text-lg font-display">
                      {currentGymSet?.rpe?.trim() ? currentGymSet.rpe : "—"}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        const next =
                          Math.max(0, toNumber(currentGymSet?.rpe || "") - 0.5);
                        updateGymSet({ rpe: next ? formatDecimal(next, 1) : "" });
                      }}
                    >
                      −0.5
                    </Button>
                    <input
                      aria-label="RPE"
                      className="w-full"
                      type="range"
                      min={6}
                      max={10}
                      step={0.5}
                      value={Math.min(
                        10,
                        Math.max(6, toNumber(currentGymSet?.rpe || "8"))
                      )}
                      onChange={(e) =>
                        updateGymSet({ rpe: formatDecimal(Number(e.target.value), 1) })
                      }
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        const next =
                          Math.min(10, toNumber(currentGymSet?.rpe || "") + 0.5);
                        updateGymSet({ rpe: formatDecimal(next, 1) });
                      }}
                    >
                      +0.5
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap ff-caption text-muted-foreground">
              <span className="shrink-0">Rest</span>
              <Button
                size="sm"
                variant={restPresetSec === 0 ? "secondary" : "outline"}
                className="rounded-xl shrink-0"
                onClick={() => setRestPresetSec(0)}
              >
                Target
              </Button>
              {[60, 90, 120, 180].map((sec) => (
                <Button
                  key={sec}
                  size="sm"
                  variant={restPresetSec === sec ? "secondary" : "outline"}
                  className="rounded-xl shrink-0"
                  onClick={() => setRestPresetSec(sec)}
                >
                  {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
                </Button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => setGymStepIndex((i: number) => Math.max(0, i - 1))}
              >
                Prev
              </Button>
              <Button
                className="rounded-2xl flex-1"
                onClick={() => {
                  const restFromTemplate = currentGymEntry?.templateHint?.restSec ?? 0;
                  const nextRest = restPresetSec || restFromTemplate || 0;
                  setRestSeconds(nextRest);
                  setRestRunning(nextRest > 0);
                  setAutoAdvanceAfterRest(true);
                  if (nextRest <= 0) {
                    setGymStepIndex((i: number) =>
                      Math.min(Math.max(gymSteps.length - 1, 0), i + 1)
                    );
                  }
                }}
              >
                Complete set
              </Button>
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={addGymSet}
              >
                Add
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
