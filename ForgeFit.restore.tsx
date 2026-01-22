/* eslint-disable */
"use client";


import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Plus,
  Trash2,
  Save,
  TrendingUp,
  Target,
  Dumbbell,
  ClipboardList,
  History,
  Sparkles,
  Download,
  Upload,
  Search,
  ChevronRight,
  Flame,
  CalendarDays,
  Trophy,
  HelpCircle,
  Zap,
  Heart,
  Loader2,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";

/**
 * Workout Tracking App
 * - Build your own workout templates (days)
 * - Log training sessions
 * - Track progressive overload (e1RM, top set, volume)
 * - Goals (manual + auto-progress suggestions)
 * - LocalStorage persistence
 */

// -------------------- Types --------------------

type Units = "lb" | "kg";

type RepRange = { min: number; max: number };
type SetType = "normal" | "dropset" | "superset" | "triset";

type TemplateExercise = {
  id?: string;
  name: string;
  defaultSets: number;
  repRange: RepRange;
  restSec: number;
  weightStep: number;
  autoProgress: boolean;
  timeUnit?: "seconds" | "minutes";
  setType?: SetType;
  supersetTag?: string;
};

type Template = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
};

type SetEntry = {
  reps: string | number;
  weight: string | number;
  rpe?: string | number;
  notes?: string;
  setType?: SetType;
  supersetTag?: string;
};

type SessionExerciseEntry = {
  exerciseId: string;
  exerciseName: string;
  sets: Array<{
    reps: number;
    weight: number;
    rpe?: number;
    notes?: string;
    setType?: SetType;
    supersetTag?: string;
  }>;
};

type Session = {
  id: string;
  dateISO: string;
  templateId: string;
  templateName: string;
  entries: SessionExerciseEntry[];
  notes?: string;
};

type GoalMetric = "e1rm" | "top_set_weight" | "volume";

type GoalStatus = "active" | "done" | "archived";

type Goal = {
  id: string;
  exerciseName: string;
  metric: GoalMetric;
  targetValue: number;
  dueDateISO?: string;
  status: GoalStatus;
};

type UserRole = "athlete" | "coach";
type Theme = "neon" | "iron" | "dune" | "noir";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekSchedule = Record<Weekday, string>;

type Profile = {
  name: string;
  age: string;
  height: string;
  weight: string;
  completed: boolean;
  introSeen: boolean;
};

type Settings = {
  units: Units;
  autoGoalMode: boolean;
  autoGoalHorizonWeeks: number;
  strictRepRangeForProgress: boolean;
  powerliftingMode: boolean;
  darkMode: boolean;
  role: UserRole;
  theme: Theme;
  schedule: WeekSchedule;
  profile: Profile;
};

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type SplitType = "full_body" | "upper_lower" | "ppl" | "phul" | "bro_split" | "custom";
type FocusType = "general" | "strength" | "hypertrophy" | "fat_loss" | "athletic";

type AppState = {
  templates: Template[];
  sessions: Session[];
  goals: Goal[];
  settings: Settings;
};

type WorkingEntry = {
  exerciseId: string;
  exerciseName: string;
  templateHint?: {
    defaultSets: number;
    repRange: RepRange;
    restSec: number;
    weightStep: number;
    autoProgress: boolean;
    timeUnit?: "seconds" | "minutes";
    setType?: SetType;
    supersetTag?: string;
  };
  sets: Array<{
    reps: string;
    weight: string;
    rpe: string;
    notes: string;
    setType?: SetType;
    supersetTag?: string;
  }>;
};

// -------------------- Utilities --------------------

const LS_KEY = "forgefit_v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

// Epley e1RM: weight * (1 + reps/30)
const e1rm = (weight: number, reps: number) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
};

const roundTo = (n: number, step = 0.5) => {
  const v = Number(n) || 0;
  return Math.round(v / step) * step;
};

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(d);
  }
};

const WEEKDAYS: Array<{ key: Weekday; label: string; short: string; index: number }> = [
  { key: "mon", label: "Monday", short: "Mon", index: 1 },
  { key: "tue", label: "Tuesday", short: "Tue", index: 2 },
  { key: "wed", label: "Wednesday", short: "Wed", index: 3 },
  { key: "thu", label: "Thursday", short: "Thu", index: 4 },
  { key: "fri", label: "Friday", short: "Fri", index: 5 },
  { key: "sat", label: "Saturday", short: "Sat", index: 6 },
  { key: "sun", label: "Sunday", short: "Sun", index: 0 },
];

const emptySchedule: WeekSchedule = {
  mon: "",
  tue: "",
  wed: "",
  thu: "",
  fri: "",
  sat: "",
  sun: "",
};

const formatSetTag = (set: { setType?: SetType; supersetTag?: string }) => {
  if (!set.setType || set.setType === "normal") return "";
  if (set.setType === "dropset") return " DS";
  if (set.setType === "superset") {
    return set.supersetTag ? ` SS ${set.supersetTag}` : " SS";
  }
  if (set.setType === "triset") {
    return set.supersetTag ? ` TS ${set.supersetTag}` : " TS";
  }
  return "";
};

const todayISO = () => new Date().toISOString().slice(0, 10);

const parseISODate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

const getWeekdayKey = (value: string) => {
  const d = parseISODate(value) ?? new Date();
  const idx = d.getDay();
  const match = WEEKDAYS.find((day) => day.index === idx);
  return match?.key ?? "mon";
};

const addDaysISO = (value: string, days: number) => {
  const base = parseISODate(value) ?? new Date();
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const getWeekStartMonday = (value: string) => {
  const base = parseISODate(value) ?? new Date();
  const day = base.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diff);
  return start;
};

const setDateToWeekday = (value: string, targetDay: number) => {
  const weekStart = getWeekStartMonday(value);
  const offset = targetDay === 0 ? 6 : targetDay - 1;
  const next = new Date(weekStart);
  next.setDate(weekStart.getDate() + offset);
  return next.toISOString().slice(0, 10);
};

const getScheduleInfo = (
  value: string,
  templates: Template[],
  schedule: WeekSchedule
) => {
  const d = parseISODate(value) ?? new Date();
  const dayIndex = d.getDay(); // 0 Sun ... 6 Sat
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayName = dayNames[dayIndex] || "Today";

  const key = getWeekdayKey(value);
  const scheduledId = schedule?.[key] || "";
  const isRestDay = scheduledId === "rest";
  const match = !isRestDay ? templates.find((t) => t.id === scheduledId) : undefined;
  return {
    dayName,
    isRestDay,
    templateId: match?.id || "",
    templateName: isRestDay ? "Active Rest Day" : match?.name || "",
    hasTemplate: !!match,
  };
};

const assignScheduleDays = (
  schedule: WeekSchedule,
  templates: Template[],
  days: Weekday[]
) => {
  const next = { ...schedule };
  days.forEach((day, idx) => {
    const template = templates[idx];
    if (template) next[day] = template.id;
  });
  return next;
};

