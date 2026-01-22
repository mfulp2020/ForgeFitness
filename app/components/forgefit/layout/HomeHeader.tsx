import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarDays, Flame, History, TrendingUp } from "lucide-react";

export type HomeHeaderStats = {
  streak: number;
  totalSessions: number;
  vol7d: number;
  lastLabel: string;
};

export function HomeHeader({ headerStats }: { headerStats: HomeHeaderStats }) {
  return (
    <div className="sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-5">
      <Card className="rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-[22px]">
        <div className="px-5 md:px-8 py-5">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] flex items-center justify-center shadow-[0_12px_30px_rgba(0,0,0,0.45)] overflow-hidden">
              <Image
                src="/forgefit-logo.svg"
                alt="ForgeFit"
                width={36}
                height={36}
                className="h-9 w-9"
                style={{ filter: "drop-shadow(0 6px 18px var(--icon-glow))" }}
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

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <Flame className="h-4 w-4" /> Streak
              </div>
              <div className="mt-1 text-2xl font-display">{headerStats.streak}d</div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <History className="h-4 w-4" /> Sessions
              </div>
              <div className="mt-1 text-2xl font-display">{headerStats.totalSessions}</div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <TrendingUp className="h-4 w-4" /> 7d Volume
              </div>
              <div className="mt-1 text-2xl font-display">
                {Math.round(headerStats.vol7d).toLocaleString()}
              </div>
            </div>

            <div className="rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 shadow-[0_16px_34px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                <CalendarDays className="h-4 w-4" /> Last
              </div>
              <div className="mt-1 text-2xl font-display">{headerStats.lastLabel}</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
