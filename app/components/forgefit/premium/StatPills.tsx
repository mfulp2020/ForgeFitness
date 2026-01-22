"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export function StatPills(props: {
  items: Array<{
    key: string;
    label: string;
    value: string;
    Icon: React.ComponentType<{ className?: string }>;
  }>;
}) {
  const { items } = props;

  return (
    <Card className="mt-3 gap-0 p-0">
      <div className="flex">
        {items.slice(0, 3).map((it, idx) => (
          <React.Fragment key={it.key}>
            <div className="flex flex-1 flex-col items-center px-3 py-2 text-center">
              <div className="flex items-center gap-2 ff-kicker text-muted-foreground">
                <it.Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{it.label}</span>
              </div>
              <div className="mt-1 text-[1.2rem] font-semibold tracking-tight text-foreground">
                {it.value}
              </div>
            </div>
            {idx < 2 && (
              <div className="self-stretch w-px bg-[rgba(255,255,255,0.1)]" />
            )}
          </React.Fragment>
        ))}
      </div>
    </Card>
  );
}
