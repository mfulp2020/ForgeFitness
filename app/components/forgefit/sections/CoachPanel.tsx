"use client";

import React from "react";
import { ClipboardList, Settings as SettingsIcon, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { PageShell } from "../layout/PageShell";

export function CoachPanel({ ctx }: { ctx: any }) {
  const {
    isCoach,
    buildCoachPackage,
    coachPackageText,
    clientImportText,
    setClientImportText,
    importClientReport,
    clientSummary,
  } = ctx;

  if (!isCoach) {
    return (
      <PageShell title="Coach" subtitle="Tools for coaches and client tracking.">
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
              <SettingsIcon className="h-5 w-5" /> Coach mode
            </CardTitle>
            <CardDescription className="ff-body-sm text-foreground/80">
              Turn on Coach Mode in Settings to unlock coach tools.
            </CardDescription>
          </CardHeader>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell title="Coach" subtitle="Packages, imports, and client summaries.">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
            <ClipboardList className="h-5 w-5" /> Send program
          </CardTitle>
          <CardDescription className="ff-body-sm text-foreground/80">
            Generate a coach package to share with your client.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="rounded-xl" onClick={buildCoachPackage}>
            Build coach package
          </Button>
          <Textarea
            value={coachPackageText}
            readOnly
            placeholder="Click “Build coach package” to generate JSON..."
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                try {
                  if (navigator?.clipboard?.writeText) {
                    await navigator.clipboard.writeText(coachPackageText || "");
                    alert("Coach package copied to clipboard.");
                    return;
                  }
                } catch {}
                alert("Copy failed. Select the text and copy manually.");
              }}
            >
              Copy package
            </Button>
            <div className="ff-caption text-muted-foreground">Client imports via Import → Paste JSON.</div>
          </div>
        </CardContent>
      </Card>

        <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 ff-kicker text-muted-foreground">
            <TrendingUp className="h-5 w-5" /> Client progress
          </CardTitle>
          <CardDescription className="ff-body-sm text-foreground/80">
            Paste a client export to view their summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={clientImportText}
            onChange={(e) => setClientImportText(e.target.value)}
            placeholder="Paste client export JSON here..."
          />
          <Button className="rounded-xl" onClick={importClientReport}>
            Load client report
          </Button>
          {clientSummary ? (
            <div className="rounded-xl border p-3 space-y-2">
              <div className="font-medium">{clientSummary.name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border p-2">Sessions: {clientSummary.totalSessions}</div>
                <div className="rounded-lg border p-2">Last: {clientSummary.lastLabel}</div>
                <div className="rounded-lg border p-2">
                  7d Volume: {Math.round(clientSummary.vol7d).toLocaleString()}
                </div>
                <div className="rounded-lg border p-2">
                  Total Volume: {Math.round(clientSummary.totalVolume).toLocaleString()}
                </div>
              </div>
            </div>
          ) : (
            <div className="ff-caption text-muted-foreground">Ask your client to Export data and paste it here.</div>
          )}
        </CardContent>
      </Card>
      </div>
    </PageShell>
  );
}
