/* eslint-disable */
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

import type {
  AppState,
  ExperienceLevel,
  FocusType,
  Goal,
  GoalMetric,
  GoalStatus,
  Profile,
  RepRange,
  Session,
  SessionExerciseEntry,
  Settings,
  SplitType,
  Template,
  TemplateExercise,
  Theme,
  Units,
  UserRole,
  Weekday,
  WeekSchedule,
  WorkingEntry,
} from "./forgefit/types";

import { BottomNav } from "./forgefit/layout/BottomNav";
import { GetStartedScreen } from "./forgefit/screens/GetStartedScreen";
import { OnboardingScreen } from "./forgefit/screens/OnboardingScreen";
import { HomePanel } from "./forgefit/sections/HomePanel";
import { HistoryPanel } from "./forgefit/sections/HistoryPanel";
import { InsightsPanel } from "./forgefit/sections/InsightsPanel";
import { CoachPanel } from "./forgefit/sections/CoachPanel";
import { SocialPanel } from "./forgefit/sections/SocialPanel";
import { TrainingPanel } from "./forgefit/sections/TrainingPanel";

import { ConfirmResetDialog } from "./forgefit/dialogs/ConfirmResetDialog";
import { ExportDialog } from "./forgefit/dialogs/ExportDialog";
import { GoalDialog } from "./forgefit/dialogs/GoalDialog";
import { ImportDialog } from "./forgefit/dialogs/ImportDialog";
import { ProgramGeneratorDialog } from "./forgefit/dialogs/ProgramGeneratorDialog";
import { RecapDialog } from "./forgefit/dialogs/RecapDialog";
import { SettingsDialog } from "./forgefit/dialogs/SettingsDialog";
import { TemplateManagerDialog } from "./forgefit/dialogs/TemplateManagerDialog";

import { OneRmCalculator } from "./forgefit/components/OneRmCalculator";
import { ForgeFitMark } from "./forgefit/components/ForgeFitMark";

import { TopBar } from "./forgefit/premium/TopBar";
import { StatPills } from "./forgefit/premium/StatPills";

import { buildAutoGoals } from "./forgefit/auto-goals";
import { formatGoalValue, formatMetricValue, metricLabel } from "./forgefit/goal-utils";
import { buildExerciseHistory } from "./forgefit/history-metrics";
import { computeInsights } from "./forgefit/insights";
import { buildEntriesFromTemplate } from "./forgefit/log-helpers";
import { generateProgramTemplates } from "./forgefit/program-generator";

import {
  addDaysISO,
  assignScheduleDays,
  clamp,
  e1rm,
  emptySchedule,
  formatNumber,
  formatRepRange,
  getWeekdayKey,
  getScheduleInfo,
  roundTo,
  setDateToWeekday,
  safeJsonParse,
  todayISO,
  uid,
  WEEKDAYS,
} from "./forgefit/utils";
import {
  WORKOUT_LIBRARY_EXERCISES,
  isLibraryWorkoutName,
  simplifyExerciseName,
  simplifyWorkoutName,
  verifyWorkoutLibrary,
} from "./forgefit/workout-library";

// -------------------- Data Model --------------------

const LS_KEY_PREFIX = "forgefit_v1";

const UI_VERSION = 3;

const normalizeExerciseName = (name?: string) =>
  simplifyExerciseName((name || "").trim());

const normalizeTemplates = (templates: any[]) =>
  templates.map((t) => ({
    ...t,
    name: isLibraryWorkoutName(t?.name) ? simplifyWorkoutName(t.name) : t?.name,
    exercises: Array.isArray(t?.exercises)
      ? t.exercises.map((ex: any) => ({
          ...ex,
          name: normalizeExerciseName(ex?.name),
        }))
      : [],
  }));

const normalizeStoredTemplates = (templates: Template[]) => {
  const normalized = normalizeTemplates(templates as any);
  const stripCoreCardio = (name: string) =>
    /core|crunch|pallof|plank|ab|carry|zone 2|interval|bike|sprint|conditioning|cool-?down|recovery/i.test(
      name
    );
  return normalized.map((t) => {
    const filtered = (t.exercises || []).filter((ex: any) => {
      const name = normalizeExerciseName(ex?.name || "");
      return !stripCoreCardio(name);
    });
    return filtered.length === (t.exercises || []).length ? t : { ...t, exercises: filtered };
  });
};

