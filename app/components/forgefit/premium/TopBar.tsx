"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ForgeFitMark } from "../components/ForgeFitMark";

export function TopBar(props: {
  themeLabel: string;
  greeting: { compact: string; full: string };
  onOpenTemplates: () => void;
  onOpenGenerator: () => void;
  onOpenSettings: () => void;
  actions: {
    TemplatesIcon: React.ComponentType<{ className?: string }>;
    SparklesIcon: React.ComponentType<{ className?: string }>;
    SettingsIcon: React.ComponentType<{ className?: string }>;
  };
}) {
  const {
    themeLabel,
    greeting,
    onOpenTemplates,
    onOpenGenerator,
    onOpenSettings,
    actions,
  } = props;

  const { TemplatesIcon, SparklesIcon, SettingsIcon } = actions;

  const iconButtonClass =
    "h-10 w-10 rounded-[var(--radius-pill)] border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] shadow-[var(--shadow-elev-1)] backdrop-blur-[18px] p-0";

  return (
    <div className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] backdrop-blur-[22px]">
      <div className="-mx-4 md:-mx-8 px-4 md:px-8 pb-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] backdrop-blur flex items-center justify-center overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
              <ForgeFitMark className="h-6 w-6" />
            </div>
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                <div className="ff-h3 leading-tight font-semibold tracking-tight shrink-0 min-w-max">
                  ForgeFit
                </div>
                <Badge
                  variant="outline"
                  className="shrink-0 text-[0.65rem] border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.04)]"
                >
                  {themeLabel}
                </Badge>
              </div>
              <div className="ff-body-sm font-medium text-muted-foreground leading-tight">
                <span className="md:hidden">{greeting.compact}</span>
                <span className="hidden md:block truncate">{greeting.full}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 max-w-[55%] overflow-x-auto">
            <Button
              variant="outline"
              size="icon"
              className={iconButtonClass}
              onClick={onOpenTemplates}
              aria-label="Templates"
            >
              <TemplatesIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={iconButtonClass}
              onClick={onOpenGenerator}
              aria-label="Generate"
            >
              <SparklesIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className={iconButtonClass}
              onClick={onOpenSettings}
              aria-label="Open settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
