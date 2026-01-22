"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { History, Search, Trash2 } from "lucide-react";
import type { Session, Units } from "../types";
import { formatDate, formatNumber } from "../utils";
import { summarizeSession } from "../log-helpers";
import { PageShell } from "../layout/PageShell";

export function HistoryPanel({
  search,
  onSearchChange,
  sessions,
  units,
  onDeleteSession,
  onBackToLog,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  sessions: Session[];
  units: Units;
  onDeleteSession: (id: string) => void;
  onBackToLog: () => void;
}) {
  return (
    <PageShell title="History" subtitle="Search and review past sessions.">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
            <History className="h-5 w-5" /> Training history
          </CardTitle>
          <CardDescription className="ff-body-sm text-foreground/80">
            Search and review past sessions.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
              <Input
                className="pl-9"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search templates, dates, exercises…"
              />
            </div>

            <Button variant="outline" className="rounded-xl" onClick={onBackToLog}>
              Log
            </Button>
          </div>

          {sessions.length === 0 ? (
            <div className="ff-body-sm text-muted-foreground">No sessions yet.</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  units={units}
                  onDelete={() => onDeleteSession(session.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function SessionCard({
  session,
  units,
  onDelete,
}: {
  session: Session;
  units: Units;
  onDelete: () => void;
}) {
  const summary = summarizeSession(session);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <CardTitle className="text-base">
              {session.templateName}{" "}
              <span className="text-muted-foreground font-normal">• {formatDate(session.dateISO)}</span>
            </CardTitle>
            <CardDescription className="ff-body-sm text-foreground/75">
              {summary.exerciseCount} exercises • {summary.setCount} sets • Volume {formatNumber(summary.volume)} ({units}×reps)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={onDelete} aria-label="Delete session">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