function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    const parsed = JSON.parse(str);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function formatNumber(n: number) {
  const v = Number(n) || 0;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

const formatRepRange = (range: RepRange) => {
  if (!range) return "";
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
};

const SUPERSET_TAGS = ["A", "B", "C", "D"];

// -------------------- Common Exercise Library --------------------

// Note: This library powers the "Add from library" dropdown and the Program Generator.
// Keep names in sync with generator presets.
const COMMON_EXERCISES: Array<Omit<TemplateExercise, "id">> = [
  // Compounds
  {
    name: "Back Squat",
    defaultSets: 3,
    repRange: { min: 5, max: 8 },
    restSec: 150,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Front Squat",
    defaultSets: 3,
    repRange: { min: 5, max: 8 },
    restSec: 150,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Deadlift",
    defaultSets: 2,
    repRange: { min: 3, max: 5 },
    restSec: 180,
    weightStep: 10,
    autoProgress: true,
  },
  {
    name: "Romanian Deadlift",
    defaultSets: 3,
    repRange: { min: 6, max: 10 },
    restSec: 150,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Bench Press",
    defaultSets: 3,
    repRange: { min: 5, max: 8 },
    restSec: 150,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Incline Bench Press",
    defaultSets: 3,
    repRange: { min: 6, max: 10 },
    restSec: 150,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Overhead Press",
    defaultSets: 3,
    repRange: { min: 5, max: 8 },
    restSec: 150,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Barbell Row",
    defaultSets: 3,
    repRange: { min: 6, max: 10 },
    restSec: 150,
    weightStep: 5,
    autoProgress: true,
  },

  // Pulling / back
  {
    name: "Lat Pulldown",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Pull-Up",
    defaultSets: 3,
    repRange: { min: 5, max: 10 },
    restSec: 120,
    weightStep: 5,
    autoProgress: false,
  },

  // Legs accessories
  {
    name: "Leg Press",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 120,
    weightStep: 10,
    autoProgress: true,
  },
  {
    name: "Leg Curl",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 90,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Calf Raise",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },

  // Shoulders / arms
  {
    name: "Lateral Raise",
    defaultSets: 3,
    repRange: { min: 12, max: 20 },
    restSec: 60,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Triceps Pushdown",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Skull Crushers",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 75,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Dumbbell Curl",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 60,
    weightStep: 2.5,
    autoProgress: true,
  },
  {
    name: "Hammer Curl",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 60,
    weightStep: 2.5,
    autoProgress: true,
    },

  // Extra common moves (to make generator more varied)
  {
    name: "Seated Cable Row",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Chest Supported Row",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Machine Chest Press",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Dumbbell Bench Press",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Goblet Squat",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Leg Extension",
    defaultSets: 3,
    repRange: { min: 12, max: 15 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Hip Thrust",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 10,
    autoProgress: true,
  },
  {
    name: "Face Pull",
    defaultSets: 3,
    repRange: { min: 12, max: 20 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Bulgarian Split Squat",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },

  // Finishers (optional)
  {
    name: "Plank",
    defaultSets: 2,
    // reps treated as seconds
    repRange: { min: 30, max: 60 },
    restSec: 45,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "seconds",
  },
  {
    name: "Cable Crunch",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 60,
    weightStep: 5,
    autoProgress: false,
  },
  {
    name: "Cardio (optional)",
    defaultSets: 1,
    // reps treated as minutes
    repRange: { min: 10, max: 20 },
    restSec: 0,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "minutes",
  },

  // Cardio (actual options)
  {
    name: "Incline Walk (min)",
    defaultSets: 1,
    repRange: { min: 15, max: 25 },
    restSec: 0,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "minutes",
  },
  {
    name: "Stationary Bike (min)",
    defaultSets: 1,
    repRange: { min: 15, max: 30 },
    restSec: 0,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "minutes",
  },
  {
    name: "Row Machine (m)",
    defaultSets: 1,
    repRange: { min: 500, max: 2000 },
    restSec: 0,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "minutes",
  },
];

const buildCardioFinisher = (
  name = "Cardio Finisher (min)",
  duration: RepRange = { min: 30, max: 30 }
): TemplateExercise => ({
  id: uid(),
  name,
  defaultSets: 1,
  repRange: duration,
  restSec: 0,
  weightStep: 0,
  autoProgress: false,
  timeUnit: "minutes",
});

const appendCardioFinisher = (
  templates: Template[],
  label: string,
  duration?: RepRange
) =>
  templates.map((t) => ({
    ...t,
    exercises: [...(t.exercises || []), buildCardioFinisher(label, duration)],
  }));

const buildCoachMasonSplit = (): Template[] => [
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 1 Chest & Triceps",
    exercises: [
      {
        id: uid(),
        name: "Incline Dumbbell Press",
        defaultSets: 4,
        repRange: { min: 8, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Machine Chest Press",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Cable Fly",
        defaultSets: 3,
        repRange: { min: 15, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Incline Cable Fly",
        defaultSets: 2,
        repRange: { min: 12, max: 12 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Dips (to failure)",
        defaultSets: 3,
        repRange: { min: 8, max: 20 },
        restSec: 90,
        weightStep: 5,
        autoProgress: false,
      },
      {
        id: uid(),
        name: "Rope Pushdowns",
        defaultSets: 4,
        repRange: { min: 12, max: 15 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Overhead Rope Extensions",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Push-up (mechanical dropset)",
        defaultSets: 1,
        repRange: { min: 12, max: 20 },
        restSec: 0,
        weightStep: 0,
        autoProgress: false,
        setType: "dropset",
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 2 Back & Biceps",
    exercises: [
      {
        id: uid(),
        name: "Lat Pulldown",
        defaultSets: 4,
        repRange: { min: 8, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Chest Supported Row",
        defaultSets: 4,
        repRange: { min: 10, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Single-Arm Cable Row",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Straight-Arm Pulldown",
        defaultSets: 3,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Face Pulls",
        defaultSets: 3,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Incline Curls",
        defaultSets: 3,
        repRange: { min: 10, max: 12 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Hammer Curls",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Cable Curls",
        defaultSets: 2,
        repRange: { min: 12, max: 15 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 3 Shoulders & Arms",
    exercises: [
      {
        id: uid(),
        name: "Machine Shoulder Press",
        defaultSets: 4,
        repRange: { min: 8, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Dumbbell Laterals",
        defaultSets: 3,
        repRange: { min: 15, max: 15 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
        setType: "triset",
        supersetTag: "A",
      },
      {
        id: uid(),
        name: "Cable Laterals",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
        setType: "triset",
        supersetTag: "A",
      },
      {
        id: uid(),
        name: "Machine Laterals",
        defaultSets: 3,
        repRange: { min: 10, max: 10 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
        setType: "triset",
        supersetTag: "A",
      },
      {
        id: uid(),
        name: "Rear Delt Fly",
        defaultSets: 3,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Rope Pushdowns",
        defaultSets: 4,
        repRange: { min: 15, max: 15 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
        setType: "superset",
        supersetTag: "B",
      },
      {
        id: uid(),
        name: "EZ Cable Curls",
        defaultSets: 4,
        repRange: { min: 12, max: 12 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
        setType: "superset",
        supersetTag: "B",
      },
      {
        id: uid(),
        name: "Overhead Rope Extensions",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
        setType: "superset",
        supersetTag: "C",
      },
      {
        id: uid(),
        name: "Dumbbell Curls",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
        setType: "superset",
        supersetTag: "C",
      },
      {
        id: uid(),
        name: "Biceps 21s (finisher)",
        defaultSets: 1,
        repRange: { min: 21, max: 21 },
        restSec: 0,
        weightStep: 5,
        autoProgress: false,
        setType: "dropset",
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 4 Legs (Quad Focus)",
    exercises: [
      {
        id: uid(),
        name: "Leg Extensions",
        defaultSets: 3,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Hack Squat",
        defaultSets: 4,
        repRange: { min: 8, max: 12 },
        restSec: 150,
        weightStep: 10,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Bulgarian Split Squat",
        defaultSets: 3,
        repRange: { min: 10, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Romanian Deadlift",
        defaultSets: 3,
        repRange: { min: 10, max: 12 },
        restSec: 120,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Hamstring Curl",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Walking Lunges",
        defaultSets: 2,
        repRange: { min: 20, max: 20 },
        restSec: 90,
        weightStep: 5,
        autoProgress: false,
      },
      {
        id: uid(),
        name: "Calf Raises",
        defaultSets: 3,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 5 Upper Body Pump",
    exercises: [
      {
        id: uid(),
        name: "Incline Machine Press",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Wide-Grip Lat Pulldown",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Cable Row",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Upper Cable Fly",
        defaultSets: 3,
        repRange: { min: 12, max: 12 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Dumbbell Lateral Raises",
        defaultSets: 3,
        repRange: { min: 15, max: 15 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Rope Curls",
        defaultSets: 3,
        repRange: { min: 15, max: 15 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Rope Pushdowns",
        defaultSets: 3,
        repRange: { min: 15, max: 15 },
        restSec: 60,
        weightStep: 5,
        autoProgress: true,
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Day 6 Hamstrings, Glutes, Calves",
    exercises: [
      {
        id: uid(),
        name: "Barbell RDL",
        defaultSets: 4,
        repRange: { min: 8, max: 12 },
        restSec: 150,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Seated Hamstring Curl",
        defaultSets: 4,
        repRange: { min: 10, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Back Extensions",
        defaultSets: 3,
        repRange: { min: 12, max: 15 },
        restSec: 90,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Leg Press (feet high & wide)",
        defaultSets: 4,
        repRange: { min: 10, max: 15 },
        restSec: 120,
        weightStep: 10,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Walking Lunges",
        defaultSets: 2,
        repRange: { min: 20, max: 30 },
        restSec: 90,
        weightStep: 5,
        autoProgress: false,
      },
      {
        id: uid(),
        name: "Calf Raises",
        defaultSets: 4,
        repRange: { min: 15, max: 20 },
        restSec: 75,
        weightStep: 5,
        autoProgress: true,
      },
      {
        id: uid(),
        name: "Sled Push/Drag (optional)",
        defaultSets: 4,
        repRange: { min: 20, max: 40 },
        restSec: 90,
        weightStep: 0,
        autoProgress: false,
      },
      buildCardioFinisher("Cardio (post-workout)"),
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Daily Abs",
    exercises: [
      {
        id: uid(),
        name: "Hanging Knee Raises",
        defaultSets: 3,
        repRange: { min: 45, max: 45 },
        restSec: 15,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      },
      {
        id: uid(),
        name: "Cable or Weighted Crunches",
        defaultSets: 3,
        repRange: { min: 45, max: 45 },
        restSec: 15,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      },
      {
        id: uid(),
        name: "Russian Twists",
        defaultSets: 3,
        repRange: { min: 45, max: 45 },
        restSec: 15,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      },
      {
        id: uid(),
        name: "Plank with Hip Dips",
        defaultSets: 3,
        repRange: { min: 45, max: 45 },
        restSec: 15,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      },
      {
        id: uid(),
        name: "Reverse Crunches",
        defaultSets: 3,
        repRange: { min: 45, max: 45 },
        restSec: 15,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      },
    ],
  },
  {
    id: uid(),
    name: "Coach Mason's 2026 Cutting Split — Optional Abs 21s",
    exercises: [
      {
        id: uid(),
        name: "Ab 21s",
        defaultSets: 2,
        repRange: { min: 21, max: 21 },
        restSec: 60,
        weightStep: 0,
        autoProgress: false,
      },
    ],
  },
];

// -------------------- Data Model --------------------

const defaultState: AppState = {
  templates: [],
  sessions: [],
  goals: [],
  settings: {
    units: "lb",
    autoGoalMode: true,
    autoGoalHorizonWeeks: 6,
    strictRepRangeForProgress: true,
    powerliftingMode: false,
    darkMode: false,
    role: "athlete",
    theme: "iron",
    schedule: emptySchedule,
    profile: {
      name: "",
      age: "",
      height: "",
      weight: "",
      completed: false,
      introSeen: false,
    },
  },
};

// -------------------- Main Component --------------------

export default function WorkoutTrackerApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [state, setState] = useState<AppState>(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null;

    const parsed = stored
      ? safeJsonParse<AppState>(stored, defaultState)
      : defaultState;

    // Deep-merge settings so new fields (like darkMode) don't break older saves
    return {
      ...defaultState,
      ...parsed,
      settings: {
        ...defaultState.settings,
        ...(parsed as any).settings,
        role: ((parsed as any)?.settings?.role === "coach" ? "coach" : "athlete") as UserRole,
        theme:
          (parsed as any)?.settings?.theme === "iron" ||
          (parsed as any)?.settings?.theme === "dune" ||
          (parsed as any)?.settings?.theme === "noir"
            ? ((parsed as any).settings.theme as Theme)
            : "iron",
        schedule: {
          ...emptySchedule,
          ...((parsed as any)?.settings?.schedule || {}),
        },
        profile: {
          ...defaultState.settings.profile,
          ...((parsed as any)?.settings?.profile || {}),
        },
        powerliftingMode: !!(parsed as any)?.settings?.powerliftingMode,
      },
      templates: Array.isArray((parsed as any).templates)
        ? (parsed as any).templates
        : defaultState.templates,
      sessions: Array.isArray((parsed as any).sessions) ? (parsed as any).sessions : [],
      goals: Array.isArray((parsed as any).goals) ? (parsed as any).goals : [],
    };
  });

// Dark mode (shadcn / Tailwind compatible)
useEffect(() => {
  if (typeof window === "undefined") return;
  document.documentElement.classList.toggle(
    "dark",
    !!state.settings.darkMode
  );
}, [state.settings.darkMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.setAttribute("data-theme", state.settings.theme || "neon");
  }, [state.settings.theme]);

  const [activeTab, setActiveTab] = useState<
    "log" | "history" | "insights" | "calc" | "coach"
  >("log");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    state.templates?.[0]?.id || ""
  );
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionNotes, setSessionNotes] = useState("");
  const [search, setSearch] = useState("");
  const [forceLog, setForceLog] = useState(false);
  const [gymMode, setGymMode] = useState(false);
  const [gymStepIndex, setGymStepIndex] = useState(0);

  // log mode
  const [logMode, setLogMode] = useState<"template" | "custom">("template");
  const [customWorkoutName, setCustomWorkoutName] = useState("Custom Workout");
  const [customExercises, setCustomExercises] = useState<TemplateExercise[]>([]);

  // dialogs
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapData, setRecapData] = useState<{
    templateName: string;
    totalSets: number;
    totalVolume: number;
    totalTimeMin: number;
    exercises: number;
    prCount: number;
  } | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restPresetSec, setRestPresetSec] = useState(90);
  const [autoAdvanceAfterRest, setAutoAdvanceAfterRest] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [coachPackageText, setCoachPackageText] = useState("");
  const [clientImportText, setClientImportText] = useState("");
  const [clientSummary, setClientSummary] = useState<{
    name: string;
    totalSessions: number;
    totalVolume: number;
    vol7d: number;
    lastLabel: string;
  } | null>(null);

  const isCoach = state.settings.role === "coach";

  const needsOnboarding = !state.settings.profile?.completed;
  const needsIntro = !state.settings.profile?.introSeen && !state.settings.profile?.completed;

  const exportData = async () => {
    try {
      if (typeof window === "undefined") return;
      const payload = JSON.stringify(state, null, 2);

      // Always store payload for fallback UI
      setExportText(payload);

      // Safari (especially iOS) frequently blocks programmatic downloads
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

      // Prefer clipboard + dialog on Safari
      if (isSafari) {
        try {
          if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(payload);
            alert("Export copied to clipboard. Paste it somewhere safe.");
          }
        } catch {
          // ignore
        }
        setExportDialogOpen(true);
        return;
      }

      // Non-Safari: attempt file download
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `forgefit_export_${todayISO()}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error("Export failed", e);
      setExportDialogOpen(true);
      alert("Export failed. Use the export window to copy your data.");
    }
  };

  const addGoal = (g: Omit<Goal, "id" | "status">) => {
    const next: Goal = {
      id: uid(),
      status: "active",
      exerciseName: g.exerciseName,
      metric: g.metric,
      targetValue: g.targetValue,
      dueDateISO: g.dueDateISO,
    };
    setState((p) => ({ ...p, goals: [next, ...(p.goals || [])] }));
  };

  const markGoalDone = (goalId: string) => {
    setState((p) => ({
      ...p,
      goals: (p.goals || []).map((x) => (x.id === goalId ? { ...x, status: "done" } : x)),
    }));
  };

  const archiveGoal = (goalId: string) => {
    setState((p) => ({
      ...p,
      goals: (p.goals || []).map((x) => (x.id === goalId ? { ...x, status: "archived" } : x)),
    }));
  };

  const applyAutoGoals = () => {
    const autos = buildAutoGoals({ history: exerciseHistory, settings: state.settings });
    if (!autos.length) {
      alert("Not enough history yet. Log a few workouts first.");
      return;
    }
    // Merge: replace active auto e1rm goals by exercise name (simple + predictable)
    setState((p) => {
      const existing = p.goals || [];
      const keep = existing.filter((x) => x.status !== "active" || x.metric !== "e1rm");
      const nextGoals: Goal[] = autos.map((a) => ({ id: uid(), status: "active", ...a }));
      return { ...p, goals: [...nextGoals, ...keep] };
    });
  };

  const deleteSession = (sessionId: string) => {
    setState((p) => ({ ...p, sessions: (p.sessions || []).filter((s) => s.id !== sessionId) }));
  };

  const saveSession = () => {
    const t = selectedTemplate;
    if (!t) return alert("Select a template first.");

    const timeUnitMap = new Map(
      (workingEntries || []).map((we) => [we.exerciseId, we.templateHint?.timeUnit])
    );

    const entries: SessionExerciseEntry[] = (workingEntries || []).map((we) => {
      const sets = (we.sets || [])
        .map((s) => ({
          reps: Number(s.reps) || 0,
          weight: Number(s.weight) || 0,
          rpe: s.rpe ? Number(s.rpe) : undefined,
          notes: s.notes || undefined,
          setType: s.setType,
          supersetTag: s.supersetTag || undefined,
        }))
        .filter((s) => (s.reps > 0 && (we.templateHint?.timeUnit ? true : s.weight > 0)));

      return {
        exerciseId: we.exerciseId,
        exerciseName: we.exerciseName,
        sets,
      };
    });

    const nonEmpty = entries.filter((e) => (e.sets || []).length > 0);
    if (!nonEmpty.length) return alert("Log at least one set.");

    const session: Session = {
      id: uid(),
      dateISO: sessionDate || todayISO(),
      templateId: t.id,
      templateName: t.name,
      entries: nonEmpty,
      notes: sessionNotes?.trim() ? sessionNotes.trim() : undefined,
    };

    const totals = nonEmpty.reduce(
      (acc, entry) => {
        const timeUnit = timeUnitMap.get(entry.exerciseId);
        for (const set of entry.sets) {
          acc.totalSets += 1;
          if (timeUnit === "minutes") {
            acc.totalTimeMin += Number(set.reps) || 0;
          } else if (timeUnit === "seconds") {
            acc.totalTimeMin += (Number(set.reps) || 0) / 60;
          } else {
            acc.totalVolume += (Number(set.weight) || 0) * (Number(set.reps) || 0);
          }
        }
        return acc;
      },
      { totalSets: 0, totalVolume: 0, totalTimeMin: 0 }
    );

    const previousMaxByExercise = new Map<string, number>();
    for (const past of state.sessions || []) {
      for (const entry of past.entries || []) {
        const maxSetWeight = Math.max(0, ...entry.sets.map((s) => Number(s.weight) || 0));
        const prev = previousMaxByExercise.get(entry.exerciseName) ?? 0;
        if (maxSetWeight > prev) previousMaxByExercise.set(entry.exerciseName, maxSetWeight);
      }
    }
    const prCount = nonEmpty.reduce((count, entry) => {
      const prev = previousMaxByExercise.get(entry.exerciseName) ?? 0;
      const maxSetWeight = Math.max(0, ...entry.sets.map((s) => Number(s.weight) || 0));
      return maxSetWeight > prev ? count + 1 : count;
    }, 0);

    setState((p) => ({ ...p, sessions: [session, ...(p.sessions || [])] }));
    setSessionNotes("");
    setRecapData({
      templateName: t.name,
      totalSets: totals.totalSets,
      totalVolume: totals.totalVolume,
      totalTimeMin: totals.totalTimeMin,
      exercises: nonEmpty.length,
      prCount,
    });
    setRecapOpen(true);
  };

  const importData = (jsonText: string) => {
    try {
      const maybeCoach = JSON.parse(jsonText);
      if (maybeCoach?.type === "forgefit_coach_package") {
        const templateIdMap = new Map<string, string>();
        const templates: Template[] = Array.isArray(maybeCoach.templates)
          ? maybeCoach.templates.map((t: Template) => {
              const nextId = uid();
              if (t.id) templateIdMap.set(t.id, nextId);
              return {
                ...t,
                id: nextId,
                exercises: (t.exercises || []).map((e) => ({ ...e, id: e.id || uid() })),
              };
            })
          : [];
        const schedule = Object.fromEntries(
          Object.entries({ ...emptySchedule, ...(maybeCoach.schedule || {}) }).map(([day, value]) => {
            const raw = typeof value === "string" ? value : "";
            return [day, templateIdMap.get(raw) || raw];
          })
        ) as WeekSchedule;
        const goals: Goal[] = Array.isArray(maybeCoach.goals)
          ? maybeCoach.goals.map((g: Goal) => ({
              ...g,
              id: g.id || uid(),
              status: g.status || "active",
            }))
          : [];

        setState((p) => ({
          ...p,
          templates: [...templates, ...(p.templates || [])],
          goals: goals.length ? [...goals, ...(p.goals || [])] : p.goals,
          settings: { ...p.settings, schedule },
        }));
        setImportDialogOpen(false);
        alert("Coach plan imported!");
        return;
      }

      const parsed = safeJsonParse<AppState>(jsonText, defaultState);
      // defensive merge
      const merged: AppState = {
        ...defaultState,
        ...parsed,
        settings: {
          ...defaultState.settings,
          ...(parsed as any).settings,
          role: ((parsed as any)?.settings?.role === "coach" ? "coach" : "athlete") as UserRole,
        },
        templates: Array.isArray((parsed as any).templates) ? (parsed as any).templates : defaultState.templates,
        sessions: Array.isArray((parsed as any).sessions) ? (parsed as any).sessions : [],
        goals: Array.isArray((parsed as any).goals) ? (parsed as any).goals : [],
      };
      setState(merged);
      setImportDialogOpen(false);
      alert("Imported!");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Import failed", e);
      alert("Import failed. Make sure it's valid ForgeFit JSON.");
    }
  };

  const buildCoachPackage = () => {
    const payload = {
      type: "forgefit_coach_package",
      version: 1,
      createdAt: new Date().toISOString(),
      templates: state.templates,
      schedule: state.settings.schedule,
      goals: state.goals,
    };
    setCoachPackageText(JSON.stringify(payload, null, 2));
  };

  const importClientReport = () => {
    try {
      const parsed = JSON.parse(clientImportText);
      const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
      const sortedSessions = [...sessions].sort((a, b) =>
        String(b.dateISO).localeCompare(String(a.dateISO))
      );
      const name = parsed?.settings?.profile?.name || "Client";
      const totalSessions = sessions.length;
      let totalVolume = 0;
      let vol7d = 0;

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      for (const s of sessions) {
        const sessionDate = new Date(s.dateISO);
        for (const e of s.entries || []) {
          for (const set of e.sets || []) {
            const reps = Number(set.reps) || 0;
            const wt = Number(set.weight) || 0;
            const vol = reps * wt;
            totalVolume += vol;
            if (sessionDate >= sevenDaysAgo) vol7d += vol;
          }
        }
      }

      const last = sortedSessions[0]?.dateISO
        ? new Date(sortedSessions[0].dateISO)
        : null;

      setClientSummary({
        name,
        totalSessions,
        totalVolume,
        vol7d,
        lastLabel: last ? last.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—",
      });
      setClientImportText("");
      alert("Client report loaded.");
    } catch {
      alert("Invalid client report JSON.");
    }
  };

  const resetAll = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(LS_KEY);
      } catch {}
    }
    setState(defaultState);
    setSelectedTemplateId(defaultState.templates[0]?.id || "");
    setSessionDate(todayISO());
    setSessionNotes("");
    setSearch("");
    setConfirmResetOpen(false);
  };

  const selectedTemplate = useMemo(() => {
    if (logMode === "custom") {
      const exs = (customExercises || []).map((ex) => ({
        ...ex,
        id: ex.id || uid(),
      }));
      return {
        id: "custom",
        name: (customWorkoutName || "Custom Workout").trim() || "Custom Workout",
        exercises: exs,
      } as Template;
    }
    return state.templates.find((t) => t.id === selectedTemplateId) || state.templates[0];
  }, [state.templates, selectedTemplateId, logMode, customExercises, customWorkoutName]);

  // Derived data
  const exerciseHistory = useMemo(() => buildExerciseHistory(state.sessions), [state.sessions]);

  const big3Stats = useMemo(() => {
    const getBest = (include: RegExp[], exclude: RegExp[] = []) => {
      let best: { name: string; value: number; date: string } | null = null;
      for (const name of Object.keys(exerciseHistory)) {
        const lower = name.toLowerCase();
        if (!include.some((re) => re.test(lower))) continue;
        if (exclude.some((re) => re.test(lower))) continue;
        const records = exerciseHistory[name] || [];
        const top = records.reduce(
          (acc: { value: number; date: string } | null, rec: any) => {
            if (!rec?.topE1RM) return acc;
            if (!acc || rec.topE1RM > acc.value) {
              return { value: rec.topE1RM, date: rec.dateISO };
            }
            return acc;
          },
          null
        );
        if (top && (!best || top.value > best.value)) {
          best = { name, value: top.value, date: top.date };
        }
      }
      return best;
    };

    return {
      squat: getBest([/squat/]),
      bench: getBest([/bench press/]),
      deadlift: getBest([/deadlift/], [/romanian deadlift/]),
    };
  }, [exerciseHistory]);

  const insights = useMemo(
    () =>
      computeInsights({
        template: selectedTemplate,
        history: exerciseHistory,
        settings: state.settings,
      }),
    [selectedTemplate, exerciseHistory, state.settings]
  );

  const filteredSessions = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const base = [...(state.sessions || [])].sort((a, b) =>
      String(b.dateISO).localeCompare(String(a.dateISO))
    );
    if (!q) return base;
    return base.filter((s) => {
      const hay = [
        s.templateName,
        s.dateISO,
        ...(s.entries || []).map((e) => e.exerciseName),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [state.sessions, search]);

  const [workingEntries, setWorkingEntries] = useState<WorkingEntry[]>(() =>
    buildEntriesFromTemplate(selectedTemplate, { suggestions: insights.suggestions })
  );

  const mainEntries = useMemo(
    () =>
      workingEntries.filter(
        (e) =>
          e.templateHint?.timeUnit !== "seconds" && e.templateHint?.timeUnit !== "minutes"
      ),
    [workingEntries]
  );

  const finisherEntries = useMemo(
    () =>
      workingEntries.filter(
        (e) =>
          e.templateHint?.timeUnit === "seconds" || e.templateHint?.timeUnit === "minutes"
      ),
    [workingEntries]
  );

  const groupedMainEntries = useMemo(() => {
    const groupedIds = new Set<string>();
    const groups: Array<
      | { type: "single"; entries: WorkingEntry[] }
      | { type: "superset"; tag: string; entries: WorkingEntry[] }
      | { type: "triset"; tag: string; entries: WorkingEntry[] }
    > = [];

    for (const entry of mainEntries) {
      if (groupedIds.has(entry.exerciseId)) continue;
      const type = entry.templateHint?.setType;
      const tag =
        type === "superset" || type === "triset"
          ? entry.templateHint?.supersetTag || "Group"
          : "";
      if (tag && (type === "superset" || type === "triset")) {
        const entries = mainEntries.filter(
          (e) =>
            e.templateHint?.setType === type &&
            (e.templateHint?.supersetTag || "Group") === tag
        );
        if ((type === "superset" && entries.length > 1) || (type === "triset" && entries.length > 2)) {
          entries.forEach((e) => groupedIds.add(e.exerciseId));
          groups.push({ type: type === "triset" ? "triset" : "superset", tag, entries });
          continue;
        }
      }
      groupedIds.add(entry.exerciseId);
      groups.push({ type: "single", entries: [entry] });
    }
    return groups;
  }, [mainEntries]);

  const sessionProgress = useMemo(() => {
    const planned = (workingEntries || []).reduce((acc, entry) => {
      const sets = entry.templateHint?.defaultSets || entry.sets.length || 0;
      return acc + sets;
    }, 0);
    const completed = (workingEntries || []).reduce((acc, entry) => {
      const isTimed =
        entry.templateHint?.timeUnit === "seconds" || entry.templateHint?.timeUnit === "minutes";
      const done = (entry.sets || []).filter((s) =>
        isTimed ? Number(s.reps) > 0 : Number(s.reps) > 0 && Number(s.weight) > 0
      ).length;
      return acc + done;
    }, 0);
    const pct = planned ? Math.round((completed / planned) * 100) : 0;
    return { planned, completed, pct };
  }, [workingEntries]);

  useEffect(() => {
    if (!restRunning) return;
    if (restSeconds <= 0) {
      setRestRunning(false);
      return;
    }
    const id = window.setInterval(() => {
      setRestSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [restRunning, restSeconds]);

  const mainIndexMap = useMemo(
    () => new Map(mainEntries.map((e, i) => [e.exerciseId, i])),
    [mainEntries]
  );

  const gymSteps = useMemo(() => {
    const steps: Array<{ exerciseId: string; setIndex: number }> = [];

    const addSingle = (entry: WorkingEntry) => {
      const count = Math.max(entry.sets.length, 1);
      for (let i = 0; i < count; i += 1) {
        steps.push({ exerciseId: entry.exerciseId, setIndex: i });
      }
    };

    const addGrouped = (entries: WorkingEntry[]) => {
      const maxSets = Math.max(...entries.map((e) => e.sets.length), 1);
      for (let i = 0; i < maxSets; i += 1) {
        entries.forEach((e) => steps.push({ exerciseId: e.exerciseId, setIndex: i }));
      }
    };

    groupedMainEntries.forEach((group) => {
      if (group.type === "superset" || group.type === "triset") {
        addGrouped(group.entries);
        return;
      }
      addSingle(group.entries[0]);
    });

    finisherEntries.forEach((entry) => addSingle(entry));
    return steps;
  }, [groupedMainEntries, finisherEntries]);

  useEffect(() => {
    if (restRunning) return;
    if (restSeconds !== 0) return;
    if (!autoAdvanceAfterRest) return;
    setAutoAdvanceAfterRest(false);
    setGymStepIndex((i) => Math.min(Math.max(gymSteps.length - 1, 0), i + 1));
  }, [autoAdvanceAfterRest, gymSteps.length, restRunning, restSeconds]);

  useEffect(() => {
    if (!gymMode) return;
    if (gymStepIndex >= gymSteps.length) {
      setGymStepIndex(Math.max(0, gymSteps.length - 1));
    }
  }, [gymMode, gymStepIndex, gymSteps.length]);

  const scheduleInfo = useMemo(
    () => getScheduleInfo(sessionDate, state.templates || [], state.settings.schedule),
    [sessionDate, state.templates, state.settings.schedule]
  );

  const scheduledDayOptions = useMemo(() => {
    const schedule = state.settings.schedule || emptySchedule;
    return WEEKDAYS.filter((day) => Boolean(schedule[day.key]));
  }, [state.settings.schedule]);

  const scheduledDayLabel = (key: Weekday) => {
    const schedule = state.settings.schedule || emptySchedule;
    const entry = schedule[key];
    if (entry === "rest") return `${key.toUpperCase()} • Rest`;
    const match = state.templates.find((t) => t.id === entry);
    return match ? `${key.toUpperCase()} • ${match.name}` : key.toUpperCase();
  };

  const currentGymStep = gymSteps[gymStepIndex];
  const currentGymEntry = currentGymStep
    ? workingEntries.find((e) => e.exerciseId === currentGymStep.exerciseId)
    : undefined;
  const currentGymSet =
    currentGymEntry && currentGymStep
      ? currentGymEntry.sets[currentGymStep.setIndex] || {
          reps: "",
          weight: "",
          rpe: "",
          notes: "",
        }
      : undefined;

  const updateGymSet = (patch: Partial<WorkingEntry["sets"][number]>) => {
    if (!currentGymEntry || !currentGymStep) return;
    setWorkingEntries((prev) =>
      prev.map((entry) => {
        if (entry.exerciseId !== currentGymEntry.exerciseId) return entry;
        const nextSets = [...entry.sets];
        while (nextSets.length <= currentGymStep.setIndex) {
          nextSets.push({
            reps: "",
            weight: "",
            rpe: "",
            notes: "",
            setType: entry.templateHint?.setType || "normal",
            supersetTag: entry.templateHint?.supersetTag || "",
          });
        }
        nextSets[currentGymStep.setIndex] = {
          ...nextSets[currentGymStep.setIndex],
          ...patch,
        };
        return { ...entry, sets: nextSets };
      })
    );
  };

  const addGymSet = () => {
    if (!currentGymEntry) return;
    const type = currentGymEntry.templateHint?.setType;
    const tag = currentGymEntry.templateHint?.supersetTag;
    setWorkingEntries((prev) =>
      prev.map((entry) => {
        if (
          type &&
          (type === "superset" || type === "triset") &&
          entry.templateHint?.setType === type &&
          entry.templateHint?.supersetTag === tag
        ) {
          return {
            ...entry,
            sets: [
              ...entry.sets,
              {
                reps: "",
                weight: "",
                rpe: "",
                notes: "",
                setType: type,
                supersetTag: tag || "",
              },
            ],
          };
        }
        if (entry.exerciseId !== currentGymEntry.exerciseId) return entry;
        return {
          ...entry,
          sets: [
            ...entry.sets,
            {
              reps: "",
              weight: "",
              rpe: "",
              notes: "",
              setType: entry.templateHint?.setType || "normal",
              supersetTag: entry.templateHint?.supersetTag || "",
            },
          ],
        };
      })
    );
  };

const headerStats = useMemo(() => {
  const sessions = [...state.sessions].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );

  const today = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);

  const sessionDays = new Set<string>();
  let totalVolume = 0;

  for (const s of sessions) {
    const d = new Date(s.dateISO);
    sessionDays.add(dayKey(d));

    for (const e of s.entries) {
      for (const set of e.sets) {
        const reps = Number(set.reps) || 0;
        const wt = Number(set.weight) || 0;
        totalVolume += reps * wt;
      }
    }
  }

  // streak (consecutive days with at least one session)
  let streak = 0;
  const cursor = new Date(dayKey(today));
  while (sessionDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  // last 7 days volume
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const vol7d = sessions
    .filter((s) => new Date(s.dateISO) >= new Date(dayKey(sevenDaysAgo)))
    .reduce((acc, s) => {
      let v = 0;
      for (const e of s.entries) for (const set of e.sets) v += (Number(set.reps) || 0) * (Number(set.weight) || 0);
      return acc + v;
    }, 0);

  const last = sessions[0]?.dateISO ? new Date(sessions[0].dateISO) : null;

  return {
    totalSessions: sessions.length,
    streak,
    vol7d,
    totalVolume,
    lastLabel: last
      ? last.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—",
  };
}, [state.sessions]);



  useEffect(() => {
    setWorkingEntries(
      buildEntriesFromTemplate(selectedTemplate, { suggestions: insights.suggestions })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplateId, logMode, customExercises, customWorkoutName]);

  useEffect(() => {
    setForceLog(false);
  }, [sessionDate]);

  useEffect(() => {
    if (logMode !== "template") return;
    if (!scheduleInfo.templateId) return;
    if (selectedTemplateId === scheduleInfo.templateId) return;
    setSelectedTemplateId(scheduleInfo.templateId);
  }, [scheduleInfo.templateId, logMode]);

  // Persist state
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-background" />;
  }

  if (needsIntro) {
    return (
      <GetStartedScreen
        onStart={() =>
          setState((p) => ({
            ...p,
            settings: {
              ...p.settings,
              profile: { ...p.settings.profile, introSeen: true },
            },
          }))
        }
      />
    );
  }

  if (needsOnboarding) {
    return (
      <OnboardingScreen
        settings={state.settings}
        onComplete={(profile, templates, days) => {
          setState((p) => ({
            ...p,
            templates,
            settings: {
              ...p.settings,
              profile,
              schedule: assignScheduleDays(emptySchedule, templates, days),
            },
          }));
          setSelectedTemplateId(templates[0]?.id || "");
          setActiveTab("log");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      {/* background accents */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,var(--glow-a),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_90%_10%,var(--glow-b),transparent)]" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            opacity: "var(--pattern-opacity)",
            backgroundImage: "var(--pattern-image)",
            backgroundSize: "var(--pattern-size)",
          }}
        />
      </div>
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        {/* Header */}
        <div className="sticky top-0 z-40 -mx-4 md:-mx-8 px-4 md:px-8 py-4 mb-5">
          <div className="rounded-3xl border border-foreground/20 bg-card/90 shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
            <div className="px-5 md:px-8 py-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-center shadow-inner overflow-hidden">
                    <img
                      src="/forgefit-logo.svg"
                      alt="ForgeFit"
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
                        className="rounded-full border-primary/40 bg-primary/15 text-primary uppercase tracking-[0.35em] text-[0.6rem] px-2.5 py-1"
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

                {/* Quick actions */}
                <div className="flex flex-wrap items-center gap-2 justify-start md:justify-end">
                  <Button
                    variant="secondary"
                    className="rounded-2xl bg-card/80 hover:bg-card border border-foreground/15 uppercase text-[0.62rem] tracking-[0.28em]"
                    onClick={() => setTemplateDialogOpen(true)}
                  >
                    <ClipboardList className="h-4 w-4" />
                    Templates
                  </Button>

                  <Button
                    variant="secondary"
                    className="rounded-2xl bg-card/80 hover:bg-card border border-foreground/15 uppercase text-[0.62rem] tracking-[0.28em]"
                    onClick={() => setGeneratorOpen(true)}
                  >
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </Button>

                  <Button
                    variant="secondary"
                    className="rounded-2xl bg-card/80 hover:bg-card border border-foreground/15 uppercase text-[0.62rem] tracking-[0.28em]"
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>

                  <Button
                    variant="secondary"
                    className="rounded-2xl bg-card/80 hover:bg-card border border-foreground/15 uppercase text-[0.62rem] tracking-[0.28em]"
                    onClick={exportData}
                  >
                    <Download className="h-4 w-4" />
                    Export
                  </Button>

                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl border-foreground/20"
                    onClick={() => setSettingsDialogOpen(true)}
                    aria-label="Open settings"
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </Button>

                </div>
              </div>

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-2xl border border-foreground/20 bg-card/80 px-3 py-2 shadow-[0_16px_32px_rgba(0,0,0,0.18)] border-l-4 border-l-primary/60">
                  <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                    <Flame className="h-4 w-4" /> Streak
                  </div>
                  <div className="mt-1 text-2xl font-display">{headerStats.streak}d</div>
                </div>

                <div className="rounded-2xl border border-foreground/20 bg-card/80 px-3 py-2 shadow-[0_16px_32px_rgba(0,0,0,0.18)] border-l-4 border-l-primary/60">
                  <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                    <History className="h-4 w-4" /> Sessions
                  </div>
                  <div className="mt-1 text-2xl font-display">{headerStats.totalSessions}</div>
                </div>

                <div className="rounded-2xl border border-foreground/20 bg-card/80 px-3 py-2 shadow-[0_16px_32px_rgba(0,0,0,0.18)] border-l-4 border-l-primary/60">
                  <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                    <TrendingUp className="h-4 w-4" /> 7d Volume
                  </div>
                  <div className="mt-1 text-2xl font-display">{Math.round(headerStats.vol7d).toLocaleString()}</div>
                </div>

                <div className="rounded-2xl border border-foreground/20 bg-card/80 px-3 py-2 shadow-[0_16px_32px_rgba(0,0,0,0.18)] border-l-4 border-l-primary/60">
                  <div className="flex items-center gap-2 text-[0.62rem] text-muted-foreground uppercase tracking-[0.3em]">
                    <CalendarDays className="h-4 w-4" /> Last
                  </div>
                  <div className="mt-1 text-2xl font-display">{headerStats.lastLabel}</div>
                </div>
              </div>

              {/* Main nav */}
              <div className="mt-4">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                  <TabsList
                    className={`w-full rounded-2xl bg-card/90 border border-foreground/20 p-1 flex md:grid ${isCoach ? "md:grid-cols-5" : "md:grid-cols-4"} gap-1 md:gap-0 overflow-x-auto shadow-[0_14px_30px_rgba(0,0,0,0.18)]`}
                  >
                    <TabsTrigger
                      value="log"
                      className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" /> Log
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <History className="h-4 w-4" /> History
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="insights"
                      className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Insights
                      </span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="calc"
                      className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <Target className="h-4 w-4" /> 1RM
                      </span>
                    </TabsTrigger>
                    {isCoach ? (
                      <TabsTrigger
                        value="coach"
                        className="rounded-xl uppercase text-[0.6rem] sm:text-[0.62rem] tracking-[0.24em] sm:tracking-[0.32em] whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/20 data-[state=active]:text-foreground data-[state=active]:shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
                      >
                        <span className="inline-flex items-center gap-2">
                          <SettingsIcon className="h-4 w-4" /> Coach
                        </span>
                      </TabsTrigger>
                    ) : null}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

{/* -------------------- Dialogs -------------------- */}

        <TemplateManagerDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          state={state}
          setState={setState}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
        />

        <ProgramGeneratorDialog
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          units={state.settings.units}
          onGenerate={(templates, days) => {
            setState((p) => {
              const nextTemplates = [...templates, ...p.templates];
              const nextSchedule = days.length
                ? assignScheduleDays(p.settings.schedule, templates, days)
                : p.settings.schedule;
              return {
                ...p,
                templates: nextTemplates,
                settings: { ...p.settings, schedule: nextSchedule },
              };
            });
            const first = templates[0];
            if (first) {
              setSelectedTemplateId(first.id);
              setActiveTab("log");
            }
          }}
          onAddCoachSplit={(templates, days) => {
            setState((p) => {
              const nextTemplates = [...templates, ...p.templates];
              const nextSchedule = days.length
                ? assignScheduleDays(p.settings.schedule, templates, days)
                : p.settings.schedule;
              return {
                ...p,
                templates: nextTemplates,
                settings: { ...p.settings, schedule: nextSchedule },
              };
            });
            const first = templates[0];
            if (first) {
              setSelectedTemplateId(first.id);
              setActiveTab("log");
            }
          }}
        />

        <GoalDialog
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          units={state.settings.units}
          existingExercises={Object.keys(exerciseHistory)}
          onAdd={addGoal}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={importData}
        />

        <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
            <DialogHeader>
              <DialogTitle>Export data</DialogTitle>
              <DialogDescription>
                If the download button is blocked on your device, copy this JSON and save it somewhere safe.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label>ForgeFit JSON</Label>
              <textarea
                value={exportText}
                readOnly
                className="min-h-[260px] w-full rounded-xl border bg-background p-3 text-sm"
              />
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    if (navigator?.clipboard?.writeText) {
                      await navigator.clipboard.writeText(exportText || "");
                      alert("Copied to clipboard!");
                      return;
                    }
                  } catch {}
                  alert("Copy failed on this browser. Select the text and copy manually.");
                }}
              >
                Copy JSON
              </Button>
              <Button onClick={() => setExportDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Update profile, schedule, and training rules in one place.
              </DialogDescription>
            </DialogHeader>
            <SettingsPanel
              settings={state.settings}
              templates={state.templates}
              onChange={(s) => setState((p) => ({ ...p, settings: s }))}
              onResetRequest={() => setConfirmResetOpen(true)}
            />
            <DialogFooter>
              <Button onClick={() => setSettingsDialogOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={recapOpen} onOpenChange={setRecapOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Workout Recap</DialogTitle>
              <DialogDescription>
                {recapData?.templateName || "Session"} • Great work today.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-foreground/20 bg-card/70 p-3 text-sm">
              {recapData?.prCount
                ? `New PRs unlocked: ${recapData.prCount}. Keep that momentum.`
                : "Solid work. Show up again and the numbers will move."}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Total sets
                </div>
                <div className="text-2xl font-display">
                  {recapData?.totalSets ?? 0}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Exercises logged
                </div>
                <div className="text-2xl font-display">
                  {recapData?.exercises ?? 0}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Volume
                </div>
                <div className="text-2xl font-display">
                  {Math.round(recapData?.totalVolume || 0).toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  {state.settings.units}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Conditioning
                </div>
                <div className="text-2xl font-display">
                  {Math.round(recapData?.totalTimeMin || 0)} min
                </div>
                <div className="text-xs text-muted-foreground">Cardio + timed work</div>
              </div>
            </div>
            <div className="rounded-xl border p-3 mt-3">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Personal records
              </div>
              <div className="text-2xl font-display">
                {recapData?.prCount ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">
                New exercise bests this session.
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRecapOpen(false);
                  setActiveTab("history");
                }}
              >
                View history
              </Button>
              <Button onClick={() => setRecapOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Reset everything?</DialogTitle>
              <DialogDescription>
                This clears templates, sessions, and goals on this device.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setConfirmResetOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={resetAll}>
                Reset
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* -------------------- Pages -------------------- */}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsContent value="log" className="mt-0">
            <div className="space-y-4">
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <Sparkles className="h-5 w-5" /> Coach suggestions
                  </CardTitle>
                  <CardDescription>
                    Accept or skip. Suggestions auto-adjust based on your last sessions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.keys(insights.suggestions).length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Log a few workouts with top sets to unlock suggestions.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(insights.suggestions).slice(0, 8).map(([name, s]) => (
                        <div key={name} className="rounded-2xl border p-3">
                          <div className="font-medium">{name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Next: {s.next.weight}
                            {state.settings.units} × {s.next.reps}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{s.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={`rounded-2xl shadow-md ${setupCollapsed ? "py-1" : ""}`}>
                <CardHeader className={setupCollapsed ? "py-1 px-3" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className={`flex items-center gap-2 font-display uppercase tracking-[0.2em] ${setupCollapsed ? "text-sm" : "text-sm md:text-base"}`}>
                        {setupCollapsed ? null : <ClipboardList className="h-5 w-5" />}
                        {setupCollapsed ? "Setup" : "Workout setup"}
                      </CardTitle>
                      {setupCollapsed ? null : (
                        <CardDescription>
                          Choose a template or build a custom workout before you start logging.
                        </CardDescription>
                      )}
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      className="rounded-full text-muted-foreground hover:text-foreground"
                      onClick={() => setSetupCollapsed((v) => !v)}
                      aria-label={setupCollapsed ? "Expand workout setup" : "Collapse workout setup"}
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${setupCollapsed ? "-rotate-90" : ""}`}
                      />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className={`space-y-4 ${setupCollapsed ? "hidden" : ""}`}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        variant={logMode === "template" ? "default" : "outline"}
                        onClick={() => setLogMode("template")}
                      >
                        Use template
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        variant={logMode === "custom" ? "default" : "outline"}
                        onClick={() => setLogMode("custom")}
                      >
                        Create your own
                      </Button>
                    </div>

                    {logMode === "template" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => setTemplateDialogOpen(true)}
                      >
                        Edit templates
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => {
                          if ((customExercises || []).length === 0) {
                            alert("Add at least one exercise first.");
                            return;
                          }
                          const newTemplate: Template = {
                            id: uid(),
                            name: (customWorkoutName || "Custom Workout").trim() || "Custom Workout",
                            exercises: (customExercises || []).map((e) => ({
                              ...e,
                              id: e.id || uid(),
                            })),
                          };
                          setState((p) => ({ ...p, templates: [newTemplate, ...(p.templates || [])] }));
                          setSelectedTemplateId(newTemplate.id);
                          setLogMode("template");
                          alert("Saved as a template!");
                        }}
                      >
                        Save as template
                      </Button>
                    )}
                  </div>

                  {logMode === "template" ? (
                    <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1fr_1fr] gap-3">
                      <div className="space-y-1">
                        <Label>Template</Label>
                        <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue className="truncate" />
                          </SelectTrigger>
                          <SelectContent>
                            {state.templates.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Date</Label>
                        <Input value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} placeholder="YYYY-MM-DD" />
                      </div>
                      <div className="space-y-1">
                        <Label>Units</Label>
                        <Select
                          value={state.settings.units}
                          onValueChange={(v) => setState((p) => ({ ...p, settings: { ...p.settings, units: v as Units } }))}
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue className="truncate" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lb">lb</SelectItem>
                            <SelectItem value="kg">kg</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <Label>Workout name</Label>
                          <Input
                            value={customWorkoutName}
                            onChange={(e) => setCustomWorkoutName(e.target.value)}
                            placeholder="Custom Workout"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label>Date</Label>
                          <Input value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} placeholder="YYYY-MM-DD" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label>Units</Label>
                          <Select
                            value={state.settings.units}
                            onValueChange={(v) => setState((p) => ({ ...p, settings: { ...p.settings, units: v as Units } }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="lb">lb</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1 md:col-span-2">
                          <Label>Add exercise</Label>
                          <div className="flex items-center gap-2">
                            <Select
                              onValueChange={(v) => {
                                const preset = COMMON_EXERCISES.find((x) => x.name === v);
                                if (!preset) return;
                                setCustomExercises((prev) => [
                                  ...(prev || []),
                                  { id: uid(), ...preset },
                                ]);
                              }}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Pick from common exercises" />
                              </SelectTrigger>
                              <SelectContent>
                                {COMMON_EXERCISES.map((item) => (
                                  <SelectItem key={item.name} value={item.name}>
                                    {item.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() =>
                                setCustomExercises((prev) => [
                                  ...(prev || []),
                                  {
                                    id: uid(),
                                    name: "New Exercise",
                                    defaultSets: 3,
                                    repRange: { min: 8, max: 12 },
                                    restSec: 120,
                                    weightStep: 5,
                                    autoProgress: true,
                                  },
                                ])
                              }
                            >
                              <Plus className="h-4 w-4 mr-2" /> Blank
                            </Button>
                          </div>
                        </div>
                      </div>

                      {(customExercises || []).length === 0 ? (
                        <div className="text-sm text-muted-foreground">
                          Add a few exercises to start building your workout.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(customExercises || []).map((ex) => (
                            <div key={ex.id} className="rounded-2xl border p-3">
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Name</Label>
                                    <Input
                                      value={ex.name}
                                      onChange={(e) =>
                                        setCustomExercises((prev) =>
                                          (prev || []).map((x) =>
                                            x.id === ex.id ? { ...x, name: e.target.value } : x
                                          )
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Sets</Label>
                                      <Input
                                        inputMode="numeric"
                                        value={ex.defaultSets}
                                        onChange={(e) => {
                                          const v = clamp(Number(e.target.value) || 1, 1, 12);
                                          setCustomExercises((prev) =>
                                            (prev || []).map((x) => (x.id === ex.id ? { ...x, defaultSets: v } : x))
                                          );
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Min</Label>
                                      <Input
                                        inputMode="numeric"
                                        value={ex.repRange?.min ?? 8}
                                        onChange={(e) => {
                                          const v = clamp(Number(e.target.value) || 1, 1, 999);
                                          setCustomExercises((prev) =>
                                            (prev || []).map((x) =>
                                              x.id === ex.id
                                                ? { ...x, repRange: { min: v, max: Math.max(v, x.repRange?.max ?? 12) } }
                                                : x
                                            )
                                          );
                                        }}
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Max</Label>
                                      <Input
                                        inputMode="numeric"
                                        value={ex.repRange?.max ?? 12}
                                        onChange={(e) => {
                                          const v = clamp(Number(e.target.value) || 1, 1, 999);
                                          setCustomExercises((prev) =>
                                            (prev || []).map((x) =>
                                              x.id === ex.id
                                                ? { ...x, repRange: { min: Math.min(x.repRange?.min ?? 8, v), max: v } }
                                                : x
                                            )
                                          );
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                <Button
                                  size="icon"
                                  variant="destructive"
                                  className="rounded-xl"
                                  onClick={() =>
                                    setCustomExercises((prev) => (prev || []).filter((x) => x.id !== ex.id))
                                  }
                                  aria-label="Delete exercise"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Rest (sec)</Label>
                                  <Input
                                    inputMode="numeric"
                                    value={ex.restSec}
                                    onChange={(e) => {
                                      const v = clamp(Number(e.target.value) || 0, 0, 600);
                                      setCustomExercises((prev) =>
                                        (prev || []).map((x) => (x.id === ex.id ? { ...x, restSec: v } : x))
                                      );
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Weight step</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={ex.weightStep}
                                    onChange={(e) => {
                                      const v = clamp(Number(e.target.value) || 1, 0, 50);
                                      setCustomExercises((prev) =>
                                        (prev || []).map((x) => (x.id === ex.id ? { ...x, weightStep: v } : x))
                                      );
                                    }}
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                                  <div>
                                    <div className="font-medium text-xs">Auto-progress</div>
                                    <div className="text-[11px] text-muted-foreground">Enable coach suggestions</div>
                                  </div>
                                  <Switch
                                    checked={!!ex.autoProgress}
                                    onCheckedChange={(v) =>
                                      setCustomExercises((prev) =>
                                        (prev || []).map((x) => (x.id === ex.id ? { ...x, autoProgress: v } : x))
                                      )
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <ClipboardList className="h-5 w-5" /> Log today’s workout
                  </CardTitle>
                  <CardDescription>
                    Pick a template, log your sets, and let ForgeFit suggest the next goal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-foreground/20 bg-card/85 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] border-l-4 border-l-primary/60">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Scheduled • {scheduleInfo.dayName}
                        </div>
                        <div className="text-lg font-semibold">
                          {scheduleInfo.isRestDay
                            ? "Active Rest Day: you deserve it."
                            : scheduleInfo.templateName || "No workout scheduled."}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={
                            (state.settings.schedule?.[getWeekdayKey(sessionDate)] || "")
                              ? getWeekdayKey(sessionDate)
                              : "unassigned"
                          }
                          onValueChange={(v) => {
                            if (v === "unassigned") return;
                            const day = WEEKDAYS.find((d) => d.key === v);
                            if (!day) return;
                            setSessionDate(setDateToWeekday(sessionDate, day.index));
                          }}
                        >
                          <SelectTrigger className="h-8 rounded-xl text-xs w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned day</SelectItem>
                            {scheduledDayOptions.map((day) => (
                              <SelectItem key={day.key} value={day.key}>
                                {scheduledDayLabel(day.key)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!scheduleInfo.isRestDay ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              const key = getWeekdayKey(sessionDate);
                              setState((p) => ({
                                ...p,
                                settings: {
                                  ...p.settings,
                                  schedule: { ...(p.settings.schedule || emptySchedule), [key]: "rest" },
                                },
                              }));
                            }}
                          >
                            Mark rest
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setSessionDate(addDaysISO(sessionDate, 1))}
                        >
                          Skip day
                        </Button>
                        {scheduleInfo.isRestDay && !forceLog ? (
                          <Button size="sm" className="rounded-xl" onClick={() => setForceLog(true)}>
                            Log anyway
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-foreground/10 bg-background/70 p-3">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Session progress
                          </div>
                          <div className="text-sm font-medium">
                            {sessionProgress.completed} / {sessionProgress.planned} sets •{" "}
                            {sessionProgress.pct}%
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setRestSeconds(60);
                              setRestRunning(true);
                            }}
                          >
                            Rest 1:00
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setRestSeconds(90);
                              setRestRunning(true);
                            }}
                          >
                            Rest 1:30
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setRestSeconds(120);
                              setRestRunning(true);
                            }}
                          >
                            Rest 2:00
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Rest timer
                        </div>
                        <div className="text-lg font-display">
                          {String(Math.floor(restSeconds / 60)).padStart(2, "0")}:
                          {String(restSeconds % 60).padStart(2, "0")}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl"
                          onClick={() => setRestRunning((v) => !v)}
                        >
                          {restRunning ? "Pause" : "Start"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => {
                            setRestSeconds(0);
                            setRestRunning(false);
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button
                        className="w-full rounded-2xl bg-primary text-primary-foreground font-display uppercase tracking-[0.3em] text-sm shadow-[0_18px_36px_rgba(0,0,0,0.45)] hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(0,0,0,0.55)]"
                        onClick={() => {
                          setLogMode("template");
                          setGymMode(true);
                          setGymStepIndex(0);
                        }}
                      >
                        Start Session
                      </Button>
                    </div>
                  </div>

                  {scheduleInfo.isRestDay && !forceLog ? (
                    <div className="rounded-2xl border border-foreground/20 bg-card/80 p-4 space-y-3 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
                      <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        Recovery Ideas
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-foreground/15 bg-card/70 p-3">
                          <div className="font-medium">Mobility Reset</div>
                          <div className="text-sm text-muted-foreground">
                            15-20 min hips, thoracic, ankles + banded shoulder work.
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/15 bg-card/70 p-3">
                          <div className="font-medium">Easy Cardio</div>
                          <div className="text-sm text-muted-foreground">
                            25-35 min incline walk or bike, conversational pace.
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/15 bg-card/70 p-3">
                          <div className="font-medium">Soft Tissue</div>
                          <div className="text-sm text-muted-foreground">
                            Foam roll quads, lats, glutes, and calves for 8-10 min.
                          </div>
                        </div>
                        <div className="rounded-xl border border-foreground/15 bg-card/70 p-3">
                          <div className="font-medium">Breath + Core</div>
                          <div className="text-sm text-muted-foreground">
                            3 rounds: dead bug 10/side, side plank 30s/side.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : !scheduleInfo.templateId ? (
                    <div className="rounded-2xl border border-foreground/20 bg-card/80 p-4 space-y-3 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
                      <div className="text-sm text-muted-foreground uppercase tracking-[0.2em]">
                        No Workout Assigned
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Assign a template to this day in Settings → Weekly schedule, or add a new
                        workout template.
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => setTemplateDialogOpen(true)}
                        >
                          Manage templates
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setActiveTab("log")}
                        >
                          Log anyway
                        </Button>
                      </div>
                    </div>
                  ) : gymMode ? (
                    <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 p-5 shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Gym Mode • Set {gymStepIndex + 1} of {Math.max(gymSteps.length, 1)}
                          </div>
                          <div className="text-2xl font-display uppercase">
                            {currentGymEntry?.exerciseName || "No set selected"}
                          </div>
                          {currentGymEntry?.templateHint ? (
                            <div className="text-sm text-muted-foreground">
                              Target {formatRepRange(currentGymEntry.templateHint.repRange)}{" "}
                              {currentGymEntry.templateHint.timeUnit === "seconds"
                                ? "sec"
                                : currentGymEntry.templateHint.timeUnit === "minutes"
                                ? "min"
                                : "reps"}{" "}
                              • Rest {Math.round(currentGymEntry.templateHint.restSec / 60)} min
                            </div>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              setGymMode(false);
                              setRestRunning(false);
                              setRestSeconds(0);
                              setAutoAdvanceAfterRest(false);
                            }}
                          >
                            Exit
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={saveSession}
                          >
                            Save
                          </Button>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        {restRunning ? (
                          <div className="rounded-2xl border border-foreground/20 bg-card/80 p-4 shadow-[0_14px_30px_rgba(0,0,0,0.2)]">
                            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                              Rest timer
                            </div>
                            <div className="mt-2 text-3xl font-display">
                              {String(Math.floor(restSeconds / 60)).padStart(2, "0")}:
                              {String(restSeconds % 60).padStart(2, "0")}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-xl"
                                onClick={() => setRestRunning((v) => !v)}
                              >
                                {restRunning ? "Pause" : "Start"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => {
                                  setRestRunning(false);
                                  setRestSeconds(0);
                                  setAutoAdvanceAfterRest(false);
                                }}
                              >
                                Skip rest
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {currentGymEntry?.templateHint?.timeUnit ? null : (
                                <div className="space-y-1">
                                  <Label>Weight ({state.settings.units})</Label>
                                  <Input
                                    inputMode="decimal"
                                    value={currentGymSet?.weight || ""}
                                    onChange={(e) => updateGymSet({ weight: e.target.value })}
                                    placeholder="0"
                                  />
                                </div>
                              )}
                              <div className="space-y-1">
                                <Label>
                                  {currentGymEntry?.templateHint?.timeUnit === "seconds"
                                    ? "Seconds"
                                    : currentGymEntry?.templateHint?.timeUnit === "minutes"
                                    ? "Minutes"
                                    : "Reps"}
                                </Label>
                                <Input
                                  inputMode="numeric"
                                  value={currentGymSet?.reps || ""}
                                  onChange={(e) => updateGymSet({ reps: e.target.value })}
                                  placeholder="0"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label>RPE</Label>
                                <Input
                                  inputMode="decimal"
                                  value={currentGymSet?.rpe || ""}
                                  onChange={(e) => updateGymSet({ rpe: e.target.value })}
                                  placeholder="8.5"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label>Notes</Label>
                              <Input
                                value={currentGymSet?.notes || ""}
                                onChange={(e) => updateGymSet({ notes: e.target.value })}
                                placeholder="Quick note..."
                              />
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            variant="outline"
                            className="rounded-2xl"
                            onClick={() => setGymStepIndex((i) => Math.max(0, i - 1))}
                          >
                            Prev
                          </Button>
                          <Button
                            className="rounded-2xl"
                            onClick={() => {
                              const restFromTemplate = currentGymEntry?.templateHint?.restSec ?? 0;
                              const nextRest = restPresetSec || restFromTemplate || 0;
                              setRestSeconds(nextRest);
                              setRestRunning(nextRest > 0);
                              setAutoAdvanceAfterRest(true);
                              if (nextRest <= 0) {
                                setGymStepIndex((i) =>
                                  Math.min(Math.max(gymSteps.length - 1, 0), i + 1)
                                );
                              }
                            }}
                          >
                            Complete set
                          </Button>
                          <Button variant="outline" className="rounded-2xl" onClick={addGymSet}>
                            Add set
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>Rest preset</span>
                          {[60, 90, 120, 150].map((sec) => (
                            <Button
                              key={sec}
                              size="sm"
                              variant={restPresetSec === sec ? "secondary" : "outline"}
                              className="rounded-xl"
                              onClick={() => setRestPresetSec(sec)}
                            >
                              {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
                            </Button>
                          ))}
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => {
                              const v = currentGymEntry?.templateHint?.restSec ?? 90;
                              setRestPresetSec(v);
                            }}
                          >
                            Use target
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>

                  <div className="space-y-3">
                    {/* Main work */}
                    {groupedMainEntries.map((group, idx) => {
                      if (group.type === "superset" || group.type === "triset") {
                        return (
                          <Card
                            key={`superset_${group.tag}_${idx}`}
                            className="rounded-2xl border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-card/60"
                          >
                            <CardHeader className="pb-2">
                              <CardTitle className="text-sm font-display uppercase tracking-[0.2em] text-primary">
                                {group.type === "triset" ? "Triset" : "Superset"} {group.tag}
                              </CardTitle>
                              <CardDescription>
                                {group.entries.map((e) => e.exerciseName).join(" + ")}
                              </CardDescription>
                              <div className="mt-2 text-xs text-muted-foreground">
                                {group.type === "triset"
                                  ? "Order: A → B → C for set 1, repeat for set 2, etc."
                                  : "Order: A then B for set 1, repeat for set 2, etc."}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {group.type === "superset" && group.entries.length === 2 ? (
                                <SupersetLogger
                                  entries={group.entries as [WorkingEntry, WorkingEntry]}
                                  units={state.settings.units}
                                  suggestions={insights.suggestions}
                                  onChange={(id, next) => {
                                    setWorkingEntries((prev) =>
                                      prev.map((p) => (p.exerciseId === id ? next : p))
                                    );
                                  }}
                                />
                              ) : group.type === "triset" && group.entries.length === 3 ? (
                                <TrisetLogger
                                  entries={group.entries as [WorkingEntry, WorkingEntry, WorkingEntry]}
                                  units={state.settings.units}
                                  suggestions={insights.suggestions}
                                  onChange={(id, next) => {
                                    setWorkingEntries((prev) =>
                                      prev.map((p) => (p.exerciseId === id ? next : p))
                                    );
                                  }}
                                />
                              ) : (
                                group.entries.map((entry) => (
                                  <ExerciseLogger
                                    key={entry.exerciseId}
                                    variant="plain"
                                    index={mainIndexMap.get(entry.exerciseId) || 0}
                                    entry={entry}
                                    units={state.settings.units}
                                    suggestion={insights.suggestions[entry.exerciseName]}
                                    onChange={(next) => {
                                      setWorkingEntries((prev) =>
                                        prev.map((p) => (p.exerciseId === next.exerciseId ? next : p))
                                      );
                                    }}
                                  />
                                ))
                              )}
                            </CardContent>
                          </Card>
                        );
                      }

                      const entry = group.entries[0];
                      return (
                        <ExerciseLogger
                          key={entry.exerciseId}
                          index={mainIndexMap.get(entry.exerciseId) || 0}
                          entry={entry}
                          units={state.settings.units}
                          suggestion={insights.suggestions[entry.exerciseName]}
                          onChange={(next) => {
                            setWorkingEntries((prev) =>
                              prev.map((p) => (p.exerciseId === next.exerciseId ? next : p))
                            );
                          }}
                        />
                      );
                    })}

                    {/* Finishers */}
                    {finisherEntries.length > 0 && (
                      <details className="rounded-2xl border bg-muted/30 p-4">
                        <summary className="cursor-pointer font-medium flex items-center justify-between text-sm">
                          <span>Finishers</span>
                          <Badge variant="secondary" className="rounded-xl">5–10 min</Badge>
                        </summary>
                        <div className="mt-4 space-y-3">
                          {finisherEntries.map((entry, idx) => (
                              <ExerciseLogger
                                key={entry.exerciseId}
                                index={idx}
                                entry={entry}
                                units={state.settings.units}
                                suggestion={insights.suggestions[entry.exerciseName]}
                                onChange={(next) => {
                                  setWorkingEntries((prev) =>
                                    prev.map((p) => (p.exerciseId === next.exerciseId ? next : p))
                                  );
                                }}
                              />
                            ))}
                        </div>
                      </details>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Input value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="How did it feel?" />
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="text-sm text-muted-foreground">Tip: Log your top set — ForgeFit handles the math and progression.</div>
                    <Button className="rounded-2xl" onClick={saveSession}>
                      <Save className="h-4 w-4 mr-2" /> Save session
                    </Button>
                  </div>
                    </>
                  )}
                </CardContent>
              </Card>

            </div>

          </TabsContent>

            <TabsContent value="history" className="mt-0">
            <div className="space-y-4">
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <History className="h-5 w-5" /> Training history
                  </CardTitle>
                  <CardDescription>Search and review past sessions.</CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                      <Input
                        className="pl-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search templates, dates, exercises…"
                      />
                    </div>

                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setActiveTab("log")}
                    >
                      Log
                    </Button>
                  </div>

                  {filteredSessions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No sessions yet.</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredSessions.map((s) => (
                        <SessionCard
                          key={s.id}
                          session={s}
                          units={state.settings.units}
                          onDelete={() => deleteSession(s.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <div className="space-y-4">
              {state.settings.powerliftingMode ? (
                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                      <Dumbbell className="h-5 w-5" /> Big 3 1RM
                    </CardTitle>
                    <CardDescription>
                      Best estimated 1RM from your logged top sets.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {(
                      [
                        ["Squat", big3Stats.squat],
                        ["Bench", big3Stats.bench],
                        ["Deadlift", big3Stats.deadlift],
                      ] as Array<[string, { name: string; value: number; date: string } | null]>
                    ).map(([label, data]) => (
                      <div key={label} className="rounded-xl border p-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {label}
                        </div>
                        <div className="text-2xl font-display">
                          {data ? Math.round(data.value).toLocaleString() : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {data ? `${formatDate(data.date)} • ${data.name}` : "Log a top set"}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="lg:col-span-2 rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <TrendingUp className="h-5 w-5" /> Progress overview
                  </CardTitle>
                  <CardDescription>
                    Quick glance at strength trends and recent PRs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Log more sessions to populate this area.
                </CardContent>
              </Card>

              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <Target className="h-5 w-5" /> Goals
                  </CardTitle>
                  <CardDescription>
                    Track targets and let ForgeFit propose new ones.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Button className="rounded-xl" onClick={() => setGoalDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Add goal
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={applyAutoGoals}>
                      Auto goals
                    </Button>
                  </div>

                  <GoalsPanel
                    goals={state.goals}
                    history={exerciseHistory}
                    units={state.settings.units}
                    onDone={markGoalDone}
                    onArchive={archiveGoal}
                  />
                </CardContent>
              </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coach" className="mt-0">
            {!isCoach ? (
              <Card className="rounded-2xl shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <SettingsIcon className="h-5 w-5" /> Coach mode
                  </CardTitle>
                  <CardDescription>
                    Turn on Coach Mode in Settings to unlock coach tools.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                      <ClipboardList className="h-5 w-5" /> Send program
                    </CardTitle>
                    <CardDescription>
                      Generate a coach package to share with your client.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="rounded-xl" onClick={buildCoachPackage}>
                      Build coach package
                    </Button>
                    <textarea
                      value={coachPackageText}
                      readOnly
                      className="min-h-[200px] w-full rounded-xl border bg-background p-3 text-sm"
                      placeholder="Click “Build coach package” to generate JSON..."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        className="rounded-xl"
                        onClick={async () => {
                          try {
                            if (navigator?.clipboard?.writeText) {
                              await navigator.clipboard.writeText(coachPackageText || "");
                              alert("Coach package copied to clipboard.");
                              return;
                            }
                          } catch {}
                          alert("Copy failed. Select the text and copy manually.");
                        }}
                      >
                        Copy package
                      </Button>
                      <div className="text-xs text-muted-foreground">
                        Client imports via Import → Paste JSON.
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl shadow-md">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                      <TrendingUp className="h-5 w-5" /> Client progress
                    </CardTitle>
                    <CardDescription>
                      Paste a client export to view their summary.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      value={clientImportText}
                      onChange={(e) => setClientImportText(e.target.value)}
                      className="min-h-[160px] w-full rounded-xl border bg-background p-3 text-sm"
                      placeholder="Paste client export JSON here..."
                    />
                    <Button className="rounded-xl" onClick={importClientReport}>
                      Load client report
                    </Button>
                    {clientSummary ? (
                      <div className="rounded-xl border p-3 space-y-2">
                        <div className="font-medium">{clientSummary.name}</div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="rounded-lg border p-2">
                            Sessions: {clientSummary.totalSessions}
                          </div>
                          <div className="rounded-lg border p-2">
                            Last: {clientSummary.lastLabel}
                          </div>
                          <div className="rounded-lg border p-2">
                            7d Volume: {Math.round(clientSummary.vol7d).toLocaleString()}
                          </div>
                          <div className="rounded-lg border p-2">
                            Total Volume: {Math.round(clientSummary.totalVolume).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Ask your client to Export data and paste it here.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="calc" className="mt-0">
            <OneRmCalculator units={state.settings.units} />
          </TabsContent>
        </Tabs>
      </div>

      {activeTab === "log" ? (
        <div className="fixed bottom-4 right-4 z-40 md:hidden">
          <div className="rounded-full border border-foreground/15 bg-card/80 p-1 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                onClick={() => {
                  setLogMode("template");
                  setGymMode((v) => !v);
                  setGymStepIndex(0);
                }}
              >
                {gymMode ? "Exit" : "Start"}
              </Button>
              <Button
                size="sm"
                className="rounded-full px-3 text-[0.65rem] uppercase tracking-[0.2em]"
                onClick={saveSession}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


// -------------------- Components --------------------


function ExerciseLogger({
  entry,
  onChange,
  units,
  suggestion,
  index,
  variant = "card",
}: {
  entry: WorkingEntry;
  onChange: (next: WorkingEntry) => void;
  units: Units;
  suggestion?: { next?: { weight: number; reps: number }; reason: string };
  index: number;
  variant?: "card" | "plain";
}) {
  const templateHint = entry?.templateHint;
  const [dismissed, setDismissed] = useState(false);
  const canSuperset =
    templateHint?.timeUnit !== "seconds" &&
    templateHint?.timeUnit !== "minutes" &&
    templateHint?.setType !== "dropset";
  const currentPairingType =
    templateHint?.setType === "superset" || templateHint?.setType === "triset"
      ? templateHint?.setType
      : "off";
  const currentSupersetTag =
    templateHint?.setType === "superset" || templateHint?.setType === "triset"
      ? templateHint?.supersetTag || "A"
      : "A";
  const repsLabel =
    templateHint?.timeUnit === "seconds"
      ? "Seconds"
      : templateHint?.timeUnit === "minutes"
      ? "Minutes"
      : "Reps";

  const header = (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="opacity-70">{index + 1}.</span> {entry.exerciseName}
            </CardTitle>
            <CardDescription>
              {templateHint ? (
                <span>
                  Target: {templateHint.defaultSets} sets • {formatRepRange(templateHint.repRange)}{" "}
                  {templateHint.timeUnit === "seconds"
                    ? "sec"
                    : templateHint.timeUnit === "minutes"
                    ? "min"
                    : "reps"}{" "}
                  • Rest{" "}
                  {Math.round(templateHint.restSec / 60)} min
                  {templateHint.setType === "superset"
                    ? ` • Superset ${templateHint.supersetTag || ""}`.trim()
                    : templateHint.setType === "triset"
                    ? ` • Triset ${templateHint.supersetTag || ""}`.trim()
                    : templateHint.setType === "dropset"
                    ? " • Dropset"
                    : ""}
                </span>
              ) : (
                ""
              )}
            </CardDescription>
          </div>

          <div className="text-left sm:text-right space-y-2">
            {canSuperset ? (
              <div className="flex items-center justify-start sm:justify-end gap-2">
                <span className="text-xs text-muted-foreground">Pairing</span>
                <Select
                  value={currentPairingType}
                  onValueChange={(v) => {
                    if (v === "off") {
                      onChange({
                        ...entry,
                        templateHint: {
                          ...(entry.templateHint || {
                            defaultSets: 3,
                            repRange: { min: 8, max: 12 },
                            restSec: 120,
                            weightStep: 5,
                            autoProgress: true,
                          }),
                          setType: "normal",
                          supersetTag: "",
                        },
                        sets: entry.sets.map((s) => ({ ...s, setType: "normal", supersetTag: "" })),
                      });
                      return;
                    }

                    onChange({
                      ...entry,
                      templateHint: {
                        ...(entry.templateHint || {
                          defaultSets: 3,
                          repRange: { min: 8, max: 12 },
                          restSec: 120,
                          weightStep: 5,
                          autoProgress: true,
                        }),
                        setType: v as SetType,
                        supersetTag: currentSupersetTag,
                      },
                      sets: entry.sets.map((s) => ({
                        ...s,
                        setType: v as SetType,
                        supersetTag: currentSupersetTag,
                      })),
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-[96px] rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="superset">Superset</SelectItem>
                    <SelectItem value="triset">Triset</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={currentSupersetTag}
                  onValueChange={(v) => {
                    onChange({
                      ...entry,
                      templateHint: {
                        ...(entry.templateHint || {
                          defaultSets: 3,
                          repRange: { min: 8, max: 12 },
                          restSec: 120,
                          weightStep: 5,
                          autoProgress: true,
                        }),
                        setType: currentPairingType === "off" ? "superset" : (currentPairingType as SetType),
                        supersetTag: v,
                      },
                      sets: entry.sets.map((s) => ({
                        ...s,
                        setType: currentPairingType === "off" ? "superset" : (currentPairingType as SetType),
                        supersetTag: v,
                      })),
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-[64px] rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPERSET_TAGS.map((tag) => (
                      <SelectItem key={tag} value={tag}>
                        {tag}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {suggestion?.next && !dismissed ? (
              <div className="text-right">
                <Badge variant="secondary" className="rounded-xl">
                  Coach suggests: {suggestion.next.weight}
                  {units} × {suggestion.next.reps}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  {suggestion.reason}
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      const first = entry.sets[0];
                      if (!first) return;
                      onChange({
                        ...entry,
                        sets: entry.sets.map((s, i) =>
                          i === 0
                            ? {
                                ...s,
                                weight: String(suggestion.next!.weight),
                                reps: String(suggestion.next!.reps),
                              }
                            : s
                        ),
                      });
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setDismissed(true)}
                  >
                    Not today
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
  );

  const content = (
      <div className="space-y-3">
        <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground px-1">
          <div className="col-span-1">Set</div>
          <div className="col-span-2">Weight ({units})</div>
          <div className="col-span-2">{repsLabel}</div>
          <div className="col-span-2">RPE</div>
          <div className="col-span-3">Type</div>
          <div className="col-span-2"></div>
        </div>

        {entry.sets.map((s, i) => (
          <div key={i}>
            <div className="hidden sm:grid group grid-cols-12 gap-2 items-center">
              <div className="col-span-1 text-sm font-medium">{i + 1}</div>

              <div className="col-span-2">
                <Input
                  className="w-full"
                  inputMode="decimal"
                  value={s.weight}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, weight: v } : x)),
                    });
                  }}
                  placeholder="0"
                />
              </div>

              <div className="col-span-2">
                <Input
                  className="w-full"
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, reps: v } : x)),
                    });
                  }}
                  placeholder="0"
                />
              </div>

              <div className="col-span-2">
                <Input
                  className="w-full"
                  inputMode="decimal"
                  value={s.rpe}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, rpe: v } : x)),
                    });
                  }}
                  placeholder=""
                />
              </div>

              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Select
                    value={s.setType || "normal"}
                    onValueChange={(v) =>
                      onChange({
                        ...entry,
                        templateHint: {
                          ...(entry.templateHint || {
                            defaultSets: 3,
                            repRange: { min: 8, max: 12 },
                            restSec: 120,
                            weightStep: 5,
                            autoProgress: true,
                          }),
                          setType: v as SetType,
                          supersetTag:
                            v === "superset" || v === "triset"
                              ? entry.templateHint?.supersetTag || "A"
                              : "",
                        },
                        sets: entry.sets.map((x, xi) =>
                          xi === i
                            ? {
                                ...x,
                                setType: v as SetType,
                                supersetTag:
                                  v === "superset" || v === "triset"
                                    ? entry.templateHint?.supersetTag || "A"
                                    : "",
                              }
                            : x
                        ),
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="dropset">Dropset</SelectItem>
                      <SelectItem value="superset">Superset</SelectItem>
                      <SelectItem value="triset">Triset</SelectItem>
                    </SelectContent>
                  </Select>
                  {s.setType === "superset" ? (
                    <Input
                      className="w-16"
                      value={s.supersetTag || entry.templateHint?.supersetTag || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange({
                          ...entry,
                          sets: entry.sets.map((x, xi) =>
                            xi === i ? { ...x, supersetTag: v } : x
                          ),
                        });
                      }}
                      placeholder={entry.templateHint?.supersetTag || "A"}
                    />
                  ) : null}
                </div>
              </div>

              <div className="col-span-2 flex items-center justify-end gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="opacity-0 group-hover:opacity-100 transition"
                  onClick={() => {
                    onChange({
                      ...entry,
                      sets: entry.sets.filter((_, xi) => xi !== i),
                    });
                  }}
                  aria-label="Delete set"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="col-span-12">
                <Input
                  className="w-full"
                  value={s.notes || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, notes: v } : x)),
                    });
                  }}
                  placeholder="Notes (optional)"
                />
              </div>
            </div>

            <div className="sm:hidden rounded-xl border border-foreground/15 bg-card/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Set {i + 1}</div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8"
                  onClick={() => {
                    onChange({
                      ...entry,
                      sets: entry.sets.filter((_, xi) => xi !== i),
                    });
                  }}
                  aria-label="Delete set"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  inputMode="decimal"
                  value={s.weight}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, weight: v } : x)),
                    });
                  }}
                  placeholder={`Weight (${units})`}
                />
                <Input
                  inputMode="numeric"
                  value={s.reps}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, reps: v } : x)),
                    });
                  }}
                  placeholder={repsLabel}
                />
                <Input
                  className="col-span-2"
                  inputMode="decimal"
                  value={s.rpe}
                  onChange={(e) => {
                    const v = e.target.value;
                    onChange({
                      ...entry,
                      sets: entry.sets.map((x, xi) => (xi === i ? { ...x, rpe: v } : x)),
                    });
                  }}
                  placeholder="RPE"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={s.setType || "normal"}
                  onValueChange={(v) =>
                    onChange({
                      ...entry,
                      templateHint: {
                        ...(entry.templateHint || {
                          defaultSets: 3,
                          repRange: { min: 8, max: 12 },
                          restSec: 120,
                          weightStep: 5,
                          autoProgress: true,
                        }),
                        setType: v as SetType,
                        supersetTag:
                          v === "superset" || v === "triset"
                            ? entry.templateHint?.supersetTag || "A"
                            : "",
                      },
                      sets: entry.sets.map((x, xi) =>
                        xi === i
                          ? {
                              ...x,
                              setType: v as SetType,
                              supersetTag:
                                v === "superset" || v === "triset"
                                  ? entry.templateHint?.supersetTag || "A"
                                  : "",
                            }
                          : x
                      ),
                    })
                  }
                >
                  <SelectTrigger className="h-9 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="dropset">Dropset</SelectItem>
                    <SelectItem value="superset">Superset</SelectItem>
                    <SelectItem value="triset">Triset</SelectItem>
                  </SelectContent>
                </Select>
                {s.setType === "superset" ? (
                  <Input
                    className="w-16"
                    value={s.supersetTag || entry.templateHint?.supersetTag || ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange({
                        ...entry,
                        sets: entry.sets.map((x, xi) =>
                          xi === i ? { ...x, supersetTag: v } : x
                        ),
                      });
                    }}
                    placeholder={entry.templateHint?.supersetTag || "A"}
                  />
                ) : null}
              </div>
              <Input
                value={s.notes || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  onChange({
                    ...entry,
                    sets: entry.sets.map((x, xi) => (xi === i ? { ...x, notes: v } : x)),
                  });
                }}
                placeholder="Notes (optional)"
              />
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            className="rounded-2xl"
            onClick={() =>
              onChange({
                ...entry,
                sets: [
                  ...entry.sets,
                  { reps: "", weight: "", rpe: "", notes: "", setType: "normal", supersetTag: "" },
                ],
              })
            }
          >
            <Plus className="h-4 w-4 mr-2" /> Add set
          </Button>

          <div className="text-xs text-muted-foreground text-right">
            <div>Top set e1RM: {formatNumber(calcEntryTopE1RM(entry as any))}</div>
            <div>Session volume: {formatNumber(calcEntryVolume(entry as any))}</div>
          </div>
        </div>
      </div>
  );

  if (variant === "plain") {
    return (
      <div className="rounded-xl border border-foreground/15 bg-card/60 p-3">
        <div className="pb-2">{header}</div>
        {content}
      </div>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">{header}</CardHeader>
      <CardContent className="space-y-3">{content}</CardContent>
    </Card>
  );
}

function SupersetLogger({
  entries,
  units,
  suggestions,
  onChange,
}: {
  entries: [WorkingEntry, WorkingEntry];
  units: Units;
  suggestions: Record<string, { next?: { weight: number; reps: number }; reason: string }>;
  onChange: (id: string, next: WorkingEntry) => void;
}) {
  const [a, b] = entries;
  const maxSets = Math.max(a.sets.length, b.sets.length, 1);
  const displayA = "A";
  const displayB = "B";

  const updateSet = (entry: WorkingEntry, idx: number, patch: Partial<typeof entry.sets[number]>) => {
    const nextSets = [...entry.sets];
    while (nextSets.length <= idx) {
      nextSets.push({ reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: entry.templateHint?.supersetTag || "" });
    }
    nextSets[idx] = { ...nextSets[idx], ...patch, setType: "superset", supersetTag: entry.templateHint?.supersetTag || "" };
    onChange(entry.exerciseId, { ...entry, sets: nextSets });
  };

  const removeSet = (idx: number) => {
    onChange(a.exerciseId, { ...a, sets: a.sets.filter((_, i) => i !== idx) });
    onChange(b.exerciseId, { ...b, sets: b.sets.filter((_, i) => i !== idx) });
  };

  const addSet = () => {
    onChange(a.exerciseId, {
      ...a,
      sets: [...a.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: a.templateHint?.supersetTag || "" }],
    });
    onChange(b.exerciseId, {
      ...b,
      sets: [...b.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "superset", supersetTag: b.templateHint?.supersetTag || "" }],
    });
  };

  const renderExercise = (label: string, entry: WorkingEntry, set: any, idx: number) => (
    <div className="rounded-lg border border-foreground/10 bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-foreground">
          {label}
        </span>
        <div className="text-sm font-semibold">{entry.exerciseName}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input
          inputMode="decimal"
          value={set.weight}
          onChange={(e) => updateSet(entry, idx, { weight: e.target.value })}
          placeholder={`Wt (${units})`}
        />
        <Input
          inputMode="numeric"
          value={set.reps}
          onChange={(e) => updateSet(entry, idx, { reps: e.target.value })}
          placeholder="Reps"
        />
        <Input
          className="col-span-2 sm:col-span-1"
          inputMode="decimal"
          value={set.rpe}
          onChange={(e) => updateSet(entry, idx, { rpe: e.target.value })}
          placeholder="RPE"
        />
      </div>
      <Input
        className="mt-2"
        value={set.notes || ""}
        onChange={(e) => updateSet(entry, idx, { notes: e.target.value })}
        placeholder={`Notes (${label})`}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {Array.from({ length: maxSets }).map((_, i) => {
        const setA = a.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setB = b.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        return (
          <div key={i} className="rounded-xl border border-foreground/15 bg-card/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Set {i + 1}</div>
              <div className="text-xs text-muted-foreground">Order: {displayA} -&gt; {displayB}</div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => removeSet(i)}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 space-y-2">
              {renderExercise(displayA, a, setA, i)}
              {renderExercise(displayB, b, setB, i)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-2xl" onClick={addSet}>
          <Plus className="h-4 w-4 mr-2" /> Add superset set
        </Button>
        <div className="text-xs text-muted-foreground">
          {suggestions?.[a.exerciseName]?.reason || suggestions?.[b.exerciseName]?.reason || ""}
        </div>
      </div>
    </div>
  );
}

function TrisetLogger({
  entries,
  units,
  suggestions,
  onChange,
}: {
  entries: [WorkingEntry, WorkingEntry, WorkingEntry];
  units: Units;
  suggestions: Record<string, { next?: { weight: number; reps: number }; reason: string }>;
  onChange: (id: string, next: WorkingEntry) => void;
}) {
  const [a, b, c] = entries;
  const maxSets = Math.max(a.sets.length, b.sets.length, c.sets.length, 1);

  const updateSet = (entry: WorkingEntry, idx: number, patch: Partial<typeof entry.sets[number]>) => {
    const nextSets = [...entry.sets];
    while (nextSets.length <= idx) {
      nextSets.push({ reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: entry.templateHint?.supersetTag || "" });
    }
    nextSets[idx] = { ...nextSets[idx], ...patch, setType: "triset", supersetTag: entry.templateHint?.supersetTag || "" };
    onChange(entry.exerciseId, { ...entry, sets: nextSets });
  };

  const removeSet = (idx: number) => {
    onChange(a.exerciseId, { ...a, sets: a.sets.filter((_, i) => i !== idx) });
    onChange(b.exerciseId, { ...b, sets: b.sets.filter((_, i) => i !== idx) });
    onChange(c.exerciseId, { ...c, sets: c.sets.filter((_, i) => i !== idx) });
  };

  const addSet = () => {
    onChange(a.exerciseId, {
      ...a,
      sets: [...a.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: a.templateHint?.supersetTag || "" }],
    });
    onChange(b.exerciseId, {
      ...b,
      sets: [...b.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: b.templateHint?.supersetTag || "" }],
    });
    onChange(c.exerciseId, {
      ...c,
      sets: [...c.sets, { reps: "", weight: "", rpe: "", notes: "", setType: "triset", supersetTag: c.templateHint?.supersetTag || "" }],
    });
  };

  const renderBlock = (label: string, entry: WorkingEntry, set: any, idx: number) => (
    <div className="rounded-lg border border-foreground/10 bg-background/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-foreground">
          {label}
        </span>
        <div className="text-sm font-semibold">{entry.exerciseName}</div>
      </div>
      <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Input
          inputMode="decimal"
          value={set.weight}
          onChange={(e) => updateSet(entry, idx, { weight: e.target.value })}
          placeholder={`Wt (${units})`}
        />
        <Input
          inputMode="numeric"
          value={set.reps}
          onChange={(e) => updateSet(entry, idx, { reps: e.target.value })}
          placeholder="Reps"
        />
        <Input
          className="col-span-2 sm:col-span-1"
          inputMode="decimal"
          value={set.rpe}
          onChange={(e) => updateSet(entry, idx, { rpe: e.target.value })}
          placeholder="RPE"
        />
      </div>
      <Input
        className="mt-2"
        value={set.notes || ""}
        onChange={(e) => updateSet(entry, idx, { notes: e.target.value })}
        placeholder={`Notes (${label})`}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      {Array.from({ length: maxSets }).map((_, i) => {
        const setA = a.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setB = b.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        const setC = c.sets[i] || { reps: "", weight: "", rpe: "", notes: "" };
        return (
          <div key={i} className="rounded-xl border border-foreground/15 bg-card/70 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium">Set {i + 1}</div>
              <div className="text-xs text-muted-foreground">Order: A -&gt; B -&gt; C</div>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                onClick={() => removeSet(i)}
                aria-label="Delete set"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              {renderBlock("A", a, setA, i)}
              {renderBlock("B", b, setB, i)}
              {renderBlock("C", c, setC, i)}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-between">
        <Button variant="outline" className="rounded-2xl" onClick={addSet}>
          <Plus className="h-4 w-4 mr-2" /> Add triset set
        </Button>
        <div className="text-xs text-muted-foreground">
          {suggestions?.[a.exerciseName]?.reason ||
            suggestions?.[b.exerciseName]?.reason ||
            suggestions?.[c.exerciseName]?.reason ||
            ""}
        </div>
      </div>
    </div>
  );
}

function SessionCard({
  session,
  units,
  onDelete,
}: {
  session: Session;
  units: Units;
  onDelete: () => void;
}) {
  const summary = summarizeSession(session);
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              {session.templateName}{" "}
              <span className="text-muted-foreground font-normal">• {formatDate(session.dateISO)}</span>
            </CardTitle>
            <CardDescription>
              {summary.exerciseCount} exercises • {summary.setCount} sets • Volume{" "}
              {formatNumber(summary.volume)} ({units}×reps)
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={onDelete}
              aria-label="Delete session"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.notes ? (
          <div className="text-sm">
            <span className="font-medium">Notes:</span> {session.notes}
          </div>
        ) : null}

        <div className="space-y-3">
          {(session.entries || []).map((e) => {
            const top = calcTopSet(e);
            const v = calcEntryVolume(e);
            const best = calcEntryTopE1RM(e);
            return (
              <div key={e.exerciseId} className="rounded-xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">{e.exerciseName}</div>
                  <div className="text-xs text-muted-foreground text-right">
                    <div>
                      Top: {top.weight}
                      {units} × {top.reps}
                    </div>
                    <div>
                      e1RM: {formatNumber(best)} • Vol: {formatNumber(v)}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {e.sets.map((s, i) => (
                    <Badge key={i} variant="secondary" className="rounded-xl">
                      {s.weight}
                      {units} × {s.reps}
                      {s.rpe ? ` @${s.rpe}` : ""}
                      {formatSetTag(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ExerciseInsightCard({
  name,
  items,
  units,
}: {
  name: string;
  items: Array<{
    dateISO: string;
    topSet: { weight: number; reps: number };
    topE1RM: number;
    volume: number;
  }>;
  units: Units;
}) {
  const latest = items[0];
  const best = items.reduce(
    (acc, cur) => (cur.topE1RM > acc.topE1RM ? cur : acc),
    items[0]
  );
  const trend = computeSimpleTrend(items.slice(0, 6).map((x) => x.topE1RM));

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between gap-3">
          <span>{name}</span>
          {best?.topE1RM === latest?.topE1RM ? (
            <Badge className="rounded-xl" variant="secondary">
              <Trophy className="h-3 w-3 mr-1" /> PR
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Latest {formatDate(latest.dateISO)} • Best {formatDate(best.dateISO)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Latest top set</div>
            <div className="font-medium">
              {latest.topSet.weight}
              {units} × {latest.topSet.reps}
            </div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Latest e1RM</div>
            <div className="font-medium">{formatNumber(latest.topE1RM)}</div>
          </div>
        </div>

        <div className="rounded-xl border p-3">
          <div className="text-xs text-muted-foreground">6-entry trend</div>
          <div className="flex items-center justify-between">
            <div className="font-medium">{trend.label}</div>
            <Badge variant="secondary" className="rounded-xl">
              {trend.delta >= 0 ? "+" : ""}
              {formatNumber(trend.delta)}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Based on change from oldest to newest of recent entries.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsPanel({
  goals,
  history,
  units,
  onDone,
  onArchive,
}: {
  goals: Goal[];
  history: Record<string, any[]>;
  units: Units;
  onDone: (goalId: string) => void;
  onArchive: (goalId: string) => void;
}) {
  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "done");

  if (goals.length === 0) {
    return <div className="text-sm text-muted-foreground">No goals yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="font-medium mb-2">Active</div>
        <div className="space-y-2">
          {active.length === 0 ? (
            <div className="text-sm text-muted-foreground">None.</div>
          ) : (
            active.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                history={history}
                units={units}
                onDone={() => onDone(g.id)}
                onArchive={() => onArchive(g.id)}
              />
            ))
          )}
        </div>
      </div>

      <div>
        <div className="font-medium mb-2">Completed</div>
        <div className="space-y-2">
          {done.length === 0 ? (
            <div className="text-sm text-muted-foreground">None.</div>
          ) : (
            done.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                history={history}
                units={units}
                onDone={null}
                onArchive={() => onArchive(g.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function GoalRow({
  goal,
  history,
  units,
  onDone,
  onArchive,
}: {
  goal: Goal;
  history: Record<string, any[]>;
  units: Units;
  onDone: null | (() => void);
  onArchive: () => void;
}) {
  const cur = getCurrentMetric(goal, history);
  const pct = goal.targetValue > 0 ? clamp((cur / goal.targetValue) * 100, 0, 200) : 0;
  const isDone = goal.status === "done";

  return (
    <div className="rounded-xl border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{goal.exerciseName}</div>
          <div className="text-sm text-muted-foreground">
            {metricLabel(goal.metric, units)} → Target {formatGoalValue(goal, units)}
            {goal.dueDateISO ? ` • Due ${formatDate(goal.dueDateISO)}` : ""}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onDone ? (
            <Button size="sm" className="rounded-xl" onClick={onDone}>
              Done
            </Button>
          ) : null}
          <Button size="sm" variant="outline" className="rounded-xl" onClick={onArchive}>
            Archive
          </Button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Current: {formatMetricValue(goal.metric, cur, units)}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-foreground" style={{ width: `${clamp(pct, 0, 100)}%` }} />
        </div>
        {isDone ? (
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Completed
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GetStartedScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_0%_0%,var(--glow-a),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_90%_10%,var(--glow-b),transparent)]" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            opacity: "var(--pattern-opacity)",
            backgroundImage: "var(--pattern-image)",
            backgroundSize: "var(--pattern-size)",
          }}
        />
      </div>
      <div className="min-h-screen w-full grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0">
            <img
              src="/get-started-hero.svg"
              alt=""
              className="h-full w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 w-full max-w-xl space-y-5 rounded-3xl border border-foreground/20 bg-background/85 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              ForgeFit • Iron Edition
            </div>
            <div className="text-4xl md:text-5xl font-display uppercase tracking-[0.22em]">
              This is your line in the sand.
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              ForgeFit is built for people who want real change. You are about to lock in your
              training, track every set, and build momentum that lasts.
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Dialed programs built for your goal.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Progress you can see, feel, and measure.
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                The discipline to keep showing up.
              </div>
            </div>
            <Button
              className="w-full rounded-2xl font-display uppercase tracking-[0.3em]"
              onClick={onStart}
            >
              Get Started
            </Button>
          </div>
        </div>
        <div className="hidden lg:flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardContent className="space-y-4 p-6">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Your Mindset
              </div>
              <div className="text-lg font-semibold uppercase tracking-[0.2em]">
                Train like it matters.
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed">
                Every session compounds. No wasted reps. No vague plans. Just a clear path, strong
                work ethic, and the accountability to follow through.
              </div>
              <div className="rounded-xl border border-foreground/15 bg-background/70 p-3">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Ready Checklist
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Commit to 3+ days per week.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Track every set you finish.
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Progress with intent.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({
  settings,
  onComplete,
}: {
  settings: Settings;
  onComplete: (profile: Profile, templates: Template[], days: Weekday[]) => void;
}) {
  const [profile, setProfile] = useState<Profile>(() => ({
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
  const heightFeet = Math.floor(heightValue / 12) || 5;
  const heightRemainder = heightValue ? Math.round(heightValue % 12) : 0;
  const heightMeters = Math.floor(heightValue / 100) || 1;
  const heightCmRemainder = heightValue ? Math.round(heightValue % 100) : 0;
  const daysPerWeek = scheduledDays.length || 1;
  const toggleDay = (key: Weekday) => {
    setScheduledDays((prev) => {
      const next = prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key];
      return WEEKDAYS.filter((d) => next.includes(d.key)).map((d) => d.key);
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
        includeCore: true,
        includeCardio: focus === "fat_loss",
        units: settings.units,
      });
      onComplete({ ...profile, completed: true }, templates, scheduledDays);
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
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{
            opacity: "var(--pattern-opacity)",
            backgroundImage: "var(--pattern-image)",
            backgroundSize: "var(--pattern-size)",
          }}
        />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center justify-center px-4 py-12">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-display uppercase tracking-[0.3em]">
              Enter The App
            </CardTitle>
            <CardDescription>
              Build your profile so ForgeFit can dial in your goals and tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 min-h-[520px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-[0.3em]">
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
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Step 1 • Profile
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Age</Label>
                    <Input
                      inputMode="numeric"
                      value={profile.age}
                      onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))}
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
                            setProfile((p) => ({
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
                            setProfile((p) => ({
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
                          value={String(heightFeet)}
                          onValueChange={(v) =>
                            setProfile((p) => ({
                              ...p,
                              height: String(Number(v) * 12 + heightRemainder),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
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
                          value={String(heightRemainder)}
                          onValueChange={(v) =>
                            setProfile((p) => ({
                              ...p,
                              height: String(heightFeet * 12 + Number(v)),
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
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
                        onValueChange={(v) => setProfile((p) => ({ ...p, weight: v }))}
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
                        onChange={(e) => setProfile((p) => ({ ...p, weight: e.target.value }))}
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
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Step 2 • Training goal
                  </div>
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
                          variant={focus === option.value ? "default" : "outline"}
                          className="h-auto w-full flex-col gap-2 rounded-2xl px-4 py-4 text-left"
                          onClick={() => setFocus(option.value)}
                        >
                          <Icon className="h-7 w-7" />
                          <span className="text-sm font-semibold uppercase tracking-[0.2em]">
                            {option.label}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {focusDescriptions[focus]}
                  </div>
                </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="rounded-xl border p-3 space-y-3">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Step 3 • Training type
                </div>
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
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Training days</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEEKDAYS.map((day) => {
                        const active = scheduledDays.includes(day.key);
                        return (
                          <Button
                            key={day.key}
                            type="button"
                            variant={active ? "default" : "outline"}
                            className="rounded-full text-xs uppercase tracking-[0.25em]"
                            onClick={() => toggleDay(day.key)}
                          >
                            {day.short}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {scheduledDays.length} days selected
                    </div>
                  </div>
                </div>
                </div>
              ) : null}

              {error ? (
                <div className="text-sm text-destructive">{error}</div>
              ) : null}
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
              <Button
                className="w-full sm:flex-1 rounded-2xl"
                onClick={handleNext}
                disabled={isGenerating}
              >
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

function SettingsPanel({
  settings,
  templates,
  onChange,
  onResetRequest,
}: {
  settings: Settings;
  templates: Template[];
  onChange: (s: Settings) => void;
  onResetRequest: () => void;
}) {
  const heightLabel = settings.units === "kg" ? "Height (cm)" : "Height";
  const weightLabel = `Bodyweight (${settings.units})`;
  const parseHeight = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const heightValue = parseHeight(settings.profile.height);
  const heightFeet = Math.floor(heightValue / 12) || 5;
  const heightRemainder = heightValue ? Math.round(heightValue % 12) : 0;
  const heightMeters = Math.floor(heightValue / 100) || 1;
  const heightCmRemainder = heightValue ? Math.round(heightValue % 100) : 0;
  const updateProfile = (partial: Partial<Profile>) => {
    const nextProfile = { ...settings.profile, ...partial };
    const completed =
      nextProfile.completed ||
      (!!nextProfile.name.trim() &&
        Number(nextProfile.age) > 0 &&
        Number(nextProfile.height) > 0 &&
        Number(nextProfile.weight) > 0);
    onChange({ ...settings, profile: { ...nextProfile, completed } });
  };

  return (
    <div className="space-y-3">
      <div className="font-medium">Settings</div>

      <div className="rounded-xl border p-3 space-y-5">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profile</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={settings.profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label>Age</Label>
              <Input
                inputMode="numeric"
                value={settings.profile.age}
                onChange={(e) => updateProfile({ age: e.target.value })}
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
                      updateProfile({ height: String(Number(v) * 100 + heightCmRemainder) })
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
                      updateProfile({ height: String(heightMeters * 100 + Number(v)) })
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
                    value={String(heightFeet)}
                    onValueChange={(v) =>
                      updateProfile({ height: String(Number(v) * 12 + heightRemainder) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                    value={String(heightRemainder)}
                    onValueChange={(v) =>
                      updateProfile({ height: String(heightFeet * 12 + Number(v)) })
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
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
                  value={settings.profile.weight || "80"}
                  onValueChange={(v) => updateProfile({ weight: v })}
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
                  value={settings.profile.weight}
                  onChange={(e) => updateProfile({ weight: e.target.value })}
                  placeholder="e.g. 180"
                />
              )}
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Units</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Units</div>
              <div className="text-xs text-muted-foreground">Used for display + suggestions.</div>
            </div>
            <Select value={settings.units} onValueChange={(v) => onChange({ ...settings, units: v as Units })}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lb">lb</SelectItem>
                <SelectItem value="kg">kg</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Theme</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Dark mode</div>
              <div className="text-xs text-muted-foreground">Toggle theme for this device.</div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => onChange({ ...settings, darkMode: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Theme</div>
              <div className="text-xs text-muted-foreground">Choose your vibe.</div>
            </div>
            <Select
              value={settings.theme}
              onValueChange={(v) => onChange({ ...settings, theme: v as Theme })}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="iron">Iron Forge</SelectItem>
                <SelectItem value="noir">Noir Steel</SelectItem>
                <SelectItem value="dune">Desert Dune</SelectItem>
                <SelectItem value="neon">Neon Gym</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Schedule</div>
          <div className="text-xs text-muted-foreground">
            Assign templates to days so the app auto-picks the right workout.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day.key} className="flex items-center gap-2">
                <div className="w-16 text-xs text-muted-foreground">{day.short}</div>
                <Select
                  value={settings.schedule?.[day.key] || "off"}
                  onValueChange={(v) =>
                    onChange({
                      ...settings,
                      schedule: {
                        ...(settings.schedule || emptySchedule),
                        [day.key]: v === "off" ? "" : v,
                      },
                    })
                  }
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Unassigned</SelectItem>
                    <SelectItem value="rest">Rest Day</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Training rules</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Coach mode</div>
              <div className="text-xs text-muted-foreground">
                Unlock coach tools for sending programs and tracking clients.
              </div>
            </div>
            <Switch
              checked={settings.role === "coach"}
              onCheckedChange={(v) =>
                onChange({ ...settings, role: v ? "coach" : "athlete" })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Strict rep range</div>
              <div className="text-xs text-muted-foreground">
                Only add weight after you hit the top end of your rep range.
              </div>
            </div>
            <Switch
              checked={settings.strictRepRangeForProgress}
              onCheckedChange={(v) => onChange({ ...settings, strictRepRangeForProgress: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Powerlifting mode</div>
              <div className="text-xs text-muted-foreground">
                Show a Big 3 1RM panel for squat, bench, and deadlift.
              </div>
            </div>
            <Switch
              checked={settings.powerliftingMode}
              onCheckedChange={(v) => onChange({ ...settings, powerliftingMode: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Auto-goal horizon</div>
              <div className="text-xs text-muted-foreground">Weeks to project a realistic target.</div>
            </div>
            <Input
              className="w-[110px]"
              inputMode="numeric"
              value={settings.autoGoalHorizonWeeks}
              onChange={(e) => {
                const v = clamp(Number(e.target.value) || 6, 2, 24);
                onChange({ ...settings, autoGoalHorizonWeeks: v });
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground">Tip: 6–8 weeks is a good default.</div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Data</div>
          <div className="font-medium text-sm text-destructive">Danger zone</div>
          <div className="text-xs text-muted-foreground">
            Resetting wipes templates, sessions, and goals on this device.
          </div>
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={onResetRequest}
          >
            <Trash2 className="h-4 w-4" />
            Reset all data
          </Button>
        </div>
      </div>
    </div>
  );
}

function ProgramGeneratorDialog({
  open,
  onOpenChange,
  units,
  onGenerate,
  onAddCoachSplit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: Units;
  onGenerate: (templates: Template[], days: Weekday[]) => void;
  onAddCoachSplit: (templates: Template[], days: Weekday[]) => void;
}) {
  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [split, setSplit] = useState<SplitType>("full_body");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [focus, setFocus] = useState<FocusType>("general");
  const [includeCore, setIncludeCore] = useState(true);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [scheduledDays, setScheduledDays] = useState<Weekday[]>(["mon", "wed", "fri"]);
  const [coachDays, setCoachDays] = useState<Weekday[]>([
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
  ]);
  const focusDescriptions: Record<FocusType, string> = {
    hypertrophy: "Build muscle size and shape.",
    strength: "Lift heavier with lower reps.",
    fat_loss: "Burn calories with higher intensity.",
    athletic: "Power, speed, and performance.",
    general: "Balanced mix for overall fitness.",
  };

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
    setIncludeCore(true);
    setIncludeCardio(false);
    setScheduledDays(["mon", "wed", "fri"]);
    setCoachDays(["mon", "tue", "wed", "thu", "fri", "sat"]);
  }, [open]);

  useEffect(() => {
    // smart defaults when split changes
    if (split === "full_body") setDaysPerWeek((d) => clamp(d, 2, 4));
    if (split === "upper_lower") setDaysPerWeek((d) => clamp(d, 3, 5));
    if (split === "ppl") setDaysPerWeek((d) => clamp(d, 3, 6));
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
      includeCore,
      includeCardio,
      units,
    });
  }, [experience, split, daysPerWeek, focus, includeCore, includeCardio, units]);

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
                  </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
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
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-foreground/20 text-muted-foreground hover:text-foreground"
                      aria-label="Explain focus goals"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 text-xs">
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
                <div className="text-xs text-muted-foreground">
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
                    className="rounded-xl"
                    onClick={() => toggleDay(scheduledDays, setScheduledDays, day.key)}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Include finishers</div>
                  <div className="text-xs text-muted-foreground">Adds 5–10 min core work.</div>
                </div>
                <Switch checked={includeCore} onCheckedChange={setIncludeCore} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Add finisher cardio</div>
                  <div className="text-xs text-muted-foreground">Adds a simple optional cardio note.</div>
                </div>
                <Switch checked={includeCardio} onCheckedChange={setIncludeCardio} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Days per week</Label>
              <div className="rounded-xl border bg-background px-3 py-2 text-sm">
                {scheduledDays.length || 0} selected
              </div>
              <div className="text-xs text-muted-foreground">
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
                  <div className="text-xs text-muted-foreground mt-1">
                    {(t.exercises || []).slice(0, 6).map((e) => e.name).join(" • ")}
                    {(t.exercises || []).length > 6 ? " …" : ""}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              You can edit anything after generating (swap exercises, sets, rep ranges, etc.).
            </div>

            <div className="rounded-2xl border p-3 space-y-3">
              <div className="font-medium">Coach Mason’s 2026 Cutting Split</div>
              <div className="text-xs text-muted-foreground">
                Add the full split and assign which days it should land on.
              </div>
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((day) => (
                  <Button
                    key={day.key}
                    type="button"
                    size="sm"
                    variant={coachDays.includes(day.key) ? "secondary" : "outline"}
                    className="rounded-xl"
                    onClick={() => toggleDay(coachDays, setCoachDays, day.key)}
                  >
                    {day.short}
                  </Button>
                ))}
              </div>
              <Button
                className="rounded-xl w-full"
                onClick={() => {
                  const templates = buildCoachMasonSplit();
                  onAddCoachSplit(templates, coachDays);
                  onOpenChange(false);
                }}
              >
                Add Coach Mason Split
              </Button>
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
                includeCore,
                includeCardio,
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

function TemplateManagerDialog({
  open,
  onOpenChange,
  state,
  setState,
  selectedTemplateId,
  onSelectTemplate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(selectedTemplateId);
  const [exporting, setExporting] = useState<Template | null>(null);
  const [importText, setImportText] = useState("");

  useEffect(() => setSelectedId(selectedTemplateId), [selectedTemplateId, open]);

  const selected = useMemo(() => {
    return state.templates.find((t) => t.id === selectedId) || state.templates[0] || null;
  }, [state.templates, selectedId]);

  const updateSelected = (next: Template) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.map((t) => (t.id === next.id ? next : t)),
    }));
  };

  const addTemplate = () => {
    const t: Template = {
      id: uid(),
      name: `New Template ${state.templates.length + 1}`,
      exercises: [],
    };
    setState((prev) => ({ ...prev, templates: [t, ...prev.templates] }));
    setSelectedId(t.id);
    onSelectTemplate(t.id);
  };

  const deleteTemplate = (id: string) => {
    setState((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
      sessions: prev.sessions.map((s) =>
        s.templateId === id
          ? { ...s, templateId: "", templateName: `${s.templateName} (deleted template)` }
          : s
      ),
      settings: {
        ...prev.settings,
        schedule: Object.fromEntries(
          Object.entries(prev.settings.schedule || emptySchedule).map(([k, v]) => [
            k,
            v === id ? "" : v,
          ])
        ) as WeekSchedule,
      },
    }));

    const next = state.templates.find((t) => t.id !== id);
    if (next) {
      setSelectedId(next.id);
      onSelectTemplate(next.id);
    } else {
      setSelectedId("");
      onSelectTemplate("");
    }
  };

  const addExercise = () => {
    if (!selected) return;
    const newExercise: TemplateExercise = {
      id: uid(),
      name: "New Exercise",
      defaultSets: 3,
      repRange: { min: 8, max: 12 },
      restSec: 120,
      weightStep: 5,
      autoProgress: true,
    };

    updateSelected({ ...selected, exercises: [...selected.exercises, newExercise] });
  };

  const deleteExercise = (exId: string | undefined) => {
    if (!selected || !exId) return;
    updateSelected({
      ...selected,
      exercises: selected.exercises.filter((e) => e.id !== exId),
    });
  };

  const moveExercise = (exId: string, dir: number) => {
    if (!selected) return;
    const idx = selected.exercises.findIndex((e) => e.id === exId);
    if (idx < 0) return;
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= selected.exercises.length) return;
    const next = [...selected.exercises];
    const [item] = next.splice(idx, 1);
    next.splice(nextIdx, 0, item);
    updateSelected({ ...selected, exercises: next });
  };

  const safeMoveExercise = (exId: string | undefined, dir: number) => {
    if (!exId) return;
    moveExercise(exId, dir);
  };

  const exportTemplate = async (t: Template) => {
    const payload = JSON.stringify(t, null, 2);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        alert("Template copied to clipboard. Send this JSON to your client.");
        return;
      }
    } catch {}
    setExporting(t);
  };

  const importTemplate = () => {
    try {
      const parsed = JSON.parse(importText);
      if (!parsed?.name || !Array.isArray(parsed?.exercises)) {
        alert("Invalid template JSON.");
        return;
      }
      const newTemplate: Template = {
        ...parsed,
        id: uid(),
        exercises: parsed.exercises.map((e: any) => ({ ...e, id: uid() })),
      };
      setState((p) => ({ ...p, templates: [newTemplate, ...p.templates] }));
      setImportText("");
      alert("Template imported!");
    } catch {
      alert("Invalid JSON.");
    }
  };

  const role: UserRole = (state.settings as any)?.role === "coach" ? "coach" : "athlete";
  const isCoach = role === "coach";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <DialogTitle>Workout templates</DialogTitle>
              <DialogDescription>
                {isCoach
                  ? "Coach view: export templates and send the JSON to clients."
                  : "Athlete view: import templates your coach sends you (JSON)."}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="rounded-xl">Mode</Badge>
              <div className="inline-flex rounded-xl border bg-background p-1">
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded-lg transition ${!isCoach ? "bg-muted" : "hover:bg-muted/60"}`}
                  onClick={() =>
                    setState((p) => ({
                      ...p,
                      settings: { ...(p.settings as any), role: "athlete" },
                    }))
                  }
                >
                  Athlete
                </button>
                <button
                  type="button"
                  className={`px-3 py-1 text-sm rounded-lg transition ${isCoach ? "bg-muted" : "hover:bg-muted/60"}`}
                  onClick={() =>
                    setState((p) => ({
                      ...p,
                      settings: { ...(p.settings as any), role: "coach" },
                    }))
                  }
                >
                  Coach
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">Templates</div>
              <Button size="sm" variant="outline" className="rounded-xl" onClick={addTemplate}>
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
            {state.templates.length === 0 ? (
              <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                No templates yet. Add one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {state.templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedId(t.id);
                      onSelectTemplate(t.id);
                    }}
                    className={`w-full text-left rounded-xl border p-3 hover:bg-muted transition ${
                      t.id === selectedId ? "bg-muted" : ""
                    }`}
                  >
                    <div className="font-medium flex items-center justify-between">
                      <span>{t.name}</span>
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </div>
                    <div className="text-xs text-muted-foreground">{(t.exercises || []).length} exercises</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-3">
            {selected ? (
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div className="space-y-1">
                  <Label>Template name</Label>
                  <Input
                    value={selected?.name || ""}
                    onChange={(e) => updateSelected({ ...selected, name: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  {isCoach ? (
                    <Button variant="outline" className="rounded-2xl" onClick={() => exportTemplate(selected)}>
                      <Download className="h-4 w-4 mr-2" /> Export for client
                    </Button>
                  ) : null}
                  <Button variant="destructive" className="rounded-2xl" onClick={() => deleteTemplate(selected.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Select a template or click Add to create your first one.
              </div>
            )}

            <Separator />

            {!isCoach ? (
              <>
                <div className="rounded-xl border p-3 space-y-2">
                  <Label className="text-sm">Import template (from coach)</Label>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="min-h-[120px] w-full rounded-xl border bg-background p-2 text-sm"
                    placeholder="Paste template JSON here"
                  />
                  <Button size="sm" className="rounded-xl" onClick={importTemplate}>
                    Import template
                  </Button>
                </div>

                <Separator />
              </>
            ) : (
              <>
                <div className="rounded-xl border p-3">
                  <div className="text-sm font-medium">Sending to clients</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Open a template, click <span className="font-medium">Export for client</span>, then send the copied JSON.
                  </div>
                </div>

                <Separator />
              </>
            )}

            {selected ? (
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="font-medium">Exercises</div>

                  <div className="flex items-center gap-2">
                    <Select
                      onValueChange={(v) => {
                        const preset = COMMON_EXERCISES.find((x) => x.name === v);
                        if (!preset) return;
                        updateSelected({
                          ...selected,
                          exercises: [...selected.exercises, { id: uid(), ...preset }],
                        });
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[260px]">
                        <SelectValue placeholder="Add from library" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMON_EXERCISES.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button size="sm" variant="outline" className="rounded-xl" onClick={addExercise}>
                      <Plus className="h-4 w-4 mr-2" /> Add exercise
                    </Button>
                  </div>
                </div>

                {(selected.exercises || []).length === 0 ? (
                  <div className="text-sm text-muted-foreground">Add exercises to this template.</div>
                ) : (
                  <div className="space-y-3">
                    {selected.exercises.map((ex) => (
                      <div key={ex.id} className="rounded-2xl border p-3">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>Exercise name</Label>
                              <Input
                                value={ex.name}
                                onChange={(e) =>
                                  updateSelected({
                                    ...selected,
                                    exercises: selected.exercises.map((x) =>
                                      x.id === ex.id ? { ...x, name: e.target.value } : x
                                    ),
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label>Default sets</Label>
                              <Input
                                inputMode="numeric"
                                value={ex.defaultSets}
                                onChange={(e) => {
                                  const v = clamp(Number(e.target.value) || 1, 1, 12);
                                  updateSelected({
                                    ...selected,
                                    exercises: selected.exercises.map((x) =>
                                      x.id === ex.id ? { ...x, defaultSets: v } : x
                                    ),
                                  });
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => safeMoveExercise(ex.id, -1)}>
                              Up
                            </Button>
                            <Button size="sm" variant="outline" className="rounded-xl" onClick={() => safeMoveExercise(ex.id, 1)}>
                              Down
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => deleteExercise(ex.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  units,
  existingExercises,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: Units;
  existingExercises: string[];
  onAdd: (g: Omit<Goal, "id" | "status">) => void;
}) {
  const [exerciseName, setExerciseName] = useState("");
  const [metric, setMetric] = useState<GoalMetric>("e1rm");
  const [targetValue, setTargetValue] = useState("");
  const [dueDateISO, setDueDateISO] = useState("");

  useEffect(() => {
    if (!open) return;
    setExerciseName(existingExercises?.[0] || "");
    setMetric("e1rm");
    setTargetValue("");
    setDueDateISO("");
  }, [open, existingExercises]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add a goal</DialogTitle>
          <DialogDescription>
            Choose an exercise and a metric. Example: Bench e1RM → 225.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Exercise</Label>
            <Input value={exerciseName} onChange={(e) => setExerciseName(e.target.value)} placeholder="Bench Press" />
            {existingExercises?.length ? (
              <div className="flex flex-wrap gap-2">
                {existingExercises.slice(0, 8).map((x) => (
                  <button
                    key={x}
                    onClick={() => setExerciseName(x)}
                    className="text-xs rounded-xl border px-2 py-1 hover:bg-muted"
                  >
                    {x}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Metric</Label>
            <Select value={metric} onValueChange={(v) => setMetric(v as GoalMetric)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="e1rm">Estimated 1RM (e1RM)</SelectItem>
                <SelectItem value="top_set_weight">Top set weight</SelectItem>
                <SelectItem value="volume">Session volume</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Target value</Label>
            <Input
              inputMode="decimal"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={metric === "volume" ? "e.g. 8000" : "e.g. 225"}
            />
            <div className="text-xs text-muted-foreground">{metricLabel(metric, units)}</div>
          </div>

          <div className="space-y-2">
            <Label>Due date (optional)</Label>
            <Input value={dueDateISO} onChange={(e) => setDueDateISO(e.target.value)} placeholder="YYYY-MM-DD" />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const ex = exerciseName.trim();
              const tv = Number(targetValue);
              if (!ex) return alert("Enter an exercise name.");
              if (!tv || tv <= 0) return alert("Enter a valid target value.");
              onAdd({ exerciseName: ex, metric, targetValue: tv, dueDateISO: dueDateISO || undefined });
              onOpenChange(false);
            }}
          >
            Add goal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (jsonText: string) => void;
}) {
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
  }, [open]);

  const onPickFile = async (file: File) => {
    const t = await file.text();
    setText(t);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Import data</DialogTitle>
          <DialogDescription>
            Paste a full export or a coach package JSON.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPickFile(f);
            }}
          />

          <Button variant="outline" className="rounded-2xl w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" /> Choose file
          </Button>

          <Label>JSON</Label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-[220px] w-full rounded-xl border bg-background p-3 text-sm"
            placeholder="{ ... }"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => onImport(text)}>Import</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// -------------------- Program Generator --------------------

function adjustForExperience(
  ex: Omit<TemplateExercise, "id">,
  experience: ExperienceLevel
): Omit<TemplateExercise, "id"> {
  const next = { ...ex };
  const isCompound = /squat|deadlift|bench press|overhead press|row|pull-up|pulldown|hip thrust/i.test(
    ex.name
  );

  if (experience === "beginner") {
    // fewer hard sets, more practice reps
    next.defaultSets = isCompound ? Math.min(next.defaultSets, 3) : Math.min(next.defaultSets, 2);
    next.restSec = Math.min(next.restSec, 150);
    if (!next.timeUnit) {
      next.repRange = {
        min: Math.max(next.repRange.min, 8),
        max: Math.max(next.repRange.max, 10),
      };
    }
  }

  if (experience === "advanced") {
    // a bit more volume + rest
    next.defaultSets = isCompound ? Math.max(next.defaultSets, 4) : Math.max(next.defaultSets, 3);
    next.restSec = Math.max(next.restSec, isCompound ? 150 : 75);
  }

  return next;
}

function pickByName(names: string[]) {
  const lib = COMMON_EXERCISES.map((x) => ({ ...x }));
  const out: Array<Omit<TemplateExercise, "id">> = [];
  for (const n of names) {
    const found = lib.find((x) => x.name.toLowerCase() === n.toLowerCase());
    if (found) out.push(found);
  }
  return out;
}

function adaptExerciseForFocus(
  ex: Omit<TemplateExercise, "id">,
  focus: FocusType,
  experience: ExperienceLevel
): Omit<TemplateExercise, "id"> {
  // Simple, friendly defaults: beginners get slightly higher reps on compounds to learn form.
  const isBig =
    /squat|deadlift|bench press|overhead press|row|pull-up|pulldown/i.test(ex.name);

  const next = { ...ex };

  if (focus === "strength") {
    if (isBig) {
      next.repRange = experience === "beginner" ? { min: 5, max: 8 } : { min: 3, max: 6 };
      next.defaultSets = experience === "advanced" ? Math.max(3, ex.defaultSets) : Math.max(2, ex.defaultSets);
      next.restSec = Math.max(150, ex.restSec);
    } else {
      next.repRange = { min: 8, max: 12 };
      next.restSec = Math.max(90, ex.restSec);
    }
  }

  if (focus === "hypertrophy") {
    if (isBig) {
      next.repRange = experience === "advanced" ? { min: 6, max: 10 } : { min: 8, max: 12 };
      next.defaultSets = Math.max(3, ex.defaultSets);
      next.restSec = Math.min(150, Math.max(90, ex.restSec));
    } else {
      next.repRange = { min: 10, max: 15 };
      next.defaultSets = Math.max(3, ex.defaultSets);
      next.restSec = Math.min(90, Math.max(60, ex.restSec));
    }
  }

  if (focus === "fat_loss") {
    if (isBig) {
      next.repRange = experience === "advanced" ? { min: 6, max: 10 } : { min: 8, max: 12 };
      next.defaultSets = Math.max(3, ex.defaultSets);
      next.restSec = Math.min(120, Math.max(75, ex.restSec));
    } else {
      next.repRange = experience === "advanced" ? { min: 12, max: 18 } : { min: 12, max: 20 };
      next.defaultSets = Math.max(3, ex.defaultSets);
      next.restSec = Math.min(75, Math.max(45, ex.restSec));
    }
  }

  if (focus === "athletic") {
    if (isBig) {
      next.repRange =
        experience === "advanced"
          ? { min: 3, max: 5 }
          : experience === "beginner"
          ? { min: 5, max: 8 }
          : { min: 4, max: 6 };
      next.defaultSets = Math.max(3, ex.defaultSets);
      next.restSec = Math.max(150, ex.restSec);
    } else {
      next.repRange = { min: 6, max: 10 };
      next.defaultSets = Math.max(2, ex.defaultSets);
      next.restSec = Math.max(75, ex.restSec);
    }
  }

  if (focus === "general") {
    // keep library defaults, but make beginners a little more reps-friendly
    if (experience === "beginner" && isBig) {
      next.repRange = { min: Math.max(5, ex.repRange.min), max: Math.max(8, ex.repRange.max) };
    }
  }

  return adjustForExperience(next, experience);
}

function buildDay(
  name: string,
  exerciseNames: string[],
  focus: FocusType,
  experience: ExperienceLevel
): Template {
  const picked = pickByName(exerciseNames)
    .map((ex) => adaptExerciseForFocus(ex, focus, experience))
    .map((ex) => ({ id: uid(), ...ex }));

  return {
    id: uid(),
    name,
    exercises: applyIntensityTechniques(picked, focus),
  };
}

function applyIntensityTechniques(exercises: TemplateExercise[], focus: FocusType) {
  const next = exercises.map((ex) => ({ ...ex }));
  const available = next.length;
  if (available === 0) return next;
  const accessoryStart = 2;

  const highIntensity = focus === "hypertrophy" || focus === "fat_loss";
  const allowTriset = focus === "fat_loss" && available - accessoryStart >= 3;

  if (allowTriset) {
    const start = Math.max(accessoryStart, available - 3);
    for (let i = start; i < start + 3; i += 1) {
      if (!next[i]) continue;
      if (next[i].setType && next[i].setType !== "normal") continue;
      next[i].setType = "triset";
      next[i].supersetTag = "T";
    }
  }

  if (highIntensity) {
    // Superset the last 2-6 accessory movements (leave first 2 big lifts alone).
    const maxPairs = focus === "fat_loss" ? 3 : 2;
    const pairCount = available >= 4 ? Math.min(maxPairs, Math.floor((available - accessoryStart) / 2)) : 0;
    const startIndex = Math.max(accessoryStart, available - pairCount * 2);
    let tagIndex = 0;
    for (let p = 0; p < pairCount; p += 1) {
      const tag = String.fromCharCode(65 + tagIndex);
      const base = startIndex + p * 2;
      if (next[base]?.setType === "triset" || next[base + 1]?.setType === "triset") continue;
      for (let i = base; i < base + 2; i += 1) {
        if (!next[i]) continue;
        if (next[i].setType && next[i].setType !== "normal") continue;
        next[i].setType = "superset";
        next[i].supersetTag = tag;
      }
      tagIndex += 1;
    }
  }

  // Add a dropset to the last accessory if it is not already tagged.
  for (let i = available - 1; i >= accessoryStart; i -= 1) {
    if (next[i].setType && next[i].setType !== "normal") continue;
    if (focus === "strength" || focus === "athletic") break;
    next[i].setType = "dropset";
    break;
  }

  return next;
}

function generateProgramTemplates(opts: {
  experience: ExperienceLevel;
  split: SplitType;
  daysPerWeek: number;
  focus: FocusType;
  includeCore: boolean;
  includeCardio: boolean;
  units: Units;
}): Template[] {
  const { experience, split, daysPerWeek, focus, includeCore, includeCardio } = opts;

  // Notes: we keep templates simple + editable. This is designed to be welcoming,
  // not “maximalist bodybuilding spreadsheets.”

  const finishers = includeCore ? ["Plank", "Cable Crunch"] : [];
  const addFinishers = (names: string[]) => [...names, ...finishers];

  const effectiveCardio = includeCardio || focus === "fat_loss";
  const cardioRange =
    focus === "fat_loss"
      ? experience === "advanced"
        ? { min: 25, max: 40 }
        : experience === "beginner"
        ? { min: 15, max: 25 }
        : { min: 20, max: 30 }
      : { min: 25, max: 35 };
  const cardioLabel =
    focus === "fat_loss"
      ? "Cardio Intervals (min)"
      : experience === "advanced"
      ? "Cardio (post-workout)"
      : "Cardio Finisher (min)";

  const maybeAddCardioFinisher = (templates: Template[]) => {
    if (!effectiveCardio) return templates;
    return appendCardioFinisher(templates, cardioLabel, cardioRange);
  };

  if (split === "full_body") {
    const d = clamp(daysPerWeek, 2, 4);
    const days: Template[] = [];
    const baseA_beginner = ["Goblet Squat", "Machine Chest Press", "Lat Pulldown", "Leg Press", "Lateral Raise"]; 
    const baseB_beginner = ["Back Squat", "Dumbbell Bench Press", "Seated Cable Row", "Leg Curl", "Triceps Pushdown"]; 

    const baseA_intermediate = ["Back Squat", "Bench Press", "Lat Pulldown", "Romanian Deadlift", "Lateral Raise"]; 
    const baseB_intermediate = ["Front Squat", "Overhead Press", "Barbell Row", "Leg Press", "Triceps Pushdown"]; 
    const baseC_intermediate = ["Deadlift", "Incline Bench Press", "Pull-Up", "Leg Curl", "Dumbbell Curl"]; 

    const baseA_advanced = ["Back Squat", "Bench Press", "Chest Supported Row", "Romanian Deadlift", "Lateral Raise", "Face Pull"]; 
    const baseB_advanced = ["Front Squat", "Overhead Press", "Barbell Row", "Hip Thrust", "Leg Extension", "Triceps Pushdown"]; 
    const baseC_advanced = ["Deadlift", "Incline Bench Press", "Pull-Up", "Leg Curl", "Bulgarian Split Squat", "Hammer Curl"]; 

    const baseA = experience === "beginner" ? baseA_beginner : experience === "advanced" ? baseA_advanced : baseA_intermediate;
    const baseB = experience === "beginner" ? baseB_beginner : experience === "advanced" ? baseB_advanced : baseB_intermediate;
    const baseC = experience === "beginner" ? baseB_beginner : experience === "advanced" ? baseC_advanced : baseC_intermediate;

    const pick = [baseA, baseB, baseC, baseA];
    for (let i = 0; i < d; i++) {
      days.push(
        buildDay(
          `Full Body ${String.fromCharCode(65 + i)}`,
          addFinishers(pick[i]),
          focus,
          experience
        )
      );
    }
    return maybeAddCardioFinisher(days);
  }

  if (split === "upper_lower") {
    const d = clamp(daysPerWeek, 3, 5);
    const upper_beginner = ["Machine Chest Press", "Dumbbell Bench Press", "Lat Pulldown", "Seated Cable Row", "Lateral Raise", "Triceps Pushdown"]; 
    const lower_beginner = ["Goblet Squat", "Leg Press", "Leg Curl", "Calf Raise", "Leg Extension"]; 

    const upper_intermediate = ["Bench Press", "Overhead Press", "Lat Pulldown", "Barbell Row", "Lateral Raise", "Triceps Pushdown", "Dumbbell Curl"]; 
    const lower_intermediate = ["Back Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"]; 

    const upper_advanced = ["Bench Press", "Overhead Press", "Pull-Up", "Chest Supported Row", "Lat Pulldown", "Lateral Raise", "Face Pull", "Dumbbell Curl"]; 
    const lower_advanced = ["Back Squat", "Deadlift", "Romanian Deadlift", "Leg Press", "Bulgarian Split Squat", "Leg Curl", "Calf Raise"]; 

    const upper = experience === "beginner" ? upper_beginner : experience === "advanced" ? upper_advanced : upper_intermediate;
    const lower = experience === "beginner" ? lower_beginner : experience === "advanced" ? lower_advanced : lower_intermediate;

    const sequence = d === 3 ? ["Upper", "Lower", "Upper"] : d === 4 ? ["Upper", "Lower", "Upper", "Lower"] : ["Upper", "Lower", "Upper", "Lower", "Upper"];

    return maybeAddCardioFinisher(sequence.map((label, i) =>
      label === "Upper"
        ? buildDay(
          `Upper ${Math.ceil((i + 1) / 2)}`,
          addFinishers(upper),
          focus,
          experience
          )
        : buildDay(
            `Lower ${Math.ceil((i + 1) / 2)}`,
            addFinishers(lower),
            focus,
            experience
          )
    ));;
  }

  // PHUL (Power / Hypertrophy Upper Lower)
  if (split === "phul") {
    const d = clamp(daysPerWeek, 2, 4);

    const upperPower_beginner = ["Machine Chest Press", "Seated Cable Row", "Dumbbell Shoulder Press", "Lat Pulldown"];
    const lowerPower_beginner = ["Leg Press", "Goblet Squat", "Romanian Deadlift", "Leg Curl", "Calf Raise"];
    const upperHyper_beginner = ["Dumbbell Bench Press", "Incline Dumbbell Press", "Lat Pulldown", "Seated Cable Row", "Lateral Raise", "Triceps Pushdown", "Dumbbell Curl"];
    const lowerHyper_beginner = ["Leg Press", "Leg Extension", "Leg Curl", "Dumbbell Romanian Deadlift", "Calf Raise"];

    const upperPower_intermediate = ["Bench Press", "Barbell Row", "Overhead Press", "Lat Pulldown"];
    const lowerPower_intermediate = ["Back Squat", "Romanian Deadlift", "Leg Press", "Calf Raise"];
    const upperHyper_intermediate = ["Incline Bench Press", "Dumbbell Bench Press", "Lat Pulldown", "Seated Cable Row", "Lateral Raise", "Triceps Pushdown", "Dumbbell Curl"];
    const lowerHyper_intermediate = ["Front Squat", "Leg Press", "Leg Extension", "Leg Curl", "Calf Raise"];

    const upperPower_advanced = ["Bench Press", "Barbell Row", "Overhead Press", "Weighted Pull-Up", "Face Pull"];
    const lowerPower_advanced = ["Back Squat", "Deadlift", "Romanian Deadlift", "Leg Press", "Calf Raise"];
    const upperHyper_advanced = ["Incline Bench Press", "Dumbbell Bench Press", "Cable Fly", "Lat Pulldown", "Seated Cable Row", "Lateral Raise", "Triceps Pushdown", "Dumbbell Curl"];
    const lowerHyper_advanced = ["Front Squat", "Bulgarian Split Squat", "Leg Press", "Leg Extension", "Leg Curl", "Calf Raise"];

    const upPow = experience === "beginner" ? upperPower_beginner : experience === "advanced" ? upperPower_advanced : upperPower_intermediate;
    const loPow = experience === "beginner" ? lowerPower_beginner : experience === "advanced" ? lowerPower_advanced : lowerPower_intermediate;
    const upHyp = experience === "beginner" ? upperHyper_beginner : experience === "advanced" ? upperHyper_advanced : upperHyper_intermediate;
    const loHyp = experience === "beginner" ? lowerHyper_beginner : experience === "advanced" ? lowerHyper_advanced : lowerHyper_intermediate;

    const phulDays: Template[] = [
      buildDay("Upper • Power", addFinishers(upPow), "strength", experience),
      buildDay("Lower • Power", addFinishers(loPow), "strength", experience),
      buildDay("Upper • Hypertrophy", addFinishers(upHyp), "hypertrophy", experience),
      buildDay("Lower • Hypertrophy", addFinishers(loHyp), "hypertrophy", experience),
    ];

    return maybeAddCardioFinisher(phulDays.slice(0, d));
  }

  // Bro Split (5-day body-part split)
  if (split === "bro_split") {
    const d = clamp(daysPerWeek, 3, 5);

    const chest_beginner = ["Machine Chest Press", "Dumbbell Bench Press", "Cable Fly", "Triceps Pushdown"];
    const back_beginner = ["Lat Pulldown", "Seated Cable Row", "Face Pull", "Dumbbell Curl"];
    const legs_beginner = ["Leg Press", "Goblet Squat", "Leg Extension", "Leg Curl", "Calf Raise"];
    const shoulders_beginner = ["Dumbbell Shoulder Press", "Lateral Raise", "Face Pull"];
    const arms_beginner = ["Triceps Pushdown", "Overhead Triceps Extension", "Dumbbell Curl", "Hammer Curl"];

    const chest_intermediate = ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Dips"];
    const back_intermediate = ["Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row", "Face Pull"];
    const legs_intermediate = ["Back Squat", "Romanian Deadlift", "Leg Press", "Leg Curl", "Calf Raise"];
    const shoulders_intermediate = ["Overhead Press", "Lateral Raise", "Rear Delt Fly", "Face Pull"];
    const arms_intermediate = ["Close-Grip Bench Press", "Triceps Pushdown", "Dumbbell Curl", "Hammer Curl"];

    const chest_advanced = ["Bench Press", "Incline Bench Press", "Dumbbell Bench Press", "Cable Fly", "Dips"];
    const back_advanced = ["Weighted Pull-Up", "Barbell Row", "Lat Pulldown", "Seated Cable Row", "Face Pull", "Dumbbell Curl"];
    const legs_advanced = ["Back Squat", "Deadlift", "Romanian Deadlift", "Leg Press", "Bulgarian Split Squat", "Leg Curl", "Calf Raise"];
    const shoulders_advanced = ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise", "Rear Delt Fly", "Face Pull"];
    const arms_advanced = ["Close-Grip Bench Press", "Skull Crusher", "Triceps Pushdown", "Dumbbell Curl", "Hammer Curl"];

    const chest = experience === "beginner" ? chest_beginner : experience === "advanced" ? chest_advanced : chest_intermediate;
    const back = experience === "beginner" ? back_beginner : experience === "advanced" ? back_advanced : back_intermediate;
    const legs = experience === "beginner" ? legs_beginner : experience === "advanced" ? legs_advanced : legs_intermediate;
    const shoulders = experience === "beginner" ? shoulders_beginner : experience === "advanced" ? shoulders_advanced : shoulders_intermediate;
    const arms = experience === "beginner" ? arms_beginner : experience === "advanced" ? arms_advanced : arms_intermediate;

    const seq = ["Chest", "Back", "Legs", "Shoulders", "Arms"];
    const out = seq.slice(0, d).map((label) => {
      if (label === "Chest") return buildDay("Chest", addFinishers(chest), focus, experience);
      if (label === "Back") return buildDay("Back", addFinishers(back), focus, experience);
      if (label === "Legs") return buildDay("Legs", addFinishers(legs), focus, experience);
      if (label === "Shoulders") return buildDay("Shoulders", addFinishers(shoulders), focus, experience);
      return buildDay("Arms", addFinishers(arms), focus, experience);
    });

    return maybeAddCardioFinisher(out);
  }

  if (split === "ppl") {
  const d = clamp(daysPerWeek, 3, 6);
  const push_beginner = ["Machine Chest Press", "Dumbbell Bench Press", "Overhead Press", "Lateral Raise", "Triceps Pushdown"]; 
  const pull_beginner = ["Lat Pulldown", "Seated Cable Row", "Face Pull", "Dumbbell Curl"]; 
  const legs_beginner = ["Goblet Squat", "Leg Press", "Leg Curl", "Leg Extension", "Calf Raise"]; 

  const push_intermediate = ["Bench Press", "Incline Bench Press", "Overhead Press", "Lateral Raise", "Triceps Pushdown", "Skull Crushers"]; 
  const pull_intermediate = ["Pull-Up", "Lat Pulldown", "Barbell Row", "Hammer Curl", "Dumbbell Curl"]; 
  const legs_intermediate = ["Back Squat", "Leg Press", "Romanian Deadlift", "Leg Curl", "Calf Raise"]; 

  const push_advanced = ["Bench Press", "Incline Bench Press", "Overhead Press", "Lateral Raise", "Face Pull", "Triceps Pushdown", "Skull Crushers"]; 
  const pull_advanced = ["Pull-Up", "Chest Supported Row", "Lat Pulldown", "Barbell Row", "Face Pull", "Hammer Curl", "Dumbbell Curl"]; 
  const legs_advanced = ["Back Squat", "Deadlift", "Romanian Deadlift", "Leg Press", "Bulgarian Split Squat", "Leg Curl", "Calf Raise"]; 

  const push = experience === "beginner" ? push_beginner : experience === "advanced" ? push_advanced : push_intermediate;
  const pull = experience === "beginner" ? pull_beginner : experience === "advanced" ? pull_advanced : pull_intermediate;
  const legs = experience === "beginner" ? legs_beginner : experience === "advanced" ? legs_advanced : legs_intermediate;

  const seq = d === 3 ? ["Push", "Pull", "Legs"] : d === 4 ? ["Push", "Pull", "Legs", "Push"] : d === 5 ? ["Push", "Pull", "Legs", "Push", "Pull"] : ["Push", "Pull", "Legs", "Push", "Pull", "Legs"];

  return maybeAddCardioFinisher(seq.map((label, i) => {
    if (label === "Push")
      return buildDay(
        `Push ${Math.ceil((i + 1) / 3)}`,
        addFinishers(push),
        focus,
        experience
      );
    if (label === "Pull")
      return buildDay(
        `Pull ${Math.ceil((i + 1) / 3)}`,
        addFinishers(pull),
        focus,
        experience
      );
    return buildDay(
      `Legs ${Math.ceil((i + 1) / 3)}`,
      addFinishers(legs),
      focus,
      experience
    );
  }));
  }

  // Fallback
  return maybeAddCardioFinisher([
    buildDay(
      "Full Body A",
      addFinishers(["Goblet Squat", "Machine Chest Press", "Lat Pulldown", "Leg Press"]),
      focus,
      experience
    ),
  ]);

}

// -------------------- Logic: Templates -> Entries --------------------

function buildEntriesFromTemplate(
  template: Template | undefined,
  opts: { suggestions?: Record<string, { next?: { weight: number; reps: number } }> } = {}
): WorkingEntry[] {
  const exs = (template?.exercises || []).map((ex) => {
    const hint = {
      defaultSets: ex.defaultSets ?? 3,
      repRange: ex.repRange || { min: 8, max: 12 },
      restSec: ex.restSec ?? 120,
      weightStep: ex.weightStep ?? 5,
      autoProgress: !!ex.autoProgress,
      timeUnit: ex.timeUnit,
      setType: ex.setType,
      supersetTag: ex.supersetTag,
    };

    const suggested = opts?.suggestions?.[ex.name];
    const setsCount = hint.defaultSets;

    const initialSets = Array.from({ length: setsCount }).map((_, i) => {
      if (i === 0 && suggested?.next?.weight && suggested?.next?.reps) {
        return {
          reps: String(suggested.next.reps),
          weight: String(suggested.next.weight),
          rpe: "",
          notes: "",
          setType: hint.setType || "normal",
          supersetTag: hint.supersetTag || "",
        };
      }
      return {
        reps: "",
        weight: "",
        rpe: "",
        notes: "",
        setType: hint.setType || "normal",
        supersetTag: hint.supersetTag || "",
      };
    });

    return {
      exerciseId: ex.id || uid(),

      exerciseName: ex.name,
      templateHint: hint,
      sets: initialSets,
    };
  });

  return exs;
}

// -------------------- Logic: History & Metrics --------------------

function summarizeSession(session: Session) {
  let setCount = 0;
  let volume = 0;
  let exerciseCount = 0;

  for (const e of session.entries || []) {
    exerciseCount += 1;
    for (const s of e.sets || []) {
      setCount += 1;
      volume += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    }
  }

  return { setCount, volume, exerciseCount };
}

function calcEntryVolume(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  return (entry.sets || []).reduce(
    (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
    0
  );
}

function calcTopSet(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  const sets = entry.sets || [];
  if (sets.length === 0) return { weight: 0, reps: 0 };
  let best = { weight: 0, reps: 0, score: 0 };
  for (const s of sets) {
    const w = Number(s.weight) || 0;
    const r = Number(s.reps) || 0;
    const score = e1rm(w, r);
    if (score > best.score || (score === best.score && w > best.weight)) {
      best = { weight: w, reps: r, score };
    }
  }
  return { weight: best.weight, reps: best.reps };
}

function calcEntryTopE1RM(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  const top = calcTopSet(entry);
  return e1rm(top.weight, top.reps);
}

function buildExerciseHistory(sessions: Session[]) {
  const map: Record<string, any[]> = {};

  for (const s of sessions || []) {
    for (const e of s.entries || []) {
      const name = e.exerciseName;
      const top = calcTopSet(e);
      const vol = calcEntryVolume(e);
      const record = {
        dateISO: s.dateISO,
        templateName: s.templateName,
        topSet: top,
        topE1RM: e1rm(top.weight, top.reps),
        volume: vol,
      };

      map[name] = map[name] ? [record, ...map[name]] : [record];
    }
  }

  for (const k of Object.keys(map)) {
    map[k] = map[k].sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
  }

  return map;
}

function computeSimpleTrend(values: number[]) {
  if (!values || values.length < 2) {
    return { label: "Not enough data", delta: 0 };
  }
  const oldest = values[values.length - 1];
  const newest = values[0];
  const delta = newest - oldest;
  const label = delta > 1e-6 ? "Up" : delta < -1e-6 ? "Down" : "Flat";
  return { label, delta: roundTo(delta, 0.5) };
}

// -------------------- 1RM Calculator --------------------

function OneRmCalculator({ units }: { units: Units }) {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [formula, setFormula] = useState<"epley" | "brzycki" | "lombardi">("epley");

  const w = Number(weight) || 0;
  const r = Number(reps) || 0;

  const estimates = useMemo(() => {
    if (w <= 0 || r <= 0) return null;

    const epleyVal = w * (1 + r / 30);
    const brzyckiVal = r >= 37 ? 0 : w * (36 / (37 - r));
    const lombardiVal = w * Math.pow(r, 0.1);

    const pick = (f: typeof formula) => {
      if (f === "epley") return epleyVal;
      if (f === "brzycki") return brzyckiVal;
      return lombardiVal;
    };

    return {
      selected: pick(formula),
      epley: epleyVal,
      brzycki: brzyckiVal,
      lombardi: lombardiVal,
    };
  }, [w, r, formula]);

  const selectedRounded = estimates ? roundTo(estimates.selected, 0.5) : 0;

  const pctTargets = useMemo(() => {
    if (!estimates) return [] as Array<{ pct: number; weight: number }>;
    const base = selectedRounded;
    const pcts = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
    return pcts.map((p) => ({ pct: Math.round(p * 100), weight: roundTo(base * p, 0.5) }));
  }, [estimates, selectedRounded]);

  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" /> 1RM Calculator
        </CardTitle>
        <CardDescription>
          Enter a weight and reps to estimate your 1RM. Useful for tracking strength progress.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label>Weight ({units})</Label>
            <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 185" />
          </div>
          <div className="space-y-2">
            <Label>Reps</Label>
            <Input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} placeholder="e.g. 5" />
          </div>
          <div className="space-y-2">
            <Label>Formula</Label>
            <Select value={formula} onValueChange={(v) => setFormula(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="epley">Epley</SelectItem>
                <SelectItem value="brzycki">Brzycki</SelectItem>
                <SelectItem value="lombardi">Lombardi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border p-4">
            <div className="text-sm text-muted-foreground">Estimated 1RM</div>
            <div className="text-3xl font-semibold tracking-tight">
              {estimates ? `${formatNumber(selectedRounded)} ${units}` : "—"}
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Note: estimates are best for ~1–10 reps. Very high reps can be less accurate.
            </div>
          </div>

          <div className="rounded-2xl border p-4 space-y-2">
            <div className="font-medium">Compare formulas</div>
            {!estimates ? (
              <div className="text-sm text-muted-foreground">Enter weight + reps.</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Epley</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {formatNumber(roundTo(estimates.epley, 0.5))} {units}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Brzycki</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {estimates.brzycki ? `${formatNumber(roundTo(estimates.brzycki, 0.5))} ${units}` : "—"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Lombardi</span>
                  <Badge variant="secondary" className="rounded-xl">
                    {formatNumber(roundTo(estimates.lombardi, 0.5))} {units}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="font-medium mb-2">Training weights (percent of 1RM)</div>
          {!estimates ? (
            <div className="text-sm text-muted-foreground">Enter weight + reps.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {pctTargets.map((x) => (
                <div key={x.pct} className="rounded-xl border p-3 text-center">
                  <div className="text-xs text-muted-foreground">{x.pct}%</div>
                  <div className="font-medium">
                    {formatNumber(x.weight)} {units}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// -------------------- Progressive Overload Suggestions --------------------

function computeInsights({
  template,
  history,
  settings,
}: {
  template: Template | undefined;
  history: Record<string, any[]>;
  settings: Settings;
}) {
  const suggestions: Record<
    string,
    { last: any; next: { weight: number; reps: number }; reason: string }
  > = {};

  for (const ex of template?.exercises || []) {
    if (!ex.autoProgress) continue;

    const h = history[ex.name];
    if (!h || h.length === 0) continue;

    const last = h[0];
    const repMin = ex.repRange?.min ?? 8;
    const repMax = ex.repRange?.max ?? 12;
    const step = ex.weightStep ?? 5;

    const lastW = Number(last.topSet.weight) || 0;
    const lastR = Number(last.topSet.reps) || 0;

    let nextW = lastW;
    let nextR = lastR;
    let reason = "";

    if (settings.strictRepRangeForProgress) {
      if (lastR >= repMax) {
        nextW = roundTo(lastW + step, step);
        nextR = repMin;
        reason = `You hit the top of your rep range (${repMax}). Add ${step} and restart at ${repMin}.`;
      } else {
        nextW = lastW;
        nextR = clamp(lastR + 1, 1, repMax);
        reason = `Stay at ${lastW} and add a rep (working toward ${repMax}).`;
      }
    } else {
      if (lastR < repMax) {
        nextW = lastW;
        nextR = lastR + 1;
        reason = `Add 1 rep at the same weight until you reach ${repMax}.`;
      } else {
        nextW = roundTo(lastW + step, step);
        nextR = repMin;
        reason = `Then add ${step} and cycle back to ${repMin} reps.`;
      }
    }

    suggestions[ex.name] = {
      last,
      next: { weight: nextW, reps: nextR },
      reason,
    };
  }

  return { suggestions };
}

// -------------------- Auto Goals --------------------

function buildAutoGoals({
  history,
  settings,
}: {
  history: Record<string, any[]>;
  settings: Settings;
}) {
  const horizonWeeks = clamp(Number(settings.autoGoalHorizonWeeks) || 6, 2, 24);
  const goals: Array<Omit<Goal, "id" | "status">> = [];

  for (const [name, items] of Object.entries(history || {})) {
    if (!items || items.length < 3) continue;
    const window = items.slice(0, 6);
    const newest = window[0];
    const oldest = window[window.length - 1];

    const newestDate = new Date(newest.dateISO);
    const oldestDate = new Date(oldest.dateISO);
    const days = Math.max(7, Math.round((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = days / 7;

    const delta = newest.topE1RM - oldest.topE1RM;
    const perWeek = delta / weeks;

    const base = Math.max(...window.map((x) => x.topE1RM));
    let projected = base + perWeek * horizonWeeks;

    const minPct = 0.02;
    const maxPct = 0.1;
    const pct = clamp(projected / (base || 1) - 1, minPct, maxPct);
    projected = base * (1 + pct);

    projected = roundTo(projected, 0.5);

    const due = new Date();
    due.setDate(due.getDate() + horizonWeeks * 7);

    goals.push({
      exerciseName: name,
      metric: "e1rm",
      targetValue: projected,
      dueDateISO: due.toISOString().slice(0, 10),
    });
  }

  goals.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  return goals;
}

// -------------------- Goal Metric Helpers --------------------

function metricLabel(metric: GoalMetric, units: Units) {
  if (metric === "e1rm") return `Estimated 1RM (${units})`;
  if (metric === "top_set_weight") return `Top set weight (${units})`;
  if (metric === "volume") return `Session volume (${units}×reps)`;
  return "Metric";
}

function formatMetricValue(metric: GoalMetric, value: number, units: Units) {
  if (metric === "volume") return `${formatNumber(value)} ${units}×reps`;
  return `${formatNumber(value)} ${units}`;
}

function formatGoalValue(goal: Goal, units: Units) {
  if (goal.metric === "volume") return `${formatNumber(goal.targetValue)} ${units}×reps`;
  return `${formatNumber(goal.targetValue)} ${units}`;
}

function getCurrentMetric(goal: Goal, history: Record<string, any[]>) {
  const items = history[goal.exerciseName];
  if (!items || items.length === 0) return 0;
  const latest = items[0];
  if (goal.metric === "e1rm") return latest.topE1RM;
  if (goal.metric === "top_set_weight") return latest.topSet.weight;
  if (goal.metric === "volume") return latest.volume;
  return 0;
}

// -------------------- Tiny self-tests (dev only) --------------------

function runSelfTests() {
  try {
    // e1rm
    console.assert(Math.abs(e1rm(100, 10) - 133.3333333333) < 0.01, "e1rm basic");
    console.assert(e1rm(0, 10) === 0, "e1rm zero weight");

    // roundTo
    console.assert(roundTo(101.2, 0.5) === 101, "roundTo 0.5");
    console.assert(roundTo(101.26, 0.5) === 101.5, "roundTo 0.5 up");

    // suggestions (double progression)
    const template: Template = {
      id: "t",
      name: "t",
      exercises: [
        {
          id: "e",
          name: "Bench Press",
          defaultSets: 3,
          repRange: { min: 5, max: 8 },
          restSec: 150,
          weightStep: 5,
          autoProgress: true,
        },
      ],
    };
    const history = {
      "Bench Press": [
        {
          dateISO: "2026-01-01",
          topSet: { weight: 185, reps: 8 },
          topE1RM: e1rm(185, 8),
          volume: 0,
        },
      ],
    };
    const s1 = computeInsights({
      template,
      history,
      settings: {
        units: "lb",
        autoGoalMode: true,
        autoGoalHorizonWeeks: 6,
        strictRepRangeForProgress: true,
        powerliftingMode: false,
        darkMode: false,
        role: "athlete",
        theme: "iron",
        schedule: emptySchedule,
        profile: defaultState.settings.profile,
      },
    });
    console.assert(
      s1.suggestions["Bench Press"].next.weight === 190 &&
      s1.suggestions["Bench Press"].next.reps === 5,
      "computeInsights strict: add weight then reset reps"
    );

    // auto goals
    const goals = buildAutoGoals({
      history: {
        Squat: [
          {
            dateISO: "2025-12-01",
            topSet: { weight: 225, reps: 5 },
            topE1RM: e1rm(225, 5),
            volume: 0,
          },
          {
            dateISO: "2025-12-15",
            topSet: { weight: 235, reps: 5 },
            topE1RM: e1rm(235, 5),
            volume: 0,
          },
          {
            dateISO: "2026-01-01",
            topSet: { weight: 245, reps: 5 },
            topE1RM: e1rm(245, 5),
            volume: 0,
          },
        ],
      },
      settings: {
        units: "lb",
        autoGoalMode: true,
        autoGoalHorizonWeeks: 6,
        strictRepRangeForProgress: true,
        powerliftingMode: false,
        darkMode: false,
        role: "athlete",
        theme: "iron",
        schedule: emptySchedule,
        profile: defaultState.settings.profile,
      },
    });
    console.assert(
      goals.length === 1 && goals[0].metric === "e1rm",
      "buildAutoGoals basic"
    );

    // generator
    const gen = generateProgramTemplates({
      experience: "beginner",
      split: "full_body",
      daysPerWeek: 3,
      focus: "general",
      includeCore: true,
      includeCardio: false,
      units: "lb",
    });
    console.assert(gen.length === 3, "generator creates correct day count");
    console.assert(
      gen[0].exercises.length >= 3,
      "generator creates templates with exercises"
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("Self-tests failed", e);
  }
}

if (typeof window !== "undefined") {
  // Run once
  // @ts-ignore
  if (!(window as any).__workoutTrackerTestsRan) {
    // @ts-ignore
    (window as any).__workoutTrackerTestsRan = true;
    runSelfTests();
  }
}
