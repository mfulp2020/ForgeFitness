"use client";

import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Units } from "../types";

export type RecapData = {
  templateName: string;
  totalSets: number;
  totalVolume: number;
  totalTimeMin: number;
  exercises: number;
  prCount: number;
};

export function RecapDialog({
  open,
  onOpenChange,
  data,
  units,
  onViewHistory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: RecapData | null;
  units: Units;
  onViewHistory: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Workout Recap</DialogTitle>
          <DialogDescription>
            {data?.templateName || "Session"} • Great work today.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3 text-sm">
          {data?.prCount
            ? `New PRs unlocked: ${data.prCount}. Keep that momentum.`
            : "Solid work. Show up again and the numbers will move."}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border p-3">
            <div className="ff-kicker text-muted-foreground">
              Total sets
            </div>
            <div className="text-2xl font-display">{data?.totalSets ?? 0}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="ff-kicker text-muted-foreground">
              Exercises logged
            </div>
            <div className="text-2xl font-display">{data?.exercises ?? 0}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="ff-kicker text-muted-foreground">
              Volume
            </div>
            <div className="text-2xl font-display">
              {Math.round(data?.totalVolume || 0).toLocaleString()}
            </div>
            <div className="ff-caption text-muted-foreground">{units}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="ff-kicker text-muted-foreground">
              Conditioning
            </div>
            <div className="text-2xl font-display">{Math.round(data?.totalTimeMin || 0)} min</div>
            <div className="ff-caption text-muted-foreground">Cardio + timed work</div>
          </div>
        </div>
        <div className="rounded-xl border p-3 mt-3">
          <div className="ff-kicker text-muted-foreground">
            Personal records
          </div>
          <div className="text-2xl font-display">{data?.prCount ?? 0}</div>
          <div className="ff-caption text-muted-foreground">New exercise bests this session.</div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onViewHistory();
              onOpenChange(false);
            }}
          >
            View history
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
