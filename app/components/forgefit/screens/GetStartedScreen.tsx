"use client";

import React from "react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function GetStartedScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,var(--glow-a),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_90%_10%,var(--glow-b),transparent)]" />
      </div>
      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0">
            <Image
              src="/get-started-hero.svg"
              alt="Forged athlete silhouette"
              fill
              className="h-full w-full object-cover opacity-85"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 w-full max-w-xl space-y-5 rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-[22px]">
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] border border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)] px-4 py-2 ff-kicker text-muted-foreground">
              ForgeFit • Iron Edition
            </div>
            <div className="ff-h1">
              This is your line in the sand.
            </div>
            <div className="ff-body text-foreground/75">
              ForgeFit is built for people who want real change. You are about to lock in your training, track every
              set, and build momentum that lasts.
            </div>
            <div className="space-y-2 ff-body-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Dialed programs built for your goal.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Progress you can see, feel, and measure.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                The discipline to keep showing up.
              </div>
            </div>
            <Button className="w-full rounded-2xl ff-kicker" onClick={onStart}>
              Get Started
            </Button>
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <div className="ff-kicker text-muted-foreground">Your Mindset</div>
              <div className="ff-h3 text-foreground">Train like it matters.</div>
              <div className="ff-body-sm text-foreground/75">
                Every session compounds. No wasted reps. No vague plans. Just a clear path, strong work ethic, and the
                accountability to follow through.
              </div>
              <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="ff-kicker text-muted-foreground">Ready Checklist</div>
                <div className="mt-2 space-y-2 ff-body-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Commit to 3+ days per week.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Track every set you finish.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Progress with intent.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