const normalizeSessions = (sessions: any[]) =>
  sessions.map((s) => ({
    ...s,
    templateName: isLibraryWorkoutName(s?.templateName)
      ? simplifyWorkoutName(s.templateName)
      : s?.templateName,
    entries: Array.isArray(s?.entries)
      ? s.entries.map((entry: any) => ({
          ...entry,
          exerciseName: normalizeExerciseName(entry?.exerciseName),
        }))
      : [],
  }));

const normalizeGoals = (goals: any[]) =>
  goals.map((g) => ({
    ...g,
    exerciseName: normalizeExerciseName(g?.exerciseName),
  }));

const normalizeSplits = (splits: any[]) =>
  splits.map((split) => ({
    ...split,
    days: Array.isArray(split?.days)
      ? split.days.map((day: any) => ({
          ...day,
          slots: Array.isArray(day?.slots)
            ? day.slots.map((slot: any) => ({
                ...slot,
                exerciseName: normalizeExerciseName(slot?.exerciseName),
              }))
            : [],
        }))
      : [],
  }));

const defaultState: AppState = {
  templates: [],
  sessions: [],
  goals: [],
  splits: [],
  settings: {
    units: "lb",
    autoGoalMode: true,
    autoGoalHorizonWeeks: 6,
    strictRepRangeForProgress: true,
    powerliftingMode: false,
    darkMode: true,
    role: "athlete",
    theme: "iron",
    uiVersion: UI_VERSION,
    schedule: emptySchedule,
    profile: {
      name: "",
      username: "",
      age: "",
      height: "",
      weight: "",
      preferredSplit: "ppl",
      focus: "general",
      completed: false,
      introSeen: false,
    },
  },
};

// -------------------- Main Component --------------------

