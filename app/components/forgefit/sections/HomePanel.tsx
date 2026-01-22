"use client";

import React from "react";
import { ClipboardList, Heart } from "lucide-react";

import { BodyWeightCard } from "../premium/BodyWeightCard";
import { WorkoutTodayCard } from "../premium/WorkoutTodayCard";
import { PageShell } from "../layout/PageShell";

export function HomePanel({ ctx }: { ctx: any }) {
  const {
    todayScheduleInfo,
    workoutDraft,
    startOrResumeTodayWorkout,
    state,
    bodyWeightInput,
    setBodyWeightInput,
    setState,
    formatNumber,
    todayISO,
  } = ctx;

  return (
    <PageShell>
      <WorkoutTodayCard
        title="Todays workout"
        subtitle={
          todayScheduleInfo.isRestDay
            ? "Rest day (log anyway if you want)"
            : ""
        }
        statusLabel={
          workoutDraft
            ? "In progress"
            : todayScheduleInfo.isRestDay
              ? "Rest day"
              : ""
        }
        primaryLine={
          workoutDraft
            ? "Resume your workout"
            : todayScheduleInfo.isRestDay
              ? "Rest day"
              : todayScheduleInfo.templateName || "Start a workout"
        }
        ctaLabel={workoutDraft ? "Resume workout" : "Start workout"}
        onPress={startOrResumeTodayWorkout}
        icon={null}
      />

      {(() => {
        const today = todayISO();
        const entries = Array.isArray(state.bodyWeight) ? state.bodyWeight : [];
        const todayEntry = entries.find((e: any) => e.dateISO === today);
        const last = [...entries].sort((a: any, b: any) => String(b.dateISO).localeCompare(String(a.dateISO)))[0];
        const yesterdayKey = (() => {
          const date = new Date(`${today}T00:00:00Z`);
          if (Number.isNaN(date.getTime())) return null;
          date.setUTCDate(date.getUTCDate() - 1);
          return date.toISOString().slice(0, 10);
        })();
        const yesterdayEntry = yesterdayKey
          ? entries.find((e: any) => e.dateISO === yesterdayKey)
          : null;
        const weeklyValues = (() => {
          const base = new Date(`${today}T00:00:00Z`);
          if (Number.isNaN(base.getTime())) return [];
          return Array.from({ length: 7 }, (_, idx) => {
            const date = new Date(base);
            date.setUTCDate(base.getUTCDate() - (6 - idx));
            const key = date.toISOString().slice(0, 10);
            const entry = entries.find((e: any) => e.dateISO === key);
            return entry ? Number(entry.weight) : null;
          });
        })();

        const summaryLine = todayEntry
          ? `Today: ${formatNumber(todayEntry.weight)} ${state.settings.units}`
          : last
            ? `Last: ${formatNumber(last.weight)} ${state.settings.units} (${last.dateISO})`
            : "No body weight logged yet.";
        const deltaText =
          todayEntry && yesterdayEntry
            ? (() => {
              const delta = Number(todayEntry.weight) - Number(yesterdayEntry.weight);
              const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
              const absDelta = formatNumber(Math.abs(delta));
              return `${sign}${absDelta} ${state.settings.units} since yesterday`;
            })()
            : undefined;

        return (
          <BodyWeightCard
            title="Body weight"
            description="Quick daily log."
            summaryLine={summaryLine}
            deltaText={deltaText}
            weeklyValues={weeklyValues}
            inputValue={bodyWeightInput}
            inputPlaceholder={`e.g. 185 (${state.settings.units})`}
            units={state.settings.units}
            onChangeInput={setBodyWeightInput}
            onSave={() => {
              const todayKey = todayISO();
              const w = Number(bodyWeightInput);
              if (!Number.isFinite(w) || w <= 0) {
                alert("Enter a valid body weight.");
                return;
              }
              setState((p: any) => {
                const next = (p.bodyWeight || []).filter((e: any) => e.dateISO !== todayKey);
                next.push({ dateISO: todayKey, weight: w });
                next.sort((a: any, b: any) => String(a.dateISO).localeCompare(String(b.dateISO)));
                return { ...p, bodyWeight: next };
              });
              setBodyWeightInput("");
            }}
            icon={<Heart className="h-5 w-5" />}
          />
        );
      })()}
    </PageShell>
  );
}
