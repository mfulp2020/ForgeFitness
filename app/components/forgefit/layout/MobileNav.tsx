import type React from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

export type MobileNavItem = {
  key: "log" | "history" | "insights" | "calc" | "coach";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type MobileNavProps = {
  items: MobileNavItem[];
  activeTab: MobileNavItem["key"];
  onTabChange: (key: MobileNavItem["key"]) => void;
  restControls: {
    running: boolean;
    seconds: number;
    onToggle: () => void;
    onReset: () => void;
  };
  showLogActions: boolean;
  gymMode: boolean;
  onToggleGymMode: () => void;
  onSave: () => void;
};

export function MobileNav({
  items,
  activeTab,
  onTabChange,
  restControls,
  showLogActions,
  gymMode,
  onToggleGymMode,
  onSave,
}: MobileNavProps) {
  const colsClass = items.length === 5 ? "grid-cols-5" : "grid-cols-4";
  const { running, seconds } = restControls;

  return (
    <div className="fixed bottom-3 left-3 right-3 z-40 md:hidden">
      <div className="rounded-[24px] border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.35)] backdrop-blur-[22px] shadow-[0_18px_40px_rgba(0,0,0,0.45)] p-3 space-y-2">
        <div className={`grid ${colsClass} gap-2`}>
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <Button
                key={item.key}
                variant={active ? "default" : "outline"}
                className="rounded-2xl h-11 flex flex-col items-center justify-center gap-1 text-[11px] tracking-[0.08em]"
                onClick={() => onTabChange(item.key)}
                aria-pressed={active}
              >
                <Icon className="h-4 w-4" />
                <span className="leading-none">{item.label}</span>
              </Button>
            );
          })}
        </div>

        {(running || seconds > 0) && (
          <div className="flex items-center justify-between rounded-[18px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-xs backdrop-blur-[18px]">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span>
                Rest {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" className="rounded-xl" onClick={restControls.onToggle}>
                {running ? "Pause" : "Start"}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-xl" onClick={restControls.onReset}>
                Reset
              </Button>
            </div>
          </div>
        )}

        {showLogActions ? (
          <div className="flex items-center gap-2">
            <Button className="flex-1 rounded-2xl" variant={gymMode ? "secondary" : "default"} onClick={onToggleGymMode}>
              {gymMode ? "Exit" : "Start"}
            </Button>
            <Button className="flex-1 rounded-2xl" variant="outline" onClick={onSave}>
              Save
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
