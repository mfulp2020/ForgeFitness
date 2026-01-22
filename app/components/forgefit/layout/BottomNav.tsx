"use client";

import React from "react";
import {
  ClipboardList,
  Heart,
  Home,
  MoreHorizontal,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function BottomNav(props: {
  mainTab: "home" | "training" | "social" | "more";
  onHomeAction: () => void;
  onTrainingAction: () => void;
  onSocialAction: () => void;
  onMoreAction: () => void;
  centerAction: {
    label: string;
    state: "play" | "pause";
    onPressAction: () => void;
  };
  fixed?: boolean;
}) {
  const {
    mainTab,
    onHomeAction,
    onTrainingAction,
    onSocialAction,
    onMoreAction,
    centerAction,
    fixed = true,
  } = props;

  const navItems: Array<{
    key: "home" | "training" | "social" | "more";
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }> = [
    { key: "home", label: "Home", Icon: Home, onClick: onHomeAction },
    { key: "training", label: "Training", Icon: ClipboardList, onClick: onTrainingAction },
    { key: "social", label: "Social", Icon: Heart, onClick: onSocialAction },
    { key: "more", label: "More", Icon: MoreHorizontal, onClick: onMoreAction },
  ];

  const renderNavButton = (
    key: "home" | "training" | "social" | "more",
    label: string,
    Icon: React.ComponentType<{ className?: string }>,
    onClick: () => void
  ) => {
    const active = mainTab === key;
    return (
      <button
        type="button"
        key={key}
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-1 ff-caption transition-all ${
          active ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
        aria-current={active ? "page" : undefined}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </button>
    );
  };

  const content = (
    <div className="pointer-events-none">
      <div className="mx-auto max-w-6xl px-4 md:px-8 pb-[env(safe-area-inset-bottom)]">
        <div className="relative">
          <div className="pointer-events-auto relative rounded-[var(--radius-card)] border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.35)] px-3 py-3 shadow-[var(--shadow-elev-2)] backdrop-blur-[24px]">
            <div className="grid grid-cols-5 items-center text-center">
              {navItems.slice(0, 2).map((item) =>
                renderNavButton(item.key, item.label, item.Icon, item.onClick)
              )}
              <div className="relative flex flex-col items-center justify-center">
                <div className="pointer-events-none absolute -top-8 h-10 w-24 rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,30,58,0.22),transparent_70%)] opacity-50" />
                <div className="mt-[-38px]">
                  <Button
                    variant="forge"
                    size="icon-lg"
                    className="h-[64px] w-[64px] p-0"
                    onClick={centerAction.onPressAction}
                    aria-label={centerAction.label}
                  >
                    {centerAction.state === "pause" ? (
                      <Pause className="h-7 w-7" />
                    ) : (
                      <Play className="h-7 w-7" />
                    )}
                  </Button>
                </div>
                <div className="mt-1 ff-kicker text-muted-foreground">
                  {centerAction.label}
                </div>
              </div>
              {navItems.slice(2).map((item) =>
                renderNavButton(item.key, item.label, item.Icon, item.onClick)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (!fixed) return content;

  return (
    <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40">
      {content}
    </div>
  );
}
