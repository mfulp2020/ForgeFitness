"use client";


import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import type { User as SupabaseUser } from "@supabase/supabase-js";
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
  Home,
  Trophy,
  HelpCircle,
  Zap,
  Heart,
  User,
  UserPlus,
  MessageCircle,
  Grid3X3,
  Send,
  Loader2,
  Settings as SettingsIcon,
  ChevronDown,
  MoreHorizontal,
  Play,
  Star,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  source?: "generated" | "custom" | "coach" | "custom_split";
  splitKey?: string;
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

type WeighIn = {
  dateISO: string;
  weight: number;
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

type UserRole = "athlete" | "smart_trainer" | "coach";
type Theme = "neon" | "iron" | "dune" | "noir";
type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type WeekSchedule = Record<Weekday, string>;

type Profile = {
  name: string;
  age: string;
  height: string;
  weight: string;
  birthdate: string;
  disclaimerAccepted: boolean;
  gender?: "male" | "female" | "prefer_not";
  coachNotes?: string;
  favoriteExercises?: string[];
  recentExercises?: string[];
  username?: string;
  avatarUrl?: string;
  shareWorkouts?: boolean;
  sharePRs?: boolean;
  shareWeighIns?: boolean;
  shareTrophies?: boolean;
  shareGoals?: boolean;
  shareStreaks?: boolean;
  completed: boolean;
  introSeen: boolean;
};

type Settings = {
  units: Units;
  autoGoalMode: boolean;
  autoGoalHorizonWeeks: number;
  strictRepRangeForProgress: boolean;
  powerliftingMode: boolean;
  simpleMode?: boolean;
  darkMode: boolean;
  role: UserRole;
  theme: Theme;
  schedule: WeekSchedule;
  activeSplitKey?: string;
  profile: Profile;
};

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type SplitType = "full_body" | "upper_lower" | "ppl" | "phul" | "bro_split" | "custom";
type FocusType = "general" | "strength" | "hypertrophy" | "fat_loss" | "athletic";
type GenderStyle = "neutral" | "glute" | "mass";

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
};

type UnlockedAchievement = {
  id: string;
  unlockedAt: string;
};

type AppState = {
  templates: Template[];
  sessions: Session[];
  goals: Goal[];
  weighIns: WeighIn[];
  achievements: UnlockedAchievement[];
  savedSplits: Record<string, Template[]>;
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

const mergeById = <T extends { id?: string }>(local: T[], remote: T[]) => {
  const merged = new Map<string, T>();
  for (const item of remote || []) {
    if (item?.id) merged.set(item.id, item);
  }
  for (const item of local || []) {
    if (item?.id) merged.set(item.id, item);
  }
  return Array.from(merged.values());
};

const mergeByKey = <T extends Record<string, any>>(
  local: T[],
  remote: T[],
  key: keyof T
) => {
  const merged = new Map<string, T>();
  for (const item of remote || []) {
    const k = String(item?.[key] ?? "");
    if (k) merged.set(k, item);
  }
  for (const item of local || []) {
    const k = String(item?.[key] ?? "");
    if (k) merged.set(k, item);
  }
  return Array.from(merged.values());
};

const normalizeRole = (role: any): UserRole =>
  role === "coach" ? "coach" : role === "smart_trainer" ? "smart_trainer" : "athlete";

const isProfileEmpty = (profile: Profile) =>
  !profile.name && !profile.age && !profile.height && !profile.weight && !profile.birthdate;

const isStateEmpty = (state: AppState) =>
  (state.templates || []).length === 0 &&
  (state.sessions || []).length === 0 &&
  (state.goals || []).length === 0 &&
  (state.weighIns || []).length === 0 &&
  isProfileEmpty(state.settings.profile);

const mergeStates = (local: AppState, remote: AppState): AppState => {
  const mergedTemplates = mergeById(local.templates || [], remote.templates || []);
  const mergedSessions = mergeById(local.sessions || [], remote.sessions || []);
  const mergedGoals = mergeById(local.goals || [], remote.goals || []);
  const mergedWeighIns = mergeByKey(local.weighIns || [], remote.weighIns || [], "dateISO");
  const mergedAchievements = mergeById(local.achievements || [], remote.achievements || []);
  const mergedSavedSplits = {
    ...(remote.savedSplits || {}),
    ...(local.savedSplits || {}),
  };

  const localProfile = local.settings.profile;
  const remoteProfile = remote.settings.profile;
  const mergedProfile = isProfileEmpty(localProfile) ? remoteProfile : localProfile;

  const mergedSchedule =
    Object.values(local.settings.schedule || {}).some(Boolean) ||
    !Object.values(remote.settings.schedule || {}).some(Boolean)
      ? local.settings.schedule
      : remote.settings.schedule;

  const localRole = normalizeRole(local.settings.role);
  const remoteRole = normalizeRole(remote.settings.role);
  const mergedRole =
    isStateEmpty(local) && (remoteRole === "coach" || remoteRole === "smart_trainer")
      ? remoteRole
      : localRole;

  return {
    ...local,
    templates: mergedTemplates,
    sessions: mergedSessions,
    goals: mergedGoals,
    weighIns: mergedWeighIns,
    achievements: mergedAchievements,
    savedSplits: mergedSavedSplits,
    settings: {
      ...local.settings,
      role: mergedRole,
      schedule: mergedSchedule,
      profile: {
        ...remoteProfile,
        ...mergedProfile,
      },
    },
  };
};

const buildSessionStats = (sessions: Session[]) => {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime()
  );
  const today = new Date();
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const sessionDays = new Set<string>();
  let totalVolume = 0;

  for (const s of sorted) {
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

  let streak = 0;
  const cursor = new Date(dayKey(today));
  while (sessionDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  const vol7d = sorted
    .filter((s) => new Date(s.dateISO) >= new Date(dayKey(sevenDaysAgo)))
    .reduce((acc, s) => {
      let v = 0;
      for (const e of s.entries) for (const set of e.sets) v += (Number(set.reps) || 0) * (Number(set.weight) || 0);
      return acc + v;
    }, 0);

  const last = sorted[0]?.dateISO ? new Date(sorted[0].dateISO) : null;

  return {
    totalSessions: sorted.length,
    streak,
    vol7d,
    totalVolume,
    lastLabel: last
      ? last.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—",
  };
};

const LS_KEY = "forgefit_v1";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

const buildSplitKey = (opts: {
  split: SplitType;
  focus: FocusType;
  experience: ExperienceLevel;
  daysPerWeek: number;
  style: GenderStyle;
  includeDeload?: boolean;
}) =>
  [
    opts.split,
    opts.focus,
    opts.experience,
    opts.daysPerWeek,
    opts.style,
    opts.includeDeload ? "deload" : "standard",
  ].join("|");

const isProgramTemplate = (t: Template) =>
  t.source === "generated" || t.source === "custom_split";

const stashProgramTemplates = (
  templates: Template[],
  savedSplits: Record<string, Template[]>
) => {
  const next = { ...(savedSplits || {}) };
  const grouped: Record<string, Template[]> = {};
  templates.filter(isProgramTemplate).forEach((t) => {
    if (!t.splitKey) return;
    grouped[t.splitKey] = grouped[t.splitKey] ? [...grouped[t.splitKey], t] : [t];
  });
  Object.entries(grouped).forEach(([key, list]) => {
    next[key] = list;
  });
  return next;
};

const removeTemplatesFromSchedule = (schedule: WeekSchedule, removeIds: Set<string>) => {
  const next = { ...schedule };
  (Object.keys(next) as Array<keyof WeekSchedule>).forEach((key) => {
    if (removeIds.has(String(next[key]))) {
      next[key] = "";
    }
  });
  return next;
};

const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_session",
    title: "First Blood",
    description: "Log your first workout session.",
    icon: Trophy,
  },
  {
    id: "streak_7",
    title: "7-Day Streak",
    description: "Train 7 days in a row.",
    icon: Flame,
  },
  {
    id: "streak_30",
    title: "30-Day Streak",
    description: "Train 30 days in a row.",
    icon: Flame,
  },
  {
    id: "sessions_10",
    title: "Double Digits",
    description: "Complete 10 sessions.",
    icon: History,
  },
  {
    id: "sessions_50",
    title: "Veteran",
    description: "Complete 50 sessions.",
    icon: History,
  },
  {
    id: "volume_25k",
    title: "Volume Machine",
    description: "Hit 25,000 total training volume.",
    icon: TrendingUp,
  },
  {
    id: "bench_135",
    title: "Bench 135",
    description: "Press 135 lb (60 kg) on bench.",
    icon: Dumbbell,
  },
  {
    id: "bench_225",
    title: "Bench 225",
    description: "Press 225 lb (100 kg) on bench.",
    icon: Dumbbell,
  },
  {
    id: "squat_225",
    title: "Squat 225",
    description: "Squat 225 lb (100 kg).",
    icon: Dumbbell,
  },
  {
    id: "squat_315",
    title: "Squat 315",
    description: "Squat 315 lb (140 kg).",
    icon: Dumbbell,
  },
  {
    id: "deadlift_315",
    title: "Deadlift 315",
    description: "Pull 315 lb (140 kg).",
    icon: Dumbbell,
  },
  {
    id: "deadlift_405",
    title: "Deadlift 405",
    description: "Pull 405 lb (180 kg).",
    icon: Dumbbell,
  },
];

const getLiftThreshold = (units: Units, lb: number, kg: number) =>
  units === "kg" ? kg : lb;

