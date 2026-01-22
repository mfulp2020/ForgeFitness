import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarDays,
  ClipboardList,
  History,
  Settings as SettingsIcon,
  Sparkles,
  TrendingUp,
  Upload,
  Download,
  Target,
  Flame,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

export type HeaderStats = {
  streak: number;
  totalSessions: number;
  vol7d: number;
  lastLabel: string;
};

export type HeaderSectionProps = {
  isCoach: boolean;
  activeTab: "log" | "history" | "insights" | "calc" | "coach";
  onTabChange: (tab: "log" | "history" | "insights" | "calc" | "coach") => void;
  stats: HeaderStats;
  actions: {
    openTemplates: () => void;
    openGenerator: () => void;
    openImport: () => void;
    onExport: () => void;
    openSettings: () => void;
  };
};

export function HeaderSection({ isCoach, activeTab, onTabChange, stats, actions }: HeaderSectionProps) {
  const tabTriggers: Array<{ key: HeaderSectionProps["activeTab"]; label: ReactNode; icon: ReactNode }> = [
    { key: "log", label: "Log", icon: <ClipboardList className="h-4 w-4" /> },
    { key: "history", label: "History", icon: <History className="h-4 w-4" /> },
    { key: "insights", label: "Insights", icon: <TrendingUp className="h-4 w-4" /> },
    { key: "calc", label: "1RM", icon: <Target className="h-4 w-4" /> },
  ];

  if (isCoach) {
    tabTriggers.push({ key: "coach", label: "Coach", icon: <SettingsIcon className="h-4 w-4" /> });
  }

  return (
    <div className="sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-5">
      <div className="rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-[22px]">
        <div className="px-5 md:px-8 py-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex items-start gap-3">
              <div className="h-12 w-12 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.45)] overflow-hidden">
                <Image
                  src="/forgefit-logo.svg"
                  alt="ForgeFit"
                  width={36}
                  height={36}
                  className="h-9 w-9"
                  style={{ filter: "drop-shadow(0 6px 18px var(--icon-glow))" }}
                  priority
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-display uppercase leading-none tracking-[0.16em] sm:tracking-[0.22em] text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--title-from),var(--title-via),var(--title-to))] drop-shadow-[0_10px_24px_rgba(0,0,0,0.3)]">
                    ForgeFit
                  </span>
                  <Badge
                    className="rounded-full uppercase tracking-[0.35em] text-[0.6rem] px-2.5 py-1"
                    variant="outline"
                  >
                    Iron
                  </Badge>
                </div>
                <div className="text-[0.68rem] md:text-xs text-muted-foreground uppercase tracking-[0.35em]">
                  Train heavy • Log fast • Progress weekly
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
              <Button
                variant="outline"
                className="rounded-full uppercase text-[0.62rem] tracking-[0.28em]"
                onClick={actions.openTemplates}
              >
                <ClipboardList className="h-4 w-4" />
                Templates
              </Button>

              <Button
                variant="outline"
                className="rounded-full uppercase text-[0.62rem] tracking-[0.28em]"
                onClick={actions.openGenerator}
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </Button>

              <Button
                variant="outline"
                className="rounded-full uppercase text-[0.62rem] tracking-[0.28em]"
                onClick={actions.openImport}
              >
                <Upload className="h-4 w-4" />
                Import
              </Button>

              <Button
                variant="outline"
                className="rounded-full uppercase text-[0.62rem] tracking-[0.28em]"
                onClick={actions.onExport}
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-10 w-10 border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] shadow-[0_12px_30px_rgba(0,0,0,0.45)]"
                onClick={actions.openSettings}
                aria-label="Open settings"
              >
                <SettingsIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <Flame className="h-4 w-4" /> Streak
              </div>
              <div className="mt-1 text-2xl font-display">{stats.streak}d</div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <History className="h-4 w-4" /> Sessions
              </div>
              <div className="mt-1 text-2xl font-display">{stats.totalSessions}</div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <TrendingUp className="h-4 w-4" /> 7d Volume
              </div>
              <div className="mt-1 text-2xl font-display">{Math.round(stats.vol7d).toLocaleString()}</div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <CalendarDays className="h-4 w-4" /> Last
              </div>
              <div className="mt-1 text-2xl font-display">{stats.lastLabel}</div>
            </div>
          </div>

          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as HeaderSectionProps["activeTab"])}>
              <TabsList
                className={`w-full rounded-[18px] bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] p-1 flex md:grid ${isCoach ? "md:grid-cols-5" : "md:grid-cols-4"} gap-1 md:gap-0 overflow-x-auto shadow-[0_14px_30px_rgba(0,0,0,0.35)]`}
              >
                {tabTriggers.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={activeTab} />
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
