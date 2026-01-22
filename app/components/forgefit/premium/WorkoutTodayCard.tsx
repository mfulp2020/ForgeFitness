"use client";

import React from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionHeaderCard } from "./SectionHeaderCard";

export function WorkoutTodayCard(props: {
  title: string;
  subtitle: string;
  statusLabel: string;
  primaryLine: string;
  ctaLabel: string;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  const { title, subtitle, statusLabel, primaryLine, ctaLabel, onPress, icon } = props;

  return (
    <SectionHeaderCard
      title={title}
      description={subtitle}
      icon={icon}
      titleClassName="relative w-full justify-center text-center"
      titleTextClassName="ff-h2 text-foreground"
      headerClassName="pb-0 pt-3"
      descriptionClassName="text-center ff-body-sm text-foreground/70"
    >
      <CardContent className="space-y-3 px-5 pt-0">
        <div className="card-inset p-4 text-center space-y-1">
          {statusLabel ? (
            <div className="ff-kicker text-muted-foreground">{statusLabel}</div>
          ) : null}
          <div className="text-[1.25rem] sm:text-[1.35rem] font-semibold text-foreground">
            {primaryLine}
          </div>
        </div>
        <div className="relative">
          <div className="pointer-events-none absolute inset-[-10px] rounded-full bg-[radial-gradient(60%_60%_at_50%_50%,rgba(255,30,58,0.18),transparent_70%)] opacity-60" />
          <Button
            variant="forge"
            className="w-full text-base h-[54px]"
            onClick={onPress}
          >
            {ctaLabel}
          </Button>
        </div>
      </CardContent>
    </SectionHeaderCard>
  );
}
