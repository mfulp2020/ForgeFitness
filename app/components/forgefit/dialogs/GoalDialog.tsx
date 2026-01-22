import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { metricLabel } from "../goal-utils";
import type { Goal, GoalMetric, Units } from "../types";

export function GoalDialog({
  open,
  onOpenChange,
  units,
  existingExercises,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: Units;
  existingExercises: string[];
  onAdd: (g: Omit<Goal, "id" | "status">) => void;
}) {
  const [exerciseName, setExerciseName] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("e1rm");
  const [targetValue, setTargetValue] = useState("");
  const [dueDateISO, setDueDateISO] = useState("");

  useEffect(() => {
    if (!open) return;
    setExerciseName(existingExercises?.[0] || "");
    setMetric("e1rm");
    setTargetValue("");
    setDueDateISO("");
  }, [open, existingExercises]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a goal</DialogTitle>
          <DialogDescription>
            Choose an exercise and a metric. Example: Bench e1RM → 225.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Input value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="Bench Press" />
            {existingExercises?.length ? (
              <div className="flex flex-wrap gap-2">
                {existingExercises.slice(0, 8).map((x) => (
                  <button
                    key={x}
                    type="button"
                    onClick={() => setExerciseName(x)}
                    className="ff-caption rounded-xl border px-2 py-1 hover:bg-muted"
                  >
                    {x}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="e1rm">Estimated 1RM (e1RM)</SelectItem>
                <SelectItem value="top_set_weight">Top set weight</SelectItem>
                <SelectItem value="volume">Session volume</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target value</Label>
            <Input
              inputMode="decimal"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={metric === "volume" ? "e.g. 8000" : "e.g. 225"}
            />
            <div className="ff-caption text-muted-foreground">{metricLabel(metric, units)}</div>
          </div>

          <div className="space-y-2">
            <Label>Due date (optional)</Label>
            <Input value={dueDateISO} onChange={(e) => setDueDateISO(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const ex = exerciseName.trim();
              const tv = Number(targetValue);
              if (!ex) return alert("Enter an exercise name.");
              if (!tv || tv <= 0) return alert("Enter a valid target value.");
              onAdd({ exerciseName: ex, metric, targetValue: tv, dueDateISO: dueDateISO || undefined });
              onOpenChange(false);
            }}
          >
            Add goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
