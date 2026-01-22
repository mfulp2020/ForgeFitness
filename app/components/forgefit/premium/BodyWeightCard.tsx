"use client";

import React from "react";
import { CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeaderCard } from "./SectionHeaderCard";

export function BodyWeightCard(props: {
  title: string;
  description: string;
  summaryLine: string;
  deltaText?: string;
  weeklyValues?: Array<number | null>;
  inputValue: string;
  inputPlaceholder: string;
  units: string;
  onChangeInput: (v: string) => void;
  onSave: () => void;
  icon?: React.ReactNode;
}) {
  const {
    title,
    description,
    summaryLine,
    deltaText,
    weeklyValues,
    inputValue,
    inputPlaceholder,
    onChangeInput,
    onSave,
    icon,
  } = props;

  const chartValues = (weeklyValues || []).filter((value) => Number.isFinite(value));
  const showChart = chartValues.length >= 2;
  const chart = (() => {
    if (!showChart || !weeklyValues) return null;
    const values = weeklyValues;
    const numericValues = values.filter((value): value is number => typeof value === "number");
    if (numericValues.length < 2) return null;
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = Math.max(1, max - min);
    const height = 56;
    const width = 260;
    const points: Array<{ x: number; y: number }> = [];

    values.forEach((value, index) => {
      if (typeof value !== "number") return;
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      points.push({ x, y });
    });

    if (points.length < 2) return null;
    const linePath = points
      .map((point, idx) => `${idx === 0 ? "M" : "L"}${point.x} ${point.y}`)
      .join(" ");
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return (
      <div className="rounded-[18px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3">
        <div className="ff-kicker text-muted-foreground">
          Last 7 days
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-2 h-14 w-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="weight-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#weight-area)" />
          <path d={linePath} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
        </svg>
      </div>
    );
  })();

  return (
    <SectionHeaderCard title={title} description={description} icon={icon}>
      <CardContent className="space-y-3 px-5">
        <div className="ff-body-sm text-foreground/75">{summaryLine}</div>
        {chart}
        <div className="flex items-center gap-2">
          <Input
            inputMode="decimal"
            value={inputValue}
            onChange={(e) => onChangeInput(e.target.value)}
            placeholder={inputPlaceholder}
            className="h-10"
          />
          <Button variant="forgeSmall" className="h-10 rounded-full px-6" onClick={onSave}>
            Save
          </Button>
        </div>
        {deltaText ? (
          <div className="ff-caption text-muted-foreground">{deltaText}</div>
        ) : null}
      </CardContent>
    </SectionHeaderCard>
  );
}
