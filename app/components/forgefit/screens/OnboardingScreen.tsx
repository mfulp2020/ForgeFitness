"use client";

import React, { useEffect, useState } from "react";
import {
  Dumbbell,
  Flame,
  Heart,
  Loader2,
  Trophy,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Weekday = string;
type FocusType = "hypertrophy" | "strength" | "fat_loss" | "athletic" | "general";
type SplitType =
  | "full_body"
  | "upper_lower"
  | "ppl"
  | "phul"
  | "bro_split"
  | "performance";

type WeekdayOption = { key: Weekday; short: string };

export function OnboardingScreen(props: {
  settings: any;
  weekdays: WeekdayOption[];
  generateProgramTemplates: (args: any) => any[];
  onComplete: (profile: any, templates: any[], days: Weekday[]) => void;
}) {
  const { settings, weekdays, generateProgramTemplates, onComplete } = props;

  const [profile, setProfile] = useState<any>(() => ({
    ...settings.profile,
    completed: false,
  }));
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<FocusType>("hypertrophy");
  const [split, setSplit] = useState<SplitType>("ppl");
  const [scheduledDays, setScheduledDays] = useState<Weekday[]>(["mon", "wed", "fri"]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    setProfile({ ...settings.profile, completed: false });
    setStep(0);
  }, [settings.profile]);

  const heightLabel = settings.units === "kg" ? "Height (cm)" : "Height";
  const weightLabel = `Bodyweight (${settings.units})`;
  const focusDescriptions: Record<FocusType, string> = {
    hypertrophy: "Build muscle size and shape.",
    strength: "Lift heavier with lower reps.",
    fat_loss: "Burn calories with higher intensity.",
    athletic: "Power, speed, and performance.",
    general: "Balanced mix for overall fitness.",
  };

  const parseHeight = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };

  const heightValue = parseHeight(profile.height);
  const hasHeight = heightValue > 0;
  const heightFeet = hasHeight ? Math.floor(heightValue / 12) : 5;
  const heightRemainder = hasHeight ? Math.round(heightValue % 12) : 0;
  const heightMeters = Math.floor(heightValue / 100) || 1;
  const heightCmRemainder = heightValue ? Math.round(heightValue % 100) : 0;
  const daysPerWeek = scheduledDays.length || 1;

  const toggleDay = (key: Weekday) => {
    setScheduledDays((prev: Weekday[]) => {
      const next = prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key];
      return weekdays.filter((d) => next.includes(d.key)).map((d) => d.key);
    });
  };

  const handleSubmit = () => {
    const age = Number(profile.age);
    const height = parseHeight(profile.height);
    const weight = Number(profile.weight);

    if (!profile.name.trim()) {
      setError("Add your name to continue.");
      return;
    }
    if (!profile.username?.trim()) {
      setError("Create a username to continue.");
      return;
    }
    if (!age || age < 10) {
      setError("Enter a valid age.");
      return;
    }
    if (!height || height <= 0) {
      setError(`Enter your ${heightLabel.toLowerCase()}.`);
      return;
    }
    if (!weight || weight <= 0) {
      setError(`Enter your ${weightLabel.toLowerCase()}.`);
      return;
    }
    if (!scheduledDays.length) {
      setError("Pick at least one training day.");
      return;
    }

    setIsGenerating(true);
    setError("");
    window.setTimeout(() => {
      const templates = generateProgramTemplates({
        experience: "intermediate",
        split,
        daysPerWeek,
        focus,
        finisherOption: focus === "fat_loss" ? "core_cardio" : "core",
        units: settings.units,
      });
      onComplete(
        { ...profile, completed: true, preferredSplit: split, focus },
        templates,
        scheduledDays
      );
    }, 900);
  };

  const handleNext = () => {
    if (step === 0) {
      const age = Number(profile.age);
      const height = parseHeight(profile.height);
      const weight = Number(profile.weight);

      if (!profile.name.trim()) {
        setError("Add your name to continue.");
        return;
      }
      if (!profile.username?.trim()) {
        setError("Create a username to continue.");
        return;
      }
      if (!age || age < 10) {
        setError("Enter a valid age.");
        return;
      }
      if (!height || height <= 0) {
        setError(`Enter your ${heightLabel.toLowerCase()}.`);
        return;
      }
      if (!weight || weight <= 0) {
        setError(`Enter your ${weightLabel.toLowerCase()}.`);
        return;
      }
    }

    if (step === 2 && !scheduledDays.length) {
      setError("Pick at least one training day.");
      return;
    }

    setError("");
    if (step >= 2) {
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,var(--glow-a),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_90%_10%,var(--glow-b),transparent)]" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="ff-h2">Enter The App</CardTitle>
            <CardDescription className="ff-body-sm text-foreground/80">
              Build your profile so ForgeFit can dial in your goals and tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 min-h-[520px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between ff-kicker text-muted-foreground">
                <span>Step {step + 1} of 3</span>
                <span>{Math.round(((step + 1) / 3) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((step + 1) / 3) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-4">
              {step === 0 ? (
                <div className="space-y-3">
                  <div className="ff-kicker text-muted-foreground">Step 1 • Profile</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile((p: any) => ({ ...p, name: e.target.value }))}
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Username</Label>
                      <Input
                        value={profile.username || ""}
                        onChange={(e) =>
                          setProfile((p: any) => ({
                            ...p,
                            username: e.target.value.replace(/\s+/g, ""),
                          }))
                        }
                        placeholder="yourhandle"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Age</Label>
                      <Input
                        inputMode="numeric"
                        value={profile.age}
                        onChange={(e) => setProfile((p: any) => ({ ...p, age: e.target.value }))}
                        placeholder="e.g. 24"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>{heightLabel}</Label>
                      {settings.units === "kg" ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={String(heightMeters)}
                            onValueChange={(v) =>
                              setProfile((p: any) => ({
                                ...p,
                                height: String(Number(v) * 100 + heightCmRemainder),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3].map((meters) => (
                                <SelectItem key={meters} value={String(meters)}>
                                  {meters} m
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={String(heightCmRemainder)}
                            onValueChange={(v) =>
                              setProfile((p: any) => ({
                                ...p,
                                height: String(heightMeters * 100 + Number(v)),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 100 }).map((_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i} cm
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Select
                            value={hasHeight ? String(heightFeet) : ""}
                            onValueChange={(v) =>
                              setProfile((p: any) => ({
                                ...p,
                                height: String(Number(v) * 12 + heightRemainder),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="ft" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 5 }).map((_, i) => {
                                const feet = i + 4;
                                return (
                                  <SelectItem key={feet} value={String(feet)}>
                                    {feet} ft
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <Select
                            value={hasHeight ? String(heightRemainder) : ""}
                            onValueChange={(v) =>
                              setProfile((p: any) => ({
                                ...p,
                                height: String(heightFeet * 12 + Number(v)),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="in" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }).map((_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {i} in
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>{weightLabel}</Label>
                      {settings.units === "kg" ? (
                        <Select
                          value={profile.weight || "80"}
                          onValueChange={(v) => setProfile((p: any) => ({ ...p, weight: v }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 171 }).map((_, i) => {
                              const kg = i + 30;
                              return (
                                <SelectItem key={kg} value={String(kg)}>
                                  {kg} kg
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          inputMode="decimal"
                          value={profile.weight}
                          onChange={(e) => setProfile((p: any) => ({ ...p, weight: e.target.value }))}
                          placeholder="e.g. 180"
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="rounded-xl border p-3 space-y-3">
                  <div>
                    <div className="ff-kicker text-muted-foreground">Step 2 • Training goal</div>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(
                        [
                          { value: "hypertrophy", label: "Hypertrophy", icon: Dumbbell },
                          { value: "strength", label: "Strength", icon: Trophy },
                          { value: "fat_loss", label: "Weight Loss", icon: Flame },
                          { value: "athletic", label: "Athletic", icon: Zap },
                          { value: "general", label: "General", icon: Heart },
                        ] as Array<{ value: FocusType; label: string; icon: typeof Dumbbell }>
                      ).map((option) => {
                        const Icon = option.icon;
                        return (
                          <Button
                            key={option.value}
                            type="button"
                            variant={focus === option.value ? "forge" : "outline"}
                            className="h-auto w-full flex-col gap-2 rounded-2xl px-4 py-4 text-left"
                            onClick={() => setFocus(option.value)}
                          >
                            <Icon className="h-7 w-7" />
                            <span className="ff-kicker font-semibold">{option.label}</span>
                          </Button>
                        );
                      })}
                    </div>
                    <div className="ff-caption text-muted-foreground mt-2">{focusDescriptions[focus]}</div>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="rounded-xl border p-3 space-y-3">
                  <div className="ff-kicker text-muted-foreground">Step 3 • Training type</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Preferred split</Label>
                      <Select value={split} onValueChange={(v) => setSplit(v as SplitType)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_body">Full Body</SelectItem>
                          <SelectItem value="upper_lower">Upper / Lower</SelectItem>
                          <SelectItem value="ppl">Push / Pull / Legs</SelectItem>
                          <SelectItem value="phul">PHUL</SelectItem>
                          <SelectItem value="bro_split">Body-Part Split</SelectItem>
                          <SelectItem value="performance">Performance Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Training days</Label>
                      <div className="flex flex-wrap gap-2">
                        {weekdays.map((day) => {
                          const active = scheduledDays.includes(day.key);
                          return (
                            <Button
                              key={day.key}
                              type="button"
                              variant={active ? "default" : "outline"}
                              className={`rounded-full ff-kicker ${
                                active ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-background" : ""
                              }`}
                              onClick={() => toggleDay(day.key)}
                            >
                              {day.short}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="ff-caption text-muted-foreground">
                        {scheduledDays.length} days selected
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {error ? <div className="text-sm text-destructive">{error}</div> : null}
            </div>

            <div className="mt-auto flex flex-col sm:flex-row gap-2">
              {step > 0 ? (
                <Button
                  variant="outline"
                  className="w-full sm:flex-1 rounded-2xl"
                  disabled={isGenerating}
                  onClick={() => {
                    setError("");
                    setStep((s) => Math.max(0, s - 1));
                  }}
                >
                  Back
                </Button>
              ) : null}
              <Button className="w-full sm:flex-1 rounded-2xl" onClick={handleNext} disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Building your plan...
                  </>
                ) : step === 2 ? (
                  "Enter App"
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
