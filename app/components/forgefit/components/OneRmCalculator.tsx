"use client";

import React, { useMemo, useState } from "react";
import { Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Units } from "../types";
import { formatNumber, roundTo } from "../utils";

export function OneRmCalculator({ units }: { units: Units }) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [formula, setFormula] = useState<"epley" | "brzycki" | "lombardi">("epley");

  const w = Number(weight) || 0;
  const r = Number(reps) || 0;

  const estimates = useMemo(() => {
    if (w <= 0 || r <= 0) return null;

    const epleyVal = w * (1 + r / 30);
    const brzyckiVal = r >= 37 ? 0 : w * (36 / (37 - r));
    const lombardiVal = w * Math.pow(r, 0.1);

    const pick = (f: typeof formula) => {
      if (f === "epley") return epleyVal;
      if (f === "brzycki") return brzyckiVal;
      return lombardiVal;
    };

    return {
      selected: pick(formula),
      epley: epleyVal,
      brzycki: brzyckiVal,
      lombardi: lombardiVal,
    };
  }, [w, r, formula]);

  const selectedRounded = estimates ? roundTo(estimates.selected, 0.5) : 0;

  const pctTargets = useMemo(() => {
    if (!estimates) return [] as Array<{ pct: number; weight: number }>;
    const base = selectedRounded;
    const pcts = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
    return pcts.map((p) => ({ pct: Math.round(p * 100), weight: roundTo(base * p, 0.5) }));
  }, [estimates, selectedRounded]);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" /> 1RM Calculator
        </CardTitle>
        <CardDescription>
          Enter a weight and reps to estimate your 1RM. Useful for tracking strength progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Weight ({units})</Label>
            <Input
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 185"
            />
          </div>
          <div className="space-y-2">
            <Label>Reps</Label>
            <Input
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div className="space-y-2">
            <Label>Formula</Label>
            <Select value={formula} onValueChange={(v) => setFormula(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epley">Epley</SelectItem>
                <SelectItem value="brzycki">Brzycki</SelectItem>
                <SelectItem value="lombardi">Lombardi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4">
            <div className="ff-body-sm text-muted-foreground">Estimated 1RM</div>
            <div className="text-3xl font-semibold tracking-tight">
              {estimates ? `${formatNumber(selectedRounded)} ${units}` : "—"}
            </div>
            <div className="ff-caption text-muted-foreground mt-2">
              Note: estimates are best for ~1–10 reps. Very high reps can be less accurate.
            </div>
          </div>

          <div className="rounded-2xl border p-4 space-y-2">
            <div className="font-medium">Compare formulas</div>
            {!estimates ? (
              <div className="ff-body-sm text-muted-foreground">Enter weight + reps.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="ff-body-sm text-muted-foreground">Epley</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {formatNumber(roundTo(estimates.epley, 0.5))} {units}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ff-body-sm text-muted-foreground">Brzycki</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {estimates.brzycki
                      ? `${formatNumber(roundTo(estimates.brzycki, 0.5))} ${units}`
                      : "—"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="ff-body-sm text-muted-foreground">Lombardi</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {formatNumber(roundTo(estimates.lombardi, 0.5))} {units}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-2">Training weights (percent of 1RM)</div>
          {!estimates ? (
            <div className="ff-body-sm text-muted-foreground">Enter weight + reps.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {pctTargets.map((x) => (
                <div key={x.pct} className="rounded-xl border p-3 text-center">
                  <div className="ff-caption text-muted-foreground">{x.pct}%</div>
                  <div className="font-medium">
                    {formatNumber(x.weight)} {units}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
