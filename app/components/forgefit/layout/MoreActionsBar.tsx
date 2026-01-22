import { Button } from "@/components/ui/button";
import { Download, Settings as SettingsIcon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

export function MoreActionsBar({
  clerkEnabled,
  userId,
  onOpenExport,
  onOpenSettings,
}: {
  clerkEnabled: boolean;
  userId?: string | null;
  onOpenExport: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="rounded-[20px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3 flex flex-wrap items-center justify-between gap-2 shadow-[0_16px_34px_rgba(0,0,0,0.45)] backdrop-blur-[20px]">
      <div className="ff-kicker text-muted-foreground">Account & data</div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="rounded-xl" onClick={onOpenExport}>
          <Download className="h-4 w-4" /> Export
        </Button>
        <Button size="sm" className="rounded-xl" onClick={onOpenSettings}>
          <SettingsIcon className="h-4 w-4" /> Settings
        </Button>
        {clerkEnabled && userId ? (
          <div className="rounded-full border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1">
            <UserButton afterSignOutUrl="/" />
          </div>
        ) : null}
      </div>
    </div>
  );
}