export default function WorkoutTrackerApp({
  userId,
  userFullName,
  focusMode,
}: {
  userId?: string;
  userFullName?: string;
  focusMode?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [libraryMigrated, setLibraryMigrated] = useState(false);

  const storageKey = useMemo(() => {
    const uid = userId;
    return uid ? `${LS_KEY_PREFIX}:${uid}` : LS_KEY_PREFIX;
  }, [userId]);

  const [state, setState] = useState<AppState>(() => {
    const stored =
      typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;

    const parsed = stored
      ? safeJsonParse<AppState>(stored, defaultState)
      : defaultState;

    const parsedSettings = (parsed as any)?.settings || {};
    const savedUiVersion = Number(parsedSettings?.uiVersion || 0);

    // Deep-merge settings so new fields don't break older saves.
    // UI migration: force premium-dark defaults for older saved data.
    const shouldMigrateUi = savedUiVersion < UI_VERSION;

    const savedTheme = (parsed as any)?.settings?.theme as Theme | undefined;
    const safeTheme: Theme =
      savedTheme === "iron" ||
      savedTheme === "dune" ||
      savedTheme === "noir" ||
      savedTheme === "neon"
        ? savedTheme
        : defaultState.settings.theme;

    return {
      ...defaultState,
      ...parsed,
      settings: {
        ...defaultState.settings,
        ...(parsed as any).settings,
        role: ((parsed as any)?.settings?.role === "coach" ? "coach" : "athlete") as UserRole,
        uiVersion: UI_VERSION,
        darkMode: shouldMigrateUi ? defaultState.settings.darkMode : !!(parsed as any)?.settings?.darkMode,
        theme: shouldMigrateUi ? defaultState.settings.theme : safeTheme,
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
        ? normalizeTemplates((parsed as any).templates)
        : defaultState.templates,
      sessions: Array.isArray((parsed as any).sessions)
        ? normalizeSessions((parsed as any).sessions)
        : [],
      goals: Array.isArray((parsed as any).goals) ? normalizeGoals((parsed as any).goals) : [],
      splits: Array.isArray((parsed as any).splits) ? normalizeSplits((parsed as any).splits) : [],
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
    document.documentElement.setAttribute("data-theme", state.settings.theme || "noir");
  }, [state.settings.theme]);

  useEffect(() => {
    if (!mounted || libraryMigrated || typeof window === "undefined") return;
    const versionKey = `${storageKey}:library_v1`;
    const version = localStorage.getItem(versionKey);
    if (version === "1") {
      setLibraryMigrated(true);
      return;
    }

    const profileCompleted = !!state.settings.profile?.completed;
    const preferredSplit = state.settings.profile?.preferredSplit || "ppl";
    const existingScheduleDays = Object.entries(state.settings.schedule || emptySchedule)
      .filter(([_, value]) => value && value !== "rest")
      .map(([key]) => key as Weekday);
    const scheduleDays: Weekday[] = existingScheduleDays.length
      ? existingScheduleDays
      : ["mon", "wed", "fri"];
    const templates = profileCompleted
      ? generateProgramTemplates({
          experience: "intermediate",
          split: preferredSplit,
          daysPerWeek: scheduleDays.length,
          focus: "general",
          finisherOption: "core",
          units: state.settings.units,
        })
      : [];
    const nextSchedule = templates.length
      ? assignScheduleDays(emptySchedule, templates, scheduleDays)
      : emptySchedule;

    setState((prev) => ({
      ...prev,
      templates,
      splits: [],
      settings: { ...prev.settings, schedule: nextSchedule },
    }));
    setSelectedTemplateId(templates[0]?.id || "");
    localStorage.setItem(versionKey, "1");
    if (process.env.NODE_ENV !== "production") {
      const removed = (state.templates || []).map((t) => t.name);
      if (removed.length) {
        console.info("ForgeFit library migration: removed templates", removed);
      }
    }
    setLibraryMigrated(true);
  }, [mounted, libraryMigrated, storageKey, state.templates]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const errors = verifyWorkoutLibrary();
    if (errors.length) {
      console.warn("Workout library verification errors:", errors);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<
    "home" | "log" | "social" | "history" | "insights" | "calc" | "coach"
  >(focusMode ? "log" : "home");
  const [mainTab, setMainTab] = useState<
    "home" | "training" | "social" | "more"
  >(focusMode ? "training" : "home");
  const [moreTab, setMoreTab] = useState<
    "history" | "insights" | "calc" | "coach"
  >("history");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    state.templates?.[0]?.id || ""
  );
  const [sessionDate, setSessionDate] = useState(todayISO());
  const [sessionNotes, setSessionNotes] = useState("");
  const [search, setSearch] = useState("");
  const [bodyWeightInput, setBodyWeightInput] = useState("");
  const [forceLog, setForceLog] = useState(false);
  const [gymMode, setGymMode] = useState(false);
  const [gymStepIndex, setGymStepIndex] = useState(0);

  const draftKey = useMemo(() => `${storageKey}:workoutDraft`, [storageKey]);
  const [workoutDraft, setWorkoutDraft] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(draftKey);
      setWorkoutDraft(raw ? safeJsonParse<any>(raw, null) : null);
    } catch {
      setWorkoutDraft(null);
    }
  }, [draftKey]);

  // log mode
  const [logMode, setLogMode] = useState<"template" | "split" | "quick">("template");
  const [customWorkoutName, setCustomWorkoutName] = useState("Quick Workout");
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
  const [restPresetSec, setRestPresetSec] = useState(0);
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
        templates: Array.isArray((parsed as any).templates)
          ? normalizeTemplates((parsed as any).templates)
          : defaultState.templates,
        sessions: Array.isArray((parsed as any).sessions)
          ? normalizeSessions((parsed as any).sessions)
          : [],
        goals: Array.isArray((parsed as any).goals) ? normalizeGoals((parsed as any).goals) : [],
        splits: Array.isArray((parsed as any).splits) ? normalizeSplits((parsed as any).splits) : [],
      };
      setState(merged);
      setImportDialogOpen(false);
      alert("Imported!");
    } catch (e) {
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
        localStorage.removeItem(storageKey);
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
    if (logMode === "quick") {
      const exs = (customExercises || []).map((ex) => ({
        ...ex,
        id: ex.id || uid(),
      }));
      return {
        id: "custom",
        name: (customWorkoutName || "Quick Workout").trim() || "Quick Workout",
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
      | { type: "circuit"; tag: string; entries: WorkingEntry[] }
    > = [];

    for (const entry of mainEntries) {
      if (groupedIds.has(entry.exerciseId)) continue;
      const type = entry.templateHint?.setType;
      const tag =
        type === "superset" || type === "triset" || type === "circuit"
          ? entry.templateHint?.supersetTag || "Group"
          : "";
      if (tag && (type === "superset" || type === "triset" || type === "circuit")) {
        const entries = mainEntries.filter(
          (e) =>
            e.templateHint?.setType === type &&
            (e.templateHint?.supersetTag || "Group") === tag
        );
        if (
          (type === "superset" && entries.length > 1) ||
          (type === "triset" && entries.length > 2) ||
          (type === "circuit" && entries.length > 1)
        ) {
          entries.forEach((e) => groupedIds.add(e.exerciseId));
          if (type === "circuit") {
            groups.push({ type: "circuit", tag, entries });
          } else {
            groups.push({ type: type === "triset" ? "triset" : "superset", tag, entries });
          }
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

  const todayScheduleInfo = useMemo(
    () => getScheduleInfo(todayISO(), state.templates || [], state.settings.schedule),
    [state.templates, state.settings.schedule]
  );

  const startOrResumeTodayWorkout = useCallback(() => {
    setSessionDate(todayISO());
    setLogMode("template");
    setMainTab("training");
    setActiveTab("log");
    setGymMode(true);
    setForceLog(true);
    if (!workoutDraft) {
      setGymStepIndex(0);
    }
  }, [
    setGymMode,
    setGymStepIndex,
    setLogMode,
    setSessionDate,
    setForceLog,
    workoutDraft,
  ]);

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
    if (gymMode) return;
    setWorkingEntries(
      buildEntriesFromTemplate(selectedTemplate, { suggestions: insights.suggestions })
    );
  }, [
    selectedTemplateId,
    state.templates,
    logMode,
    customExercises,
    customWorkoutName,
    insights.suggestions,
    gymMode,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextTemplates = normalizeStoredTemplates(state.templates || []);
    let changed = nextTemplates.length !== (state.templates || []).length;
    if (!changed) {
      for (let i = 0; i < nextTemplates.length; i += 1) {
        const next = nextTemplates[i];
        const cur = (state.templates || [])[i];
        if (!cur || next.name !== cur.name) {
          changed = true;
          break;
        }
        if ((next.exercises || []).length !== (cur.exercises || []).length) {
          changed = true;
          break;
        }
        for (let j = 0; j < (next.exercises || []).length; j += 1) {
          if (next.exercises[j].name !== cur.exercises[j].name) {
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
    }
    if (changed) {
      setState((p) => ({ ...p, templates: nextTemplates }));
    }
  }, [state.templates]);

  useEffect(() => {
    setWorkingEntries((prev) => {
      let changed = false;
      const next = (prev || []).map((entry) => {
        const name = normalizeExerciseName(entry.exerciseName);
        if (name !== entry.exerciseName) {
          changed = true;
          return { ...entry, exerciseName: name };
        }
        return entry;
      });
      return changed ? next : prev;
    });
  }, [state.templates]);

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
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state, storageKey]);

  if (!mounted) {
    return <div className="min-h-screen w-full bg-transparent" />;
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
        weekdays={WEEKDAYS}
        generateProgramTemplates={generateProgramTemplates}
        onComplete={(profile, templates, days) => {
          const normalizedDays = (Array.isArray(days) ? days : [])
            .filter((d) => WEEKDAYS.some((w) => w.key === d))
            .map((d) => d as Weekday);
          setState((p) => ({
            ...p,
            templates,
            settings: {
              ...p.settings,
              profile,
              schedule: assignScheduleDays(emptySchedule, templates, normalizedDays),
            },
          }));
          setSelectedTemplateId(templates[0]?.id || "");
          setMainTab("training");
          setActiveTab("log");
        }}
      />
    );
  }

  const displayName = (state.settings.profile?.name || userFullName || "").trim();
  const firstName = displayName.split(/\s+/).filter(Boolean)[0] || "";

  return (
    <div className="min-h-screen w-full bg-transparent text-foreground">
      <div
        className={`mx-auto max-w-6xl px-4 md:px-8 ${
          focusMode ? "" : mainTab === "social" ? "pb-0" : "pb-[calc(120px+env(safe-area-inset-bottom))]"
        }`}
      >
        {/* Top bar */}
        {mainTab === "social" ? null : (
          <div className="sticky top-0 z-40">
            <TopBar
              themeLabel={
                state.settings.theme === "noir"
                  ? "Noir"
                  : state.settings.theme === "dune"
                    ? "Dune"
                    : state.settings.theme === "neon"
                      ? "Neon"
                      : "Iron"
              }
              greeting={{
                compact: displayName ? `Hi, ${firstName || displayName}` : "Train. Log. Improve.",
                full: displayName ? `Welcome back, ${displayName}` : "Train. Log. Improve.",
              }}
              onOpenTemplates={() => setTemplateDialogOpen(true)}
              onOpenGenerator={() => setGeneratorOpen(true)}
              onOpenSettings={() => setSettingsDialogOpen(true)}
              actions={{
                TemplatesIcon: ClipboardList,
                SparklesIcon: Sparkles,
                SettingsIcon,
              }}
            />

            <div className="-mx-4 md:-mx-8 px-4 md:px-8 pb-4">
              <div className="pt-1 text-center ff-kicker text-muted-foreground">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <StatPills
                items={[
                  { key: "streak", label: "Streak", value: `${headerStats.streak}d`, Icon: Flame },
                  {
                    key: "sessions",
                    label: "Sessions",
                    value: String(headerStats.totalSessions),
                    Icon: History,
                  },
                  {
                    key: "vol7d",
                    label: "7d Volume",
                    value: `${Math.round(headerStats.vol7d).toLocaleString()} ${state.settings.units}`,
                    Icon: TrendingUp,
                  },
                  { key: "last", label: "Last", value: headerStats.lastLabel, Icon: CalendarDays },
                ]}
              />

              {focusMode ? null : mainTab === "more" ? (
                <div className="mt-3">
                  <Tabs
                    value={moreTab}
                    onValueChange={(v) => {
                      const next = v as any;
                      setMainTab("more");
                      setMoreTab(next);
                      setActiveTab(next);
                    }}
                  >
                    <TabsList
                      className={`w-full rounded-xl border bg-card p-1 flex md:grid ${isCoach ? "md:grid-cols-4" : "md:grid-cols-3"} gap-1 md:gap-0 overflow-x-auto`}
                    >
                      <TabsTrigger
                        value="history"
                        className="rounded-lg text-xs whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <History className="h-4 w-4" /> History
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="insights"
                        className="rounded-lg text-xs whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" /> Insights
                        </span>
                      </TabsTrigger>
                      <TabsTrigger
                        value="calc"
                        className="rounded-lg text-xs whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Target className="h-4 w-4" /> 1RM
                        </span>
                      </TabsTrigger>
                      {isCoach ? (
                        <TabsTrigger
                          value="coach"
                          className="rounded-lg text-xs whitespace-nowrap min-w-max px-3 sm:px-4 data-[state=active]:bg-primary/10 data-[state=active]:text-foreground"
                        >
                          <span className="inline-flex items-center gap-2">
                            <SettingsIcon className="h-4 w-4" /> Coach
                          </span>
                        </TabsTrigger>
                      ) : null}
                    </TabsList>
                  </Tabs>
                </div>
              ) : null}
            </div>
          </div>
        )}

{/* -------------------- Dialogs -------------------- */}

        <TemplateManagerDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          state={state as any}
          setState={setState as any}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={setSelectedTemplateId}
        />

        <ProgramGeneratorDialog
          open={generatorOpen}
          onOpenChange={setGeneratorOpen}
          units={state.settings.units as any}
          onGenerate={(templates: any, days: any) => {
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
              setMainTab("training");
              setActiveTab("log");
            }
          }}
        />

        <GoalDialog
          open={goalDialogOpen}
          onOpenChange={setGoalDialogOpen}
          units={state.settings.units as any}
          existingExercises={Object.keys(exerciseHistory)}
          onAdd={addGoal}
        />

        <ImportDialog
          open={importDialogOpen}
          onOpenChange={setImportDialogOpen}
          onImport={importData}
        />

        <ExportDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          exportText={exportText}
        />

        <SettingsDialog
          open={settingsDialogOpen}
          onOpenChange={setSettingsDialogOpen}
          settings={state.settings as any}
          templates={state.templates as any}
          onChange={(s) => setState((p) => ({ ...p, settings: s }))}
          onResetRequest={() => setConfirmResetOpen(true)}
        />

        <RecapDialog
          open={recapOpen}
          onOpenChange={setRecapOpen}
          data={recapData as any}
          units={state.settings.units as any}
          onViewHistory={() => {
            setMainTab("more");
            setMoreTab("history");
            setActiveTab("history");
          }}
        />

        <ConfirmResetDialog
          open={confirmResetOpen}
          onOpenChange={setConfirmResetOpen}
          onConfirm={resetAll}
        />

        {/* -------------------- Pages -------------------- */}

        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            const next = v as any;
            setActiveTab(next);
            if (next === "home") {
              setMainTab("home");
              return;
            }
            if (next === "social") {
              setMainTab("social");
              return;
            }
            if (next === "log") {
              setMainTab("training");
              return;
            }
            setMainTab("more");
            setMoreTab(next);
          }}
        >
          <TabsContent value="home" className="mt-0">
            <HomePanel
              ctx={{
                todayScheduleInfo,
                workoutDraft,
                startOrResumeTodayWorkout,
                state,
                bodyWeightInput,
                setBodyWeightInput,
                setState,
                formatNumber,
                todayISO,
              }}
            />
          </TabsContent>

          <TabsContent value="social" className="mt-0">
            <SocialPanel
              social={(state as any).social || { handle: "", displayName: "", friends: [], posts: [], challenges: [], groups: [] }}
              templates={(state.templates || []) as any}
              sessions={(state.sessions || []).map((s) => ({
                id: s.id,
                dateISO: s.dateISO,
                templateName: s.templateName,
                entries: (s.entries || []).map((e) => ({
                  exerciseName: e.exerciseName,
                  sets: (e.sets || []).map((set: any) => ({
                    reps: Number(set.reps) || 0,
                    weight: Number(set.weight) || 0,
                    setType: set.setType,
                    supersetTag: set.supersetTag,
                  })),
                })),
              })) as any}
              splits={(state.splits || []) as any}
              units={state.settings.units as any}
              profileName={state.settings.profile?.name || userFullName || undefined}
              profileHandle={state.settings.profile?.username || undefined}
              profileFocus={state.settings.profile?.focus}
              userId={userId || undefined}
              userFullName={userFullName || undefined}
              setStateAction={setState as any}
              onGoHomeAction={() => {
                setMainTab("home");
                setActiveTab("home");
              }}
            />
          </TabsContent>

          <TabsContent value="log" className="mt-0">
            <TrainingPanel
              ctx={{
                focusMode,
                setTemplateDialogOpen,
                setGeneratorOpen,
                setImportDialogOpen,
                insights,
                state,
                setupCollapsed,
                setSetupCollapsed,
                logMode,
                setLogMode,
                customExercises,
                setCustomExercises,
                customWorkoutName,
                setCustomWorkoutName,
                uid,
                clamp,
                COMMON_EXERCISES: WORKOUT_LIBRARY_EXERCISES,
                setState,
                setSelectedTemplateId,
                selectedTemplateId,
                sessionDate,
                setSessionDate,
                scheduleInfo,
                WEEKDAYS,
                scheduledDayOptions,
                scheduledDayLabel,
                emptySchedule,
                getWeekdayKey,
                setDateToWeekday,
                addDaysISO,
                forceLog,
                setForceLog,
                sessionProgress,
                restSeconds,
                setRestSeconds,
                restRunning,
                setRestRunning,
                setMainTab,
                gymMode,
                gymStepIndex,
                gymSteps,
                currentGymEntry,
                currentGymSet,
                formatRepRange,
                updateGymSet,
                saveSession,
                setGymMode,
                setAutoAdvanceAfterRest,
                restPresetSec,
                setRestPresetSec,
                addGymSet,
                setGymStepIndex,
                groupedMainEntries,
                mainIndexMap,
                finisherEntries,
                setWorkingEntries,
                sessionNotes,
                setSessionNotes,
              }}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryPanel
              search={search}
              onSearchChange={setSearch}
              sessions={filteredSessions}
              units={state.settings.units}
              onDeleteSession={deleteSession}
              onBackToLog={() => {
                setMainTab("training");
                setActiveTab("log");
              }}
            />
          </TabsContent>

          <TabsContent value="insights" className="mt-0">
            <InsightsPanel
              powerliftingMode={state.settings.powerliftingMode}
              big3Stats={big3Stats}
              exerciseHistory={exerciseHistory}
              goals={state.goals}
              units={state.settings.units}
              onAddGoal={() => setGoalDialogOpen(true)}
              onAutoGoals={applyAutoGoals}
              onDoneGoal={markGoalDone}
              onArchiveGoal={archiveGoal}
            />
          </TabsContent>

          <TabsContent value="coach" className="mt-0">
            <CoachPanel
              ctx={{
                isCoach,
                buildCoachPackage,
                coachPackageText,
                clientImportText,
                setClientImportText,
                importClientReport,
                clientSummary,
              }}
            />
          </TabsContent>

          <TabsContent value="calc" className="mt-0">
            <OneRmCalculator units={state.settings.units} />
          </TabsContent>
        </Tabs>
      </div>

      {activeTab === "log" ? (
        <div className="fixed bottom-4 right-4 z-40 md:hidden">
          <div className="rounded-full border bg-card/80 p-1 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full px-3 ff-kicker"
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
                className="rounded-full px-3 ff-kicker"
                onClick={saveSession}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {focusMode || mainTab === "social" ? null : (
        <div className="fixed bottom-0 left-0 right-0 z-50">
          <BottomNav
            fixed={false}
            mainTab={mainTab}
            centerAction={(() => {
              const inWorkout = !!workoutDraft;
              const inLogger = mainTab === "training" && activeTab === "log";
              if (!inWorkout) {
                return { label: "Start", state: "play" as const, onPressAction: startOrResumeTodayWorkout };
              }
              if (inLogger) {
                return {
                  label: "Pause",
                  state: "pause" as const,
                  onPressAction: () => {
                    setMainTab("home");
                    setActiveTab("home");
                  },
                };
              }
              return { label: "Resume", state: "play" as const, onPressAction: startOrResumeTodayWorkout };
            })()}
            onHomeAction={() => {
              setMainTab("home");
              setActiveTab("home");
            }}
            onTrainingAction={() => {
              setMainTab("training");
              setActiveTab("log");
            }}
            onSocialAction={() => {
              setMainTab("social");
              setActiveTab("social");
            }}
            onMoreAction={() => {
              setMainTab("more");
              setActiveTab(moreTab);
            }}
          />
        </div>
      )}
    </div>
  );
}


// -------------------- Components --------------------
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
          <div className="ff-kicker text-muted-foreground">Profile</div>
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
          <div className="ff-kicker text-muted-foreground">Units</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Units</div>
              <div className="ff-caption text-muted-foreground">Used for display + suggestions.</div>
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
          <div className="ff-kicker text-muted-foreground">Theme</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Dark mode</div>
              <div className="ff-caption text-muted-foreground">Toggle theme for this device.</div>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => onChange({ ...settings, darkMode: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Theme</div>
              <div className="ff-caption text-muted-foreground">Choose your vibe.</div>
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
          <div className="ff-kicker text-muted-foreground">Schedule</div>
          <div className="ff-caption text-muted-foreground">
            Assign templates to days so the app auto-picks the right workout.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {WEEKDAYS.map((day) => (
              <div key={day.key} className="flex items-center gap-2">
                <div className="w-16 ff-caption text-muted-foreground">{day.short}</div>
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
          <div className="ff-kicker text-muted-foreground">Training rules</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-medium text-sm">Coach mode</div>
              <div className="ff-caption text-muted-foreground">
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
              <div className="ff-caption text-muted-foreground">
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
              <div className="ff-caption text-muted-foreground">
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
              <div className="ff-caption text-muted-foreground">Weeks to project a realistic target.</div>
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
          <div className="ff-caption text-muted-foreground">Tip: 6–8 weeks is a good default.</div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="ff-kicker text-muted-foreground">Data</div>
          <div className="font-medium text-sm text-destructive">Danger zone</div>
          <div className="ff-caption text-muted-foreground">
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

// -------------------- Logic: Templates -> Entries --------------------

// -------------------- Logic: History & Metrics --------------------

// -------------------- 1RM Calculator --------------------

// -------------------- Progressive Overload Suggestions --------------------

// -------------------- Auto Goals --------------------

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
      finisherOption: "core",
      units: "lb",
    });
    console.assert(gen.length === 3, "generator creates correct day count");
    console.assert(
      gen[0].exercises.length >= 3,
      "generator creates templates with exercises"
    );
  } catch (e) {
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