const buildAchievementUnlocks = (
  sessions: Session[],
  units: Units,
  existing: UnlockedAchievement[]
) => {
  const unlocked = new Map(existing.map((a) => [a.id, a.unlockedAt]));
  const sessionDays = new Set<string>();
  let totalVolume = 0;
  const best = { bench: 0, squat: 0, deadlift: 0 };

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  for (const s of sessions) {
    sessionDays.add(dayKey(new Date(s.dateISO)));
    for (const e of s.entries) {
      const name = String(e.exerciseName || "").toLowerCase();
      for (const set of e.sets || []) {
        const reps = Number(set.reps) || 0;
        const wt = Number(set.weight) || 0;
        totalVolume += reps * wt;
        if (name.includes("bench")) best.bench = Math.max(best.bench, wt);
        if (name.includes("squat")) best.squat = Math.max(best.squat, wt);
        if (name.includes("deadlift") || name.includes("dead lift")) {
          best.deadlift = Math.max(best.deadlift, wt);
        }
      }
    }
  }

  let streak = 0;
  const cursor = new Date(dayKey(new Date()));
  while (sessionDays.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const unlock = (id: string) => {
    if (!unlocked.has(id)) unlocked.set(id, todayISO());
  };

  if (sessions.length >= 1) unlock("first_session");
  if (sessions.length >= 10) unlock("sessions_10");
  if (sessions.length >= 50) unlock("sessions_50");
  if (totalVolume >= 25000) unlock("volume_25k");
  if (streak >= 7) unlock("streak_7");
  if (streak >= 30) unlock("streak_30");

  if (best.bench >= getLiftThreshold(units, 135, 60)) unlock("bench_135");
  if (best.bench >= getLiftThreshold(units, 225, 100)) unlock("bench_225");
  if (best.squat >= getLiftThreshold(units, 225, 100)) unlock("squat_225");
  if (best.squat >= getLiftThreshold(units, 315, 140)) unlock("squat_315");
  if (best.deadlift >= getLiftThreshold(units, 315, 140)) unlock("deadlift_315");
  if (best.deadlift >= getLiftThreshold(units, 405, 180)) unlock("deadlift_405");

  return Array.from(unlocked.entries()).map(([id, unlockedAt]) => ({
    id,
    unlockedAt,
  }));
};

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

const formatHeightValue = (inches: number, units: Units) => {
  if (units === "kg") return `${Math.round(inches)} cm`;
  const feet = Math.floor(inches / 12) || 0;
  const remainder = Math.round(inches % 12);
  return `${feet} ft ${remainder} in`;
};

const formatMMSS = (totalSeconds: number) => {
  const safe = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
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

const calcTrend = (points: Array<{ dateISO: string; weight: number }>) => {
  if (points.length < 3) return null;
  const sorted = [...points].sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
  const t0 = new Date(sorted[0].dateISO).getTime();
  const xs = sorted.map((p) => (new Date(p.dateISO).getTime() - t0) / 86400000);
  const ys = sorted.map((p) => p.weight);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (!denom) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  return { slopePerDay: slope, points: sorted };
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

const getUsername = (record: any, fallback: string) => {
  const resolved = Array.isArray(record) ? record[0] : record;
  return resolved?.username || fallback;
};

const sanitizeUsername = (value: string) =>
  value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .slice(0, 24);

const SUPERSET_TAGS = ["A", "B", "C", "D"];

const getWeightSliderConfig = (units: Units) => {
  const step = 2.5;
  const max = units === "kg" ? 300 : 700;
  return { step, max };
};

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
    name: "Dumbbell Romanian Deadlift",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
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
  {
    name: "Chest Supported Row",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
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
    name: "Assisted Pull-Up",
    defaultSets: 3,
    repRange: { min: 6, max: 10 },
    restSec: 120,
    weightStep: 5,
    autoProgress: false,
  },
  {
    name: "Pull-Up",
    defaultSets: 3,
    repRange: { min: 5, max: 10 },
    restSec: 120,
    weightStep: 5,
    autoProgress: false,
  },
  {
    name: "Weighted Pull-Up",
    defaultSets: 3,
    repRange: { min: 4, max: 8 },
    restSec: 150,
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
    name: "Seated Hamstring Curl",
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
  {
    name: "Hip Abduction",
    defaultSets: 3,
    repRange: { min: 12, max: 20 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Glute Bridge",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 90,
    weightStep: 10,
    autoProgress: true,
  },
  {
    name: "Cable Kickback",
    defaultSets: 3,
    repRange: { min: 12, max: 15 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Step-Up",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 90,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Hack Squat",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 10,
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
    name: "Dumbbell Shoulder Press",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Rear Delt Fly",
    defaultSets: 3,
    repRange: { min: 12, max: 20 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Cable Fly",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Incline Cable Fly",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Upper Cable Fly",
    defaultSets: 3,
    repRange: { min: 10, max: 15 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Rope Pushdown",
    defaultSets: 3,
    repRange: { min: 12, max: 15 },
    restSec: 60,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Overhead Triceps Extension",
    defaultSets: 3,
    repRange: { min: 10, max: 12 },
    restSec: 75,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Incline Dumbbell Press",
    defaultSets: 3,
    repRange: { min: 8, max: 12 },
    restSec: 120,
    weightStep: 5,
    autoProgress: true,
  },
  {
    name: "Dips",
    defaultSets: 3,
    repRange: { min: 6, max: 12 },
    restSec: 120,
    weightStep: 0,
    autoProgress: false,
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
  weighIns: [],
  achievements: [],
  savedSplits: {},
  settings: {
    units: "lb",
    autoGoalMode: true,
    autoGoalHorizonWeeks: 6,
    strictRepRangeForProgress: true,
    powerliftingMode: false,
    simpleMode: false,
    darkMode: false,
    role: "athlete",
    theme: "iron",
    schedule: emptySchedule,
    profile: {
      name: "",
      age: "",
      height: "",
      weight: "",
      birthdate: "",
      disclaimerAccepted: false,
      gender: "prefer_not",
      coachNotes: "",
      favoriteExercises: [],
      recentExercises: [],
      username: "",
      avatarUrl: "",
      shareWorkouts: true,
      sharePRs: true,
      shareWeighIns: false,
      shareTrophies: true,
      shareGoals: false,
      shareStreaks: true,
      completed: false,
      introSeen: false,
    },
  },
};

const pageMotion: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut", when: "beforeChildren", staggerChildren: 0.04 },
  },
  exit: { opacity: 0, y: 6, transition: { duration: 0.16 } },
};

const cardMotion: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: "easeOut" } },
};

const listMotion: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const listItemMotion: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
};

// -------------------- Main Component --------------------

export default function WorkoutTrackerApp() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const supabaseEnabled = !!supabase;
  const [authReady, setAuthReady] = useState(!supabaseEnabled);
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [remoteLoaded, setRemoteLoaded] = useState(false);
  const [pendingRemote, setPendingRemote] = useState<AppState | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const stateRef = useRef<AppState | null>(null);

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
        role: normalizeRole((parsed as any)?.settings?.role),
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
      weighIns: Array.isArray((parsed as any).weighIns) ? (parsed as any).weighIns : [],
      savedSplits:
        (parsed as any)?.savedSplits && typeof (parsed as any).savedSplits === "object"
          ? (parsed as any).savedSplits
          : defaultState.savedSplits,
      achievements: Array.isArray((parsed as any).achievements)
        ? (parsed as any).achievements
        : defaultState.achievements,
    };
  });

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);

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
    "dashboard" | "workouts" | "social" | "profile" | "more"
  >("dashboard");
  const simpleMode = !!state.settings.simpleMode;
  useEffect(() => {
    if (!simpleMode) return;
    if (activeTab === "social" || activeTab === "profile") {
      setActiveTab("dashboard");
    }
  }, [simpleMode, activeTab]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    state.templates?.[0]?.id || ""
  );
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionNotes, setSessionNotes] = useState("");
  const [weighInInput, setWeighInInput] = useState("");
  const [weighInEditing, setWeighInEditing] = useState(false);
  const [birthdayClaimed, setBirthdayClaimed] = useState(false);
  const [search, setSearch] = useState("");
  const [forceLog, setForceLog] = useState(false);
  const [gymMode, setGymMode] = useState(false);
  const [gymStepIndex, setGymStepIndex] = useState(0);
  const [includeFinishers, setIncludeFinishers] = useState<boolean | null>(null);
  const [finisherPromptOpen, setFinisherPromptOpen] = useState(false);

  // log mode
  const [logMode, setLogMode] = useState<"template" | "custom">("template");
  const [customWorkoutName, setCustomWorkoutName] = useState("Custom Workout");
  const [customExercises, setCustomExercises] = useState<TemplateExercise[]>([]);

  // dialogs
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [splitWizard, setSplitWizard] = useState<null | { title: string; templateIds: string[] }>(
    null
  );
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportText, setExportText] = useState("");
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [confirmDeleteAccountOpen, setConfirmDeleteAccountOpen] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapData, setRecapData] = useState<{
    templateName: string;
    totalSets: number;
    totalVolume: number;
    totalTimeMin: number;
    exercises: number;
    prCount: number;
    topSets: Array<{ name: string; weight: number; reps: number }>;
    nextTargets: Array<{ name: string; weight: number; reps: number }>;
  } | null>(null);
  const [restSeconds, setRestSeconds] = useState(0);
  const [restRunning, setRestRunning] = useState(false);
  const [restPickerOpen, setRestPickerOpen] = useState(false);
  const [restTargetSec, setRestTargetSec] = useState(0);
  const [autoAdvanceAfterRest, setAutoAdvanceAfterRest] = useState(false);
  const [showGymNotes, setShowGymNotes] = useState(false);
  const [trophyPopupOpen, setTrophyPopupOpen] = useState(false);
  const [trophyPopupIds, setTrophyPopupIds] = useState<string[]>([]);
  const [sessionStartTs, setSessionStartTs] = useState<number | null>(null);
  const [sessionElapsedSec, setSessionElapsedSec] = useState(0);
  const [totalRestSec, setTotalRestSec] = useState(0);
  const [restCount, setRestCount] = useState(0);
  const [swapOpen, setSwapOpen] = useState(false);
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [setupCollapsed, setSetupCollapsed] = useState(false);
  const [draggedDay, setDraggedDay] = useState<Weekday | null>(null);
  const [coachPackageText, setCoachPackageText] = useState("");
  const [clientImportText, setClientImportText] = useState("");
  const [clientSummary, setClientSummary] = useState<{
    name: string;
    totalSessions: number;
    totalVolume: number;
    vol7d: number;
    lastLabel: string;
  } | null>(null);
  const [coachClients, setCoachClients] = useState<Array<{ athleteId: string | null; email: string }>>([]);
  const [coachInviteEmail, setCoachInviteEmail] = useState("");
  const [coachAssignments, setCoachAssignments] = useState<Array<{ id: string; athleteId: string; templateName: string }>>([]);
  const [coachClientProgress, setCoachClientProgress] = useState<{
    athleteId: string;
    sessions: number;
    lastDate: string;
    volume7d: number;
  } | null>(null);
  const [coachLinkEmail, setCoachLinkEmail] = useState("");
  const [athleteAssignments, setAthleteAssignments] = useState<Array<{ id: string; template: Template }>>([]);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendResults, setFriendResults] = useState<Array<{ userId: string; username: string }>>([]);
  const [friendRequests, setFriendRequests] = useState<Array<{ id: string; fromId: string; fromName: string }>>([]);
  const [friends, setFriends] = useState<Array<{ userId: string; username: string }>>([]);
  const [socialFeed, setSocialFeed] = useState<Array<{ id: string; actor: string; type: string; payload: any; createdAt: string }>>([]);
  const [postLikes, setPostLikes] = useState<Record<string, { count: number; liked: boolean }>>({});
  const [postComments, setPostComments] = useState<Record<string, Array<{ id: string; author: string; body: string; createdAt: string }>>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeType, setChallengeType] = useState<"volume" | "workouts" | "prs">("volume");
  const [challenges, setChallenges] = useState<Array<{ id: string; title: string; type: string; start: string; end: string; joined: boolean }>>([]);
  const [challengeLeaders, setChallengeLeaders] = useState<Record<string, Array<{ username: string; score: number }>>>({});
  const [selectedMessageFriend, setSelectedMessageFriend] = useState<{ userId: string; username: string } | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; from: string; body: string; createdAt: string }>>([]);
  const [workoutInvites, setWorkoutInvites] = useState<Array<{ id: string; fromId: string; fromName: string; template: Template }>>([]);
  const [socialFriendsOpen, setSocialFriendsOpen] = useState(false);
  const [socialMessagesOpen, setSocialMessagesOpen] = useState(false);
  const [socialInvitesOpen, setSocialInvitesOpen] = useState(false);
  const [inviteFriendId, setInviteFriendId] = useState("");
  const [inviteTemplateId, setInviteTemplateId] = useState("");
  const [socialChallengesOpen, setSocialChallengesOpen] = useState(false);
  const [customSplitName, setCustomSplitName] = useState("My Split");
  const [customSplitDays, setCustomSplitDays] = useState<Weekday[]>(["mon", "wed", "fri"]);

  const isCoach = normalizeRole(state.settings.role) === "coach";

  useEffect(() => {
    if (!supabaseEnabled || !authUser) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    if (!isCoach) return;
    const loadCoach = async () => {
      const clientsRes = await supabaseClient
        .from("coach_clients")
        .select("athlete_id, athlete_email")
        .eq("coach_id", authUser.id);
      if (!clientsRes.error) {
        setCoachClients(
          (clientsRes.data || []).map((c: any) => ({
            athleteId: c.athlete_id,
            email: c.athlete_email,
          }))
        );
      }

      const assignRes = await supabaseClient
        .from("coach_assignments")
        .select("id, athlete_id, template_name")
        .eq("coach_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!assignRes.error) {
        setCoachAssignments(
          (assignRes.data || []).map((a: any) => ({
            id: a.id,
            athleteId: a.athlete_id,
            templateName: a.template_name,
          }))
        );
      }
    };
    loadCoach();
  }, [supabaseEnabled, authUser, isCoach]);

  useEffect(() => {
    if (!supabaseEnabled || !authUser) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    if (isCoach) return;
    const loadAssignments = async () => {
      const assignRes = await supabaseClient
        .from("coach_assignments")
        .select("id, template")
        .eq("athlete_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!assignRes.error) {
        setAthleteAssignments(
          (assignRes.data || []).map((a: any) => ({
            id: a.id,
            template: a.template,
          }))
        );
      }
    };
    loadAssignments();
  }, [supabaseEnabled, authUser, isCoach, supabase]);

  useEffect(() => {
    if (!supabaseEnabled || !authUser) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    const loadSocial = async () => {
      const friendsRes = await supabaseClient
        .from("friendships")
        .select("friend_id, friend:profiles(username)")
        .eq("user_id", authUser.id);
      if (!friendsRes.error) {
        setFriends(
          (friendsRes.data || [])
            .map((f: any) => ({
              userId: f.friend_id,
              username: getUsername(f.friend, "Athlete"),
            }))
            .filter((f: any) => f.userId)
        );
      }

      const requestRes = await supabaseClient
        .from("friend_requests")
        .select("id, requester_id, requester:profiles(username)")
        .eq("addressee_id", authUser.id)
        .eq("status", "pending");
      if (!requestRes.error) {
        setFriendRequests(
          (requestRes.data || []).map((r: any) => ({
            id: r.id,
            fromId: r.requester_id,
            fromName: getUsername(r.requester, "Athlete"),
          }))
        );
      }

      const ids = [authUser.id, ...(friendsRes.data || []).map((f: any) => f.friend_id)].filter(Boolean);
      if (ids.length) {
        const feedRes = await supabaseClient
          .from("social_posts")
          .select("id, actor_id, type, payload, created_at, actor:profiles(username)")
          .in("actor_id", ids)
          .order("created_at", { ascending: false })
          .limit(30);
        if (!feedRes.error) {
          const mapped = (feedRes.data || []).map((p: any) => ({
            id: p.id,
            actor: getUsername(p.actor, "Athlete"),
            type: p.type,
            payload: p.payload,
            createdAt: p.created_at,
          }));
          setSocialFeed(mapped);
          const postIds = mapped.map((p) => p.id);
          if (postIds.length) {
            const [likesRes, commentsRes] = await Promise.all([
              supabaseClient.from("social_likes").select("post_id, user_id").in("post_id", postIds),
              supabaseClient
                .from("social_comments")
                .select("id, post_id, body, created_at, author:profiles(username)")
                .in("post_id", postIds)
                .order("created_at", { ascending: false }),
            ]);
            if (!likesRes.error) {
              const likesMap: Record<string, { count: number; liked: boolean }> = {};
              for (const row of likesRes.data || []) {
                const key = row.post_id;
                if (!likesMap[key]) likesMap[key] = { count: 0, liked: false };
                likesMap[key].count += 1;
                if (row.user_id === authUser.id) likesMap[key].liked = true;
              }
              setPostLikes(likesMap);
            }
            if (!commentsRes.error) {
              const commentMap: Record<string, Array<{ id: string; author: string; body: string; createdAt: string }>> = {};
              for (const row of commentsRes.data || []) {
                const key = row.post_id;
                if (!commentMap[key]) commentMap[key] = [];
                commentMap[key].push({
                  id: row.id,
                  author: getUsername(row.author, "Athlete"),
                  body: row.body,
                  createdAt: row.created_at,
                });
              }
              setPostComments(commentMap);
            }
          }
        }
      }

      const nowIso = new Date().toISOString().slice(0, 10);
      const challengeRes = await supabaseClient
        .from("challenges")
        .select("id, title, type, start_date, end_date")
        .gte("end_date", nowIso)
        .order("start_date", { ascending: false })
        .limit(8);
      if (!challengeRes.error) {
        const participantRes = await supabaseClient
          .from("challenge_participants")
          .select("challenge_id")
          .eq("user_id", authUser.id);
        const joinedIds = new Set((participantRes.data || []).map((p: any) => p.challenge_id));
        setChallenges(
          (challengeRes.data || []).map((c: any) => ({
            id: c.id,
            title: c.title,
            type: c.type,
            start: c.start_date,
            end: c.end_date,
            joined: joinedIds.has(c.id),
          }))
        );
      }

      const invitesRes = await supabaseClient
        .from("workout_invites")
        .select("id, sender_id, template, sender:profiles(username)")
        .eq("recipient_id", authUser.id)
        .eq("status", "pending");
      if (!invitesRes.error) {
        setWorkoutInvites(
          (invitesRes.data || []).map((i: any) => ({
            id: i.id,
            fromId: i.sender_id,
            fromName: getUsername(i.sender, "Athlete"),
            template: i.template,
          }))
        );
      }
    };
    loadSocial();
  }, [supabaseEnabled, authUser, supabase]);

  useEffect(() => {
    if (!selectedMessageFriend || !authUser) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    const loadMessages = async () => {
      const res = await supabaseClient
        .from("messages")
        .select("id, sender_id, body, created_at, sender:profiles(username)")
        .or(
          `and(sender_id.eq.${authUser.id},recipient_id.eq.${selectedMessageFriend.userId}),and(sender_id.eq.${selectedMessageFriend.userId},recipient_id.eq.${authUser.id})`
        )
        .order("created_at", { ascending: false })
        .limit(40);
      if (!res.error) {
        setMessages(
          (res.data || []).map((m: any) => ({
            id: m.id,
            from: getUsername(m.sender, "Athlete"),
            body: m.body,
            createdAt: m.created_at,
          }))
        );
      }
    };
    loadMessages();
  }, [selectedMessageFriend, supabase, authUser]);

  const needsOnboarding = !state.settings.profile?.completed;
  const needsIntro = !state.settings.profile?.introSeen;

  const replaceProgramTemplates = useCallback(
    (
      templates: Template[],
      days: Weekday[],
      splitKey: string,
      source: "generated" | "custom_split"
    ) => {
      setState((p) => {
        const savedSplits = stashProgramTemplates(p.templates || [], p.savedSplits || {});
        const removeIds = new Set(
          (p.templates || []).filter(isProgramTemplate).map((t) => t.id)
        );
        const kept = (p.templates || []).filter((t) => !removeIds.has(t.id));
        const nextTemplates = templates.map((t) => ({
          ...t,
          source,
          splitKey,
        }));
        const nextSchedule = days.length
          ? assignScheduleDays(
              removeTemplatesFromSchedule(p.settings.schedule, removeIds),
              nextTemplates,
              days
            )
          : removeTemplatesFromSchedule(p.settings.schedule, removeIds);

        return {
          ...p,
          templates: [...nextTemplates, ...kept],
          settings: { ...p.settings, schedule: nextSchedule, activeSplitKey: splitKey },
          savedSplits: { ...savedSplits, [splitKey]: nextTemplates },
        };
      });
      const first = templates[0];
      if (first?.id) {
        setSelectedTemplateId(first.id);
      }
      if (source === "custom_split") {
        setTemplateDialogOpen(true);
      }
    },
    []
  );

  const deleteSavedSplit = useCallback((splitKey: string) => {
    setState((p) => {
      const nextSavedSplits = { ...(p.savedSplits || {}) };
      const splitTemplates = nextSavedSplits[splitKey] || [];
      delete nextSavedSplits[splitKey];
      const removeIds = new Set(splitTemplates.map((t) => t.id));
      const keptTemplates = (p.templates || []).filter((t) => !removeIds.has(t.id));
      const nextSchedule = removeTemplatesFromSchedule(p.settings.schedule, removeIds);
      return {
        ...p,
        templates: keptTemplates,
        settings: { ...p.settings, schedule: nextSchedule },
        savedSplits: nextSavedSplits,
      };
    });
  }, []);

  const toggleCustomSplitDay = (key: Weekday) => {
    setCustomSplitDays((prev) => {
      const next = prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key];
      return WEEKDAYS.filter((d) => next.includes(d.key)).map((d) => d.key);
    });
  };

  useEffect(() => {
    if (!state.sessions.length) return;
    if ((state.achievements || []).length) return;
    setState((p) => ({
      ...p,
      achievements: buildAchievementUnlocks(
        p.sessions || [],
        p.settings.units,
        p.achievements || []
      ),
    }));
  }, [state.sessions.length, state.settings.units, state.achievements.length]);

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
    const topSets = nonEmpty
      .map((entry) => {
        const best = (entry.sets || []).reduce(
          (acc, s) => {
            const weight = Number(s.weight) || 0;
            const reps = Number(s.reps) || 0;
            return weight > acc.weight ? { weight, reps } : acc;
          },
          { weight: 0, reps: 0 }
        );
        return best.weight > 0
          ? { name: entry.exerciseName, weight: best.weight, reps: best.reps }
          : null;
      })
      .filter((x): x is { name: string; weight: number; reps: number } => !!x)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3);
    const nextTargets = nonEmpty
      .map((entry) => {
        const next = insights.suggestions?.[entry.exerciseName]?.next;
        return next ? { name: entry.exerciseName, weight: next.weight, reps: next.reps } : null;
      })
      .filter((x): x is { name: string; weight: number; reps: number } => !!x)
      .slice(0, 3);

    setState((p) => {
      const nextSessions = [session, ...(p.sessions || [])];
      const nextAchievements = buildAchievementUnlocks(
        nextSessions,
        p.settings.units,
        p.achievements || []
      );
      const prevIds = new Set((p.achievements || []).map((a) => a.id));
      const newlyUnlocked = nextAchievements.filter((a) => !prevIds.has(a.id));
      if (newlyUnlocked.length) {
        setTrophyPopupIds(newlyUnlocked.map((a) => a.id));
        setTrophyPopupOpen(true);
      }
      return {
        ...p,
        sessions: nextSessions,
        achievements: nextAchievements,
      };
    });
    setSessionNotes("");
    setRecapData({
      templateName: t.name,
      totalSets: totals.totalSets,
      totalVolume: totals.totalVolume,
      totalTimeMin: totals.totalTimeMin,
      exercises: nonEmpty.length,
      prCount,
      topSets,
      nextTargets,
    });
    if (prCount > 0) {
      setShowPRCelebration(true);
    }
    setRecapOpen(true);
    if (supabaseEnabled && authUser) {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      supabaseClient
        .from("user_sessions")
        .upsert(
          {
            user_id: authUser.id,
            session_id: session.id,
            session,
            created_at: session.dateISO,
          },
          { onConflict: "session_id" }
        )
        .then(({ error }) => {
          if (error) console.warn("Supabase session upsert error", error.message);
        });
    }
    if (supabaseEnabled && authUser) {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      const share = state.settings.profile;
      if (share.shareWorkouts) {
        supabaseClient.from("social_posts").insert({
          actor_id: authUser.id,
          type: "workout",
          payload: {
            templateName: t.name,
            totalSets: totals.totalSets,
            totalVolume: totals.totalVolume,
            dateISO: session.dateISO,
          },
        });
      }
      if (share.sharePRs && prCount > 0) {
        supabaseClient.from("social_posts").insert({
          actor_id: authUser.id,
          type: "pr",
          payload: {
            prCount,
            dateISO: session.dateISO,
          },
        });
      }
      if (share.shareStreaks && headerStats.streak > 0) {
        supabaseClient.from("social_posts").insert({
          actor_id: authUser.id,
          type: "streak",
          payload: {
            streak: headerStats.streak,
            dateISO: session.dateISO,
          },
        });
      }
    }
  };

  const shareRecap = async () => {
    if (!recapData || typeof window === "undefined") return;
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#0b0b0b");
    gradient.addColorStop(0.5, "#151515");
    gradient.addColorStop(1, "#0b0b0b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "rgba(255,122,24,0.2)";
    ctx.beginPath();
    ctx.arc(width * 0.85, height * 0.15, 180, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = "700 56px system-ui, -apple-system, sans-serif";
    ctx.fillText("Forge Fitness", 72, 140);

    ctx.font = "600 40px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#ff7a18";
    ctx.fillText("Workout Recap", 72, 210);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = "500 34px system-ui, -apple-system, sans-serif";
    ctx.fillText(recapData.templateName || "Session", 72, 270);

    const stats = [
      ["Total sets", String(recapData.totalSets)],
      ["Exercises", String(recapData.exercises)],
      ["Volume", `${Math.round(recapData.totalVolume).toLocaleString()}`],
      ["Time", `${Math.round(recapData.totalTimeMin)} min`],
      ["PRs", String(recapData.prCount)],
    ];
    ctx.font = "500 30px system-ui, -apple-system, sans-serif";
    ctx.fillStyle = "#c9c9c9";
    let y = 370;
    for (const [label, value] of stats) {
      ctx.fillText(label, 72, y);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(value, 420, y);
      ctx.fillStyle = "#c9c9c9";
      y += 64;
    }

    ctx.fillStyle = "rgba(255,122,24,0.6)";
    ctx.fillRect(72, height - 210, width - 144, 4);
    ctx.fillStyle = "#9a9a9a";
    ctx.font = "400 26px system-ui, -apple-system, sans-serif";
    ctx.fillText("Built with Forge Fitness", 72, height - 150);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png")
    );
    if (!blob) return;
    const file = new File([blob], "forge-fitness-recap.png", { type: "image/png" });
    const canShare =
      typeof navigator !== "undefined" &&
      "share" in navigator &&
      (navigator as any).canShare?.({ files: [file] });
    if (canShare) {
      await (navigator as any).share({
        title: "Forge Fitness recap",
        text: "Workout recap",
        files: [file],
      });
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "forge-fitness-recap.png";
    link.click();
    URL.revokeObjectURL(url);
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
          role: normalizeRole((parsed as any)?.settings?.role),
        },
        templates: Array.isArray((parsed as any).templates) ? (parsed as any).templates : defaultState.templates,
        sessions: Array.isArray((parsed as any).sessions) ? (parsed as any).sessions : [],
        goals: Array.isArray((parsed as any).goals) ? (parsed as any).goals : [],
        weighIns: Array.isArray((parsed as any).weighIns) ? (parsed as any).weighIns : [],
        savedSplits:
          (parsed as any)?.savedSplits && typeof (parsed as any).savedSplits === "object"
            ? (parsed as any).savedSplits
            : defaultState.savedSplits,
        achievements: Array.isArray((parsed as any).achievements)
          ? (parsed as any).achievements
          : defaultState.achievements,
      };
      setState(merged);
      setImportDialogOpen(false);
      alert("Imported!");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Import failed", e);
      alert("Import failed. Make sure it's valid Forge Fitness JSON.");
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

  const deleteAccount = async () => {
    if (!supabase || !authUser) {
      resetAll();
      setConfirmDeleteAccountOpen(false);
      return;
    }
    setDeleteAccountLoading(true);
    try {
      const userId = authUser.id;
      await Promise.allSettled([
        supabase.from("user_data").delete().eq("user_id", userId),
        supabase.from("user_sessions").delete().eq("user_id", userId),
        supabase.from("user_weighins").delete().eq("user_id", userId),
        supabase.from("social_posts").delete().eq("actor_id", userId),
        supabase.from("social_likes").delete().eq("user_id", userId),
        supabase.from("social_comments").delete().eq("user_id", userId),
        supabase.from("friend_requests").delete().or(`sender_id.eq.${userId},receiver_id.eq.${userId}`),
        supabase.from("friendships").delete().or(`user_id.eq.${userId},friend_id.eq.${userId}`),
        supabase.from("messages").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
        supabase.from("workout_invites").delete().or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
        supabase.from("challenge_participants").delete().eq("user_id", userId),
        supabase.from("challenges").delete().eq("creator_id", userId),
        supabase.from("coach_clients").delete().or(`coach_id.eq.${userId},athlete_id.eq.${userId}`),
        supabase.from("coach_assignments").delete().or(`coach_id.eq.${userId},athlete_id.eq.${userId}`),
        supabase.from("profiles").delete().eq("user_id", userId),
      ]);
    } catch {
      // best-effort cleanup
    }
    await supabase.auth.signOut();
    resetAll();
    setConfirmDeleteAccountOpen(false);
    setDeleteAccountLoading(false);
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

  const todayKey = todayISO();
  const todaysWeighIn = useMemo(
    () => (state.weighIns || []).find((w) => w.dateISO === todayKey),
    [state.weighIns, todayKey]
  );
  const formattedDate = useMemo(
    () =>
      new Date(todayKey).toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    [todayKey]
  );
  const isBirthday = useMemo(() => {
    const birthdate = state.settings.profile.birthdate;
    if (!birthdate) return false;
    const [, birthMonth, birthDay] = birthdate.split("-");
    const [, todayMonth, todayDay] = todayKey.split("-");
    return birthMonth === todayMonth && birthDay === todayDay;
  }, [state.settings.profile.birthdate, todayKey]);
  const birthdayAge = useMemo(() => {
    const birthdate = state.settings.profile.birthdate;
    if (!birthdate) return null;
    const birth = new Date(birthdate);
    if (Number.isNaN(birth.getTime())) return null;
    const today = new Date(todayKey);
    let age = today.getFullYear() - birth.getFullYear();
    const birthdayThisYear = new Date(today.getFullYear(), birth.getMonth(), birth.getDate());
    if (today < birthdayThisYear) age -= 1;
    return age;
  }, [state.settings.profile.birthdate, todayKey]);
  useEffect(() => {
    if (!isBirthday) setBirthdayClaimed(false);
  }, [isBirthday]);
  const recentWeighIns = useMemo(() => {
    const sorted = [...(state.weighIns || [])].sort((a, b) =>
      String(b.dateISO).localeCompare(String(a.dateISO))
    );
    return sorted.slice(0, 7);
  }, [state.weighIns]);
  const trend = useMemo(
    () => calcTrend((state.weighIns || []).slice(0, 14)),
    [state.weighIns]
  );
  const kcalPerUnit = state.settings.units === "kg" ? 7700 : 3500;
  const kcalPerDay = trend ? -trend.slopePerDay * kcalPerUnit : 0;
  const energyLabel = trend
    ? Math.abs(kcalPerDay) < 50
      ? "Holding steady"
      : kcalPerDay > 0
      ? `Est. deficit ${Math.round(kcalPerDay)} kcal/day`
      : `Est. surplus ${Math.round(Math.abs(kcalPerDay))} kcal/day`
    : "Log a few days to see your trend.";
  const weighInRange =
    state.settings.units === "kg"
      ? { min: 30, max: 200, step: 0.1, tickEvery: 5 }
      : { min: 70, max: 350, step: 0.1, tickEvery: 10 };
  const weighInNumber = Number(weighInInput);
  const weighInSliderValue = clamp(
    Number.isFinite(weighInNumber) && weighInNumber > 0
      ? weighInNumber
      : todaysWeighIn?.weight ?? (state.settings.units === "kg" ? 80 : 180),
    weighInRange.min,
    weighInRange.max
  );
  const weighInQuickValues = useMemo(
    () => recentWeighIns.map((w) => w.weight).slice(0, 5),
    [recentWeighIns]
  );

  const saveWeighIn = () => {
    const value = Number(weighInInput);
    if (!value || value <= 0) {
      alert("Enter a valid weight.");
      return;
    }
    setState((p) => {
      const next = (p.weighIns || []).filter((w) => w.dateISO !== todayKey);
      return { ...p, weighIns: [{ dateISO: todayKey, weight: value }, ...next] };
    });
    if (supabaseEnabled && authUser) {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      supabaseClient
        .from("user_weighins")
        .upsert(
          {
            user_id: authUser.id,
            date_iso: todayKey,
            weight: value,
          },
          { onConflict: "user_id,date_iso" }
        )
        .then(({ error }) => {
          if (error) console.warn("Supabase weigh-in upsert error", error.message);
        });
    }
    if (supabaseEnabled && authUser && state.settings.profile.shareWeighIns) {
      const supabaseClient = supabase;
      if (!supabaseClient) return;
      supabaseClient.from("social_posts").insert({
        actor_id: authUser.id,
        type: "weighin",
        payload: { weight: value, dateISO: todayKey },
      });
    }
    setWeighInInput("");
    setWeighInEditing(false);
  };

  useEffect(() => {
    if (!restRunning) return;
    if (restSeconds <= 0) {
      setRestRunning(false);
      setRestTargetSec(0);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(200);
      }
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

  const mainGymSteps = useMemo(() => {
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

    return steps;
  }, [groupedMainEntries]);

  const finisherGymSteps = useMemo(() => {
    const steps: Array<{ exerciseId: string; setIndex: number }> = [];
    const addSingle = (entry: WorkingEntry) => {
      const count = Math.max(entry.sets.length, 1);
      for (let i = 0; i < count; i += 1) {
        steps.push({ exerciseId: entry.exerciseId, setIndex: i });
      }
    };
    finisherEntries.forEach((entry) => addSingle(entry));
    return steps;
  }, [finisherEntries]);

  const gymSteps = useMemo(() => {
    if (includeFinishers) return [...mainGymSteps, ...finisherGymSteps];
    return mainGymSteps;
  }, [includeFinishers, mainGymSteps, finisherGymSteps]);

  const advanceGymStep = useCallback(() => {
    const nextIndex = gymStepIndex + 1;
    if (
      includeFinishers === null &&
      finisherGymSteps.length > 0 &&
      nextIndex >= mainGymSteps.length
    ) {
      setFinisherPromptOpen(true);
      return;
    }
    setGymStepIndex((i) => Math.min(Math.max(gymSteps.length - 1, 0), i + 1));
  }, [
    gymStepIndex,
    includeFinishers,
    finisherGymSteps.length,
    mainGymSteps.length,
    gymSteps.length,
  ]);

  useEffect(() => {
    if (restRunning) return;
    if (restSeconds !== 0) return;
    if (!autoAdvanceAfterRest) return;
    setAutoAdvanceAfterRest(false);
    advanceGymStep();
  }, [autoAdvanceAfterRest, advanceGymStep, restRunning, restSeconds]);

  useEffect(() => {
    if (!gymMode) return;
    if (gymStepIndex >= gymSteps.length) {
      setGymStepIndex(Math.max(0, gymSteps.length - 1));
    }
  }, [gymMode, gymStepIndex, gymSteps.length]);

  useEffect(() => {
    if (gymMode) return;
    setIncludeFinishers(null);
    setFinisherPromptOpen(false);
  }, [gymMode]);

  const scheduleInfo = useMemo(
    () => getScheduleInfo(sessionDate, state.templates || [], state.settings.schedule),
    [sessionDate, state.templates, state.settings.schedule]
  );
  const todaysSplitTemplates = useMemo(() => {
    const programTemplates = (state.templates || []).filter(isProgramTemplate);
    if (!programTemplates.length) return [];
    const scheduled = scheduleInfo.templateId
      ? programTemplates.find((t) => t.id === scheduleInfo.templateId)
      : undefined;
    const splitKey =
      scheduled?.splitKey || programTemplates.find((t) => t.splitKey)?.splitKey;
    if (!splitKey) return [];
    return programTemplates.filter((t) => t.splitKey === splitKey);
  }, [state.templates, scheduleInfo.templateId]);

  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof navigator === "undefined") return;
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  };
  const dashboardTemplate = useMemo(() => {
    if (scheduleInfo.isRestDay) return undefined;
    if (scheduleInfo.templateId) {
      return state.templates.find((t) => t.id === scheduleInfo.templateId);
    }
    return selectedTemplate;
  }, [scheduleInfo.isRestDay, scheduleInfo.templateId, selectedTemplate, state.templates]);

  const scheduledDayOptions = useMemo(() => {
    const schedule = state.settings.schedule || emptySchedule;
    return WEEKDAYS.filter((day) => Boolean(schedule[day.key]));
  }, [state.settings.schedule]);

  useEffect(() => {
    if (!socialInvitesOpen) return;
    if (!inviteTemplateId && state.templates.length) {
      setInviteTemplateId(state.templates[0].id);
    }
  }, [socialInvitesOpen, inviteTemplateId, state.templates]);

  const updateProfile = useCallback((partial: Partial<Profile>) => {
    setState((p) => {
    const nextProfile = { ...p.settings.profile, ...partial };
    const completed =
      nextProfile.completed ||
      (!!nextProfile.name.trim() &&
        !!nextProfile.username?.trim() &&
        Number(nextProfile.age) > 0 &&
        Number(nextProfile.height) > 0 &&
        Number(nextProfile.weight) > 0 &&
        !!nextProfile.birthdate &&
        !!nextProfile.disclaimerAccepted &&
        !!nextProfile.gender);
      return {
        ...p,
        settings: { ...p.settings, profile: { ...nextProfile, completed } },
      };
    });
  }, []);

  const handleAvatarChange = useCallback(
    (file?: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        alert("Please choose an image file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        updateProfile({ avatarUrl: result });
      };
      reader.readAsDataURL(file);
    },
    [updateProfile]
  );

  const formatSplitLabel = (splitKey: string) => {
    if (splitKey.startsWith("custom|")) {
      const [, name] = splitKey.split("|");
      return name ? `Custom • ${name}` : "Custom split";
    }
    const [split, focus, experience, days, style, deload] = splitKey.split("|");
    const splitLabels: Record<string, string> = {
      full_body: "Full Body",
      upper_lower: "Upper/Lower",
      ppl: "Push Pull Legs",
      phul: "PHUL",
      bro_split: "Bro Split",
      custom: "Custom",
    };
    const focusLabels: Record<string, string> = {
      hypertrophy: "Hypertrophy",
      strength: "Strength",
      fat_loss: "Weight Loss",
      athletic: "Athletic",
      general: "General",
    };
    const expLabel = experience ? experience.replace(/_/g, " ") : "All levels";
    const styleLabel =
      style === "glute" ? "Glute focus" : style === "mass" ? "Mass focus" : "Balanced";
    const splitLabel = splitLabels[split] || split;
    const focusLabel = focusLabels[focus] || focus;
    const deloadLabel = deload === "deload" ? "Deload" : "Standard";
    return `${splitLabel} • ${focusLabel} • ${expLabel} • ${days} days • ${styleLabel} • ${deloadLabel}`;
  };

  const activeSplitLabel = useMemo(() => {
    const key = state.settings.activeSplitKey;
    if (!key) return "";
    return formatSplitLabel(key);
  }, [state.settings.activeSplitKey]);

  const socialPostSummary = (post: { type: string; payload: any }) => {
    if (post.type === "workout") {
      const name = post.payload?.templateName || "a workout";
      const sets = post.payload?.totalSets || 0;
      const volume = post.payload?.totalVolume || 0;
      return {
        title: `Logged ${name}`,
        meta: sets ? `${sets} sets • ${Math.round(volume).toLocaleString()} volume` : "Session completed",
      };
    }
    if (post.type === "pr") {
      const count = post.payload?.prCount || 1;
      return {
        title: `Hit ${count} PR${count === 1 ? "" : "s"}`,
        meta: "New personal bests unlocked",
      };
    }
    if (post.type === "weighin") {
      const weight = post.payload?.weight;
      return {
        title: "Weigh-in logged",
        meta: weight ? `${weight} ${state.settings.units}` : "Daily check-in",
      };
    }
    if (post.type === "streak") {
      const streak = post.payload?.streak || 0;
      return {
        title: `${streak}-day streak`,
        meta: "Consistency win",
      };
    }
    return { title: "Shared an update", meta: "Community post" };
  };

  const toggleLike = useCallback(
    async (postId: string) => {
      if (!supabase || !authUser) return;
      if (postLikes[postId]?.liked) {
        await supabase.from("social_likes").delete().eq("post_id", postId).eq("user_id", authUser.id);
        setPostLikes((prev) => ({
          ...prev,
          [postId]: {
            count: Math.max((prev[postId]?.count || 1) - 1, 0),
            liked: false,
          },
        }));
      } else {
        await supabase.from("social_likes").insert({ post_id: postId, user_id: authUser.id });
        setPostLikes((prev) => ({
          ...prev,
          [postId]: {
            count: (prev[postId]?.count || 0) + 1,
            liked: true,
          },
        }));
      }
    },
    [authUser, postLikes, supabase]
  );

  const addComment = useCallback(
    async (postId: string) => {
      if (!supabase || !authUser) return;
      const body = (commentDrafts[postId] || "").trim();
      if (!body) return;
      const res = await supabase
        .from("social_comments")
        .insert({ post_id: postId, user_id: authUser.id, body })
        .select("id, body, created_at, author:profiles(username)")
        .single();
      if (!res.error && res.data) {
        setPostComments((prev) => ({
          ...prev,
          [postId]: [
            {
              id: res.data.id,
              author: getUsername(res.data.author, "You"),
              body: res.data.body,
              createdAt: res.data.created_at,
            },
            ...(prev[postId] || []),
          ],
        }));
        setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
      }
    },
    [authUser, commentDrafts, supabase]
  );

  const acceptFriendRequest = useCallback(
    async (requestId: string, fromId: string, fromName: string) => {
      if (!supabase || !authUser) return;
      await supabase.from("friendships").insert([
        { user_id: authUser.id, friend_id: fromId },
        { user_id: fromId, friend_id: authUser.id },
      ]);
      await supabase.from("friend_requests").delete().eq("id", requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      setFriends((prev) =>
        prev.some((f) => f.userId === fromId)
          ? prev
          : [...prev, { userId: fromId, username: fromName || "Athlete" }]
      );
    },
    [authUser, supabase]
  );

  const declineFriendRequest = useCallback(
    async (requestId: string) => {
      if (!supabase) return;
      await supabase.from("friend_requests").delete().eq("id", requestId);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    },
    [supabase]
  );

  const sendWorkoutInvite = useCallback(async () => {
    if (!supabase || !authUser || !inviteFriendId || !inviteTemplateId) return;
    const template = state.templates.find((t) => t.id === inviteTemplateId);
    if (!template) return;
    const payload = {
      sender_id: authUser.id,
      recipient_id: inviteFriendId,
      template,
      status: "pending",
    };
    const { error } = await supabase.from("workout_invites").insert(payload);
    if (error) {
      alert("Invite failed. Try again.");
      return;
    }
    alert("Invite sent.");
    setInviteFriendId("");
    setInviteTemplateId("");
  }, [authUser, inviteFriendId, inviteTemplateId, state.templates, supabase]);

  const scheduledDayLabel = (key: Weekday) => {
    const schedule = state.settings.schedule || emptySchedule;
    const entry = schedule[key];
    if (entry === "rest") return `${key.toUpperCase()} • Rest`;
    const match = state.templates.find((t) => t.id === entry);
    return match ? `${key.toUpperCase()} • ${match.name}` : `${key.toUpperCase()} • Unassigned`;
  };

  const setScheduleDay = (day: Weekday, value: string) => {
    setState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        schedule: {
          ...(prev.settings.schedule || emptySchedule),
          [day]: value,
        },
      },
    }));
  };

  const swapScheduleDays = (from: Weekday, to: Weekday) => {
    if (from === to) return;
    setState((prev) => {
      const schedule = { ...(prev.settings.schedule || emptySchedule) };
      const fromValue = schedule[from];
      schedule[from] = schedule[to];
      schedule[to] = fromValue;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          schedule,
        },
      };
    });
  };

  const toggleRestDay = (day: Weekday) => {
    const schedule = state.settings.schedule || emptySchedule;
    const current = schedule[day];
    setScheduleDay(day, current === "rest" ? "" : "rest");
  };

  const currentGymStep = gymSteps[gymStepIndex];
  const currentGymEntry = currentGymStep
    ? workingEntries.find((e) => e.exerciseId === currentGymStep.exerciseId)
    : undefined;
  const effectiveRestSec = currentGymEntry?.templateHint?.restSec || 0;
  const currentGymSet =
    currentGymEntry && currentGymStep
      ? currentGymEntry.sets[currentGymStep.setIndex] || {
          reps: "",
          weight: "",
          rpe: "",
          notes: "",
        }
      : undefined;
  const suggestionForCurrent = currentGymEntry
    ? insights.suggestions?.[currentGymEntry.exerciseName]?.next || null
    : null;
  const swapOptions = currentGymEntry
    ? getSimilarExercises(currentGymEntry.exerciseName).filter(
        (ex) => ex.name.toLowerCase() !== currentGymEntry.exerciseName.toLowerCase()
      )
    : [];
  const warmupSets = useMemo(() => {
    if (!currentGymEntry) return [];
    const currentWeight = Number(currentGymSet?.weight) || 0;
    const historyTop = exerciseHistory[currentGymEntry.exerciseName]?.[0]?.topSet?.weight || 0;
    const base = currentWeight || historyTop;
    if (!base || base < 40) return [];
    const step = currentGymEntry.templateHint?.weightStep || getWeightSliderConfig(state.settings.units).step;
    const round = (v: number) => Math.round(v / step) * step;
    return [0.4, 0.6, 0.8].map((pct) => round(base * pct));
  }, [currentGymEntry, currentGymSet?.weight, exerciseHistory, state.settings.units]);

  const weightConfig = getWeightSliderConfig(state.settings.units);
  const weightStep =
    currentGymEntry?.templateHint?.weightStep || weightConfig.step;
  const weightValue = Number(currentGymSet?.weight) || 0;
  const historyTop = currentGymEntry
    ? exerciseHistory[currentGymEntry.exerciseName]?.[0]?.topSet?.weight || 0
    : 0;
  const weightQuickValues = useMemo(() => {
    const presets =
      state.settings.units === "lb"
        ? [45, 90, 135, 185, 225, 275]
        : [20, 40, 60, 80, 100, 120];
    return [historyTop, ...presets]
      .filter((v) => v > 0)
      .map((v) => roundTo(v, weightStep));
  }, [historyTop, state.settings.units, weightStep]);

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

  const handleSwapExercise = (nextEx: Omit<TemplateExercise, "id">) => {
    if (!currentGymEntry) return;
    const preserve = currentGymEntry.templateHint || {
      setType: "normal" as SetType,
      supersetTag: "",
    };
    setWorkingEntries((prev) =>
      prev.map((entry) =>
        entry.exerciseId === currentGymEntry.exerciseId
          ? {
              ...entry,
              exerciseName: nextEx.name,
              templateHint: {
                defaultSets: nextEx.defaultSets,
                repRange: nextEx.repRange,
                restSec: nextEx.restSec,
                weightStep: nextEx.weightStep,
                autoProgress: nextEx.autoProgress,
                timeUnit: nextEx.timeUnit,
                setType: preserve.setType,
                supersetTag: preserve.supersetTag,
              },
            }
          : entry
      )
    );
    if (logMode === "template") {
      setState((p) => ({
        ...p,
        templates: (p.templates || []).map((t) =>
          t.id === selectedTemplateId
            ? {
                ...t,
                exercises: (t.exercises || []).map((ex) =>
                  ex.id === currentGymEntry.exerciseId ? { ...ex, ...nextEx, id: ex.id } : ex
                ),
              }
            : t
        ),
      }));
    }
    setSwapOpen(false);
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

  const startWorkout = () => {
    const templateToStart = dashboardTemplate;
    if (!templateToStart) {
      alert("Select a workout first.");
      return;
    }
    if (selectedTemplateId !== templateToStart.id) {
      setSelectedTemplateId(templateToStart.id);
    }
    setWorkingEntries(
      buildEntriesFromTemplate(templateToStart, { suggestions: insights.suggestions })
    );
    setLogMode("template");
    setGymMode(true);
    setGymStepIndex(0);
    setIncludeFinishers(null);
    setFinisherPromptOpen(false);
    setRestRunning(false);
    setRestSeconds(0);
    setRestTargetSec(0);
    setTotalRestSec(0);
    setRestCount(0);
    setSessionStartTs(Date.now());
    setSessionElapsedSec(0);
    setAutoAdvanceAfterRest(false);
  };

  const avgRestSec = restCount ? Math.round(totalRestSec / restCount) : 0;
  const prCelebration = showPRCelebration ? (
    <div className="pointer-events-none fixed inset-0 z-[120] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative mx-auto flex max-w-sm flex-col items-center gap-3 rounded-3xl border border-primary/40 bg-card/90 px-6 py-8 text-center shadow-[0_25px_60px_rgba(0,0,0,0.4)]">
        <div className="absolute -top-8 h-16 w-16 rounded-full bg-primary/20 blur-2xl" />
        <Trophy className="h-10 w-10 text-primary" />
        <div className="text-2xl font-display uppercase tracking-[0.2em] text-primary">
          New PR!
        </div>
        <div className="text-sm text-muted-foreground">
          You just leveled up. Keep that momentum going.
        </div>
      </div>
    </div>
  ) : null;

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
    if (!gymMode || !sessionStartTs) return;
    const id = window.setInterval(() => {
      setSessionElapsedSec(Math.max(0, Math.round((Date.now() - sessionStartTs) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [gymMode, sessionStartTs]);

  useEffect(() => {
    if (!showPRCelebration) return;
    const id = window.setTimeout(() => setShowPRCelebration(false), 2600);
    return () => window.clearTimeout(id);
  }, [showPRCelebration]);

  const achievementsById = useMemo(
    () => new Map((state.achievements || []).map((a) => [a.id, a.unlockedAt])),
    [state.achievements]
  );
  const achievementsList = useMemo(
    () =>
      ACHIEVEMENTS.map((a) => ({
        ...a,
        unlockedAt: achievementsById.get(a.id),
      })),
    [achievementsById]
  );
  const unlockedCount = achievementsList.filter((a) => a.unlockedAt).length;
  const latestAchievement = achievementsList
    .filter((a) => a.unlockedAt)
    .sort((a, b) => String(b.unlockedAt).localeCompare(String(a.unlockedAt)))[0];

  const primaryGoal = useMemo(
    () => (state.goals || []).find((g) => g.status === "active") || null,
    [state.goals]
  );
  const focusHeadline = state.settings.powerliftingMode
    ? "Power focus"
    : primaryGoal
    ? "Goal focus"
    : "Consistency focus";
  const focusDetail = state.settings.powerliftingMode
    ? "Chase strong top sets and tight technique today."
    : primaryGoal
    ? `${primaryGoal.exerciseName} • Target ${primaryGoal.targetValue}`
    : "Stack a clean session and log every set.";
  const nextExercisePreview = useMemo(() => {
    const exercise = dashboardTemplate?.exercises?.[0];
    if (!exercise) return null;
    const repLabel = exercise.repRange
      ? `${exercise.repRange.min}–${exercise.repRange.max} reps`
      : "Reps";
    return {
      name: exercise.name,
      sets: exercise.defaultSets || 0,
      reps: repLabel,
      rest: exercise.restSec ? `${Math.round(exercise.restSec / 60)} min rest` : "Rest as needed",
    };
  }, [dashboardTemplate]);




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

  useEffect(() => {
    if (!supabaseEnabled) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    supabaseClient.auth.getSession().then(({ data }) => {
      setAuthUser(data.session?.user ?? null);
      setAuthReady(true);
    });
    const { data } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => {
      data.subscription?.unsubscribe();
    };
  }, [supabaseEnabled]);

  useEffect(() => {
    if (!supabaseEnabled || !authUser || !supabase) return;
    const email = authUser.email || "";
    supabase
      .from("profiles")
      .upsert(
        {
          user_id: authUser.id,
          email,
          role: state.settings.role === "coach" ? "coach" : "athlete",
          username: state.settings.profile.username || null,
          avatar_url: state.settings.profile.avatarUrl || null,
          share_settings: {
            workouts: !!state.settings.profile.shareWorkouts,
            prs: !!state.settings.profile.sharePRs,
            weigh_ins: !!state.settings.profile.shareWeighIns,
            trophies: !!state.settings.profile.shareTrophies,
            goals: !!state.settings.profile.shareGoals,
            streaks: !!state.settings.profile.shareStreaks,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(({ error }) => {
        if (error) console.warn("Supabase profile error", error.message);
      });
  }, [
    supabaseEnabled,
    authUser,
    state.settings.role,
    state.settings.profile.username,
    state.settings.profile.avatarUrl,
    state.settings.profile.shareWorkouts,
    state.settings.profile.sharePRs,
    state.settings.profile.shareWeighIns,
    state.settings.profile.shareTrophies,
    state.settings.profile.shareGoals,
    state.settings.profile.shareStreaks,
  ]);

  useEffect(() => {
    if (!supabaseEnabled || !authUser) {
      setRemoteLoaded(false);
      return;
    }
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    let canceled = false;
    const loadRemote = async () => {
      const [stateRes, sessionsRes, weighRes] = await Promise.all([
        supabaseClient.from("user_data").select("state").eq("user_id", authUser.id).single(),
        supabaseClient.from("user_sessions").select("session").eq("user_id", authUser.id),
        supabaseClient.from("user_weighins").select("date_iso, weight").eq("user_id", authUser.id),
      ]);
      if (canceled) return;
      const remoteState = stateRes.data?.state as AppState | undefined;
      const remoteSessions = (sessionsRes.data || []).map((row: any) => row.session as Session);
      const remoteWeighIns = (weighRes.data || []).map((row: any) => ({
        dateISO: row.date_iso,
        weight: Number(row.weight),
      }));

      const combinedRemote = remoteState
        ? {
            ...remoteState,
            sessions: remoteSessions.length ? remoteSessions : remoteState.sessions,
            weighIns: remoteWeighIns.length ? remoteWeighIns : remoteState.weighIns,
          }
        : undefined;

      if (combinedRemote && typeof combinedRemote === "object") {
        const localSnapshot = stateRef.current || state;
        if (!isStateEmpty(localSnapshot) && !isStateEmpty(combinedRemote)) {
          const merged = mergeStates(localSnapshot, combinedRemote);
          const mergedWithRemoteProfile = {
            ...merged,
            settings: {
              ...merged.settings,
              profile: {
                ...merged.settings.profile,
                ...(combinedRemote.settings?.profile || {}),
              },
            },
          };
          setState(mergedWithRemoteProfile);
          setRemoteLoaded(true);
          return;
        }
        setState((prev) => ({
          ...prev,
          ...combinedRemote,
          settings: {
            ...prev.settings,
            ...(combinedRemote.settings || {}),
            profile: {
              ...prev.settings.profile,
              ...(combinedRemote.settings?.profile || {}),
            },
          },
        }));
      }

      if (stateRes.error && stateRes.error.code !== "PGRST116") {
        console.warn("Supabase load error", stateRes.error.message);
      }
      if (sessionsRes.error) console.warn("Supabase sessions error", sessionsRes.error.message);
      if (weighRes.error) console.warn("Supabase weighins error", weighRes.error.message);

      setRemoteLoaded(true);
    };
    loadRemote();
    return () => {
      canceled = true;
    };
  }, [supabaseEnabled, authUser]);

  useEffect(() => {
    if (!supabaseEnabled || !authUser || !remoteLoaded) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    const id = window.setTimeout(() => {
      supabaseClient
        .from("user_data")
        .upsert(
          {
            user_id: authUser.id,
            state,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .then(({ error }) => {
          if (error) console.warn("Supabase save error", error.message);
        });
    }, 800);
    return () => window.clearTimeout(id);
  }, [supabaseEnabled, authUser, remoteLoaded, state]);

  const syncNow = async (nextState?: AppState) => {
    if (!supabaseEnabled || !authUser) return;
    const supabaseClient = supabase;
    if (!supabaseClient) return;
    const payload = nextState || stateRef.current || state;
    setSyncStatus("syncing");
    setSyncError("");
    const [stateRes, sessionsRes, weighRes] = await Promise.all([
      supabaseClient.from("user_data").upsert(
        {
          user_id: authUser.id,
          state: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      ),
      supabaseClient.from("user_sessions").upsert(
        (payload.sessions || []).map((s) => ({
          user_id: authUser.id,
          session_id: s.id,
          session: s,
          created_at: s.dateISO,
        })),
        { onConflict: "session_id" }
      ),
      supabaseClient.from("user_weighins").upsert(
        (payload.weighIns || []).map((w) => ({
          user_id: authUser.id,
          date_iso: w.dateISO,
          weight: w.weight,
        })),
        { onConflict: "user_id,date_iso" }
      ),
    ]);

    if (stateRes.error || sessionsRes.error || weighRes.error) {
      setSyncStatus("error");
      setSyncError(
        stateRes.error?.message ||
          sessionsRes.error?.message ||
          weighRes.error?.message ||
          "Sync failed"
      );
      return;
    }
    setSyncStatus("success");
    setLastSyncAt(new Date().toISOString());
    window.setTimeout(() => setSyncStatus("idle"), 1200);
  };

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

  if (supabaseEnabled && !authReady) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading account...</div>
      </div>
    );
  }

  if (supabaseEnabled && !authUser) {
    return (
      <AuthScreen
        mode={authMode}
        email={authEmail}
        password={authPassword}
        error={authError}
        loading={authLoading}
        googleLoading={googleLoading}
        onModeChange={setAuthMode}
        onEmailChange={setAuthEmail}
        onPasswordChange={setAuthPassword}
        onSubmit={async () => {
          if (!supabase) return;
          setAuthError("");
          setAuthLoading(true);
          const payload = { email: authEmail.trim(), password: authPassword };
          const { error } =
            authMode === "signup"
              ? await supabase.auth.signUp({
                  ...payload,
                  options: {
                    emailRedirectTo:
                      typeof window === "undefined" ? undefined : window.location.origin,
                  },
                })
              : await supabase.auth.signInWithPassword(payload);
          if (error) {
            setAuthError(error.message);
          } else if (authMode === "signup") {
            setAuthError("Check your email to confirm your account.");
          }
          setAuthLoading(false);
        }}
        onGoogle={async () => {
          if (!supabase) return;
          setAuthError("");
          setGoogleLoading(true);
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo:
                typeof window === "undefined" ? undefined : window.location.origin,
            },
          });
          if (error) {
            setAuthError(error.message);
            setGoogleLoading(false);
          }
        }}
      />
    );
  }

  if (pendingRemote) {
    return (
      <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-4">
        <Card className="w-full max-w-md rounded-3xl">
          <CardHeader>
            <CardTitle>Sync your data</CardTitle>
            <CardDescription>
              We found data on this device and in the cloud. Choose how to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-xl border p-3">
              <div className="font-medium">Local data</div>
              <div className="text-xs text-muted-foreground">
                Templates: {(stateRef.current?.templates || []).length} • Sessions:{" "}
                {(stateRef.current?.sessions || []).length}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <div className="font-medium">Cloud data</div>
              <div className="text-xs text-muted-foreground">
                Templates: {(pendingRemote.templates || []).length} • Sessions:{" "}
                {(pendingRemote.sessions || []).length}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="rounded-xl"
                onClick={async () => {
                  const localSnap = stateRef.current || state;
                  setPendingRemote(null);
                  setRemoteLoaded(true);
                  await syncNow(localSnap);
                }}
              >
                Keep local
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={async () => {
                  setState(pendingRemote);
                  setPendingRemote(null);
                  setRemoteLoaded(true);
                }}
              >
                Use cloud
              </Button>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={async () => {
                  const localSnap = stateRef.current || state;
                  const merged = mergeStates(localSnap, pendingRemote);
                  setState(merged);
                  setPendingRemote(null);
                  setRemoteLoaded(true);
                  await syncNow(merged);
                }}
              >
                Merge
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <OnboardingScreen
        settings={state.settings}
        onComplete={(profile, templates, days, meta, role) => {
          replaceProgramTemplates(templates, days, meta.splitKey, meta.source);
          setState((p) => ({
            ...p,
            settings: {
              ...p.settings,
              role,
              profile,
            },
          }));
          if (supabaseEnabled && authUser) {
            syncNow({
              ...state,
              settings: { ...state.settings, role, profile },
            });
          }
          setActiveTab("dashboard");
        }}
      />
    );
  }

  if (gymMode) {
    const workoutName = selectedTemplate?.name || "Workout Session";
    const nextGymStep = gymSteps[gymStepIndex + 1];
    const nextGymEntry = nextGymStep
      ? workingEntries.find((e) => e.exerciseId === nextGymStep.exerciseId)
      : undefined;
    const sessionProgressPct = Math.round(
      ((gymStepIndex + 1) / Math.max(gymSteps.length, 1)) * 100
    );
    return (
      <div className="min-h-screen h-[100svh] w-full bg-background text-foreground overflow-hidden">
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

        <div className="relative z-10 mx-auto flex h-full max-w-md flex-col px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Workout Mode
              </div>
              <div className="text-xl font-display uppercase leading-tight">{workoutName}</div>
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
                  setRestTargetSec(0);
                  setAutoAdvanceAfterRest(false);
                  setSessionStartTs(null);
                  setSessionElapsedSec(0);
                  setTotalRestSec(0);
                  setRestCount(0);
                }}
              >
                Exit
              </Button>
              <Button size="sm" className="rounded-xl" onClick={saveSession}>
                Save
              </Button>
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <span>Session progress</span>
              <span>{sessionProgressPct}%</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted/60">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${sessionProgressPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Elapsed {formatMMSS(sessionElapsedSec)}</span>
              <span>
                Avg rest {avgRestSec ? formatMMSS(avgRestSec) : "—"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex-1 min-h-0 flex flex-col gap-2">
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-card/60 p-3 shadow-[0_14px_30px_rgba(0,0,0,0.22)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Current set
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <div className="text-lg font-display uppercase">
                      {currentGymEntry?.exerciseName || "Pick a workout"}
                    </div>
                    {currentGymEntry?.templateHint?.defaultSets ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 py-0.5 text-[0.6rem] uppercase tracking-[0.2em]"
                      >
                        Set {Math.min((currentGymStep?.setIndex ?? 0) + 1, currentGymEntry.templateHint.defaultSets)}/
                        {currentGymEntry.templateHint.defaultSets}
                      </Badge>
                    ) : null}
                  </div>
                  {currentGymEntry?.templateHint ? (
                    <div className="text-xs text-muted-foreground mt-1">
                      Target {formatRepRange(currentGymEntry.templateHint.repRange)}{" "}
                      {currentGymEntry.templateHint.timeUnit === "seconds"
                        ? "sec"
                        : currentGymEntry.templateHint.timeUnit === "minutes"
                        ? "min"
                        : "reps"}{" "}
                      • Rest {formatMMSS(effectiveRestSec)}
                    </div>
                  ) : null}
                  {suggestionForCurrent ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Suggested: {suggestionForCurrent.weight}{" "}
                        {state.settings.units} × {suggestionForCurrent.reps}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 rounded-lg px-2 text-[11px]"
                        onClick={() =>
                          updateGymSet({
                            weight: String(suggestionForCurrent.weight),
                            reps: String(suggestionForCurrent.reps),
                          })
                        }
                      >
                        Use
                      </Button>
                    </div>
                  ) : null}
                  {nextGymEntry ? (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Up next: {nextGymEntry.exerciseName} • Set{" "}
                      {Math.min((nextGymStep?.setIndex ?? 0) + 1, nextGymEntry.templateHint?.defaultSets || 1)}/
                      {nextGymEntry.templateHint?.defaultSets || 1}
                    </div>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <span>
                    Set {gymStepIndex + 1}/{Math.max(gymSteps.length, 1)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-7 px-2 text-[11px] normal-case"
                    onClick={() => setSwapOpen(true)}
                    disabled={!currentGymEntry}
                  >
                    Swap
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl h-7 px-2 text-[11px] normal-case"
                    onClick={async () => {
                      if (!supabase || !authUser) return;
                      if (!selectedTemplate) return;
                      if (!friends.length) {
                        alert("Add a friend first.");
                        return;
                      }
                      const friend = friends[0];
                      await supabase.from("workout_invites").insert({
                        sender_id: authUser.id,
                        recipient_id: friend.userId,
                        template_id: selectedTemplate.id,
                        template_name: selectedTemplate.name,
                        template: selectedTemplate,
                        status: "pending",
                      });
                      alert(`Invite sent to @${friend.username}.`);
                    }}
                  >
                    Invite
                  </Button>
                </div>
              </div>
            </div>

            {restRunning ? (
              <div className="rounded-2xl border border-foreground/20 bg-card/80 p-3 shadow-[0_12px_26px_rgba(0,0,0,0.2)]">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Rest timer
                </div>
                <div className="mt-2 text-3xl font-display">
                  {String(Math.floor(restSeconds / 60)).padStart(2, "0")}:
                  {String(restSeconds % 60).padStart(2, "0")}
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted/60">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${restTargetSec ? Math.max(0, Math.min(100, ((restTargetSec - restSeconds) / restTargetSec) * 100)) : 0}%`,
                    }}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      const delta = Math.min(15, restSeconds);
                      const next = Math.max(0, restSeconds - delta);
                      setRestSeconds(next);
                      setRestTargetSec(Math.max(restTargetSec - delta, 0));
                      setTotalRestSec((v) => Math.max(0, v - delta));
                    }}
                  >
                    -15s
                  </Button>
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
                      setRestSeconds(restSeconds + 15);
                      setRestTargetSec(restTargetSec + 15);
                      setTotalRestSec((v) => v + 15);
                    }}
                  >
                    +15s
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setRestRunning(false);
                      setTotalRestSec((v) => Math.max(0, v - restSeconds));
                      setRestSeconds(0);
                      setRestTargetSec(0);
                      setAutoAdvanceAfterRest(false);
                    }}
                  >
                    Skip rest
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-foreground/15 bg-card/80 p-3 space-y-1.5">
                {warmupSets.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span>Warm-up</span>
                    {warmupSets.map((w) => (
                      <Button
                        key={w}
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-6 px-2 text-[11px]"
                        onClick={() => updateGymSet({ weight: String(w) })}
                      >
                        {w} {state.settings.units}
                      </Button>
                    ))}
                  </div>
                ) : null}
                {currentGymEntry?.templateHint?.timeUnit ? null : (
                  <MetricStepper
                    label="Weight"
                    value={weightValue || 0}
                    min={0}
                    max={weightConfig.max}
                    step={weightStep}
                    unit={state.settings.units}
                    onChange={(v) => updateGymSet({ weight: String(v) })}
                    quickValues={weightQuickValues}
                    quickAdjust={(state.settings.units === "lb"
                      ? [
                          { label: "+2.5", delta: 2.5 },
                          { label: "+5", delta: 5 },
                          { label: "+10", delta: 10 },
                          { label: "+25", delta: 25 },
                          { label: "+35", delta: 35 },
                          { label: "+45", delta: 45 },
                        ]
                      : [
                          { label: "+1", delta: 1 },
                          { label: "+2.5", delta: 2.5 },
                          { label: "+5", delta: 5 },
                          { label: "+10", delta: 10 },
                          { label: "+15", delta: 15 },
                          { label: "+20", delta: 20 },
                        ])}
                    size="md"
                    compact
                  />
                )}
                {currentGymEntry?.templateHint?.timeUnit ? null : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <MetricStepper
                      label="Reps"
                      value={Number(currentGymSet?.reps) || 0}
                      min={1}
                      max={30}
                      step={1}
                      onChange={(v) => updateGymSet({ reps: String(v) })}
                      quickValues={[6, 8, 10, 12, 15, 20]}
                      quickAdjust={[
                        { label: "+1", delta: 1 },
                        { label: "+2", delta: 2 },
                        { label: "+5", delta: 5 },
                        { label: "-1", delta: -1 },
                      ]}
                      size="md"
                      compact
                    />
                    <MetricStepper
                      label="RPE"
                      value={Number(currentGymSet?.rpe) || 6}
                      min={6}
                      max={10}
                      step={0.5}
                      onChange={(v) => updateGymSet({ rpe: String(v) })}
                      quickValues={[6, 7, 8, 9, 10]}
                      quickAdjust={[
                        { label: "+0.5", delta: 0.5 },
                        { label: "+1", delta: 1 },
                        { label: "-0.5", delta: -0.5 },
                      ]}
                      helperText="10 = max, 8 = ~2 reps left"
                      size="md"
                      compact
                    />
                  </div>
                )}
                {showGymNotes ? (
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input
                      value={currentGymSet?.notes || ""}
                      onChange={(e) => updateGymSet({ notes: e.target.value })}
                      placeholder="Quick note..."
                    />
                  </div>
                ) : null}
                {restPickerOpen ? (
                  <div className="rounded-xl border border-foreground/10 bg-background/70 p-2 space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Select rest
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {[30, 60, 90, 120].map((sec) => (
                        <Button
                          key={sec}
                          size="sm"
                          variant="outline"
                          className="rounded-lg h-7 px-2 text-[11px]"
                          onClick={() => {
                            setRestPickerOpen(false);
                            setRestSeconds(sec);
                            setRestTargetSec(sec);
                            setRestRunning(sec > 0);
                            setAutoAdvanceAfterRest(true);
                            if (sec > 0) {
                              setTotalRestSec((v) => v + sec);
                              setRestCount((v) => v + 1);
                            } else {
                              advanceGymStep();
                            }
                          }}
                        >
                          {formatMMSS(sec)}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg h-7 px-2 text-[11px]"
                        onClick={() => {
                          const sec = currentGymEntry?.templateHint?.restSec ?? 90;
                          setRestPickerOpen(false);
                          setRestSeconds(sec);
                          setRestTargetSec(sec);
                          setRestRunning(sec > 0);
                          setAutoAdvanceAfterRest(true);
                          if (sec > 0) {
                            setTotalRestSec((v) => v + sec);
                            setRestCount((v) => v + 1);
                          } else {
                            advanceGymStep();
                          }
                        }}
                      >
                        Use target
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-lg h-7 px-2 text-[11px]"
                        onClick={() => {
                          setRestPickerOpen(false);
                          advanceGymStep();
                        }}
                      >
                        Skip rest
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg h-6 px-2 text-[11px]"
                    onClick={() => setShowGymNotes((v) => !v)}
                  >
                    {showGymNotes ? "Hide notes" : "Add note"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-2">
            <div className="rounded-2xl border border-foreground/15 bg-background/80 p-2 shadow-[0_10px_24px_rgba(0,0,0,0.2)] backdrop-blur">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl h-8 px-3 text-xs"
                  onClick={() => setGymStepIndex((i) => Math.max(0, i - 1))}
                >
                  Prev
                </Button>
                <Button
                  className="rounded-2xl flex-1 h-9 text-xs"
                  onClick={() => {
                    triggerHaptic(40);
                    setRestPickerOpen(true);
                  }}
                >
                  Complete set
                </Button>
                <Button
                  variant="outline"
                  className="rounded-2xl h-8 px-3 text-xs"
                  onClick={addGymSet}
                >
                  Add set
                </Button>
              </div>
            </div>
          </div>

          <div className="h-1" />
        </div>

        <Dialog open={finisherPromptOpen} onOpenChange={setFinisherPromptOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Finishers?</DialogTitle>
              <DialogDescription>
                You&apos;re done with the main workout. Want to hit the optional finishers?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIncludeFinishers(false);
                  setFinisherPromptOpen(false);
                  setAutoAdvanceAfterRest(false);
                }}
              >
                Skip finishers
              </Button>
              <Button
                onClick={() => {
                  setIncludeFinishers(true);
                  setFinisherPromptOpen(false);
                  setGymStepIndex(Math.max(mainGymSteps.length, 0));
                }}
              >
                Do finishers
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Swap exercise</DialogTitle>
              <DialogDescription>
                Pick a similar movement to keep the session flowing.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2">
              {swapOptions.length ? (
                swapOptions.map((ex) => (
                  <button
                    key={ex.name}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-left text-sm hover:bg-muted/60"
                    onClick={() =>
                      handleSwapExercise({
                        name: ex.name,
                        defaultSets: ex.defaultSets,
                        repRange: ex.repRange,
                        restSec: ex.restSec,
                        weightStep: ex.weightStep,
                        autoProgress: ex.autoProgress,
                        timeUnit: ex.timeUnit,
                      })
                    }
                  >
                    <span className="font-medium">{ex.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRepRange(ex.repRange)} reps
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">
                  No close matches found for this exercise yet.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {prCelebration}
      </div>
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
      {prCelebration}
      <div className="mx-auto w-full max-w-none px-0 pb-6 pt-4">

{/* -------------------- Dialogs -------------------- */}

        <TemplateManagerDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          state={state}
          setState={setState}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
          splitWizard={splitWizard}
          onCloseSplitWizard={() => setSplitWizard(null)}
        />

        <ProgramGeneratorDialog
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          units={state.settings.units}
          gender={state.settings.profile.gender}
          savedSplits={state.savedSplits}
          onGenerate={(payload) => {
            replaceProgramTemplates(
              payload.templates,
              payload.days,
              payload.splitKey,
              payload.source
            );
            setActiveTab("dashboard");
          }}
          onAddCoachSplit={(templates, days) => {
            setState((p) => {
              const nextTemplates = templates.map((t) => ({ ...t, source: "coach" as const }));
              const merged = [...nextTemplates, ...p.templates];
              const nextSchedule = days.length
                ? assignScheduleDays(p.settings.schedule, nextTemplates, days)
                : p.settings.schedule;
              return {
                ...p,
                templates: merged,
                settings: { ...p.settings, schedule: nextSchedule },
              };
            });
            const first = templates[0];
            if (first) {
              setSelectedTemplateId(first.id);
              setActiveTab("dashboard");
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
              <Label>Forge Fitness JSON</Label>
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
          <DialogContent
            className="w-[calc(100vw-2rem)] max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription>
                Update profile, schedule, and training rules in one place.
              </DialogDescription>
            </DialogHeader>
            <SettingsPanel
              settings={state.settings}
              templates={state.templates}
              authEmail={authUser?.email || ""}
              syncStatus={syncStatus}
              lastSyncAt={lastSyncAt}
              syncError={syncError}
              onSyncNow={() => syncNow()}
              onSignOut={
                supabaseEnabled
                  ? async () => {
                      await supabase?.auth.signOut();
                      setAuthUser(null);
                      setRemoteLoaded(false);
                    }
                  : undefined
              }
              onChange={(s) => setState((p) => ({ ...p, settings: s }))}
              onResetRequest={() => setConfirmResetOpen(true)}
              onDeleteAccountRequest={() => setConfirmDeleteAccountOpen(true)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Top sets
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {(recapData?.topSets || []).length ? (
                    recapData?.topSets.map((set) => (
                      <div key={set.name} className="flex items-center justify-between">
                        <span className="font-medium">{set.name}</span>
                        <span className="text-muted-foreground">
                          {set.weight} {state.settings.units} × {set.reps}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">Log more sets to see highlights.</div>
                  )}
                </div>
              </div>
              <div className="rounded-xl border p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Next targets
                </div>
                <div className="mt-2 space-y-2 text-sm">
                  {(recapData?.nextTargets || []).length ? (
                    recapData?.nextTargets.map((set) => (
                      <div key={set.name} className="flex items-center justify-between">
                        <span className="font-medium">{set.name}</span>
                        <span className="text-muted-foreground">
                          {set.weight} {state.settings.units} × {set.reps}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">Hit the rep range to unlock targets.</div>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={shareRecap}>
                Share recap
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRecapOpen(false);
                  setActiveTab("more");
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

        <Dialog open={confirmDeleteAccountOpen} onOpenChange={setConfirmDeleteAccountOpen}>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Delete your account?</DialogTitle>
              <DialogDescription>
                This removes your cloud data and signs you out. This action can&apos;t be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmDeleteAccountOpen(false)}
                disabled={deleteAccountLoading}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteAccount}
                disabled={deleteAccountLoading}
              >
                {deleteAccountLoading ? "Deleting..." : "Delete account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={trophyPopupOpen} onOpenChange={setTrophyPopupOpen}>
          <DialogContent className="rounded-2xl overflow-hidden">
            <motion.div
              className="pointer-events-none absolute inset-0 opacity-70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                backgroundImage:
                  "radial-gradient(60%_50%_at_20%_0%,rgba(255,122,24,0.35),transparent),radial-gradient(50%_50%_at_80%_10%,rgba(255,200,80,0.25),transparent)",
              }}
            />
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <Trophy className="h-5 w-5 text-[#ffb020]" />
                </motion.div>
                Trophy unlocked
              </DialogTitle>
              <DialogDescription>
                Big win. Keep stacking these.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3">
              {trophyPopupIds.map((id) => {
                const trophy = ACHIEVEMENTS.find((a) => a.id === id);
                if (!trophy) return null;
                const Icon = trophy.icon;
                return (
                  <div key={id} className="rounded-xl border p-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      <Icon className="h-4 w-4" />
                      Unlocked
                    </div>
                    <div className="mt-1 font-medium">{trophy.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {trophy.description}
                    </div>
                  </div>
                );
              })}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTrophyPopupOpen(false);
                  setActiveTab("more");
                }}
              >
                View trophies
              </Button>
              <Button onClick={() => setTrophyPopupOpen(false)}>Lets go</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit schedule</DialogTitle>
              <DialogDescription>Assign workouts to each day of the week.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WEEKDAYS.map((day) => (
                  <div key={day.key} className="flex items-center gap-2">
                    <div className="w-20 text-xs text-muted-foreground">{day.label}</div>
                    <Select
                      value={state.settings.schedule?.[day.key] || "off"}
                      onValueChange={(v) =>
                        setState((prev) => ({
                          ...prev,
                          settings: {
                            ...prev.settings,
                            schedule: {
                              ...(prev.settings.schedule || emptySchedule),
                              [day.key]: v === "off" ? "" : v,
                            },
                          },
                        }))
                      }
                    >
                      <SelectTrigger className="w-full min-w-0">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Unassigned</SelectItem>
                        <SelectItem value="rest">Rest Day</SelectItem>
                        {state.templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setScheduleDialogOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* -------------------- Pages -------------------- */}
        <div className="pb-28">
          {!isOnline ? (
            <div className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive">
              You&apos;re offline. Changes will save locally and sync when you&apos;re back online.
            </div>
          ) : null}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsContent value="dashboard" className="mt-0">
              <motion.div variants={pageMotion} initial="hidden" animate="show" className="space-y-4">
                <div className="text-center space-y-3">
                  <div className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground">
                    {formattedDate}
                  </div>
                  <div className="text-3xl sm:text-4xl md:text-5xl font-display uppercase tracking-[0.28em] text-transparent bg-clip-text bg-[linear-gradient(90deg,var(--title-from),var(--title-via),var(--title-to))]">
                    Forge Fitness
                  </div>
                  <div className="mx-auto h-[3px] w-32 rounded-full bg-gradient-to-r from-transparent via-[#ff5a1f] to-transparent" />
                </div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-hero">
                  <CardHeader>
                    <CardTitle className="flex flex-col items-center gap-2 text-center font-display uppercase tracking-[0.35em] text-2xl md:text-3xl">
                      <ClipboardList className="h-8 w-8" />
                      Today’s workout
                    </CardTitle>
                  </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_auto] gap-3">
                    <div className="space-y-2">
                      <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        Active split
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {activeSplitLabel ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                            {activeSplitLabel}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            No split selected yet
                          </span>
                        )}
                      </div>
                      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Today&apos;s workout
                          </div>
                          {scheduleInfo.templateName ? (
                            <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground">
                              {scheduleInfo.templateName}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                          Switch workout
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant={scheduleInfo.isRestDay ? "secondary" : "outline"}
                            className="rounded-full"
                            onClick={() => {
                              const dayKey = getWeekdayKey(sessionDate);
                              setState((prev) => ({
                                ...prev,
                                settings: {
                                  ...prev.settings,
                                  schedule: {
                                    ...(prev.settings.schedule || emptySchedule),
                                    [dayKey]: "rest",
                                  },
                                },
                              }));
                              setSelectedTemplateId("");
                            }}
                          >
                            Active rest day
                          </Button>
                          {todaysSplitTemplates.map((t) => (
                            <Button
                              key={t.id}
                              size="sm"
                              variant={t.id === dashboardTemplate?.id ? "default" : "outline"}
                              className="rounded-full"
                              onClick={() => {
                                const dayKey = getWeekdayKey(sessionDate);
                                setState((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    schedule: {
                                      ...(prev.settings.schedule || emptySchedule),
                                      [dayKey]: t.id,
                                    },
                                    activeSplitKey: t.splitKey || prev.settings.activeSplitKey,
                                  },
                                }));
                                setSelectedTemplateId(t.id);
                              }}
                            >
                              {t.name}
                            </Button>
                          ))}
                          {!todaysSplitTemplates.length ? (
                            <span className="text-xs text-muted-foreground">
                              No workouts for this split yet.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          className="rounded-2xl h-11 px-4"
                          onClick={() => {
                            const dayKey = getWeekdayKey(sessionDate);
                            setState((prev) => ({
                              ...prev,
                              settings: {
                                ...prev.settings,
                                schedule: {
                                  ...(prev.settings.schedule || emptySchedule),
                                  [dayKey]: "rest",
                                },
                              },
                            }));
                            setSelectedTemplateId("");
                          }}
                        >
                          Skip today
                        </Button>
                        <Button
                          className="rounded-2xl h-11 px-6"
                          onClick={startWorkout}
                          disabled={!dashboardTemplate}
                        >
                          <Play className="h-4 w-4 mr-2" /> Start workout
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Change the workout here if you want a different session today.
                  </div>
                </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                    <Flame className="h-5 w-5" /> Daily weigh-in
                  </CardTitle>
                  <CardDescription>Track weight to see weekly trends.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {todaysWeighIn && !weighInEditing ? (
                    <div className="rounded-2xl border border-foreground/10 bg-background/60 px-4 py-3">
                      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Today&apos;s weigh-in
                      </div>
                      <div className="mt-2 text-3xl font-display">
                        {todaysWeighIn.weight} {state.settings.units}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 rounded-xl"
                        onClick={() => {
                          setWeighInInput(String(todaysWeighIn.weight));
                          setWeighInEditing(true);
                        }}
                      >
                        Edit weigh-in
                      </Button>
                    </div>
                  ) : (
                    <>
                      <MetricStepper
                        label="Weight"
                        value={weighInSliderValue}
                        min={weighInRange.min}
                        max={weighInRange.max}
                        step={weighInRange.step}
                        unit={state.settings.units}
                        onChange={(v) => setWeighInInput(String(v))}
                        quickValues={weighInQuickValues}
                        quickAdjust={[
                          { label: "+0.5", delta: 0.5 },
                          { label: "+1", delta: 1 },
                          { label: "+2", delta: 2 },
                          { label: "-0.5", delta: -0.5 },
                        ]}
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Button className="rounded-xl flex-1" onClick={saveWeighIn}>
                          Save weigh-in
                        </Button>
                        {todaysWeighIn ? (
                          <Button
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setWeighInEditing(false)}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </>
                  )}
                  <WeightTrendGraph
                    points={(state.weighIns || []).slice(0, 14)}
                    units={state.settings.units}
                  />
                  <div className="text-xs text-muted-foreground">{energyLabel}</div>
                  <motion.div variants={listMotion} className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {recentWeighIns.length === 0 ? (
                      <div className="text-sm text-muted-foreground col-span-full">
                        No weigh-ins yet.
                      </div>
                    ) : (
                      recentWeighIns.map((w) => (
                        <motion.div key={w.dateISO} variants={listItemMotion} className="rounded-xl border p-2">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            {formatDate(w.dateISO)}
                          </div>
                          <div className="text-lg font-display">
                            {w.weight} {state.settings.units}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </motion.div>
                </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <CalendarDays className="h-5 w-5" /> Weekly overview
                      </CardTitle>
                      <CardDescription>All assigned workouts and rest days.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <motion.div variants={listMotion} className="space-y-2">
                        {WEEKDAYS.map((day) => (
                          <motion.div
                            key={day.key}
                            variants={listItemMotion}
                            className="rounded-xl border p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {day.label}
                                </div>
                                <div className="text-lg font-display">
                                  {scheduledDayLabel(day.key)}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg h-7 px-2 text-[11px]"
                                  onClick={() => toggleRestDay(day.key)}
                                >
                                  {state.settings.schedule?.[day.key] === "rest" ? "Unset rest" : "Set rest"}
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button className="rounded-xl" onClick={() => setScheduleDialogOpen(true)}>
                          Edit schedule
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => setTemplateDialogOpen(true)}>
                          Manage templates
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            <TabsContent value="workouts" className="mt-0">
              <motion.div variants={pageMotion} initial="hidden" animate="show" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                      Training
                    </div>
                    <div className="text-3xl font-display uppercase">Training</div>
                  </div>
                  <Button variant="outline" className="rounded-2xl" onClick={() => setActiveTab("dashboard")}>
                    Today
                  </Button>
                </div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <ClipboardList className="h-5 w-5" /> Selected workout
                      </CardTitle>
                      <CardDescription>Your active split and current day.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                          Active split
                        </span>
                        {activeSplitLabel ? (
                          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em]">
                            {activeSplitLabel}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No split selected yet</span>
                        )}
                      </div>
                      <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3">
                        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Today&apos;s workout
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {todaysSplitTemplates.map((t) => (
                            <Button
                              key={t.id}
                              size="sm"
                              variant={t.id === dashboardTemplate?.id ? "default" : "outline"}
                              className="rounded-full"
                              onClick={() => {
                                const dayKey = getWeekdayKey(sessionDate);
                                setState((prev) => ({
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    schedule: {
                                      ...(prev.settings.schedule || emptySchedule),
                                      [dayKey]: t.id,
                                    },
                                    activeSplitKey: t.splitKey || prev.settings.activeSplitKey,
                                  },
                                }));
                                setSelectedTemplateId(t.id);
                              }}
                            >
                              {t.name}
                            </Button>
                          ))}
                          {!todaysSplitTemplates.length ? (
                            <span className="text-xs text-muted-foreground">
                              No workouts for this split yet.
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <CalendarDays className="h-5 w-5" /> Weekly split
                      </CardTitle>
                      <CardDescription>Switch between saved splits and weekly programs.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.keys(state.savedSplits || {}).length ? (
                        <div className="space-y-2">
                          {Object.entries(state.savedSplits || {}).map(([key, templates]) => {
                            const daysForSplit = scheduledDayOptions.length
                              ? scheduledDayOptions.map((d) => d.key)
                              : WEEKDAYS.filter((d) => d.index !== 0).map((d) => d.key);
                            const source =
                              templates?.[0]?.source === "custom_split" ? "custom_split" : "generated";
                            const isActiveSplit = key === state.settings.activeSplitKey;
                            return (
                              <div
                                key={key}
                                className={`rounded-xl border p-3 text-sm ${
                                  isActiveSplit ? "border-primary/60 bg-primary/10" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="font-medium">{formatSplitLabel(key)}</div>
                                  {isActiveSplit ? (
                                    <Badge variant="secondary" className="rounded-full">
                                      Active
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {templates.length} templates saved
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={() =>
                                      replaceProgramTemplates(
                                        templates,
                                        daysForSplit as Weekday[],
                                        key,
                                        source
                                      )
                                    }
                                  >
                                    Use this split
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => deleteSavedSplit(key)}
                                  >
                                    Delete split
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          No saved splits yet. Generate one to get started.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <ClipboardList className="h-5 w-5" /> My workouts
                      </CardTitle>
                      <CardDescription>Build workouts, create splits, and manage templates.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Button className="rounded-xl" onClick={() => setTemplateDialogOpen(true)}>
                          Manage templates
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => setGeneratorOpen(true)}>
                          Generate workouts
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => setImportDialogOpen(true)}>
                          Import data
                        </Button>
                      </div>
                      <div className="rounded-2xl border border-foreground/10 bg-background/70 p-3 space-y-3">
                        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Create your own split
                        </div>
                        <Input
                          value={customSplitName}
                          onChange={(e) => setCustomSplitName(e.target.value)}
                          placeholder="Split name (e.g., Lift & Sculpt)"
                        />
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((day) => (
                            <Button
                              key={day.key}
                              type="button"
                              size="sm"
                              variant={customSplitDays.includes(day.key) ? "secondary" : "outline"}
                              className="rounded-xl"
                              onClick={() => toggleCustomSplitDay(day.key)}
                            >
                              {day.short}
                            </Button>
                          ))}
                        </div>
                        <Button
                          className="rounded-xl w-full"
                          onClick={() => {
                            if (!customSplitDays.length) {
                              alert("Pick at least one day first.");
                              return;
                            }
                            const name = customSplitName.trim() || "My Split";
                            const splitKey = `custom|${name}|${customSplitDays.join("-") || "days"}`;
                            const templates = customSplitDays.map((day, idx) => {
                              const label =
                                WEEKDAYS.find((d) => d.key === day)?.label || `Day ${idx + 1}`;
                              return {
                                id: uid(),
                                name: `${name} • ${label}`,
                                exercises: [],
                              } as Template;
                            });
                            replaceProgramTemplates(templates, customSplitDays, splitKey, "custom_split");
                            setSplitWizard({
                              title: name,
                              templateIds: templates.map((t) => t.id),
                            });
                          }}
                        >
                          Create custom split
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Your split is saved locally. You can switch back anytime.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

              </motion.div>
            </TabsContent>

            {!simpleMode ? (
            <TabsContent value="social" className="mt-0">
              <motion.div variants={pageMotion} initial="hidden" animate="show" className="space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                        Community
                      </div>
                      <div className="text-3xl font-display uppercase">Social</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setActiveTab("profile")}>
                        <User className="h-4 w-4 mr-2" /> Profile
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSocialFriendsOpen(true)}>
                        <UserPlus className="h-4 w-4 mr-2" /> Friends
                        {friendRequests.length ? (
                          <Badge className="ml-2 rounded-full" variant="secondary">
                            {friendRequests.length}
                          </Badge>
                        ) : null}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSocialMessagesOpen(true)}>
                        <MessageCircle className="h-4 w-4 mr-2" /> Messages
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSocialInvitesOpen(true)}>
                        <Send className="h-4 w-4 mr-2" /> Invites
                        {workoutInvites.length ? (
                          <Badge className="ml-2 rounded-full" variant="secondary">
                            {workoutInvites.length}
                          </Badge>
                        ) : null}
                      </Button>
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => setSocialChallengesOpen(true)}>
                        <Trophy className="h-4 w-4 mr-2" /> Challenges
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    <div className="flex flex-col items-center gap-1">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold">
                        You
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        You
                      </div>
                    </div>
                    {friends.map((f) => (
                      <div key={`story-${f.userId}`} className="flex flex-col items-center gap-1">
                        <div className="h-12 w-12 rounded-full border border-primary/40 bg-card flex items-center justify-center text-sm font-semibold">
                          {f.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          @{f.username}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <motion.div variants={listMotion} className="space-y-4">
                  {socialFeed.length ? (
                    socialFeed.map((post) => {
                      const summary = socialPostSummary(post);
                      const likeCount = postLikes[post.id]?.count || 0;
                      const commentCount = (postComments[post.id] || []).length;
                      return (
                        <motion.article
                          key={post.id}
                          variants={listItemMotion}
                          className="rounded-3xl border bg-card/80 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">
                                {post.actor.slice(0, 1).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold">@{post.actor}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDate(post.createdAt)}
                                </div>
                              </div>
                            </div>
                            <Badge variant="secondary" className="rounded-full px-3 text-[10px] uppercase tracking-[0.2em]">
                              {post.type.replace("_", " ")}
                            </Badge>
                          </div>
                          <div className="mt-3">
                            <div className="text-lg font-semibold">{summary.title}</div>
                            <div className="text-sm text-muted-foreground">{summary.meta}</div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                            <button
                              type="button"
                              className="flex items-center gap-2"
                              onClick={() => toggleLike(post.id)}
                            >
                              <Heart className={`h-4 w-4 ${postLikes[post.id]?.liked ? "text-primary" : ""}`} />
                              {likeCount} likes
                            </button>
                            <div>{commentCount} comments</div>
                          </div>
                          <div className="mt-3 space-y-2">
                            {(postComments[post.id] || []).slice(0, 2).map((c) => (
                              <div key={c.id} className="text-xs text-muted-foreground">
                                <span className="font-medium">@{c.author}</span> {c.body}
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <Input
                                value={commentDrafts[post.id] || ""}
                                onChange={(e) =>
                                  setCommentDrafts((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value,
                                  }))
                                }
                                placeholder="Add a comment..."
                                className="h-9 text-sm"
                              />
                              <Button size="sm" variant="outline" className="rounded-xl" onClick={() => addComment(post.id)}>
                                Send
                              </Button>
                            </div>
                          </div>
                        </motion.article>
                      );
                    })
                  ) : (
                    <motion.div variants={listItemMotion} className="rounded-3xl border bg-card/80 p-6 text-center">
                      <div className="text-lg font-semibold">Your feed is empty</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Add friends to see workouts, PRs, and streaks here.
                      </div>
                    </motion.div>
                  )}
                </motion.div>

                <Dialog open={socialFriendsOpen} onOpenChange={setSocialFriendsOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Friends</DialogTitle>
                      <DialogDescription>Search, accept requests, and manage your network.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label>Find friends by username</Label>
                        <div className="flex gap-2">
                          <Input
                            value={friendSearch}
                            onChange={(e) => setFriendSearch(e.target.value)}
                            placeholder="username"
                          />
                          <Button
                            className="rounded-xl"
                            onClick={async () => {
                              if (!supabase || !friendSearch.trim()) return;
                              const res = await supabase
                                .from("profiles")
                                .select("user_id, username")
                                .ilike("username", friendSearch.trim());
                              if (!res.error) {
                                setFriendResults(
                                  (res.data || [])
                                    .filter((u: any) => u.user_id !== authUser?.id)
                                    .map((u: any) => ({
                                      userId: u.user_id,
                                      username: u.username,
                                    }))
                                );
                              }
                            }}
                          >
                            Search
                          </Button>
                        </div>
                        {friendResults.length ? (
                          <div className="space-y-2">
                            {friendResults.map((u) => (
                              <div key={u.userId} className="flex items-center justify-between rounded-xl border p-2 text-sm">
                                <span className="font-medium">@{u.username}</span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase || !authUser) return;
                                    await supabase.from("friend_requests").insert({
                                      sender_id: authUser.id,
                                      receiver_id: u.userId,
                                    });
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Friend requests</div>
                        {friendRequests.length ? (
                          <div className="space-y-2 text-sm">
                            {friendRequests.map((req) => (
                              <div key={req.id} className="flex items-center justify-between rounded-xl border p-2">
                                <span className="font-medium">@{req.fromName}</span>
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={() => acceptFriendRequest(req.id, req.fromId, req.fromName)}
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => declineFriendRequest(req.id)}
                                  >
                                    Decline
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No pending requests.</div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm font-medium">Your friends</div>
                        {friends.length ? (
                          <div className="flex flex-wrap gap-2 text-sm">
                            {friends.map((f) => (
                              <div key={f.userId} className="rounded-full border px-3 py-1">
                                @{f.username}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Add a friend to see shared workouts.</div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={socialMessagesOpen} onOpenChange={setSocialMessagesOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Messages</DialogTitle>
                      <DialogDescription>Chat with your training partners.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="rounded-xl border p-2 space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Friends
                        </div>
                        {friends.length ? (
                          <div className="space-y-1 text-sm">
                            {friends.map((f) => (
                              <button
                                key={`msg-${f.userId}`}
                                type="button"
                                className="w-full text-left rounded-lg border px-2 py-1 hover:bg-muted/50"
                                onClick={() => setSelectedMessageFriend(f)}
                              >
                                @{f.username}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">No friends yet.</div>
                        )}
                      </div>
                      <div className="rounded-xl border p-2 space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          {selectedMessageFriend ? `Chat @${selectedMessageFriend.username}` : "Select a friend"}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                          {messages.length ? (
                            messages.map((m) => (
                              <div key={m.id} className="rounded-lg border px-2 py-1">
                                <span className="font-medium">@{m.from}</span> {m.body}
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-muted-foreground">No messages yet.</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={messageDraft}
                            onChange={(e) => setMessageDraft(e.target.value)}
                            placeholder="Send a message"
                            className="h-8 text-xs"
                          />
                          <Button
                            size="sm"
                            className="rounded-xl h-8 px-2 text-[11px]"
                            onClick={async () => {
                              if (!supabase || !authUser || !selectedMessageFriend) return;
                              const body = messageDraft.trim();
                              if (!body) return;
                              const res = await supabase.from("messages").insert({
                                sender_id: authUser.id,
                                recipient_id: selectedMessageFriend.userId,
                                body,
                              }).select("id, body, created_at, sender:profiles(username)").single();
                              if (!res.error && res.data) {
                                setMessages((prev) => [
                                  {
                                    id: res.data.id,
                                    from: getUsername(res.data.sender, "You"),
                                    body: res.data.body,
                                    createdAt: res.data.created_at,
                                  },
                                  ...prev,
                                ]);
                                setMessageDraft("");
                              }
                            }}
                            disabled={!selectedMessageFriend}
                          >
                            Send
                          </Button>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={socialInvitesOpen} onOpenChange={setSocialInvitesOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Workout invites</DialogTitle>
                      <DialogDescription>Join a friend’s live workout.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="rounded-xl border p-3 space-y-2">
                        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          Invite a friend
                        </div>
                        <div className="space-y-2">
                          <Select value={inviteFriendId} onValueChange={setInviteFriendId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Choose friend" />
                            </SelectTrigger>
                            <SelectContent>
                              {friends.length ? (
                                friends.map((f) => (
                                  <SelectItem key={f.userId} value={f.userId}>
                                    @{f.username}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  No friends yet
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Select value={inviteTemplateId} onValueChange={setInviteTemplateId}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Pick a workout" />
                            </SelectTrigger>
                            <SelectContent>
                              {state.templates.length ? (
                                state.templates.map((t) => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="none" disabled>
                                  No templates yet
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          <Button
                            className="w-full rounded-xl"
                            onClick={sendWorkoutInvite}
                            disabled={!inviteFriendId || !inviteTemplateId}
                          >
                            Send invite
                          </Button>
                        </div>
                      </div>
                      {workoutInvites.length ? (
                        <div className="space-y-2">
                          {workoutInvites.map((invite) => (
                            <div key={invite.id} className="rounded-xl border p-2 text-sm">
                              <div className="font-medium">@{invite.fromName}</div>
                              <div className="text-xs text-muted-foreground">
                                Invited you to {invite.template?.name || "a workout"}
                              </div>
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase || !authUser) return;
                                    const template = invite.template as Template;
                                    const freshTemplate: Template = {
                                      ...template,
                                      id: uid(),
                                      exercises: (template.exercises || []).map((ex) => ({
                                        ...ex,
                                        id: uid(),
                                      })),
                                      source: "custom",
                                    };
                                    setState((p) => ({
                                      ...p,
                                      templates: [freshTemplate, ...p.templates],
                                    }));
                                    setSelectedTemplateId(freshTemplate.id);
                                    await supabase
                                      .from("workout_invites")
                                      .update({ status: "accepted" })
                                      .eq("id", invite.id);
                                    setWorkoutInvites((prev) => prev.filter((i) => i.id !== invite.id));
                                    startWorkout();
                                  }}
                                >
                                  Join
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase) return;
                                    await supabase
                                      .from("workout_invites")
                                      .update({ status: "declined" })
                                      .eq("id", invite.id);
                                    setWorkoutInvites((prev) => prev.filter((i) => i.id !== invite.id));
                                  }}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No invites yet.</div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={socialChallengesOpen} onOpenChange={setSocialChallengesOpen}>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Challenges</DialogTitle>
                      <DialogDescription>Start a weekly challenge with friends.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_auto] gap-2">
                        <Input
                          value={challengeTitle}
                          onChange={(e) => setChallengeTitle(e.target.value)}
                          placeholder="Challenge name"
                        />
                        <Select value={challengeType} onValueChange={(v) => setChallengeType(v as any)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Challenge type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="volume">Weekly volume</SelectItem>
                            <SelectItem value="workouts">Weekly workouts</SelectItem>
                            <SelectItem value="prs">Monthly PRs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        className="rounded-xl"
                        onClick={async () => {
                          if (!supabase || !authUser) return;
                          const title = challengeTitle.trim() || "Challenge";
                          const today = new Date();
                          const start = today.toISOString().slice(0, 10);
                          const end = new Date(
                            today.getTime() + (challengeType === "prs" ? 30 : 7) * 24 * 60 * 60 * 1000
                          )
                            .toISOString()
                            .slice(0, 10);
                          const res = await supabase
                            .from("challenges")
                            .insert({ creator_id: authUser.id, title, type: challengeType, start_date: start, end_date: end })
                            .select("id")
                            .single();
                          if (res.error) return;
                          await supabase.from("challenge_participants").insert({
                            challenge_id: res.data.id,
                            user_id: authUser.id,
                          });
                          setChallengeTitle("");
                        }}
                      >
                        Create challenge
                      </Button>
                      {challenges.length ? (
                        <div className="space-y-2 text-sm">
                          {challenges.map((c) => (
                            <div key={c.id} className="rounded-xl border p-2 flex items-center justify-between">
                              <div>
                                <div className="font-medium">{c.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {c.type} • {c.start} → {c.end}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant={c.joined ? "secondary" : "outline"}
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase || !authUser) return;
                                    if (c.joined) return;
                                    await supabase.from("challenge_participants").insert({
                                      challenge_id: c.id,
                                      user_id: authUser.id,
                                    });
                                    setChallenges((prev) =>
                                      prev.map((x) => (x.id === c.id ? { ...x, joined: true } : x))
                                    );
                                  }}
                                >
                                  {c.joined ? "Joined" : "Join"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase || !authUser) return;
                                    const ids = [authUser.id, ...friends.map((f) => f.userId)];
                                    const sessionsRes = await supabase
                                      .from("user_sessions")
                                      .select("user_id, session")
                                      .in("user_id", ids);
                                    if (sessionsRes.error) return;
                                    const scores: Record<string, number> = {};
                                    for (const row of sessionsRes.data || []) {
                                      const s = row.session as Session;
                                      if (s.dateISO < c.start || s.dateISO > c.end) continue;
                                      if (!scores[row.user_id]) scores[row.user_id] = 0;
                                      if (c.type === "workouts") scores[row.user_id] += 1;
                                      if (c.type === "volume") {
                                        for (const e of s.entries) {
                                          for (const set of e.sets) {
                                            scores[row.user_id] += (Number(set.weight) || 0) * (Number(set.reps) || 0);
                                          }
                                        }
                                      }
                                      if (c.type === "prs") {
                                        const maxWeight = Math.max(0, ...s.entries.map((e) => Math.max(0, ...e.sets.map((set) => Number(set.weight) || 0))));
                                        if (maxWeight > 0) scores[row.user_id] += 1;
                                      }
                                    }
                                    const leaderboard = ids.map((id) => {
                                      const friend = friends.find((f) => f.userId === id);
                                      const name = id === authUser.id ? "You" : getUsername(friend, "Athlete");
                                      return { username: name, score: scores[id] || 0 };
                                    });
                                    leaderboard.sort((a, b) => b.score - a.score);
                                    setChallengeLeaders((prev) => ({ ...prev, [c.id]: leaderboard }));
                                  }}
                                >
                                  Leaderboard
                                </Button>
                              </div>
                            </div>
                          ))}
                          {challenges.map((c) =>
                            challengeLeaders[c.id] ? (
                              <div key={`${c.id}-leaderboard`} className="rounded-xl border p-2">
                                <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  {c.title} leaderboard
                                </div>
                                <div className="mt-2 space-y-1 text-xs">
                                  {challengeLeaders[c.id].map((entry, idx) => (
                                    <div key={`${c.id}-${entry.username}`} className="flex items-center justify-between">
                                      <span>
                                        {idx + 1}. {entry.username}
                                      </span>
                                      <span className="text-muted-foreground">{entry.score}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">No active challenges yet.</div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </motion.div>
            </TabsContent>
            ) : null}

            {!simpleMode ? (
            <TabsContent value="profile" className="mt-0">
              <motion.div variants={pageMotion} initial="hidden" animate="show" className="space-y-4">
                <div>
                  <Button variant="outline" className="rounded-2xl" onClick={() => setActiveTab("social")}>
                    Back to Social
                  </Button>
                </div>
                <motion.div variants={cardMotion}>
                  <Card className="rounded-3xl shadow-lg card-hero overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                          <div className="relative h-20 w-20 rounded-3xl bg-black/90 text-white flex items-center justify-center text-3xl font-display uppercase tracking-[0.2em] shadow-[0_20px_40px_rgba(0,0,0,0.35)] overflow-hidden">
                            {state.settings.profile.avatarUrl ? (
                              <img
                                src={state.settings.profile.avatarUrl}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (state.settings.profile.name || state.settings.profile.username || "FF")
                                .split(" ")
                                .map((s) => s.slice(0, 1))
                                .join("")
                                .slice(0, 2)
                            )}
                          </div>
                          <div>
                            <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                              @{state.settings.profile.username || "forgeathlete"}
                            </div>
                            <div className="text-3xl font-display uppercase tracking-[0.2em]">
                              {state.settings.profile.name || "Forge Athlete"}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Build. Track. Earn it.
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label className="rounded-2xl border border-foreground/10 bg-background/70 px-4 py-2 text-sm cursor-pointer">
                            Change photo
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleAvatarChange(e.target.files?.[0])}
                            />
                          </label>
                          <Button className="rounded-2xl" onClick={() => setSettingsDialogOpen(true)}>
                            Edit profile
                          </Button>
                          <Button variant="outline" className="rounded-2xl" onClick={() => setActiveTab("social")}>
                            View feed
                          </Button>
                        </div>
                      </div>
                      <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                        <div className="rounded-2xl border border-foreground/10 bg-background/70 py-3">
                          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Sessions
                          </div>
                          <div className="text-2xl font-display">{headerStats.totalSessions}</div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-background/70 py-3">
                          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            Streak
                          </div>
                          <div className="text-2xl font-display">{headerStats.streak}d</div>
                        </div>
                        <div className="rounded-2xl border border-foreground/10 bg-background/70 py-3">
                          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                            7d Volume
                          </div>
                          <div className="text-2xl font-display">
                            {Math.round(headerStats.vol7d).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-3xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <Grid3X3 className="h-5 w-5" /> My feed
                      </CardTitle>
                      <CardDescription>Recent sessions and highlights.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[...state.sessions]
                          .sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime())
                          .slice(0, 9)
                          .map((s) => {
                            const volume = s.entries.reduce((acc, e) => acc + calcEntryVolume(e), 0);
                            return (
                              <div key={s.id} className="rounded-2xl border border-foreground/10 bg-background/70 p-3">
                                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                                  {new Date(s.dateISO).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                <div className="mt-2 font-medium">{s.templateName || "Session"}</div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {Math.round(volume).toLocaleString()} vol • {s.entries.length} lifts
                                </div>
                              </div>
                            );
                          })}
                        {state.sessions.length === 0 ? (
                          <div className="col-span-full text-sm text-muted-foreground">
                            Log your first session to build your feed.
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-minimal">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <User className="h-5 w-5" /> Sharing
                      </CardTitle>
                      <CardDescription>Control what shows up in your social feed.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {[
                        { key: "shareWorkouts", label: "Share workouts" },
                        { key: "sharePRs", label: "Share PRs" },
                        { key: "shareWeighIns", label: "Share weigh-ins" },
                        { key: "shareTrophies", label: "Share trophies" },
                        { key: "shareGoals", label: "Share goals" },
                        { key: "shareStreaks", label: "Share streaks" },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border p-2">
                          <div className="text-sm">{item.label}</div>
                          <Switch
                            checked={!!(state.settings.profile as any)[item.key]}
                            onCheckedChange={(v) =>
                              updateProfile({ [item.key]: v } as Partial<Profile>)
                            }
                          />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>

                {!isCoach ? (
                  <motion.div variants={cardMotion}>
                    <Card className="rounded-2xl shadow-md card-glass">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <Sparkles className="h-5 w-5" /> Coach access
                        </CardTitle>
                        <CardDescription>
                          Connect to your coach and import assigned programs.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="space-y-2">
                          <Label>Coach email</Label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                              value={coachLinkEmail}
                              onChange={(e) => setCoachLinkEmail(e.target.value)}
                              placeholder="coach@email.com"
                            />
                            <Button
                              className="rounded-xl"
                              onClick={async () => {
                                if (!supabase || !authUser) return;
                                const email = coachLinkEmail.trim();
                                if (!email) return;
                                const coachRes = await supabase
                                  .from("profiles")
                                  .select("user_id, role")
                                  .eq("email", email)
                                  .single();
                                if (coachRes.error || coachRes.data?.role !== "coach") {
                                  alert("Coach not found.");
                                  return;
                                }
                                await supabase.from("coach_clients").insert({
                                  coach_id: coachRes.data.user_id,
                                  athlete_id: authUser.id,
                                  athlete_email: authUser.email,
                                });
                                alert("Coach linked. Ask them to assign your program.");
                                setCoachLinkEmail("");
                              }}
                            >
                              Connect
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-xl border p-3 space-y-2">
                          <div className="text-sm font-medium">Coach assignments</div>
                          {athleteAssignments.length ? (
                            <div className="space-y-2">
                              {athleteAssignments.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{item.template.name}</span>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={() => {
                                      const freshTemplate: Template = {
                                        ...item.template,
                                        id: uid(),
                                        exercises: (item.template.exercises || []).map((ex) => ({
                                          ...ex,
                                          id: uid(),
                                        })),
                                        source: "coach",
                                      };
                                      setState((p) => ({
                                        ...p,
                                        templates: [freshTemplate, ...p.templates],
                                      }));
                                      setSelectedTemplateId(freshTemplate.id);
                                      alert("Template added to your library.");
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              No assignments yet.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ) : null}

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-edge">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                      <Target className="h-5 w-5" /> Goals
                    </CardTitle>
                    <CardDescription>Your focus and weekly targets.</CardDescription>
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
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <Trophy className="h-5 w-5" /> Trophies
                      </CardTitle>
                      <CardDescription>Celebrate milestones and gym wins.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="text-muted-foreground">
                          Unlocked {unlockedCount}/{ACHIEVEMENTS.length}
                        </div>
                        {latestAchievement ? (
                          <div className="text-xs text-muted-foreground">
                            Latest: {latestAchievement.title}
                          </div>
                        ) : null}
                      </div>
                      <motion.div
                        variants={listMotion}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-2"
                      >
                        {achievementsList
                          .slice()
                          .sort((a, b) => Number(!!b.unlockedAt) - Number(!!a.unlockedAt))
                          .slice(0, 3)
                          .map((a) => {
                            const Icon = a.icon;
                            return (
                              <motion.div
                                key={a.id}
                                variants={listItemMotion}
                                className={`rounded-xl border p-3 ${
                                  a.unlockedAt ? "" : "opacity-60"
                                }`}
                              >
                                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                                  <Icon className="h-4 w-4" />
                                  {a.unlockedAt ? "Unlocked" : "Locked"}
                                </div>
                                <div className="mt-1 font-medium">{a.title}</div>
                                <div className="text-xs text-muted-foreground">{a.description}</div>
                              </motion.div>
                            );
                          })}
                      </motion.div>
                      <div className="text-xs text-muted-foreground">
                        Unlock trophies by hitting PRs, stacking volume, and staying consistent.
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {state.settings.powerliftingMode ? (
                  <motion.div variants={cardMotion}>
                    <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <Dumbbell className="h-5 w-5" /> Big 3 1RM
                      </CardTitle>
                      <CardDescription>Visible on your profile when sharing.</CardDescription>
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
                  </motion.div>
                ) : null}
              </motion.div>
            </TabsContent>
            ) : null}

            <TabsContent value="more" className="mt-0">
              <motion.div variants={pageMotion} initial="hidden" animate="show" className="space-y-4">
                <div>
                <div className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                  {simpleMode ? "Settings" : "Tools & settings"}
                </div>
                <div className="text-3xl font-display uppercase">
                  {simpleMode ? "Settings" : "More"}
                </div>
                </div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-glass">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <Sparkles className="h-5 w-5" /> Modes
                      </CardTitle>
                      <CardDescription>Switch between focus levels and roles.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between rounded-xl border p-3">
                        <div>
                          <div className="text-sm font-medium">Simple mode</div>
                          <div className="text-xs text-muted-foreground">
                            Hide social and extra tools for fast training.
                          </div>
                        </div>
                        <Switch
                          checked={!!state.settings.simpleMode}
                          onCheckedChange={(v) =>
                            setState((p) => ({
                              ...p,
                              settings: { ...p.settings, simpleMode: v },
                            }))
                          }
                        />
                      </div>
                      <div className="rounded-xl border p-3 space-y-2">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Role</div>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { key: "athlete", label: "Athlete" },
                            { key: "smart_trainer", label: "Smart Trainer" },
                            { key: "coach", label: "Coach" },
                          ].map((item) => (
                            <Button
                              key={item.key}
                              size="sm"
                              variant={state.settings.role === item.key ? "secondary" : "outline"}
                              className="rounded-full"
                              onClick={() =>
                                setState((p) => ({
                                  ...p,
                                  settings: { ...p.settings, role: item.key as UserRole },
                                }))
                              }
                            >
                              {item.label}
                            </Button>
                          ))}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Coach mode is for verified trainers managing clients.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardMotion}>
                  <Card className="rounded-2xl shadow-md card-minimal">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 font-display uppercase tracking-[0.2em] text-sm md:text-base">
                        <SettingsIcon className="h-5 w-5" /> Account
                      </CardTitle>
                      <CardDescription>Profile, privacy, and app settings.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button className="rounded-xl" onClick={() => setSettingsDialogOpen(true)}>
                        Account & settings
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {!simpleMode ? (
                  <details className="rounded-2xl border border-foreground/10 bg-card/70 p-4">
                    <summary className="cursor-pointer text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                      More tools
                    </summary>
                    <div className="mt-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setTemplateDialogOpen(true)}>
                          Workout templates
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => setGeneratorOpen(true)}>
                          Generate workouts
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={() => setImportDialogOpen(true)}>
                          Import data
                        </Button>
                        <Button variant="outline" className="rounded-xl" onClick={exportData}>
                          Export data
                        </Button>
                      </div>

                      <div className="rounded-2xl border border-foreground/10 p-3">
                        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          Training history
                        </div>
                        <div className="mt-3 space-y-3">
                          <div className="relative">
                            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-60" />
                            <Input
                              className="pl-9"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              placeholder="Search templates, dates, exercises…"
                            />
                          </div>
                          {filteredSessions.length === 0 ? (
                            <div className="text-sm text-muted-foreground">No sessions yet.</div>
                          ) : (
                            <motion.div variants={listMotion} className="space-y-3">
                              {filteredSessions.map((s) => (
                                <motion.div key={s.id} variants={listItemMotion}>
                                  <SessionCard
                                    session={s}
                                    units={state.settings.units}
                                    onDelete={() => deleteSession(s.id)}
                                  />
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </div>

                      {isCoach ? (
                        <div className="rounded-2xl border border-foreground/10 p-3 space-y-3">
                          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Coach tools
                          </div>
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2">
                              <Label>Invite client by email</Label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Input
                                  value={coachInviteEmail}
                                  onChange={(e) => setCoachInviteEmail(e.target.value)}
                                  placeholder="client@email.com"
                                />
                                <Button
                                  className="rounded-xl"
                                  onClick={async () => {
                                    if (!supabase || !authUser) return;
                                    const email = coachInviteEmail.trim();
                                    if (!email) return;
                                    await supabase.from("coach_clients").insert({
                                      coach_id: authUser.id,
                                      athlete_email: email,
                                    });
                                    setCoachInviteEmail("");
                                    const res = await supabase
                                      .from("coach_clients")
                                      .select("athlete_id, athlete_email")
                                      .eq("coach_id", authUser.id);
                                    if (!res.error) {
                                      setCoachClients(
                                        (res.data || []).map((c: any) => ({
                                          athleteId: c.athlete_id,
                                          email: c.athlete_email,
                                        }))
                                      );
                                    }
                                  }}
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                            {coachClients.length === 0 ? (
                              <div className="text-sm text-muted-foreground">
                                No clients yet. Add an email to invite someone.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {coachClients.map((c) => (
                                  <div key={c.email} className="rounded-xl border p-3 text-sm">
                                    <div className="font-medium">{c.email}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {c.athleteId ? "Connected" : "Pending connection"}
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <Select
                                        onValueChange={async (v) => {
                                          const template = state.templates.find((t) => t.id === v);
                                          if (!template || !supabase || !authUser) return;
                                          if (!c.athleteId) {
                                            alert("Client hasn't connected yet.");
                                            return;
                                          }
                                          await supabase.from("coach_assignments").insert({
                                            coach_id: authUser.id,
                                            athlete_id: c.athleteId,
                                            template_id: template.id,
                                            template_name: template.name,
                                            template,
                                          });
                                          const assignRes = await supabase
                                            .from("coach_assignments")
                                            .select("id, athlete_id, template_name")
                                            .eq("coach_id", authUser.id)
                                            .order("created_at", { ascending: false })
                                            .limit(6);
                                          if (!assignRes.error) {
                                            setCoachAssignments(
                                              (assignRes.data || []).map((a: any) => ({
                                                id: a.id,
                                                athleteId: a.athlete_id,
                                                templateName: a.template_name,
                                              }))
                                            );
                                          }
                                        }}
                                      >
                                        <SelectTrigger className="w-[180px]">
                                          <SelectValue placeholder="Assign template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {state.templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                              {t.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <Button
                                        variant="outline"
                                        className="rounded-xl"
                                        onClick={async () => {
                                          if (!supabase || !c.athleteId) return;
                                          const sessionsRes = await supabase
                                            .from("user_sessions")
                                            .select("session")
                                            .eq("user_id", c.athleteId);
                                          if (sessionsRes.error) return;
                                          const sessions = (sessionsRes.data || []).map(
                                            (row: any) => row.session as Session
                                          );
                                          const stats = buildSessionStats(sessions);
                                          setCoachClientProgress({
                                            athleteId: c.athleteId,
                                            sessions: stats.totalSessions,
                                            lastDate: stats.lastLabel,
                                            volume7d: stats.vol7d,
                                          });
                                        }}
                                        disabled={!c.athleteId}
                                      >
                                        View progress
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="rounded-xl border p-3 space-y-2">
                              <div className="text-sm font-medium">Coach insights</div>
                              {coachClientProgress ? (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div className="rounded-lg border p-2">
                                    Sessions: {coachClientProgress.sessions}
                                  </div>
                                  <div className="rounded-lg border p-2">
                                    Last: {coachClientProgress.lastDate}
                                  </div>
                                  <div className="rounded-lg border p-2">
                                    7d Volume: {Math.round(coachClientProgress.volume7d).toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  Pick a connected client and click “View progress”.
                                </div>
                              )}
                              <div className="rounded-xl border p-3 space-y-2">
                                <div className="text-sm font-medium">Recent assignments</div>
                                {coachAssignments.length ? (
                                  <div className="space-y-2 text-sm">
                                    {coachAssignments.map((a) => (
                                      <div key={a.id} className="flex items-center justify-between">
                                        <span className="font-medium">{a.templateName}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {a.athleteId ? "Assigned" : "Pending"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground">No assignments yet.</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}
            </motion.div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-foreground/10 bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-4">
            <button
              type="button"
              className={`flex min-w-[64px] flex-col items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] ${
                activeTab === "dashboard" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("dashboard")}
            >
              <Home className="h-5 w-5" />
              Home
            </button>
            <button
              type="button"
              className={`flex min-w-[64px] flex-col items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] ${
                activeTab === "workouts" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("workouts")}
            >
              <ClipboardList className="h-5 w-5" />
              Training
            </button>
            <button
              type="button"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_36px_rgba(0,0,0,0.35)] ring-1 ring-primary/40"
              onClick={startWorkout}
            >
              <Play className="h-7 w-7" />
            </button>

            {!simpleMode ? (
              <button
                type="button"
                className={`flex min-w-[64px] flex-col items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] ${
                  activeTab === "social" ? "text-foreground" : "text-muted-foreground"
                }`}
                onClick={() => setActiveTab("social")}
              >
                <Heart className="h-5 w-5" />
                Social
              </button>
            ) : null}
            <button
              type="button"
              className={`flex min-w-[64px] flex-col items-center gap-1 text-[0.65rem] uppercase tracking-[0.2em] ${
                activeTab === "more" ? "text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setActiveTab("more")}
            >
              {simpleMode ? <SettingsIcon className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
              {simpleMode ? "Settings" : "More"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
// -------------------- Components --------------------

function WeightSlider({
  value,
  onChange,
  units,
  step,
}: {
  value: string | number;
  onChange: (next: string) => void;
  units: Units;
  step?: number;
}) {
  const { step: sliderStep, max } = getWeightSliderConfig(units);
  const raw = Number(value) || 0;
  const sliderValue = Math.min(Math.max(raw, 0), max);
  const snap = (v: number) => Math.round(v / sliderStep) * sliderStep;
  const applyValue = (v: number) => {
    const next = Math.min(Math.max(snap(v), 0), max);
    const formatted = Number.isInteger(next) ? String(next) : next.toFixed(1);
    onChange(formatted);
  };
  const ticks = Array.from({ length: 41 }).map((_, i) => {
    const pct = i / 40;
    const value = Math.round((max * pct) / 2.5) * 2.5;
    const isMajor = i % 5 === 0;
    return { key: i, value, isMajor };
  });
  return (
    <div className="rounded-2xl border border-foreground/10 bg-background/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Weight
        </div>
        <div className="text-sm font-semibold">
          {sliderValue}
          {units}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-xl"
          onClick={() => applyValue(sliderValue - sliderStep)}
          aria-label="Decrease weight"
        >
          –
        </Button>
        <input
          type="range"
          min={0}
          max={max}
          step={sliderStep}
          value={sliderValue}
          onChange={(e) => applyValue(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-xl"
          onClick={() => applyValue(sliderValue + sliderStep)}
          aria-label="Increase weight"
        >
          +
        </Button>
      </div>
      <div className="mt-3 flex items-end justify-between">
        {ticks.map((tick) => (
          <div key={tick.key} className="flex flex-col items-center">
            <span
              className={`inline-flex w-[2px] ${
                tick.isMajor ? "h-3 bg-foreground/50" : "h-2 bg-foreground/25"
              }`}
            />
            {tick.isMajor ? (
              <span className="mt-1 text-[10px] text-muted-foreground">
                {tick.value}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function BigWeightSlider({
  value,
  onChange,
  units,
}: {
  value: string | number;
  onChange: (next: string) => void;
  units: Units;
}) {
  const { step: sliderStep, max } = getWeightSliderConfig(units);
  const raw = Number(value) || 0;
  const sliderValue = Math.min(Math.max(raw, 0), max);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const snap = (v: number) => Math.round(v / sliderStep) * sliderStep;
  const applyValue = (v: number) => {
    const next = Math.min(Math.max(snap(v), 0), max);
    const formatted = Number.isInteger(next) ? String(next) : next.toFixed(1);
    onChange(formatted);
  };
  const pxPerUnit = 6;
  const majorEvery = 25 * pxPerUnit;
  const rulerStyle: React.CSSProperties = {
    backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 4px, transparent 4px ${majorEvery}px)`,
    backgroundPositionX: "0px",
  };
  const lastClientXRef = useRef(0);
  const lastTsRef = useRef(0);
  const rawValueRef = useRef(sliderValue);
  const momentumRef = useRef(0);

  useEffect(() => {
    if (draggingRef.current) return;
    rawValueRef.current = sliderValue;
  }, [sliderValue]);

  const setFromClientX = useCallback(
    (clientX: number, ts?: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (!ts) {
        const nextValue = ((clientX - rect.left) / rect.width) * max;
        applyValue(nextValue);
        return;
      }
      const dx = clientX - lastClientXRef.current;
      const dt = Math.max(1, ts - lastTsRef.current);
      lastClientXRef.current = clientX;
      lastTsRef.current = ts;

      const sensitivity = 15 / rect.width;
      const speed = Math.min(Math.abs(dx / dt) / 1.8, 1);
      const decay = dt * 0.001;
      momentumRef.current = Math.max(0, momentumRef.current - decay);
      if (speed > 0.7) {
        momentumRef.current = Math.min(1.35, momentumRef.current + speed * 0.16);
      }
      const boost = 1 + momentumRef.current;
      rawValueRef.current = rawValueRef.current - dx * sensitivity * boost;
      applyValue(rawValueRef.current);
    },
    [max]
  );
  return (
    <div className="relative rounded-[28px] border border-foreground/10 bg-card/70 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="text-center text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
        Weight
      </div>
      <motion.div
        key={sliderValue}
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="mt-2 text-center text-4xl font-display text-foreground"
      >
        {sliderValue}
        <span className="text-sm text-muted-foreground ml-2">{units}</span>
      </motion.div>
      <div
        ref={trackRef}
        className="relative mt-6 h-24 overflow-hidden rounded-2xl border border-foreground/10 bg-muted/40"
        style={{ touchAction: "none" }}
        onMouseDown={(e) => {
          draggingRef.current = true;
          rawValueRef.current = sliderValue;
          lastClientXRef.current = e.clientX;
          lastTsRef.current = performance.now();
          setFromClientX(e.clientX, lastTsRef.current);
          const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            setFromClientX(ev.clientX, performance.now());
          };
          const onUp = () => {
            draggingRef.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        onTouchStart={(e) => {
          draggingRef.current = true;
          const clientX = e.touches[0]?.clientX ?? 0;
          rawValueRef.current = sliderValue;
          lastClientXRef.current = clientX;
          lastTsRef.current = performance.now();
          setFromClientX(clientX, lastTsRef.current);
        }}
        onTouchMove={(e) => {
          if (!draggingRef.current) return;
          e.preventDefault();
          setFromClientX(e.touches[0]?.clientX ?? 0, performance.now());
        }}
        onTouchEnd={() => {
          draggingRef.current = false;
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-[-200%] w-[500%] pointer-events-none"
          style={rulerStyle}
          animate={{ x: `calc(${-sliderValue * pxPerUnit}px + 28px)` }}
          transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.9 }}
        />
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent,rgba(0,0,0,0.45))]" />
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-foreground/80 pointer-events-none" />
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 rounded-[2px] bg-foreground/80 pointer-events-none" />
      </div>
    </div>
  );
}

function BigMetricSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  suffix,
  compact = false,
  tickOffset = 0,
  tickEvery,
}: {
  label: string;
  value: string | number;
  onChange: (next: string) => void;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  compact?: boolean;
  tickOffset?: number;
  tickEvery?: number;
}) {
  const raw = Number(value) || 0;
  const sliderValue = Math.min(Math.max(raw, min), max);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const rawValueRef = useRef(sliderValue);
  const lastClientXRef = useRef(0);
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (draggingRef.current) return;
    rawValueRef.current = sliderValue;
  }, [sliderValue]);

  const snap = (v: number) => Math.round(v / step) * step;
  const applyValue = (v: number) => {
    const next = Math.min(Math.max(snap(v), min), max);
    const formatted = Number.isInteger(next) ? String(next) : next.toFixed(1);
    onChange(formatted);
  };

  const pxPerUnit = 3;
  const majorEvery = (tickEvery ?? 5) * pxPerUnit;
  const minorEveryUnits = Math.max(step, (tickEvery ?? step) / 5);
  const minorEvery = minorEveryUnits * pxPerUnit;
  const rulerStyle: React.CSSProperties = {
    backgroundImage: `repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 1px, transparent 1px ${minorEvery}px), repeating-linear-gradient(90deg, rgba(255,255,255,0.6) 0 3px, transparent 3px ${majorEvery}px)`,
  };
  const rulerWidth = (max - min) * pxPerUnit + 1200;
  const baseOffset = min * pxPerUnit;

  const setFromClientX = useCallback(
    (clientX: number, ts?: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (!ts) {
        const pct = (clientX - rect.left) / rect.width;
        applyValue(min + pct * (max - min));
        return;
      }
      const dx = clientX - lastClientXRef.current;
      lastClientXRef.current = clientX;
      lastTsRef.current = ts;
      const sensitivity = 15 / rect.width;
      rawValueRef.current = rawValueRef.current - dx * sensitivity;
      applyValue(rawValueRef.current);
    },
    [max, min, step]
  );

  return (
    <div
      className={`relative rounded-[20px] border border-foreground/10 bg-card/70 shadow-[0_14px_30px_rgba(0,0,0,0.2)] ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="text-center text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
        {label}
      </div>
      <motion.div
        key={sliderValue}
        initial={{ y: 6, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`mt-1 text-center font-display text-foreground ${
          compact ? "text-2xl" : "text-3xl"
        }`}
      >
        {sliderValue}
        {suffix ? <span className="text-sm text-muted-foreground ml-2">{suffix}</span> : null}
      </motion.div>
      <div
        ref={trackRef}
        className={`relative mt-3 overflow-hidden rounded-2xl border border-foreground/10 bg-muted/40 ${
          compact ? "h-12" : "h-16"
        }`}
        style={{ touchAction: "none" }}
        onMouseDown={(e) => {
          draggingRef.current = true;
          rawValueRef.current = sliderValue;
          lastClientXRef.current = e.clientX;
          lastTsRef.current = performance.now();
          setFromClientX(e.clientX, lastTsRef.current);
          const onMove = (ev: MouseEvent) => {
            if (!draggingRef.current) return;
            setFromClientX(ev.clientX, performance.now());
          };
          const onUp = () => {
            draggingRef.current = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
        onTouchStart={(e) => {
          draggingRef.current = true;
          const clientX = e.touches[0]?.clientX ?? 0;
          rawValueRef.current = sliderValue;
          lastClientXRef.current = clientX;
          lastTsRef.current = performance.now();
          setFromClientX(clientX, lastTsRef.current);
        }}
        onTouchMove={(e) => {
          if (!draggingRef.current) return;
          e.preventDefault();
          setFromClientX(e.touches[0]?.clientX ?? 0, performance.now());
        }}
        onTouchEnd={() => {
          draggingRef.current = false;
        }}
      >
        <motion.div
          className="absolute inset-y-0 pointer-events-none"
          style={{
            ...rulerStyle,
            width: rulerWidth,
            left: `calc(50% - ${rulerWidth / 2}px)`,
          }}
          animate={{ x: `calc(${-sliderValue * pxPerUnit}px + ${baseOffset + tickOffset}px)` }}
          transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.9 }}
        />
        <div className="absolute inset-y-0 left-1/2 w-[2px] bg-foreground/80 pointer-events-none" />
      </div>
    </div>
  );
}

function MetricStepper({
  label,
  value,
  min,
  max,
  step,
  unit,
  displayValue,
  onChange,
  quickAdjust = [],
  quickValues = [],
  helperText,
  size = "lg",
  compact = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  displayValue?: string;
  onChange: (next: number) => void;
  quickAdjust?: Array<{ label: string; delta: number }>;
  quickValues?: number[];
  helperText?: string;
  size?: "lg" | "md";
  compact?: boolean;
}) {
  const clamped = clamp(roundTo(value || min, step), min, max);
  const formatValue = (n: number) =>
    Number.isInteger(n) ? String(n) : n.toFixed(1);
  const display = displayValue || formatValue(clamped);
  const applyValue = (next: number) => {
    const snapped = clamp(roundTo(next, step), min, max);
    onChange(snapped);
  };
  const uniqueQuick = Array.from(new Set(quickValues)).filter(
    (v) => v >= min && v <= max
  );

  return (
    <div
      className={`border border-foreground/10 bg-card/80 shadow-[0_18px_50px_rgba(0,0,0,0.22)] ${
        compact ? "rounded-2xl p-3" : "rounded-[28px] p-5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.4em] text-muted-foreground">
          {label}
        </div>
        {unit ? (
          <div className="rounded-full border border-foreground/10 bg-background/70 px-2 py-1 text-[10px] uppercase tracking-[0.3em]">
            {unit}
          </div>
        ) : null}
      </div>
      <div
        className={`mt-3 flex items-center justify-between gap-3 ${
          compact ? "min-h-[56px]" : size === "lg" ? "min-h-[80px]" : "min-h-[64px]"
        }`}
      >
        <button
          type="button"
          className={`flex items-center justify-center rounded-2xl border border-foreground/10 bg-background/70 font-display ${
            compact ? "h-10 w-10 text-xl" : size === "lg" ? "h-14 w-14 text-2xl" : "h-12 w-12 text-2xl"
          }`}
          onClick={() => applyValue(clamped - step)}
        >
          –
        </button>
        <div className="flex-1 text-center">
          <div
            className={`font-display text-foreground ${
              compact ? "text-2xl" : size === "lg" ? "text-4xl" : "text-3xl"
            }`}
          >
            {display}
          </div>
          {helperText ? (
            <div className="mt-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {helperText}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`flex items-center justify-center rounded-2xl border border-foreground/10 bg-background/70 font-display ${
            compact ? "h-10 w-10 text-xl" : size === "lg" ? "h-14 w-14 text-2xl" : "h-12 w-12 text-2xl"
          }`}
          onClick={() => applyValue(clamped + step)}
        >
          +
        </button>
      </div>

      {uniqueQuick.length ? (
        <div
          className={`flex flex-wrap items-center ${compact ? "gap-1.5 mt-1" : "gap-2 mt-2"}`}
        >
          <div
            className={`uppercase tracking-[0.3em] text-muted-foreground ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            Quick set
          </div>
          {uniqueQuick.map((preset) => (
            <Button
              key={`preset-${preset}`}
              size="sm"
              variant="outline"
              className={`rounded-full px-3 text-[11px] ${compact ? "h-5 px-2 text-[10px] leading-none" : ""}`}
              onClick={() => applyValue(preset)}
            >
              {formatValue(preset)}
            </Button>
          ))}
        </div>
      ) : null}

      {quickAdjust.length ? (
        <div
          className={`flex flex-wrap items-center ${compact ? "gap-1.5 mt-1" : "gap-2 mt-1.5"}`}
        >
          <div
            className={`uppercase tracking-[0.3em] text-muted-foreground ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            Quick adjust
          </div>
          {quickAdjust.map((adj) => (
            <Button
              key={adj.label}
              size="sm"
              variant="secondary"
              className={`rounded-full px-3 text-[11px] ${compact ? "h-5 px-2 text-[10px] leading-none" : ""}`}
              onClick={() => applyValue(clamped + adj.delta)}
            >
              {adj.label}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function WeightTrendGraph({
  points,
  units,
}: {
  points: Array<{ dateISO: string; weight: number }>;
  units: Units;
}) {
  if (!points.length) return null;
  const width = 320;
  const height = 140;
  const padding = 14;
  const sorted = [...points].sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
  const weights = sorted.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(1, max - min);
  const toX = (i: number) =>
    padding + (i / Math.max(1, sorted.length - 1)) * (width - padding * 2);
  const toY = (w: number) =>
    padding + (1 - (w - min) / range) * (height - padding * 2);

  const path = sorted
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.weight)}`)
    .join(" ");
  const area = `${path} L ${toX(sorted.length - 1)} ${height - padding} L ${toX(0)} ${
    height - padding
  } Z`;

  return (
    <div className="rounded-2xl border border-foreground/15 bg-card/80 p-3">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Weight trend
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-2 w-full h-32">
        <defs>
          <linearGradient id="weightTrendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,122,24,0.35)" />
            <stop offset="100%" stopColor="rgba(255,122,24,0)" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#weightTrendFill)" />
        <path d={path} fill="none" stroke="rgba(255,122,24,0.9)" strokeWidth="3" />
        {sorted.map((p, i) => (
          <circle key={p.dateISO} cx={toX(i)} cy={toY(p.weight)} r="3.5" fill="#ff7a18" />
        ))}
      </svg>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Range: {min.toFixed(1)}–{max.toFixed(1)} {units}
      </div>
    </div>
  );
}


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
  const showWeight = !templateHint?.timeUnit;
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
                  Smart Trainer suggests: {suggestion.next.weight}
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
                {showWeight ? (
                  <div className="space-y-1">
                    <Input
                      className="w-full"
                      inputMode="decimal"
                      value={s.weight}
                      onChange={(e) => {
                        const v = e.target.value;
                        onChange({
                          ...entry,
                          sets: entry.sets.map((x, xi) =>
                            xi === i ? { ...x, weight: v } : x
                          ),
                        });
                      }}
                      placeholder="0"
                    />
                    <WeightSlider
                      value={s.weight}
                      units={units}
                      step={templateHint?.weightStep}
                      onChange={(v) =>
                        onChange({
                          ...entry,
                          sets: entry.sets.map((x, xi) =>
                            xi === i ? { ...x, weight: v } : x
                          ),
                        })
                      }
                    />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">Timed</div>
                )}
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

            <div className="sm:hidden rounded-2xl border border-foreground/15 bg-gradient-to-br from-card/90 via-card/80 to-card/60 p-3 space-y-2 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
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
                {showWeight ? (
                  <Input
                    inputMode="decimal"
                    value={s.weight}
                    onChange={(e) => {
                      const v = e.target.value;
                      onChange({
                        ...entry,
                        sets: entry.sets.map((x, xi) =>
                          xi === i ? { ...x, weight: v } : x
                        ),
                      });
                    }}
                    placeholder={`Weight (${units})`}
                  />
                ) : (
                  <div className="rounded-xl border border-foreground/10 bg-background/70 p-2 text-xs text-muted-foreground">
                    Timed
                  </div>
                )}
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
              {showWeight ? (
                <div className="mt-1">
                  <WeightSlider
                    value={s.weight}
                    units={units}
                    step={templateHint?.weightStep}
                    onChange={(v) =>
                      onChange({
                        ...entry,
                        sets: entry.sets.map((x, xi) =>
                          xi === i ? { ...x, weight: v } : x
                        ),
                      })
                    }
                  />
                </div>
              ) : null}
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
      {entry.templateHint?.timeUnit ? null : (
        <div className="mt-2">
          <WeightSlider
            value={set.weight}
            units={units}
            step={entry.templateHint?.weightStep}
            onChange={(v) => updateSet(entry, idx, { weight: v })}
          />
        </div>
      )}
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
      {entry.templateHint?.timeUnit ? null : (
        <div className="mt-2">
          <WeightSlider
            value={set.weight}
            units={units}
            step={entry.templateHint?.weightStep}
            onChange={(v) => updateSet(entry, idx, { weight: v })}
          />
        </div>
      )}
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
            <img
              src="/Branding/forge-fitness-icon-1024.png"
              alt=""
              className="absolute left-1/2 top-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 opacity-20 blur-[0.5px] rotate-[-6deg] mix-blend-screen"
            />
            <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 opacity-25 bg-[radial-gradient(closest-side,rgba(255,122,24,0.25),transparent)]" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/20" />
            <div className="absolute inset-0 bg-black/30" />
          </div>
          <div className="relative z-10 w-full max-w-2xl space-y-5 px-5 py-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/60 bg-white/80 px-5 py-2 text-sm font-bold uppercase tracking-[0.35em] text-black shadow-md">
              Forge Fitness • Iron Edition
            </div>
            <div className="text-5xl md:text-6xl font-display uppercase tracking-[0.18em] text-black drop-shadow-[0_8px_22px_rgba(0,0,0,0.55)] leading-[1.02]">
              Built in the forge. Earned in the gym.
            </div>
            <div className="text-base font-bold text-black/90 leading-relaxed max-w-[46ch]">
              Forge Fitness is where strength gets built. Lock in your sessions, track every set,
              and shape a physique that lasts.
            </div>
            <div className="space-y-2 text-base font-bold text-black/90">
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
              className="w-full rounded-2xl font-display uppercase tracking-[0.32em] text-xl py-7"
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
  onComplete: (
    profile: Profile,
    templates: Template[],
    days: Weekday[],
    meta: { splitKey: string; source: "generated" },
    role: UserRole
  ) => void;
}) {
  const [profile, setProfile] = useState<Profile>(() => ({
    ...settings.profile,
    completed: false,
  }));
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<UserRole>(settings.role || "athlete");
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
  const ageValue = clamp(Number(profile.age) || 25, 10, 80);
  const heightValue = parseHeight(profile.height);
  const heightSliderValue =
    settings.units === "kg"
      ? clamp(heightValue || 175, 140, 210)
      : clamp(heightValue || 68, 54, 82);
  const weightValue = Number(profile.weight) || 0;
  const weightSliderValue =
    settings.units === "kg"
      ? clamp(weightValue || 80, 40, 200)
      : clamp(weightValue || 180, 80, 400);
  const genderStyle: GenderStyle =
    profile.gender === "female"
      ? "glute"
      : profile.gender === "male"
      ? "mass"
      : "neutral";
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
    if (!profile.username?.trim()) {
      setError("Pick a username to continue.");
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
    if (!profile.birthdate) {
      setError("Add your birthday.");
      return;
    }
    if (!profile.disclaimerAccepted) {
      setError("Accept the training disclaimer to continue.");
      return;
    }
    if (!profile.gender) {
      setError("Select a gender.");
      return;
    }
    if (!scheduledDays.length) {
      setError("Pick at least one training day.");
      return;
    }

    setIsGenerating(true);
    setError("");
    window.setTimeout(() => {
      const splitKey = buildSplitKey({
        split,
        focus,
        experience: "intermediate",
        daysPerWeek,
        style: genderStyle,
        includeDeload: false,
      });
      const templates = generateProgramTemplates({
        experience: "intermediate",
        split,
        daysPerWeek,
        focus,
        includeCore: true,
        includeCardio: focus === "fat_loss",
        units: settings.units,
        style: genderStyle,
        includeDeload: false,
      });
      onComplete({ ...profile, completed: true }, templates, scheduledDays, {
        splitKey,
        source: "generated",
      }, role);
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
        setError("Pick a username to continue.");
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
      if (!profile.birthdate) {
        setError("Add your birthday.");
        return;
      }
      if (!profile.disclaimerAccepted) {
        setError("Accept the training disclaimer to continue.");
        return;
      }
    }

    if (step === 2 && !scheduledDays.length) {
      setError("Pick at least one training day.");
      return;
    }

    setError("");
    if (step >= 3) {
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
            <div className="flex flex-wrap items-center gap-3">
              <img
                src="/Branding/forge-fitness-icon-1024.png"
                alt="Forge Fitness icon"
                className="h-9 w-9 rounded-xl border border-primary/30 bg-black"
              />
              <img
                src="/Branding/forge-fitness-logo-transparent.png"
                alt="Forge Fitness"
                className="h-7 w-auto"
              />
            </div>
            <CardTitle className="text-2xl font-display uppercase tracking-[0.3em]">
              Enter The App
            </CardTitle>
            <CardDescription>
              Build your profile so Forge Fitness can dial in your goals and tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 min-h-[520px]">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground uppercase tracking-[0.3em]">
                <span>Step {step + 1} of 4</span>
                <span>{Math.round(((step + 1) / 4) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${((step + 1) / 4) * 100}%` }}
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
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Username</Label>
                    <Input
                      value={profile.username || ""}
                      onChange={(e) =>
                        setProfile((p) => ({
                          ...p,
                          username: sanitizeUsername(e.target.value),
                        }))
                      }
                      placeholder="forgeathlete"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Lowercase letters, numbers, dot, underscore. Used for friends + coaches.
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Gender</Label>
                    <Select
                      value={profile.gender || ""}
                      onValueChange={(v) => setProfile((p) => ({ ...p, gender: v as Profile["gender"] }))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Age</Label>
                    <Input
                      inputMode="numeric"
                      value={profile.age}
                      onChange={(e) => setProfile((p) => ({ ...p, age: e.target.value }))}
                      placeholder="e.g. 24"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>10</span>
                        <span>{ageValue}</span>
                        <span>80</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={80}
                        step={1}
                        value={ageValue}
                        onChange={(e) =>
                          setProfile((p) => ({ ...p, age: e.target.value }))
                        }
                        className="w-full accent-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Birthday</Label>
                    <Input
                      type="date"
                      value={profile.birthdate}
                      onChange={(e) => setProfile((p) => ({ ...p, birthdate: e.target.value }))}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Used for birthday rewards and training milestones.
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{heightLabel}</Label>
                    <MetricStepper
                      label="Height"
                      value={heightSliderValue}
                      min={settings.units === "kg" ? 140 : 54}
                      max={settings.units === "kg" ? 210 : 82}
                      step={1}
                      displayValue={formatHeightValue(heightSliderValue, settings.units)}
                      onChange={(v) =>
                        setProfile((p) => ({
                          ...p,
                          height: String(v),
                        }))
                      }
                      helperText="Tap +/− to adjust"
                      size="md"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{weightLabel}</Label>
                    <MetricStepper
                      label="Weight"
                      value={weightSliderValue}
                      min={settings.units === "kg" ? 40 : 80}
                      max={settings.units === "kg" ? 200 : 400}
                      step={1}
                      unit={settings.units}
                      onChange={(v) =>
                        setProfile((p) => ({
                          ...p,
                          weight: String(v),
                        }))
                      }
                      helperText="Tap +/− to adjust"
                      size="md"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2">
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                          Training disclaimer
                        </div>
                        <div className="text-xs text-muted-foreground">
                          This app provides fitness guidance only. Always train safely and consult a professional if
                          needed.
                        </div>
                      </div>
                      <Switch
                        checked={!!profile.disclaimerAccepted}
                        onCheckedChange={(v) =>
                          setProfile((p) => ({ ...p, disclaimerAccepted: v }))
                        }
                      />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      By continuing, you confirm you understand this is not medical advice.
                    </div>
                  </div>
                </div>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="rounded-xl border p-3 space-y-3">
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Step 2 • Role
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        key: "athlete",
                        title: "Athlete",
                        desc: "Train, track, and follow programs built for you.",
                      },
                      {
                        key: "smart_trainer",
                        title: "Smart Trainer",
                        desc: "App-powered guidance, cues, and adaptive suggestions.",
                      },
                      {
                        key: "coach",
                        title: "Coach",
                        desc: "Manage clients, templates, and progress insights.",
                      },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setRole(item.key as UserRole)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          role === item.key
                            ? "border-primary/60 bg-primary/10"
                            : "hover:bg-muted/40"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {item.key === "coach"
                            ? "Coach mode"
                            : item.key === "smart_trainer"
                            ? "Smart Trainer mode"
                            : "Athlete mode"}
                        </div>
                        <div className="mt-2 text-lg font-display uppercase">
                          {item.title}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="rounded-xl border p-3 space-y-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Step 3 • Training goal
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

              {step === 3 ? (
                <div className="rounded-xl border p-3 space-y-3">
                <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Step 4 • Training type
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
                            variant="outline"
                            className={`rounded-full text-xs uppercase tracking-[0.25em] ${
                              active
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background/70 text-foreground border-border"
                            }`}
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
                ) : step === 3 ? (
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
  authEmail,
  syncStatus,
  lastSyncAt,
  syncError,
  onSyncNow,
  onSignOut,
  onChange,
  onResetRequest,
  onDeleteAccountRequest,
}: {
  settings: Settings;
  templates: Template[];
  authEmail?: string;
  syncStatus?: "idle" | "syncing" | "success" | "error";
  lastSyncAt?: string | null;
  syncError?: string;
  onSyncNow?: () => void;
  onSignOut?: () => void;
  onChange: (s: Settings) => void;
  onResetRequest: () => void;
  onDeleteAccountRequest: () => void;
}) {
  const heightLabel = settings.units === "kg" ? "Height (cm)" : "Height";
  const weightLabel = `Bodyweight (${settings.units})`;
  const parseHeight = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  };
  const ageValue = clamp(Number(settings.profile.age) || 25, 10, 80);
  const heightValue = parseHeight(settings.profile.height);
  const heightSliderValue =
    settings.units === "kg"
      ? clamp(heightValue || 175, 140, 210)
      : clamp(heightValue || 68, 54, 82);
  const weightValue = Number(settings.profile.weight) || 0;
  const weightSliderValue =
    settings.units === "kg"
      ? clamp(weightValue || 80, 40, 200)
      : clamp(weightValue || 180, 80, 400);
  const updateProfile = (partial: Partial<Profile>) => {
    const nextProfile = { ...settings.profile, ...partial };
    const completed =
      nextProfile.completed ||
              (!!nextProfile.name.trim() &&
                !!nextProfile.username?.trim() &&
                Number(nextProfile.age) > 0 &&
                Number(nextProfile.height) > 0 &&
                Number(nextProfile.weight) > 0 &&
                !!nextProfile.birthdate &&
                !!nextProfile.disclaimerAccepted &&
                !!nextProfile.gender);
    onChange({ ...settings, profile: { ...nextProfile, completed } });
  };

  return (
    <div className="space-y-3">
      <div className="font-medium">Settings</div>

      <div className="rounded-xl border p-3 space-y-5">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Mode</div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-foreground/10 bg-background/60 px-3 py-2">
            <div>
              <div className="font-medium text-sm">Simple mode</div>
              <div className="text-xs text-muted-foreground">
                Minimal dashboard with just today&apos;s workout and weekly overview.
              </div>
            </div>
            <Switch
              checked={!!settings.simpleMode}
              onCheckedChange={(v) => onChange({ ...settings, simpleMode: v })}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Profile</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Username</Label>
              <Input
                value={settings.profile.username || ""}
                onChange={(e) => updateProfile({ username: sanitizeUsername(e.target.value) })}
                placeholder="forgeathlete"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <div className="text-xs text-muted-foreground">
                Used for friends search and your social profile.
              </div>
            </div>
            <div className="space-y-1">
              <Label>Name</Label>
              <Input
                value={settings.profile.name}
                onChange={(e) => updateProfile({ name: e.target.value })}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1">
              <Label>Gender</Label>
              <Select
                value={settings.profile.gender || ""}
                onValueChange={(v) => updateProfile({ gender: v as Profile["gender"] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                inputMode="numeric"
                value={settings.profile.age}
                onChange={(e) => updateProfile({ age: e.target.value })}
                placeholder="e.g. 24"
              />
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>10</span>
                  <span>{ageValue}</span>
                  <span>80</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  step={1}
                  value={ageValue}
                  onChange={(e) => updateProfile({ age: e.target.value })}
                  className="w-full accent-primary"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Birthday</Label>
              <Input
                type="date"
                value={settings.profile.birthdate}
                onChange={(e) => updateProfile({ birthdate: e.target.value })}
              />
              <div className="text-[10px] text-muted-foreground">
                Unlocks birthday rewards inside Forge Fitness.
              </div>
            </div>
            <div className="space-y-1">
              <Label>{heightLabel}</Label>
              <MetricStepper
                label="Height"
                value={heightSliderValue}
                min={settings.units === "kg" ? 140 : 54}
                max={settings.units === "kg" ? 210 : 82}
                step={1}
                displayValue={formatHeightValue(heightSliderValue, settings.units)}
                onChange={(v) => updateProfile({ height: String(v) })}
                helperText="Tap +/− to adjust"
                size="md"
              />
            </div>
            <div className="space-y-1">
              <Label>{weightLabel}</Label>
              <MetricStepper
                label="Weight"
                value={weightSliderValue}
                min={settings.units === "kg" ? 40 : 80}
                max={settings.units === "kg" ? 200 : 400}
                step={1}
                unit={settings.units}
                onChange={(v) => updateProfile({ weight: String(v) })}
                helperText="Tap +/− to adjust"
                size="md"
              />
            </div>
          </div>
        </div>

        <Separator />

        {authEmail && onSignOut ? (
          <>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Account</div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Signed in</div>
                  <div className="text-xs text-muted-foreground">{authEmail}</div>
                </div>
                <Button variant="outline" className="rounded-xl" onClick={onSignOut}>
                  Sign out
                </Button>
              </div>
            </div>

            <Separator />
          </>
        ) : null}

        {onSyncNow ? (
          <>
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sync</div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Cloud sync</div>
                  <div className="text-xs text-muted-foreground">
                    {syncStatus === "syncing"
                      ? "Syncing now..."
                      : syncStatus === "error"
                      ? syncError || "Sync failed"
                      : lastSyncAt
                      ? `Last sync ${formatDate(lastSyncAt)}`
                      : "Ready to sync"}
                  </div>
                </div>
                <Button variant="outline" className="rounded-xl" onClick={onSyncNow}>
                  Sync now
                </Button>
              </div>
            </div>

            <Separator />
          </>
        ) : null}

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Role</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Account type</div>
              <div className="text-xs text-muted-foreground">
                Smart Trainer is the in-app guidance. Coaches manage clients and programming.
              </div>
            </div>
            <div className="inline-flex rounded-xl border bg-background p-1">
              <button
                type="button"
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  settings.role === "athlete" ? "bg-muted" : "hover:bg-muted/60"
                }`}
                onClick={() => onChange({ ...settings, role: "athlete" })}
              >
                Athlete
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  settings.role === "smart_trainer" ? "bg-muted" : "hover:bg-muted/60"
                }`}
                onClick={() => onChange({ ...settings, role: "smart_trainer" })}
              >
                Smart Trainer
              </button>
              <button
                type="button"
                className={`px-3 py-1 text-sm rounded-lg transition ${
                  settings.role === "coach" ? "bg-muted" : "hover:bg-muted/60"
                }`}
                onClick={() => onChange({ ...settings, role: "coach" })}
              >
                Coach
              </button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Sharing</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { key: "shareWorkouts", label: "Share workouts" },
              { key: "sharePRs", label: "Share PRs" },
              { key: "shareWeighIns", label: "Share weigh-ins" },
              { key: "shareTrophies", label: "Share trophies" },
              { key: "shareGoals", label: "Share goals" },
              { key: "shareStreaks", label: "Share streaks" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border p-2">
                <div className="text-sm">{item.label}</div>
                <Switch
                  checked={!!(settings.profile as any)[item.key]}
                  onCheckedChange={(v) =>
                    updateProfile({ [item.key]: v } as Partial<Profile>)
                  }
                />
              </div>
            ))}
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
          {settings.role !== "coach" ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium text-sm">Smart Trainer guidance</div>
                <div className="text-xs text-muted-foreground">
                  Toggle app-powered cues and adaptive suggestions.
                </div>
              </div>
              <Switch
                checked={settings.role === "smart_trainer"}
                onCheckedChange={(v) =>
                  onChange({ ...settings, role: v ? "smart_trainer" : "athlete" })
                }
              />
            </div>
          ) : (
            <div className="rounded-xl border p-2 text-xs text-muted-foreground">
              Coach tools enabled. Athletes can still connect to you via your email.
            </div>
          )}
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
          <div className="text-xs text-muted-foreground">
            Deleting your account removes your cloud data and signs you out.
          </div>
          <Button
            variant="destructive"
            className="w-full rounded-xl"
            onClick={onDeleteAccountRequest}
          >
            <Trash2 className="h-4 w-4" />
            Delete account
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
  gender,
  savedSplits,
  onGenerate,
  onAddCoachSplit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  units: Units;
  gender?: Profile["gender"];
  savedSplits: Record<string, Template[]>;
  onGenerate: (payload: {
    templates: Template[];
    days: Weekday[];
    splitKey: string;
    source: "generated" | "custom_split";
  }) => void;
  onAddCoachSplit: (templates: Template[], days: Weekday[]) => void;
}) {
  const [experience, setExperience] = useState<ExperienceLevel>("beginner");
  const [split, setSplit] = useState<SplitType>("full_body");
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [focus, setFocus] = useState<FocusType>("general");
  const [includeCore, setIncludeCore] = useState(true);
  const [includeCardio, setIncludeCardio] = useState(false);
  const [includeDeload, setIncludeDeload] = useState(false);
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
  const genderStyle: GenderStyle =
    gender === "female" ? "glute" : gender === "male" ? "mass" : "neutral";

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
    setIncludeDeload(false);
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

  const splitKey = buildSplitKey({
    split,
    focus,
    experience,
    daysPerWeek,
    style: genderStyle,
    includeDeload,
  });
  const savedTemplates = savedSplits?.[splitKey];

  const preview = useMemo(() => {
    if (savedTemplates?.length) return savedTemplates;
    return generateProgramTemplates({
      experience,
      split,
      daysPerWeek,
      focus,
      includeCore,
      includeCardio,
      units,
      style: genderStyle,
      includeDeload,
    });
  }, [
    experience,
    split,
    daysPerWeek,
    focus,
    includeCore,
    includeCardio,
    units,
    genderStyle,
    includeDeload,
    savedTemplates,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle>Generate a workout plan</DialogTitle>
          <DialogDescription>
            Pick your experience and preferred split. Forge Fitness will create templates you can start logging immediately.
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
                {WEEKDAYS.map((day) => {
                  const active = scheduledDays.includes(day.key);
                  return (
                    <Button
                      key={day.key}
                      type="button"
                      size="sm"
                      variant="outline"
                      className={`rounded-xl ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background/70 text-foreground border-border"
                      }`}
                      onClick={() => toggleDay(scheduledDays, setScheduledDays, day.key)}
                    >
                      {day.short}
                    </Button>
                  );
                })}
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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">Include deload week</div>
                  <div className="text-xs text-muted-foreground">
                    Adds lighter deload templates for recovery.
                  </div>
                </div>
                <Switch checked={includeDeload} onCheckedChange={setIncludeDeload} />
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
            {savedTemplates?.length ? (
              <div className="text-xs text-muted-foreground">
                Saved split detected. We’ll reuse your last version.
              </div>
            ) : null}
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
              const templates =
                savedTemplates?.length
                  ? savedTemplates
                  : generateProgramTemplates({
                      experience,
                      split,
                      daysPerWeek,
                      focus,
                      includeCore,
                      includeCardio,
                      units,
                      style: genderStyle,
                      includeDeload,
                    });
              if (!templates.length) return;
              onGenerate({
                templates,
                days: scheduledDays,
                splitKey,
                source: "generated",
              });
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
  splitWizard,
  onCloseSplitWizard,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  selectedTemplateId: string;
  onSelectTemplate: (id: string) => void;
  splitWizard: null | { title: string; templateIds: string[] };
  onCloseSplitWizard: () => void;
}) {
  const [selectedId, setSelectedId] = useState(selectedTemplateId);
  const [exporting, setExporting] = useState<Template | null>(null);
  const [importText, setImportText] = useState("");
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [exerciseGroup, setExerciseGroup] = useState<
    "all" | "arms" | "chest" | "shoulders" | "back" | "legs" | "core" | "cardio"
  >("all");

  const exerciseGroups = [
    { key: "all", label: "All", test: (_: string) => true },
    { key: "arms", label: "Arms", test: (n: string) => /curl|bicep|tricep|pushdown|extension|skull|forearm/.test(n) },
    { key: "chest", label: "Chest", test: (n: string) => /bench|press|fly|pec|chest/.test(n) },
    { key: "shoulders", label: "Shoulders", test: (n: string) => /shoulder|delt|raise|overhead|upright/.test(n) },
    { key: "back", label: "Back", test: (n: string) => /row|pull|pulldown|lat|rear delt|trap/.test(n) },
    { key: "legs", label: "Legs", test: (n: string) => /squat|deadlift|leg|glute|ham|calf|lunge|rdl|curl/.test(n) },
    { key: "core", label: "Core", test: (n: string) => /plank|crunch|twist|raise|ab/.test(n) },
    { key: "cardio", label: "Cardio", test: (n: string) => /sled|bike|rower|run|walk|stair|jump/.test(n) },
  ] as const;

  const exerciseMap = useMemo(() => {
    return new Map(COMMON_EXERCISES.map((ex) => [ex.name, ex]));
  }, []);

  const filteredExercises = useMemo(() => {
    const q = exerciseSearch.trim().toLowerCase();
    const group = exerciseGroups.find((g) => g.key === exerciseGroup) || exerciseGroups[0];
    return COMMON_EXERCISES.filter((ex) => {
      const name = ex.name.toLowerCase();
      if (!group.test(name)) return false;
      if (!q) return true;
      return name.includes(q);
    });
  }, [exerciseSearch, exerciseGroup, exerciseGroups]);

  const favoriteNames = state.settings.profile.favoriteExercises || [];
  const recentNames = state.settings.profile.recentExercises || [];
  const favorites = favoriteNames
    .map((name) => exerciseMap.get(name))
    .filter((ex): ex is Omit<TemplateExercise, "id"> => !!ex)
    .filter((ex) => filteredExercises.some((f) => f.name === ex.name));
  const recents = recentNames
    .map((name) => exerciseMap.get(name))
    .filter((ex): ex is Omit<TemplateExercise, "id"> => !!ex)
    .filter((ex) => filteredExercises.some((f) => f.name === ex.name));
  const excluded = new Set([...favoriteNames, ...recentNames]);
  const topMatches = filteredExercises.filter((ex) => !excluded.has(ex.name));

  useEffect(() => setSelectedId(selectedTemplateId), [selectedTemplateId, open]);

  const visibleTemplates = useMemo(() => {
    if (!splitWizard) return state.templates;
    const ids = new Set(splitWizard.templateIds);
    return state.templates.filter((t) => ids.has(t.id));
  }, [state.templates, splitWizard]);

  useEffect(() => {
    if (!open || !splitWizard) return;
    const firstId = splitWizard.templateIds[0];
    if (firstId && !splitWizard.templateIds.includes(selectedId)) {
      setSelectedId(firstId);
      onSelectTemplate(firstId);
    }
  }, [open, splitWizard, selectedId, onSelectTemplate]);

  const selected = useMemo(() => {
    return visibleTemplates.find((t) => t.id === selectedId) || visibleTemplates[0] || null;
  }, [visibleTemplates, selectedId]);

  const wizardIndex = splitWizard
    ? splitWizard.templateIds.indexOf(selectedId)
    : -1;
  const wizardTotal = splitWizard?.templateIds.length || 0;
  const goWizard = (dir: number) => {
    if (!splitWizard) return;
    const nextId = splitWizard.templateIds[wizardIndex + dir];
    if (!nextId) return;
    setSelectedId(nextId);
    onSelectTemplate(nextId);
  };

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
      source: "custom",
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

  const addPresetExercise = (preset: Omit<TemplateExercise, "id">) => {
    if (!selected) return;
    updateSelected({
      ...selected,
      exercises: [...selected.exercises, { id: uid(), ...preset }],
    });
    setState((p) => {
      const prev = p.settings.profile.recentExercises || [];
      const next = [preset.name, ...prev.filter((x) => x !== preset.name)].slice(0, 8);
      return {
        ...p,
        settings: {
          ...p.settings,
          profile: { ...p.settings.profile, recentExercises: next },
        },
      };
    });
  };

  const toggleFavoriteExercise = (name: string) => {
    setState((p) => {
      const prev = p.settings.profile.favoriteExercises || [];
      const next = prev.includes(name)
        ? prev.filter((x) => x !== name)
        : [name, ...prev].slice(0, 16);
      return {
        ...p,
        settings: {
          ...p.settings,
          profile: { ...p.settings.profile, favoriteExercises: next },
        },
      };
    });
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

  const role: UserRole = normalizeRole((state.settings as any)?.role);
  const isCoach = role === "coach";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && splitWizard) onCloseSplitWizard();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          {splitWizard ? (
            <div className="rounded-2xl border bg-background/70 p-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    Custom split builder
                  </div>
                  <div className="text-lg font-display">
                    {splitWizard.title} • Day {wizardIndex + 1}/{wizardTotal}
                  </div>
                  {selected ? (
                    <div className="text-xs text-muted-foreground mt-1">{selected.name}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => goWizard(-1)}
                    disabled={wizardIndex <= 0}
                  >
                    Previous day
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => goWizard(1)}
                    disabled={wizardIndex < 0 || wizardIndex >= wizardTotal - 1}
                  >
                    Next day
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    onClick={() => {
                      onCloseSplitWizard();
                      onOpenChange(false);
                    }}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
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
                  className={`px-3 py-1 text-sm rounded-lg transition ${
                    role === "smart_trainer" ? "bg-muted" : "hover:bg-muted/60"
                  }`}
                  onClick={() =>
                    setState((p) => ({
                      ...p,
                      settings: { ...(p.settings as any), role: "smart_trainer" },
                    }))
                  }
                >
                  Smart Trainer
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
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={addTemplate}
                disabled={!!splitWizard}
              >
                <Plus className="h-4 w-4 mr-2" /> Add
              </Button>
            </div>
            {visibleTemplates.length === 0 ? (
              <div className="rounded-xl border p-3 text-sm text-muted-foreground">
                No templates yet. Add one to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {visibleTemplates.map((t) => (
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

                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        value={exerciseSearch}
                        onChange={(e) => setExerciseSearch(e.target.value)}
                        placeholder="Search the exercise library..."
                        className="sm:w-[260px]"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        {exerciseGroups.map((group) => (
                          <button
                            key={group.key}
                            type="button"
                            onClick={() => setExerciseGroup(group.key)}
                            className={`rounded-full border px-2 py-1 text-[11px] uppercase tracking-[0.2em] transition ${
                              exerciseGroup === group.key ? "bg-muted" : "hover:bg-muted/60"
                            }`}
                          >
                            {group.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {favorites.length ? (
                        <>
                          <div className="w-full text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                            Favorites
                          </div>
                          {favorites.map((item) => (
                            <div key={`fav-${item.name}`} className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => addPresetExercise(item)}
                              >
                                {item.name}
                              </Button>
                              <button
                                type="button"
                                className="rounded-full border p-1 hover:bg-muted/60"
                                onClick={() => toggleFavoriteExercise(item.name)}
                              >
                                <Star className="h-3 w-3 text-primary fill-primary" />
                              </button>
                            </div>
                          ))}
                        </>
                      ) : null}

                      {recents.length ? (
                        <>
                          <div className="w-full text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                            Recent
                          </div>
                          {recents.map((item) => (
                            <div key={`recent-${item.name}`} className="flex items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => addPresetExercise(item)}
                              >
                                {item.name}
                              </Button>
                              <button
                                type="button"
                                className="rounded-full border p-1 hover:bg-muted/60"
                                onClick={() => toggleFavoriteExercise(item.name)}
                              >
                                <Star
                                  className={`h-3 w-3 ${
                                    favoriteNames.includes(item.name)
                                      ? "text-primary fill-primary"
                                      : "text-muted-foreground"
                                  }`}
                                />
                              </button>
                            </div>
                          ))}
                        </>
                      ) : null}

                      <div className="w-full text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        Top matches
                      </div>
                      {topMatches.slice(0, 8).map((item) => (
                        <div key={item.name} className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => addPresetExercise(item)}
                          >
                            {item.name}
                          </Button>
                          <button
                            type="button"
                            className="rounded-full border p-1 hover:bg-muted/60"
                            onClick={() => toggleFavoriteExercise(item.name)}
                          >
                            <Star
                              className={`h-3 w-3 ${
                                favoriteNames.includes(item.name)
                                  ? "text-primary fill-primary"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                      {filteredExercises.length === 0 ? (
                        <div className="text-xs text-muted-foreground">
                          No matches. Try a different filter.
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(v) => {
                          const preset = COMMON_EXERCISES.find((x) => x.name === v);
                          if (!preset) return;
                          addPresetExercise(preset);
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[260px]">
                          <SelectValue placeholder="Browse all exercises" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredExercises.map((item) => (
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

function AuthScreen({
  mode,
  email,
  password,
  error,
  loading,
  googleLoading,
  onModeChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onGoogle,
}: {
  mode: "signin" | "signup";
  email: string;
  password: string;
  error: string;
  loading: boolean;
  googleLoading: boolean;
  onModeChange: (v: "signin" | "signup") => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onSubmit: () => void;
  onGoogle: () => void;
}) {
  return (
    <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-4 py-10">
      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute -inset-8 rounded-[36px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--glow-a),transparent)] opacity-80" />
        <div className="pointer-events-none absolute -inset-12 opacity-70">
          <div className="absolute -top-16 -left-16 h-60 w-60 rounded-full bg-[radial-gradient(circle,var(--title-to),transparent)] blur-[90px]" />
          <div className="absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,var(--title-via),transparent)] blur-[100px]" />
          <div className="absolute inset-0 bg-[radial-gradient(60%_80%_at_10%_0%,rgba(255,255,255,0.12),transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(0,0,0,0.25)_55%,transparent_100%)]" />
        </div>
        <div className="relative rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))] p-[1px] shadow-[0_28px_70px_rgba(0,0,0,0.35)]">
          <Card className="relative w-full rounded-[28px] border border-border/70 bg-card/90 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-[0.6rem] uppercase tracking-[0.5em] text-muted-foreground">
                Forge Fitness
              </div>
              <div className="rounded-full border border-border/70 bg-muted/50 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                {mode === "signup" ? "New" : "Secure"}
              </div>
            </div>
            <CardTitle className="text-2xl font-display uppercase tracking-[0.25em]">
              {mode === "signup" ? "Create account" : "Welcome back"}
            </CardTitle>
            <CardDescription>
              {mode === "signup"
                ? "Sync your workouts across devices and unlock coaching tools."
                : "Sign in to continue your training plan."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Email
              </Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                placeholder="you@example.com"
                className="h-11 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Password
              </Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl"
              />
            </div>
            {error ? (
              <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {error}
              </div>
            ) : null}
            <Button className="w-full rounded-xl h-11" onClick={onSubmit} disabled={loading}>
              {loading ? "Working..." : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border/70" />
              or
              <span className="h-px flex-1 bg-border/70" />
            </div>
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={onGoogle}
              disabled={googleLoading}
            >
              {googleLoading ? "Connecting..." : "Continue with Google"}
            </Button>
            <div className="text-xs text-muted-foreground text-center">
              {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => onModeChange(mode === "signup" ? "signin" : "signup")}
              >
                {mode === "signup" ? "Sign in" : "Sign up"}
              </button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
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

const EXERCISE_ALIASES: Record<string, string> = {
  "skull crusher": "skull crushers",
  "dumbbell romanian deadlift": "romanian deadlift",
  "weighted pull-up": "pull-up",
  "calf raises": "calf raise",
  "hip thrusts": "hip thrust",
  "cable kickbacks": "cable kickback",
  "rope pushdowns": "rope pushdown",
};

const findFallbackExercise = (name: string, lib: Array<Omit<TemplateExercise, "id">>) => {
  const n = name.toLowerCase();
  const has = (keyword: RegExp) => keyword.test(n);
  const pick = (candidates: string[]) =>
    lib.find((x) => candidates.includes(x.name.toLowerCase()));

  if (has(/pull-?up/)) return pick(["lat pulldown", "assisted pull-up", "pull-up"]);
  if (has(/pulldown/)) return pick(["lat pulldown"]);
  if (has(/row/)) return pick(["chest supported row", "seated cable row", "barbell row"]);
  if (has(/bench|press/)) return pick(["dumbbell bench press", "machine chest press", "incline dumbbell press"]);
  if (has(/overhead press|shoulder press/)) return pick(["dumbbell shoulder press", "overhead press"]);
  if (has(/fly/)) return pick(["cable fly", "incline cable fly", "upper cable fly"]);
  if (has(/deadlift|rdl/)) return pick(["romanian deadlift", "dumbbell romanian deadlift"]);
  if (has(/squat/)) return pick(["back squat", "front squat", "goblet squat"]);
  if (has(/leg extension/)) return pick(["leg extension"]);
  if (has(/leg curl|hamstring/)) return pick(["leg curl", "seated hamstring curl"]);
  if (has(/calf/)) return pick(["calf raise"]);
  if (has(/tricep/)) return pick(["triceps pushdown", "skull crushers"]);
  if (has(/bicep|curl/)) return pick(["dumbbell curl", "hammer curl"]);
  if (has(/glute/)) return pick(["hip thrust", "glute bridge", "hip abduction"]);

  return undefined;
};

function pickByName(names: string[]) {
  const lib = COMMON_EXERCISES.map((x) => ({ ...x }));
  const out: Array<Omit<TemplateExercise, "id">> = [];
  for (const n of names) {
    const target = n.toLowerCase();
  const alias = EXERCISE_ALIASES[target];
    const found =
      lib.find((x) => x.name.toLowerCase() === target) ||
      (alias ? lib.find((x) => x.name.toLowerCase() === alias) : undefined);
    if (found) {
      out.push(found);
      continue;
    }
    const fallback = findFallbackExercise(n, lib);
    if (fallback) out.push(fallback);
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
    /squat|deadlift|bench press|overhead press|row|pull-up|pulldown|hip thrust/i.test(ex.name);

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

function applyGenderBias(
  exerciseNames: string[],
  style: GenderStyle,
  dayName: string
): string[] {
  if (style === "neutral") return exerciseNames;
  const list = [...exerciseNames];
  const lowerDay = /lower|leg|glute|ham|quad/i.test(dayName);
  const upperDay = /upper|push|pull|chest|back|arm|shoulder/i.test(dayName);
  const fullDay = /full body/i.test(dayName);
  const has = (name: string) =>
    list.some((x) => x.toLowerCase() === name.toLowerCase());
  const replaceOne = (from: string[], to: string) => {
    if (has(to)) return true;
    for (const item of from) {
      const idx = list.findIndex((x) => x.toLowerCase() === item.toLowerCase());
      if (idx >= 0) {
        list[idx] = to;
        return true;
      }
    }
    return false;
  };

  if (style === "glute" && (lowerDay || fullDay)) {
    replaceOne(
      ["Leg Extension", "Leg Press", "Calf Raise", "Front Squat"],
      "Hip Thrust"
    );
    replaceOne(
      ["Leg Extension", "Calf Raise", "Leg Press"],
      "Bulgarian Split Squat"
    );
  }

  if (style === "mass" && (upperDay || fullDay)) {
    if (!has("Dumbbell Curl") && !has("Hammer Curl")) {
      replaceOne(["Face Pull", "Lateral Raise"], "Dumbbell Curl");
    }
    if (!has("Triceps Pushdown")) {
      replaceOne(["Face Pull", "Lateral Raise"], "Triceps Pushdown");
    }
    if (has("Bench Press") && !has("Incline Bench Press")) {
      replaceOne(["Machine Chest Press", "Dumbbell Bench Press"], "Incline Bench Press");
    }
  }

  return list;
}

function getSimilarExercises(name: string) {
  const n = name.toLowerCase();
  const matches = COMMON_EXERCISES.filter((ex) => {
    const exName = ex.name.toLowerCase();
    if (n.includes("bench") || n.includes("press")) {
      return /bench|press|fly|dips/.test(exName);
    }
    if (n.includes("row") || n.includes("pull") || n.includes("lat")) {
      return /row|pull|pulldown/.test(exName);
    }
    if (n.includes("squat") || n.includes("leg") || n.includes("glute") || n.includes("ham")) {
      return /squat|leg|glute|ham|calf/.test(exName);
    }
    if (n.includes("curl") || n.includes("bicep")) {
      return /curl/.test(exName);
    }
    if (n.includes("tricep")) {
      return /tricep|skull|pushdown/.test(exName);
    }
    if (n.includes("shoulder") || n.includes("delt") || n.includes("raise")) {
      return /shoulder|delt|raise|press/.test(exName);
    }
    return false;
  });
  const unique = new Map(matches.map((m) => [m.name, m]));
  return Array.from(unique.values()).slice(0, 10);
}

function buildDay(
  name: string,
  exerciseNames: string[],
  focus: FocusType,
  experience: ExperienceLevel,
  style: GenderStyle
): Template {
  const biasedNames = applyGenderBias(exerciseNames, style, name);
  const picked = pickByName(biasedNames)
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

function applyDeloadTemplate(template: Template): Template {
  return {
    ...template,
    id: uid(),
    name: `Deload • ${template.name}`,
    exercises: (template.exercises || []).map((ex) => ({
      ...ex,
      id: uid(),
      defaultSets: Math.max(1, Math.round((ex.defaultSets || 1) * 0.6)),
      restSec: Math.max(30, Math.round((ex.restSec || 60) * 0.8)),
      repRange: ex.timeUnit
        ? ex.repRange
        : {
            min: Math.max(4, Math.round(ex.repRange.min * 0.8)),
            max: Math.max(6, Math.round(ex.repRange.max * 0.8)),
          },
    })),
  };
}

function generateProgramTemplates(opts: {
  experience: ExperienceLevel;
  split: SplitType;
  daysPerWeek: number;
  focus: FocusType;
  includeCore: boolean;
  includeCardio: boolean;
  units: Units;
  style?: GenderStyle;
  includeDeload?: boolean;
}): Template[] {
  const {
    experience,
    split,
    daysPerWeek,
    focus,
    includeCore,
    includeCardio,
    style = "neutral",
    includeDeload = false,
  } = opts;

  // Notes: we keep templates simple + editable. This is designed to be welcoming,
  // not “maximalist bodybuilding spreadsheets.”

  const coreFinishers = () => {
    if (!includeCore) return [];
    const base = pickByName(["Plank", "Cable Crunch"]);
    const out: TemplateExercise[] = [];
    const plank = base.find((ex) => ex.name.toLowerCase() === "plank");
    if (plank) {
      out.push({
        id: uid(),
        ...plank,
        name: "Optional Core • Plank (sec)",
        defaultSets: 3,
        repRange: { min: 30, max: 60 },
        restSec: 30,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      });
    }
    const crunch = base.find((ex) => ex.name.toLowerCase() === "cable crunch");
    if (crunch) {
      out.push({
        id: uid(),
        ...crunch,
        name: "Optional Core • Cable Crunch (sec)",
        defaultSets: 3,
        repRange: { min: 30, max: 45 },
        restSec: 30,
        weightStep: 0,
        autoProgress: false,
        timeUnit: "seconds",
      });
    }
    return out;
  };

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
      ? "Optional Cardio Intervals (min)"
      : experience === "advanced"
      ? "Optional Cardio (post-workout)"
      : "Optional Cardio (min)";

  const maybeAddCardioFinisher = (templates: Template[]) => {
    if (!effectiveCardio) return templates;
    return appendCardioFinisher(templates, cardioLabel, cardioRange);
  };

  const maybeAddCoreFinishers = (templates: Template[]) => {
    const core = coreFinishers();
    if (!core.length) return templates;
    return templates.map((t) => ({
      ...t,
      exercises: [...(t.exercises || []), ...core.map((ex) => ({ ...ex, id: uid() }))],
    }));
  };

  const finalizeTemplates = (templates: Template[]) => {
    const withFinishers = maybeAddCoreFinishers(maybeAddCardioFinisher(templates));
    if (!includeDeload) return withFinishers;
    const deload = withFinishers.map((t) => applyDeloadTemplate(t));
    return [...withFinishers, ...deload];
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
          pick[i],
          focus,
          experience,
          style
        )
      );
    }
    return finalizeTemplates(days);
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

    return finalizeTemplates(sequence.map((label, i) =>
      label === "Upper"
        ? buildDay(
          `Upper ${Math.ceil((i + 1) / 2)}`,
          upper,
          focus,
          experience,
          style
          )
        : buildDay(
            `Lower ${Math.ceil((i + 1) / 2)}`,
            lower,
            focus,
            experience,
            style
          )
    ));
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
      buildDay("Upper • Power", upPow, "strength", experience, style),
      buildDay("Lower • Power", loPow, "strength", experience, style),
      buildDay("Upper • Hypertrophy", upHyp, "hypertrophy", experience, style),
      buildDay("Lower • Hypertrophy", loHyp, "hypertrophy", experience, style),
    ];

    return finalizeTemplates(phulDays.slice(0, d));
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
      if (label === "Chest") return buildDay("Chest", chest, focus, experience, style);
      if (label === "Back") return buildDay("Back", back, focus, experience, style);
      if (label === "Legs") return buildDay("Legs", legs, focus, experience, style);
      if (label === "Shoulders") return buildDay("Shoulders", shoulders, focus, experience, style);
      return buildDay("Arms", arms, focus, experience, style);
    });

    return finalizeTemplates(out);
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

  return maybeAddCoreFinishers(maybeAddCardioFinisher(seq.map((label, i) => {
    if (label === "Push")
      return buildDay(
        `Push ${Math.ceil((i + 1) / 3)}`,
        push,
        focus,
        experience,
        style
      );
    if (label === "Pull")
      return buildDay(
        `Pull ${Math.ceil((i + 1) / 3)}`,
        pull,
        focus,
        experience,
        style
      );
    return buildDay(
      `Legs ${Math.ceil((i + 1) / 3)}`,
      legs,
      focus,
      experience,
      style
    );
  })));
  }

  // Fallback
  return finalizeTemplates([
    buildDay(
      "Full Body A",
      ["Goblet Squat", "Machine Chest Press", "Lat Pulldown", "Leg Press"],
      focus,
      experience,
      style
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
      includeDeload: false,
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
