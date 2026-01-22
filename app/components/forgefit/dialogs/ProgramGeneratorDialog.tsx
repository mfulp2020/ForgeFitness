import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { clamp, WEEKDAYS } from "../utils";
import { generateProgramTemplates, type FinisherOption } from "../program-generator";
import type { ExperienceLevel, FocusType, SplitType, Template, Units, Weekday } from "../types";

export function ProgramGeneratorDialog({
  open,
  onOpenChange,
  units,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: Units;
  onGenerate: (templates: Template[], days: Weekday[]) => void;
}) {
  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [split, setSplit] = useState<SplitType>("full_body");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [focus, setFocus] = useState<FocusType>("general");
  const [finisherOption, setFinisherOption] = useState<FinisherOption>("core");
  const [scheduledDays, setScheduledDays] = useState<Weekday[]>(["mon", "wed", "fri"]);
  // focusDescriptions previously used in popovers; removed to avoid unused variable lint.

  const sortDays = (days: Weekday[]) =>
    WEEKDAYS.filter((d) => days.includes(d.key)).map((d) => d.key);

  const toggleDay = (days: Weekday[], setDays: (next: Weekday[]) => void, key: Weekday) => {
    const next = days.includes(key) ? days.filter((d) => d !== key) : [...days, key];
    const sorted = sortDays(next);
    setDays(sorted);
    setDaysPerWeek(sorted.length || 1);
  };

  useEffect(() => {
    if (!open) return;
    setExperience("beginner");
    setSplit("full_body");
    setDaysPerWeek(3);
    setFocus("general");
    setFinisherOption("core");
    setScheduledDays(["mon", "wed", "fri"]);
  }, [open]);

  useEffect(() => {
    setDaysPerWeek((d) => clamp(d, 1, 7));
  }, [split]);

  useEffect(() => {
    const defaults = WEEKDAYS.filter((d) => d.index !== 0)
      .slice(0, daysPerWeek)
      .map((d) => d.key);
    setScheduledDays((prev) => (prev.length ? prev : defaults));
  }, [daysPerWeek]);

  const preview = useMemo(() => {
    return generateProgramTemplates({
      experience,
      split,
      daysPerWeek,
      focus,
      finisherOption,
      units,
    });
  }, [experience, split, daysPerWeek, focus, finisherOption, units]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle>Generate a workout plan</DialogTitle>
          <DialogDescription>
            Pick your experience and preferred split. ForgeFit will create templates you can start logging immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-2">
            <div className="space-y-2">
              <Label>Experience</Label>
              <Select value={experience} onValueChange={(v) => setExperience(v as ExperienceLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner" className="whitespace-normal">
                    Beginner (new / getting back into it)
                  </SelectItem>
                  <SelectItem value="intermediate" className="whitespace-normal">
                    Intermediate (consistent lifting)
                  </SelectItem>
                  <SelectItem value="advanced" className="whitespace-normal">
                    Advanced (structured training)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred split</Label>
              <Select value={split} onValueChange={(v) => setSplit(v as SplitType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_body">Full Body</SelectItem>
                  <SelectItem value="upper_lower">Upper / Lower</SelectItem>
                  <SelectItem value="ppl">Push / Pull / Legs (PPL)</SelectItem>
                  <SelectItem value="phul">PHUL (Power/Hypertrophy Upper-Lower)</SelectItem>
                  <SelectItem value="bro_split">Body-Part Split (Bro Split)</SelectItem>
                  <SelectItem value="performance">Performance Hybrid</SelectItem>
                </SelectContent>
              </Select>
              <div className="ff-caption text-muted-foreground">
                Tip: Full Body is best for beginners and busy schedules.
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>Focus</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(255,255,255,0.1)] text-muted-foreground hover:text-foreground"
                      aria-label="Explain focus goals"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 ff-caption">
                    <div className="font-medium text-sm">Goal guide</div>
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      {(
                        [
                          ["hypertrophy", "Build muscle size and shape."],
                          ["strength", "Lift heavier with lower reps."],
                          ["fat_loss", "Burn calories with higher intensity."],
                          ["athletic", "Power, speed, and performance."],
                          ["general", "Balanced mix for overall fitness."],
                        ] as Array<[FocusType, string]>
                      ).map(([key, desc]) => (
                        <div key={key} className={focus === key ? "text-foreground" : undefined}>
                          <span className="font-medium capitalize">{key.replace("_", " ")}</span>{" "}
                          — {desc}
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={focus} onValueChange={(v) => setFocus(v as FocusType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General fitness</SelectItem>
                  <SelectItem value="hypertrophy">Muscle building</SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="fat_loss">Weight loss</SelectItem>
                  <SelectItem value="athletic">Athletic performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-xl border p-3 space-y-3">
              <div>
                <div className="font-medium text-sm">Assign days</div>
                <div className="ff-caption text-muted-foreground">
                  Pick the weekdays you want these templates scheduled to.
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.key}
                    type="button"
                    size="sm"
                    variant={scheduledDays.includes(day.key) ? "secondary" : "outline"}
                    className={`rounded-xl ${
                      scheduledDays.includes(day.key)
                        ? "border-primary/50 bg-primary/15 text-foreground ring-1 ring-primary/30"
                        : ""
                    }`}
                    onClick={() => toggleDay(scheduledDays, setScheduledDays, day.key)}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-3">
              <div>
                <div className="font-medium text-sm">Finishers</div>
                <div className="ff-caption text-muted-foreground">
                  Add core, cardio, or both to the end of each workout.
                </div>
              </div>
              <Select
                value={finisherOption}
                onValueChange={(v) => setFinisherOption(v as FinisherOption)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No finishers</SelectItem>
                  <SelectItem value="core">Core finishers</SelectItem>
                  <SelectItem value="cardio">Cardio finishers</SelectItem>
                  <SelectItem value="core_cardio">Core + Cardio finishers</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Days per week</Label>
              <div className="rounded-xl border bg-background px-3 py-2 text-sm">
                {scheduledDays.length || 0} selected
              </div>
              <div className="ff-caption text-muted-foreground">
                Days are set by your weekday selections above.
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:max-h-[60vh] lg:overflow-y-auto lg:pr-2">
            <div className="font-medium">Preview</div>
            <div className="space-y-2">
              {preview.map((t) => (
                <div key={t.id} className="rounded-2xl border p-3">
                  <div className="font-medium">{t.name}</div>
                  <div className="ff-caption text-muted-foreground mt-1">
                    {(t.exercises || []).slice(0, 6).map((e) => e.name).join(" • ")}
                    {(t.exercises || []).length > 6 ? " …" : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="ff-caption text-muted-foreground">
              You can edit anything after generating (swap exercises, sets, rep ranges, etc.).
            </div>

          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const templates = generateProgramTemplates({
                experience,
                split,
                daysPerWeek,
                focus,
                finisherOption,
                units,
              });
              if (!templates.length) return;
              onGenerate(templates, scheduledDays);
              onOpenChange(false);
            }}
          >
            Generate templates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
