"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CARD_GAP as CARD_GAP_CLASS, INNER_PADDING, SECTION_GAP } from "../layout/spacing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  GripVertical,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import {
  ExerciseLogger as ImportedExerciseLogger,
  SupersetLogger as ImportedSupersetLogger,
  TrisetLogger as ImportedTrisetLogger,
} from "./ExerciseLoggers";
import { TrainingToolsCard } from "../layout/TrainingToolsCard";
import type { FinisherInstance, FinisherDefinition, SetType, SplitDaySlot } from "../types";
import { FINISHER_LIBRARY } from "../finisher-library";
import {
  WORKOUT_LIBRARY_V1,
  WORKOUT_LIBRARY_EXERCISES,
  simplifyWorkoutName,
} from "../workout-library";
import { EXERCISE_CATALOG } from "../exercise-catalog";

export function TrainingPanel(props: { ctx: any }) {
  const {
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
    COMMON_EXERCISES,
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
  } = props.ctx;

  const hasSessions = (state.sessions || []).length > 0;

  const formatSessionDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || "";
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const DatePickerField = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (next: string) => void;
    ariaLabel: string;
  }) => (
    <div className="relative">
      <Input
        value={formatSessionDate(value)}
        readOnly
        placeholder="Select date"
        className="cursor-pointer pr-10"
      />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  );

  const scheduledTemplateOptions = useMemo(() => {
    const schedule = state.settings.schedule || emptySchedule;
    return (WEEKDAYS || [])
      .map((day: (typeof WEEKDAYS)[number]) => {
        const templateId = schedule[day.key];
        if (!templateId || templateId === "rest") return null;
        const match = (state.templates || []).find((t: any) => t.id === templateId);
        if (!match) return null;
        return { dayKey: day.key, templateId, label: `${day.short} • ${match.name}` };
      })
      .filter(Boolean) as Array<{ dayKey: string; templateId: string; label: string }>;
  }, [WEEKDAYS, state.settings.schedule, state.templates]);

  const todayKey = getWeekdayKey(new Date().toISOString().slice(0, 10));
  const scheduledTodayId = (state.settings.schedule || emptySchedule)[todayKey];
  const hasScheduledToday = !!scheduledTodayId && scheduledTodayId !== "rest";
  const [todayWorkoutDayKey, setTodayWorkoutDayKey] = useState(
    hasScheduledToday ? todayKey : ""
  );

  useEffect(() => {
    if (todayWorkoutDayKey) return;
    if (hasScheduledToday) {
      setTodayWorkoutDayKey(todayKey);
    }
  }, [todayWorkoutDayKey, hasScheduledToday, todayKey]);

  const setTodayWorkout = (dayKey: string) => {
    const schedule = state.settings.schedule || emptySchedule;
    const templateId = schedule[dayKey];
    if (!templateId || templateId === "rest") return;
    const today = new Date().toISOString().slice(0, 10);
    setSessionDate(today);
    setSelectedTemplateId(templateId);
    setLogMode("template");
    setForceLog(true);
    setTodayWorkoutDayKey(dayKey);
  };

  const [splitStep, setSplitStep] = useState<1 | 2 | 3>(1);
  const [splitName, setSplitName] = useState("");
  const [splitDays, setSplitDays] = useState<string[]>([]);
  const [splitDayNames, setSplitDayNames] = useState<Record<string, string>>({});
  const [splitDayExercisesByDay, setSplitDayExercisesByDay] = useState<
    Record<
      string,
      Array<{
        name: string;
        sets: number;
        repMin: number;
        repMax: number;
        setType: SetType;
        supersetTag: string;
      }>
    >
  >({});
  const [splitDaySlots, setSplitDaySlots] = useState<Record<string, SplitDaySlot[]>>({});
  const [splitDayFinishers, setSplitDayFinishers] = useState<Record<string, FinisherInstance[]>>({});
  const [finisherEnabledByDay, setFinisherEnabledByDay] = useState<Record<string, boolean>>({});
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [finisherPickerOpen, setFinisherPickerOpen] = useState(false);
  const [pickerDayKey, setPickerDayKey] = useState("");
  const [pickerSlotId, setPickerSlotId] = useState("");
  const [pickerSlotType, setPickerSlotType] = useState<SplitDaySlot["slotType"]>("accessory");
  const [pickerPatternTag, setPickerPatternTag] = useState("");
  const [pickerTab, setPickerTab] = useState<"suggested" | "recent" | "favorites" | "all">("suggested");
  const [pickerSearch, setPickerSearch] = useState("");
  const [applySwapToAll, setApplySwapToAll] = useState(false);
  const [exercisePatternFilter, setExercisePatternFilter] = useState("all");
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all");
  const [exerciseEquipmentFilter, setExerciseEquipmentFilter] = useState("all");
  const [recentExercises, setRecentExercises] = useState<string[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<string[]>([]);
  const [recentFinishers, setRecentFinishers] = useState<string[]>([]);
  const [favoriteFinishers, setFavoriteFinishers] = useState<string[]>([]);
  const [finisherTab, setFinisherTab] = useState<"suggested" | "recent" | "favorites" | "all">("suggested");
  const [finisherSearch, setFinisherSearch] = useState("");
  const [finisherTypeFilter, setFinisherTypeFilter] = useState<FinisherDefinition["type"] | "all">("all");
  const [finisherIntensityFilter, setFinisherIntensityFilter] = useState<FinisherDefinition["intensity"] | "all">("all");
  const [finisherDurationFilter, setFinisherDurationFilter] = useState<"all" | "5-8" | "8-12" | "12-20">("all");
  const [finisherEquipmentFilter, setFinisherEquipmentFilter] = useState<string>("all");
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [customFinisherName, setCustomFinisherName] = useState("");
  const [customFinisherType, setCustomFinisherType] = useState<FinisherDefinition["type"]>("pump");
  const [customFinisherIntensity, setCustomFinisherIntensity] = useState<FinisherDefinition["intensity"]>("moderate");
  const [customFinisherDuration, setCustomFinisherDuration] = useState("");
  const [customFinisherRounds, setCustomFinisherRounds] = useState("");
  const [history, setHistory] = useState<Array<{ slots: Record<string, SplitDaySlot[]>; finishers: Record<string, FinisherInstance[]> }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<string[]>([]);
  const [copySourceDay, setCopySourceDay] = useState("");
  const [editingFinisherId, setEditingFinisherId] = useState("");
  const [finisherSwapId, setFinisherSwapId] = useState("");
  const [finisherSectionOpenByDay, setFinisherSectionOpenByDay] = useState<Record<string, boolean>>({});

  const CARD_PADDING = INNER_PADDING;
  const CARD_GAP = CARD_GAP_CLASS;
  const CARD_SECTION_GAP = "space-y-2";
  const CARD_HEADER = "px-5 pt-4 pb-2";
  const CARD_FOOTER = "px-5 pb-4";
  const SECTION_LABEL = "flex items-center gap-2 ff-kicker text-muted-foreground";
  const BODY_TEXT = "ff-body-sm text-muted-foreground leading-relaxed break-words";
  const BUTTON_ROW = "flex flex-wrap items-center gap-2";

  const slotTypeOptions: Array<SplitDaySlot["slotType"]> = [
    "main",
    "secondary",
    "accessory",
    "arms_core",
    "conditioning",
  ];

  const patternOptions = ["squat", "hinge", "press", "pull", "accessory", "core", "conditioning"];

  const orderedSplitDays = useMemo(
    () =>
      WEEKDAYS.filter((d: any) => splitDays.includes(d.key)).map((d: any) => d.key),
    [splitDays, WEEKDAYS]
  );

  const workoutOptions = useMemo(() => {
    const seen = new Set<string>();
    return Object.keys(WORKOUT_LIBRARY_V1.workouts)
      .map((key) => ({
        key,
        label: simplifyWorkoutName(WORKOUT_LIBRARY_V1.workouts[key]?.name || key),
      }))
      .filter((item) => {
        if (!item.label) return false;
        if (seen.has(item.label)) return false;
        seen.add(item.label);
        return true;
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const [dayExercisePickerOpen, setDayExercisePickerOpen] = useState(false);
  const [dayExercisePickerDayKey, setDayExercisePickerDayKey] = useState("");
  const [dayExerciseSearch, setDayExerciseSearch] = useState("");
  const [dayExerciseCategory, setDayExerciseCategory] = useState("all");
  const [dragExercise, setDragExercise] = useState<{ dayKey: string; index: number } | null>(
    null
  );

  const filteredExerciseCatalog = useMemo(() => {
    const query = dayExerciseSearch.trim().toLowerCase();
    return EXERCISE_CATALOG.filter((category) =>
      dayExerciseCategory === "all" ? true : category.title === dayExerciseCategory
    )
      .map((category) => {
      const groups = category.groups
        .map((group) => {
          const items = group.items.filter(
            (name) => !query || name.toLowerCase().includes(query)
          );
          return { ...group, items };
        })
        .filter((group) => group.items.length > 0);
      return { ...category, groups };
    })
      .filter((category) => category.groups.length > 0);
  }, [dayExerciseSearch, dayExerciseCategory]);

  const openDayExercisePicker = (dayKey: string) => {
    setDayExercisePickerDayKey(dayKey);
    setDayExerciseSearch("");
    setDayExerciseCategory("all");
    setDayExercisePickerOpen(true);
  };

  const addExerciseToDay = (dayKey: string, name: string) => {
    setSplitDayExercisesByDay((prev) => {
      const existing = prev[dayKey] || [];
      if (existing.some((item) => item.name === name)) {
        return prev;
      }
      const found = exerciseLibrary.find((ex) => ex.name === name);
      const next = [
        ...existing,
        {
          name,
          sets: found?.defaultSets ?? 3,
          repMin: found?.repRange?.min ?? 8,
          repMax: found?.repRange?.max ?? 12,
          setType: "normal" as SetType,
          supersetTag: "A",
        },
      ];
      return { ...prev, [dayKey]: next };
    });
  };

  const removeExerciseFromDay = (dayKey: string, name: string) => {
    setSplitDayExercisesByDay((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((item) => item.name !== name),
    }));
  };

  const moveExerciseInDay = (dayKey: string, fromIndex: number, toIndex: number) => {
    setSplitDayExercisesByDay((prev) => {
      const current = prev[dayKey] || [];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= current.length ||
        toIndex >= current.length
      ) {
        return prev;
      }
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, [dayKey]: next };
    });
  };

  const exerciseLibrary = useMemo(() => {
    return (WORKOUT_LIBRARY_EXERCISES || []).map((ex) => {
      const name = ex.name || "";
      const patterns: string[] = [];
      const muscles: string[] = [];
      const equipment: string[] = [];

      if (/squat|leg press|hack/i.test(name)) patterns.push("squat");
      if (/deadlift|rdl|hinge|hip thrust/i.test(name)) patterns.push("hinge");
      if (/bench|press/i.test(name)) patterns.push("press");
      if (/row|pulldown|pull-up|chin-up/i.test(name)) patterns.push("pull");
      if (/curl|pressdown|triceps|biceps|arms/i.test(name)) muscles.push("arms");
      if (/lateral|rear delt|shoulder|ohp/i.test(name)) muscles.push("shoulders");
      if (/quad|leg|calf|ham|glute|lunge/i.test(name)) muscles.push("legs");
      if (/row|pulldown|pull-up|back/i.test(name)) muscles.push("back");
      if (/bench|chest|press/i.test(name)) muscles.push("chest");
      if (/plank|pallof|core|carry|ab/i.test(name)) muscles.push("core");

      if (/cable/i.test(name)) equipment.push("cable");
      if (/machine/i.test(name)) equipment.push("machine");
      if (/dumbbell|db/i.test(name)) equipment.push("dumbbells");
      if (/barbell|bench|squat|deadlift/i.test(name)) equipment.push("barbell");
      if (/pull-up|chin-up/i.test(name)) equipment.push("bodyweight");

      return {
        ...ex,
        tags: {
          patterns: Array.from(new Set(patterns)),
          muscles: Array.from(new Set(muscles)),
          equipment: Array.from(new Set(equipment)),
        },
      };
    });
  }, []);

  const exercisePatternOptions = useMemo(
    () =>
      Array.from(
        new Set(exerciseLibrary.flatMap((ex: any) => ex.tags?.patterns || []))
      ).sort(),
    [exerciseLibrary]
  );
  const exerciseMuscleOptions = useMemo(
    () =>
      Array.from(
        new Set(exerciseLibrary.flatMap((ex: any) => ex.tags?.muscles || []))
      ).sort(),
    [exerciseLibrary]
  );
  const exerciseEquipmentOptions = useMemo(
    () =>
      Array.from(
        new Set(exerciseLibrary.flatMap((ex: any) => ex.tags?.equipment || []))
      ).sort(),
    [exerciseLibrary]
  );

  const finisherEquipmentOptions = useMemo(
    () =>
      Array.from(
        new Set(FINISHER_LIBRARY.flatMap((fin) => fin.equipment || []))
      ).sort(),
    []
  );

  const commitSplitState = (
    nextSlots: Record<string, SplitDaySlot[]>,
    nextFinishers: Record<string, FinisherInstance[]>
  ) => {
    setSplitDaySlots(nextSlots);
    setSplitDayFinishers(nextFinishers);
    setHistory((prev) => {
      const base = prev.slice(0, Math.max(0, historyIndex + 1));
      return [...base, { slots: nextSlots, finishers: nextFinishers }];
    });
    setHistoryIndex((idx) => idx + 1);
  };

  const handleUndo = () => {
    if (historyIndex <= 0) return;
    const nextIndex = historyIndex - 1;
    const snapshot = history[nextIndex];
    if (!snapshot) return;
    setSplitDaySlots(snapshot.slots);
    setSplitDayFinishers(snapshot.finishers);
    setHistoryIndex(nextIndex);
  };

  const buildSlotsFromWorkout = (workoutName: string): SplitDaySlot[] => {
    const workout = WORKOUT_LIBRARY_V1.workouts[workoutName];
    const exercises = workout?.exercises || [];
    const slots: SplitDaySlot[] = [];
    exercises.forEach((ex, idx) => {
      const tags = exerciseLibrary.find((item) => item.name === ex.name)?.tags;
      const pattern = tags?.patterns?.[0] || "accessory";
      const slotType =
        idx === 0
          ? "main"
          : idx === 1
          ? "secondary"
          : idx < 4
          ? "accessory"
          : idx < 5
          ? "arms_core"
          : "accessory";
      slots.push({
        id: uid(),
        slotType,
        patternTag: pattern,
        exerciseName: ex.name,
      });
    });
    return slots.slice(0, 6);
  };

  const copyDayToTargets = () => {
    if (!copySourceDay || copyTargets.length === 0) return;
    const sourceSlots = splitDaySlots[copySourceDay] || [];
    const sourceFinishers = splitDayFinishers[copySourceDay] || [];
    const nextSlots = { ...splitDaySlots };
    const nextFinishers = { ...splitDayFinishers };
    copyTargets.forEach((target) => {
      nextSlots[target] = sourceSlots.map((slot) => ({ ...slot, id: uid() }));
      nextFinishers[target] = sourceFinishers.map((fin, idx) => ({
        ...fin,
        id: uid(),
        order: idx,
      }));
    });
    commitSplitState(nextSlots, nextFinishers);
    setCopyDialogOpen(false);
    setCopyTargets([]);
  };

  const openExercisePicker = (dayKey: string, slot: SplitDaySlot) => {
    setPickerDayKey(dayKey);
    setPickerSlotId(slot.id);
    setPickerSlotType(slot.slotType);
    setPickerPatternTag(slot.patternTag);
    setPickerTab("suggested");
    setPickerSearch("");
    setApplySwapToAll(false);
    setExercisePatternFilter(slot.patternTag || "all");
    setExerciseMuscleFilter("all");
    setExerciseEquipmentFilter("all");
    setCustomExerciseName("");
    setExercisePickerOpen(true);
  };

  const openFinisherPicker = (dayKey: string, swapId?: string) => {
    setPickerDayKey(dayKey);
    setFinisherSwapId(swapId || "");
    setFinisherTab("suggested");
    setFinisherSearch("");
    setFinisherTypeFilter("all");
    setFinisherIntensityFilter("all");
    setFinisherDurationFilter("all");
    setFinisherEquipmentFilter("all");
    setCustomFinisherName("");
    setCustomFinisherDuration("");
    setCustomFinisherRounds("");
    setFinisherPickerOpen(true);
  };

  const updateSlotExercise = (dayKey: string, slotId: string, name: string, applyAll: boolean) => {
    const nextSlots = { ...splitDaySlots };
    const daySlots = nextSlots[dayKey] || [];
    if (applyAll) {
      const targetPattern = daySlots.find((s) => s.id === slotId)?.patternTag;
      orderedSplitDays.forEach((key: string) => {
        nextSlots[key] = (nextSlots[key] || []).map((slot) =>
          slot.patternTag === targetPattern ? { ...slot, exerciseName: name } : slot
        );
      });
    } else {
      nextSlots[dayKey] = daySlots.map((slot) =>
        slot.id === slotId ? { ...slot, exerciseName: name } : slot
      );
    }
    commitSplitState(nextSlots, splitDayFinishers);
    setRecentExercises((prev) => [name, ...prev.filter((x) => x !== name)].slice(0, 8));
  };

  const toggleFavoriteExercise = (name: string) => {
    setFavoriteExercises((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [name, ...prev]
    );
  };

  const addFinisherInstance = (dayKey: string, finisher: FinisherDefinition, replaceId?: string) => {
    const dayFinishers = splitDayFinishers[dayKey] || [];
    if (!replaceId && dayFinishers.length >= 3) return;
    if (replaceId) {
      const nextFinishers = {
        ...splitDayFinishers,
        [dayKey]: dayFinishers.map((item) =>
          item.id === replaceId
            ? {
                ...item,
                finisherId: finisher.id,
                name: finisher.name,
                type: finisher.type,
                params: {
                  durationMinutes: finisher.durationMinutes,
                  rounds: finisher.rounds,
                },
              }
            : item
        ),
      };
      commitSplitState(splitDaySlots, nextFinishers);
      setRecentFinishers((prev) => [finisher.id, ...prev.filter((x) => x !== finisher.id)].slice(0, 8));
      return;
    }
    const nextFinishers = {
      ...splitDayFinishers,
      [dayKey]: [
        ...dayFinishers,
        {
          id: uid(),
          finisherId: finisher.id,
          name: finisher.name,
          type: finisher.type,
          params: {
            durationMinutes: finisher.durationMinutes,
            rounds: finisher.rounds,
          },
          order: dayFinishers.length,
        },
      ],
    };
    commitSplitState(splitDaySlots, nextFinishers);
    setRecentFinishers((prev) => [finisher.id, ...prev.filter((x) => x !== finisher.id)].slice(0, 8));
  };

  const toggleFavoriteFinisher = (finisherId: string) => {
    setFavoriteFinishers((prev) =>
      prev.includes(finisherId) ? prev.filter((x) => x !== finisherId) : [finisherId, ...prev]
    );
  };

  const filteredExercises = useMemo(() => {
    const search = pickerSearch.trim().toLowerCase();
    return exerciseLibrary.filter((ex: any) => {
      const matchesSearch =
        !search ||
        ex.name.toLowerCase().includes(search) ||
        (ex.tags?.muscles || []).some((m: string) => m.includes(search)) ||
        (ex.tags?.patterns || []).some((p: string) => p.includes(search));
      if (!matchesSearch) return false;
      if (exercisePatternFilter !== "all" && !(ex.tags?.patterns || []).includes(exercisePatternFilter)) {
        return false;
      }
      if (exerciseMuscleFilter !== "all" && !(ex.tags?.muscles || []).includes(exerciseMuscleFilter)) {
        return false;
      }
      if (
        exerciseEquipmentFilter !== "all" &&
        !(ex.tags?.equipment || []).includes(exerciseEquipmentFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [
    exerciseLibrary,
    pickerSearch,
    exercisePatternFilter,
    exerciseMuscleFilter,
    exerciseEquipmentFilter,
  ]);

  const suggestedExercises = useMemo(() => {
    const pattern = pickerPatternTag || "";
    const slotType = pickerSlotType;
    const base = exerciseLibrary.filter((ex: any) => {
      if (slotType === "arms_core") {
        return (ex.tags?.muscles || []).some((m: string) => ["arms", "core"].includes(m));
      }
      if (slotType === "conditioning") {
        return /row|bike|sprint|sled|carry/i.test(ex.name);
      }
      if (pattern) {
        return (ex.tags?.patterns || []).includes(pattern);
      }
      return true;
    });
    return base.slice(0, 16);
  }, [exerciseLibrary, pickerPatternTag, pickerSlotType]);

  const recentExerciseItems = useMemo(() => {
    return recentExercises
      .map((name) => exerciseLibrary.find((ex: any) => ex.name === name) || { name })
      .filter(Boolean);
  }, [recentExercises, exerciseLibrary]);

  const favoriteExerciseItems = useMemo(() => {
    return favoriteExercises
      .map((name) => exerciseLibrary.find((ex: any) => ex.name === name) || { name })
      .filter(Boolean);
  }, [favoriteExercises, exerciseLibrary]);

  const suggestedFinishers = useMemo(() => {
    const dayName = (splitDayNames[pickerDayKey] || "").toLowerCase();
    const slotNames = (splitDaySlots[pickerDayKey] || [])
      .map((slot) => slot.exerciseName.toLowerCase());
    return FINISHER_LIBRARY.filter((fin) => {
      if (dayName.includes("push")) return fin.name.toLowerCase().includes("chest") || fin.name.toLowerCase().includes("arms");
      if (dayName.includes("pull")) return fin.name.toLowerCase().includes("back") || fin.name.toLowerCase().includes("carry");
      if (dayName.includes("leg")) return fin.name.toLowerCase().includes("leg");
      if (slotNames.some((name) => name.includes("row") || name.includes("pull"))) return fin.type === "carry";
      return fin.type === "core" || fin.type === "conditioning";
    }).slice(0, 10);
  }, [pickerDayKey, splitDayNames, splitDaySlots]);

  const filteredFinishers = useMemo(() => {
    const search = finisherSearch.trim().toLowerCase();
    return FINISHER_LIBRARY.filter((fin) => {
      const matchesSearch =
        !search ||
        fin.name.toLowerCase().includes(search) ||
        fin.type.toLowerCase().includes(search);
      if (!matchesSearch) return false;
      if (finisherTypeFilter !== "all" && fin.type !== finisherTypeFilter) return false;
      if (finisherIntensityFilter !== "all" && fin.intensity !== finisherIntensityFilter) return false;
      if (
        finisherDurationFilter !== "all" &&
        !(
          (finisherDurationFilter === "5-8" && (fin.durationMinutes || 0) <= 8) ||
          (finisherDurationFilter === "8-12" &&
            (fin.durationMinutes || 0) >= 8 &&
            (fin.durationMinutes || 0) <= 12) ||
          (finisherDurationFilter === "12-20" && (fin.durationMinutes || 0) >= 12)
        )
      ) {
        return false;
      }
      if (
        finisherEquipmentFilter !== "all" &&
        !(fin.equipment || []).includes(finisherEquipmentFilter)
      ) {
        return false;
      }
      return true;
    });
  }, [
    finisherSearch,
    finisherTypeFilter,
    finisherIntensityFilter,
    finisherDurationFilter,
    finisherEquipmentFilter,
  ]);

  const recentFinisherItems = useMemo(() => {
    return recentFinishers
      .map((id) => FINISHER_LIBRARY.find((fin) => fin.id === id))
      .filter(Boolean);
  }, [recentFinishers]);

  const favoriteFinisherItems = useMemo(() => {
    return favoriteFinishers
      .map((id) => FINISHER_LIBRARY.find((fin) => fin.id === id))
      .filter(Boolean);
  }, [favoriteFinishers]);

  const ensureSplitDay = (dayKey: string) => {
    setSplitDayExercisesByDay((prev) => {
      if (prev[dayKey]) return prev;
      return { ...prev, [dayKey]: [] };
    });
  };

  const toggleSplitDay = (dayKey: string) => {
    setSplitDays((prev) => {
      const next = prev.includes(dayKey)
        ? prev.filter((d) => d !== dayKey)
        : [...prev, dayKey];
      return next;
    });
    ensureSplitDay(dayKey);
  };

  const currentGymStep = gymSteps[gymStepIndex];
  const currentGymSetCount = Math.max(currentGymEntry?.sets?.length || 1, 1);
  const currentGymSetNumber = currentGymStep ? currentGymStep.setIndex + 1 : 1;
  const currentSuggestion =
    currentGymEntry?.exerciseName && insights?.suggestions
      ? insights.suggestions[currentGymEntry.exerciseName]
      : undefined;
  const lastTopSet = currentSuggestion?.last?.topSet;
  const nextTarget = currentSuggestion?.next;
  const previousSet =
    currentGymEntry && currentGymStep && currentGymStep.setIndex > 0
      ? currentGymEntry.sets[currentGymStep.setIndex - 1]
      : undefined;
  const repRangeText = currentGymEntry?.templateHint
    ? `${formatRepRange(currentGymEntry.templateHint.repRange)} ${
        currentGymEntry.templateHint.timeUnit === "seconds"
          ? "sec"
          : currentGymEntry.templateHint.timeUnit === "minutes"
            ? "min"
            : "reps"
      }`
    : null;
  const restText = currentGymEntry?.templateHint
    ? (() => {
        const total = Math.max(0, Math.round(currentGymEntry.templateHint.restSec || 0));
        const minutes = Math.floor(total / 60);
        const seconds = String(total % 60).padStart(2, "0");
        return `Rest ${minutes}:${seconds}`;
      })()
    : null;

  const gymModePanel = (
    <Card className="rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
      <CardHeader className={CARD_HEADER}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="!text-4xl sm:!text-5xl font-display uppercase break-words text-foreground">
              {currentGymEntry?.exerciseName || "No exercise"}
            </CardTitle>
            <div className="mt-2 flex flex-nowrap items-center gap-2 overflow-hidden">
              <div className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 ff-caption text-primary whitespace-nowrap">
                Set {currentGymSetNumber} / {currentGymSetCount}
              </div>
              {repRangeText ? (
                <div className="inline-flex items-center rounded-full bg-card/60 px-3 py-1 ff-caption text-muted-foreground whitespace-nowrap">
                  {repRangeText}
                </div>
              ) : null}
              {restText ? (
                <div className="inline-flex items-center rounded-full bg-card/60 px-3 py-1 ff-caption text-muted-foreground whitespace-nowrap">
                  {restText}
                </div>
              ) : null}
            </div>
          </div>
          <div className={BUTTON_ROW} />
        </div>
      </CardHeader>

      <CardContent className={`${CARD_PADDING} ${CARD_GAP} pt-2`}>
        {restRunning ? (
          <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-5 text-center shadow-[0_18px_40px_rgba(0,0,0,0.22)]">
            <div className="ff-kicker text-muted-foreground">Rest timer</div>
            <div className="mt-3 text-4xl md:text-5xl font-display text-primary">
              {String(Math.floor(restSeconds / 60)).padStart(2, "0")}:
              {String(restSeconds % 60).padStart(2, "0")}
            </div>
            <div className="mt-2 ff-caption text-muted-foreground">
              Next: Set {Math.min(currentGymSetNumber + 1, currentGymSetCount)} of {currentGymSetCount}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-xl"
                onClick={() => setRestRunning((v: boolean) => !v)}
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
                  setGymStepIndex((i: number) =>
                    Math.min(Math.max(gymSteps.length - 1, 0), i + 1)
                  );
                }}
              >
                Skip rest
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-4 shadow-[0_16px_34px_rgba(0,0,0,0.16)] -mt-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {previousSet?.reps && previousSet?.weight ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 h-8"
                    onClick={() =>
                      updateGymSet({
                        reps: String(previousSet.reps),
                        weight: String(previousSet.weight),
                      })
                    }
                  >
                    Last set
                  </Button>
                ) : null}
                {lastTopSet?.reps && lastTopSet?.weight ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 h-8"
                    onClick={() =>
                      updateGymSet({
                        reps: String(lastTopSet.reps),
                        weight: String(lastTopSet.weight),
                      })
                    }
                  >
                    Last week
                  </Button>
                ) : null}
                {nextTarget?.reps && nextTarget?.weight ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full px-3 h-8"
                    onClick={() =>
                      updateGymSet({
                        reps: String(nextTarget.reps),
                        weight: String(nextTarget.weight),
                      })
                    }
                  >
                    Target
                  </Button>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3">
                {currentGymEntry?.templateHint?.timeUnit ? null : (
                  <div className="space-y-1">
                    <Label>Weight ({state.settings.units})</Label>
                    <Input
                      inputMode="decimal"
                      className="h-12 text-lg rounded-xl"
                      value={currentGymSet?.weight || ""}
                      onChange={(e) => updateGymSet({ weight: e.target.value })}
                      placeholder="0"
                    />
                    <div className="flex gap-2">
                      {[-10, -5, 5, 10].map((delta) => (
                        <Button
                          key={delta}
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3 h-8"
                          onClick={() => {
                            const current = Number(currentGymSet?.weight || 0);
                            const next = Number.isFinite(current) ? current + delta : delta;
                            updateGymSet({ weight: String(Math.max(0, next)) });
                          }}
                        >
                          {delta > 0 ? `+${delta}` : delta}
                        </Button>
                      ))}
                    </div>
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
                    className="h-12 text-lg rounded-xl"
                    value={currentGymSet?.reps || ""}
                    onChange={(e) => updateGymSet({ reps: e.target.value })}
                    placeholder="0"
                  />
                  <div className="flex gap-2">
                    {[-2, -1, 1, 2].map((delta) => (
                      <Button
                        key={delta}
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 h-8"
                        onClick={() => {
                          const current = Number(currentGymSet?.reps || 0);
                          const next = Number.isFinite(current) ? current + delta : delta;
                          updateGymSet({ reps: String(Math.max(0, next)) });
                        }}
                      >
                        {delta > 0 ? `+${delta}` : delta}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>RPE</Label>
                  <Input
                    inputMode="decimal"
                    className="h-12 text-lg rounded-xl"
                    value={currentGymSet?.rpe || ""}
                    onChange={(e) => updateGymSet({ rpe: e.target.value })}
                    placeholder="8.5"
                  />
                  <div className="flex gap-2">
                    {[7, 8, 9, 10].map((val) => (
                      <Button
                        key={val}
                        size="sm"
                        variant="outline"
                        className="rounded-full px-3 h-8"
                        onClick={() => updateGymSet({ rpe: String(val) })}
                      >
                        {val}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="forge"
                className="rounded-2xl h-12 text-base"
                onClick={() => {
                  const restFromTemplate = currentGymEntry?.templateHint?.restSec ?? 0;
                  const nextRest = restPresetSec || restFromTemplate || 0;
                  setRestSeconds(nextRest);
                  setRestRunning(nextRest > 0);
                  setAutoAdvanceAfterRest(true);
                  if (nextRest <= 0) {
                    setGymStepIndex((i: number) =>
                      Math.min(Math.max(gymSteps.length - 1, 0), i + 1)
                    );
                  }
                }}
              >
                Complete set
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl h-11"
                  onClick={() => setGymStepIndex((i: number) => Math.max(0, i - 1))}
                >
                  Prev
                </Button>
                <Button variant="outline" className="rounded-2xl h-11" onClick={addGymSet}>
                  Add set
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 ff-caption text-muted-foreground">
                <span>Rest preset</span>
                {[60, 90, 120, 150].map((sec) => (
                  <Button
                    key={sec}
                    size="sm"
                    variant={restPresetSec === sec ? "forge" : "outline"}
                    className="rounded-xl h-9"
                    onClick={() => setRestPresetSec(sec)}
                  >
                    {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant={restPresetSec === 0 ? "forge" : "outline"}
                  className="rounded-xl h-9"
                  onClick={() => {
                    setRestPresetSec(0);
                  }}
                >
                  Use target
                </Button>
              </div>

            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  if (gymMode && !focusMode && logMode === "template") {
    return (
      <div className="fixed inset-0 z-[70] bg-background text-foreground flex flex-col">
        <div className="pt-[env(safe-area-inset-top)] border-b border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl">
          <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-3">
            <div className="font-semibold">Workout mode</div>
            <div className={BUTTON_ROW}>
              <Button
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  saveSession();
                  setGymMode(false);
                  setRestRunning(false);
                  setRestSeconds(0);
                  setAutoAdvanceAfterRest(false);
                }}
              >
                Save & Exit
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden px-4 md:px-8 py-3 space-y-3">
          {gymModePanel}
        </div>
      </div>
    );
  }

  return (
    <>
      {logMode === "split" || logMode === "quick" ? (
        <div className="fixed inset-0 z-[80] bg-background text-foreground flex flex-col">
          <div className="pt-[env(safe-area-inset-top)] border-b border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="px-4 md:px-8 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setLogMode("template")}
                  aria-label="Back"
                >
                  <ChevronDown className="h-5 w-5 rotate-90" />
                </Button>
                <div className="font-semibold">
                  {logMode === "split" ? "Create split" : "Quick workout"}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 md:px-8 py-4 space-y-4">
            {logMode === "split" ? (
              <Card className="rounded-3xl">
                <CardContent className={`${CARD_PADDING} ${CARD_GAP}`}>
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="ff-kicker text-muted-foreground">
                          Step {splitStep} of 3
                        </div>
                        <div className="text-lg font-semibold break-words">Create split</div>
                      </div>
                      <div className={BUTTON_ROW}>
                        {splitStep > 1 ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() =>
                              setSplitStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))
                            }
                          >
                            Back
                          </Button>
                        ) : null}
                        {splitStep < 3 ? (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() =>
                              setSplitStep((s) => (s < 3 ? ((s + 1) as 1 | 2 | 3) : 3))
                            }
                            disabled={
                              (splitStep === 1 && (!splitName.trim() || orderedSplitDays.length === 0)) ||
                              (splitStep === 2 &&
                                orderedSplitDays.some(
                                  (d: string) =>
                                    !(splitDayNames[d] || "").trim() ||
                                    (splitDayExercisesByDay[d] || []).length === 0
                                ))
                            }
                          >
                            Next
                          </Button>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ff-caption text-muted-foreground">
                      <div className="h-1 flex-1 rounded-full bg-[rgba(255,255,255,0.08)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[rgba(255,255,255,0.35)] transition-all"
                          style={{ width: `${(splitStep / 3) * 100}%` }}
                        />
                      </div>
                      <span>{Math.round((splitStep / 3) * 100)}%</span>
                    </div>
                  </div>

                  {splitStep === 1 ? (
                    <div className="space-y-4">
                      <div className={CARD_SECTION_GAP}>
                        <Label>Split name</Label>
                        <Input
                          value={splitName}
                          onChange={(e) => setSplitName(e.target.value)}
                          placeholder="Split name"
                        />
                      </div>
                      <div className={CARD_SECTION_GAP}>
                        <Label>Pick training days</Label>
                        <div className="flex flex-wrap gap-2">
                          {WEEKDAYS.map((day: any) => {
                            const active = splitDays.includes(day.key);
                            return (
                              <Button
                                key={day.key}
                                type="button"
                                size="sm"
                                variant={active ? "default" : "outline"}
                                className={`rounded-full ${active ? "bg-primary text-white border-transparent" : ""}`}
                                onClick={() => toggleSplitDay(day.key)}
                              >
                                {day.short}
                              </Button>
                            );
                          })}
                        </div>
                        <div className="ff-caption text-muted-foreground leading-relaxed break-words">
                          Pick 1–7 days. You can edit everything later.
                        </div>
                      </div>
                      <div className={CARD_SECTION_GAP}>
                        <div className="ff-caption text-muted-foreground leading-relaxed break-words">
                          You can customize each day’s workout in the next step.
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {splitStep === 2 ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Day builder</Label>
                        <div className="ff-caption text-muted-foreground">
                          Name each day and choose workouts from the library.
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {orderedSplitDays.map((dayKey: string, idx: number) => {
                          const exercises = splitDayExercisesByDay[dayKey] || [];
                          return (
                            <div
                              key={dayKey}
                              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-3"
                            >
                              <div className="space-y-1">
                                <div className="ff-kicker text-muted-foreground">
                                  {WEEKDAYS.find((d: any) => d.key === dayKey)?.label || dayKey}
                                </div>
                                <Input
                                  value={splitDayNames[dayKey] || ""}
                                  onChange={(e) =>
                                    setSplitDayNames((prev) => ({
                                      ...prev,
                                      [dayKey]: e.target.value,
                                    }))
                                  }
                                  placeholder={`Day ${idx + 1} name`}
                                />
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-sm font-semibold">Workouts</div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-full"
                                    onClick={() => openDayExercisePicker(dayKey)}
                                  >
                                    Select workouts
                                  </Button>
                                </div>
                                {exercises.length ? (
                                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {exercises.map((item, idx) => (
                                      <div
                                        key={item.name}
                                        className={`rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-3 space-y-2 ${
                                          dragExercise &&
                                          dragExercise.dayKey === dayKey &&
                                          dragExercise.index === idx
                                            ? "opacity-60"
                                            : ""
                                        }`}
                                        draggable
                                        onDragStart={(event) => {
                                          event.dataTransfer.effectAllowed = "move";
                                          setDragExercise({ dayKey, index: idx });
                                        }}
                                        onDragOver={(event) => {
                                          event.preventDefault();
                                        }}
                                        onDrop={(event) => {
                                          event.preventDefault();
                                          if (!dragExercise || dragExercise.dayKey !== dayKey) return;
                                          moveExerciseInDay(dayKey, dragExercise.index, idx);
                                          setDragExercise(null);
                                        }}
                                        onDragEnd={() => setDragExercise(null)}
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground">
                                              <GripVertical className="h-4 w-4" />
                                            </span>
                                            <div className="font-medium">{item.name}</div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Button
                                              size="icon-sm"
                                              variant="outline"
                                              className="rounded-full"
                                              onClick={() => moveExerciseInDay(dayKey, idx, idx - 1)}
                                              disabled={idx === 0}
                                              aria-label="Move up"
                                            >
                                              <ChevronUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="icon-sm"
                                              variant="outline"
                                              className="rounded-full"
                                              onClick={() => moveExerciseInDay(dayKey, idx, idx + 1)}
                                              disabled={idx === exercises.length - 1}
                                              aria-label="Move down"
                                            >
                                              <ChevronDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                              size="icon-sm"
                                              variant="outline"
                                              className="rounded-full"
                                              onClick={() => removeExerciseFromDay(dayKey, item.name)}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                          <div className="space-y-1">
                                            <div className="ff-kicker text-muted-foreground">Sets</div>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={item.sets}
                                              onChange={(e) => {
                                                const sets = Math.max(1, Number(e.target.value || 1));
                                                setSplitDayExercisesByDay((prev) => ({
                                                  ...prev,
                                                  [dayKey]: (prev[dayKey] || []).map((ex) =>
                                                    ex.name === item.name ? { ...ex, sets } : ex
                                                  ),
                                                }));
                                              }}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <div className="ff-kicker text-muted-foreground">Reps min</div>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={item.repMin}
                                              onChange={(e) => {
                                                const repMin = Math.max(1, Number(e.target.value || 1));
                                                const repMax = Math.max(repMin, item.repMax);
                                                setSplitDayExercisesByDay((prev) => ({
                                                  ...prev,
                                                  [dayKey]: (prev[dayKey] || []).map((ex) =>
                                                    ex.name === item.name ? { ...ex, repMin, repMax } : ex
                                                  ),
                                                }));
                                              }}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <div className="ff-kicker text-muted-foreground">Reps max</div>
                                            <Input
                                              type="number"
                                              min={1}
                                              value={item.repMax}
                                              onChange={(e) => {
                                                const repMax = Math.max(item.repMin, Number(e.target.value || 1));
                                                setSplitDayExercisesByDay((prev) => ({
                                                  ...prev,
                                                  [dayKey]: (prev[dayKey] || []).map((ex) =>
                                                    ex.name === item.name ? { ...ex, repMax } : ex
                                                  ),
                                                }));
                                              }}
                                            />
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <div className="ff-kicker text-muted-foreground">Format</div>
                                            <Select
                                              value={item.setType}
                                              onValueChange={(value) => {
                                                setSplitDayExercisesByDay((prev) => ({
                                                  ...prev,
                                                  [dayKey]: (prev[dayKey] || []).map((ex) =>
                                                    ex.name === item.name
                                                      ? { ...ex, setType: value as SetType }
                                                      : ex
                                                  ),
                                                }));
                                              }}
                                            >
                                              <SelectTrigger className="h-9 rounded-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                <SelectItem value="normal">Normal</SelectItem>
                                                <SelectItem value="superset">Superset</SelectItem>
                                                <SelectItem value="triset">Triset</SelectItem>
                                                <SelectItem value="circuit">Circuit</SelectItem>
                                              </SelectContent>
                                            </Select>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="ff-kicker text-muted-foreground">Group</div>
                                            <Select
                                              value={item.supersetTag}
                                              onValueChange={(value) => {
                                                setSplitDayExercisesByDay((prev) => ({
                                                  ...prev,
                                                  [dayKey]: (prev[dayKey] || []).map((ex) =>
                                                    ex.name === item.name
                                                      ? { ...ex, supersetTag: value }
                                                      : ex
                                                  ),
                                                }));
                                              }}
                                              disabled={item.setType === "normal"}
                                            >
                                              <SelectTrigger className="h-9 rounded-full">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent>
                                                {["A", "B", "C", "D", "E", "F"].map((tag) => (
                                                  <SelectItem key={tag} value={tag}>
                                                    {tag}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="ff-caption text-muted-foreground">
                                    No workouts selected yet.
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {splitStep === 3 ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border/50 bg-background/10 p-4 space-y-2">
                        <div className="font-semibold break-words">{splitName}</div>
                        <div className="ff-caption text-muted-foreground leading-relaxed break-words">
                          {orderedSplitDays.length} days •{" "}
                          {orderedSplitDays
                            .map((dayKey: string) => splitDayNames[dayKey] || dayKey)
                            .join(" / ")}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {orderedSplitDays.map((dayKey: string, idx: number) => {
                          const exercises = splitDayExercisesByDay[dayKey] || [];
                          return (
                            <div
                              key={dayKey}
                              className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-sm font-semibold">
                                  {splitDayNames[dayKey] || `Day ${idx + 1}`}
                                </div>
                                <div className="ff-caption text-muted-foreground">
                                  {exercises.length} workouts
                                </div>
                              </div>
                              {exercises.length ? (
                                <div className="flex flex-wrap gap-2">
                                  {exercises.map((item) => (
                                    <Badge key={item.name} variant="outline" className="rounded-full px-3 py-1">
                                      {item.name} • {item.sets} × {item.repMin}-{item.repMax}
                                      {item.setType !== "normal" ? ` • ${item.setType} ${item.supersetTag}` : ""}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <div className="ff-caption text-muted-foreground">
                                  No workouts selected.
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button
                        className="rounded-full h-11"
                        onClick={() => {
                          const days = orderedSplitDays;
                          if (!splitName.trim() || !days.length) {
                            alert("Add a split name and at least one day.");
                            return;
                          }
                          const templatesToAdd = days.map((dayKey: string, idx: number) => {
                            const label = splitDayNames[dayKey] || `Day ${idx + 1}`;
                            const exercises = splitDayExercisesByDay[dayKey] || [];
                            return {
                              id: uid(),
                              name: label,
                              exercises: exercises.map((item) => {
                                const found = exerciseLibrary.find((ex) => ex.name === item.name);
                                return {
                                  id: uid(),
                                  name: item.name,
                                  defaultSets: item.sets || found?.defaultSets || 3,
                                  repRange: { min: item.repMin, max: item.repMax },
                                  restSec: found?.restSec ?? 90,
                                  weightStep: found?.weightStep ?? 5,
                                  autoProgress: found?.autoProgress ?? true,
                                  timeUnit: found?.timeUnit,
                                  setType: item.setType === "normal" ? undefined : item.setType,
                                  supersetTag: item.setType === "normal" ? undefined : item.supersetTag,
                                };
                              }),
                            };
                          });

                          setState((p: any) => {
                            const nextTemplates = [...templatesToAdd, ...(p.templates || [])];
                            const nextSchedule = { ...(p.settings.schedule || emptySchedule) };
                            days.forEach((dayKey: string, idx: number) => {
                              nextSchedule[dayKey] = templatesToAdd[idx]?.id || "";
                            });
                            const split = {
                              id: uid(),
                              name: splitName.trim(),
                              createdAtISO: new Date().toISOString(),
                              days: days.map((dayKey: string, idx: number) => ({
                                day: dayKey,
                                label: splitDayNames[dayKey] || `Day ${idx + 1}`,
                                templateId: templatesToAdd[idx]?.id || "",
                                slots: splitDaySlots[dayKey] || [],
                                finishers: splitDayFinishers[dayKey] || [],
                              })),
                            };
                            return {
                              ...p,
                              templates: nextTemplates,
                              splits: [split, ...(p.splits || [])],
                              settings: { ...p.settings, schedule: nextSchedule },
                            };
                          });

                          setSelectedTemplateId(templatesToAdd[0]?.id || "");
                          setLogMode("template");
                          setSplitStep(1);
                          setSplitDays([]);
                          setSplitDayNames({});
                          setSplitDayExercisesByDay({});
                          setSplitDaySlots({});
                          setSplitDayFinishers({});
                          setFinisherEnabledByDay({});
                          setHistory([]);
                          setHistoryIndex(-1);
                          alert("Split saved!");
                        }}
                      >
                        Save split
                      </Button>
                    </div>
                  ) : null}

                </CardContent>
              </Card>
            ) : null}

            {logMode === "quick" ? (
              <Card className="rounded-3xl">
                <CardContent className={`${CARD_PADDING} ${CARD_GAP}`}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={`${CARD_SECTION_GAP} md:col-span-2`}>
                      <Label>Workout name</Label>
                      <Input
                        value={customWorkoutName}
                        onChange={(e) => setCustomWorkoutName(e.target.value)}
                        placeholder="Quick Workout"
                      />
                    </div>
                    <div className={CARD_SECTION_GAP}>
                      <Label>Date</Label>
                      <DatePickerField
                        value={sessionDate}
                        onChange={setSessionDate}
                        ariaLabel="Session date"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className={CARD_SECTION_GAP}>
                      <Label>Units</Label>
                      <Select
                        value={state.settings.units}
                        onValueChange={(v) =>
                          setState((p: any) => ({
                            ...p,
                            settings: { ...p.settings, units: v as any },
                          }))
                        }
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

                    <div className={`${CARD_SECTION_GAP} md:col-span-2`}>
                      <Label>Add exercise</Label>
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={(v) => {
                            const preset = (COMMON_EXERCISES || []).find((x: any) => x.name === v);
                            if (!preset) return;
                            setCustomExercises((prev: any) => [
                              ...prev,
                              {
                                id: uid(),
                                name: preset.name,
                                defaultSets: preset.defaultSets || 3,
                                repRange: preset.repRange || { min: 8, max: 12 },
                                restSec: preset.restSec || 90,
                                weightStep: preset.weightStep || 5,
                                autoProgress: true,
                              },
                            ]);
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Pick from library" />
                          </SelectTrigger>
                          <SelectContent>
                            {(COMMON_EXERCISES || []).map((ex: any) => (
                              <SelectItem key={ex.name} value={ex.name}>
                                {ex.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          onClick={() => {
                            setCustomExercises((prev: any) => [
                              ...prev,
                              {
                                id: uid(),
                                name: "New Exercise",
                                defaultSets: 3,
                                repRange: { min: 8, max: 12 },
                                restSec: 90,
                                weightStep: 5,
                                autoProgress: true,
                              },
                            ]);
                          }}
                        >
                          Add custom
                        </Button>
                      </div>
                    </div>
                  </div>

                  {(customExercises || []).length === 0 ? (
                    <div className={BODY_TEXT}>
                      Add at least one exercise to start.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(customExercises || []).map((ex: any) => (
                        <div
                          key={ex.id}
                          className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3 flex flex-wrap items-center gap-2"
                        >
                          <Input
                            className="flex-1 min-w-[160px]"
                            value={ex.name}
                            onChange={(e) => {
                              const v = e.target.value;
                              setCustomExercises((prev: any) =>
                                prev.map((x: any) => (x.id === ex.id ? { ...x, name: v } : x))
                              );
                            }}
                          />
                          <Input
                            className="h-9 w-16"
                            inputMode="numeric"
                            value={String(ex.defaultSets || 3)}
                            onChange={(e) => {
                              const v = Number(e.target.value || 3);
                              setCustomExercises((prev: any) =>
                                prev.map((x: any) =>
                                  x.id === ex.id ? { ...x, defaultSets: v || 1 } : x
                                )
                              );
                            }}
                          />
                          <Button
                            size="icon-sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() =>
                              setCustomExercises((prev: any) => prev.filter((x: any) => x.id !== ex.id))
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className={BUTTON_ROW}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        if ((customExercises || []).length === 0) {
                          alert("Add at least one exercise first.");
                          return;
                        }
                        const newTemplate = {
                          id: uid(),
                          name: (customWorkoutName || "Quick Workout").trim() || "Quick Workout",
                          exercises: (customExercises || []).map((e: any) => ({
                            ...e,
                            id: e.id || uid(),
                          })),
                        };
                        setState((p: any) => ({
                          ...p,
                          templates: [newTemplate, ...(p.templates || [])],
                        }));
                        setSelectedTemplateId(newTemplate.id);
                        setLogMode("template");
                        alert("Saved as a template!");
                      }}
                    >
                      Save as template
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => {
                        if ((customExercises || []).length === 0) {
                          alert("Add at least one exercise first.");
                          return;
                        }
                        setLogMode("template");
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className={SECTION_GAP}>
      {focusMode ? null : (
        <TrainingToolsCard
          onOpenTemplates={() => setTemplateDialogOpen(true)}
          onOpenGenerator={() => setGeneratorOpen(true)}
          onOpenImport={() => setImportDialogOpen(true)}
        />
      )}

      {focusMode ? null : (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className={CARD_HEADER}>
            <CardTitle className={SECTION_LABEL}>
              <ClipboardList className="h-5 w-5" /> Set today’s workout
            </CardTitle>
            <CardDescription className={BODY_TEXT}>
              Pick a template from your scheduled split workouts.
            </CardDescription>
          </CardHeader>
          <CardContent className={`${CARD_PADDING} ${CARD_GAP}`}>
            {scheduledTemplateOptions.length ? (
              <div className={CARD_SECTION_GAP}>
                <Label>Workout</Label>
                <Select value={todayWorkoutDayKey} onValueChange={setTodayWorkout}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="Choose today’s workout" />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduledTemplateOptions.map((option) => (
                      <SelectItem key={option.dayKey} value={option.dayKey}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ff-caption text-muted-foreground">
                  Sets today’s workout without changing your weekly schedule.
                </div>
              </div>
            ) : (
              <div className={BODY_TEXT}>
                Assign templates to your schedule in Settings to see them here.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {focusMode || !hasSessions ? null : (
        <Card className="rounded-2xl shadow-sm">
          <CardHeader className={`${CARD_HEADER} pb-1`}>
            <CardTitle className={SECTION_LABEL}>
              <Sparkles className="h-5 w-5" /> Coach suggestions
            </CardTitle>
            <CardDescription className={BODY_TEXT}>
              Accept or skip. Suggestions auto-adjust based on your last sessions.
            </CardDescription>
          </CardHeader>
          <CardContent className={`${CARD_PADDING} pt-2 space-y-2`}>
            {Object.keys(insights.suggestions).length === 0 ? (
              <div className={BODY_TEXT}>
                Log a few workouts with top sets to unlock suggestions.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(insights.suggestions)
                  .slice(0, 8)
                  .map(([name, s]: any) => (
                    <div key={name} className="rounded-2xl border p-3">
                      <div className="font-medium">{name}</div>
                      <div className={`${BODY_TEXT} mt-1`}>
                        Next: {s.next.weight}
                        {state.settings.units} × {s.next.reps}
                      </div>
                      <div className="ff-caption text-muted-foreground mt-1">{s.reason}</div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {focusMode ? null : (
        <Card className={`rounded-2xl shadow-sm ${setupCollapsed ? "py-1" : ""}`}>
          <CardHeader className={setupCollapsed ? "px-4 py-2" : `${CARD_HEADER} pb-1`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle
                  className={`${SECTION_LABEL} ${setupCollapsed ? "text-sm" : "text-sm md:text-base"}`}
                >
                  {setupCollapsed ? null : <ClipboardList className="h-5 w-5" />}
                  {setupCollapsed ? "Setup" : "Workout setup"}
                </CardTitle>
                {setupCollapsed ? null : (
                  <CardDescription className={BODY_TEXT}>
                    Choose a template or build a custom workout before you start logging.
                  </CardDescription>
                )}
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                className="rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSetupCollapsed((v: boolean) => !v)}
                aria-label={setupCollapsed ? "Expand workout setup" : "Collapse workout setup"}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    setupCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </Button>
            </div>
          </CardHeader>

          <CardContent className={`${CARD_PADDING} pt-2 space-y-3 ${setupCollapsed ? "hidden" : ""}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className={BUTTON_ROW}>
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
                  variant={logMode === "split" ? "default" : "outline"}
                  onClick={() => setLogMode("split")}
                >
                  Create split
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl"
                  variant={logMode === "quick" ? "default" : "outline"}
                  onClick={() => setLogMode("quick")}
                >
                  Quick workout
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
              ) : logMode === "quick" ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    if ((customExercises || []).length === 0) {
                      alert("Add at least one exercise first.");
                      return;
                    }
                    const newTemplate = {
                      id: uid(),
                      name:
                        (customWorkoutName || "Quick Workout").trim() || "Quick Workout",
                      exercises: (customExercises || []).map((e: any) => ({
                        ...e,
                        id: e.id || uid(),
                      })),
                    };
                    setState((p: any) => ({
                      ...p,
                      templates: [newTemplate, ...(p.templates || [])],
                    }));
                    setSelectedTemplateId(newTemplate.id);
                    setLogMode("template");
                    alert("Saved as a template!");
                  }}
                >
                  Save as template
                </Button>
              ) : null}
            </div>

            {logMode === "template" ? (
              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1fr_1fr] gap-3">
                <div className={CARD_SECTION_GAP}>
                  <Label>Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger className="w-full min-w-0">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent
                      position="popper"
                      align="start"
                      sideOffset={8}
                      className="max-h-[60vh] overflow-y-auto"
                    >
                      {(state.templates || []).map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className={CARD_SECTION_GAP}>
                  <Label>Date</Label>
                  <DatePickerField
                    value={sessionDate}
                    onChange={setSessionDate}
                    ariaLabel="Session date"
                  />
                </div>
                <div className={CARD_SECTION_GAP}>
                  <Label>Units</Label>
                  <Select
                    value={state.settings.units}
                    onValueChange={(v) =>
                      setState((p: any) => ({
                        ...p,
                        settings: { ...p.settings, units: v as any },
                      }))
                    }
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
            ) : logMode === "split" ? (
              <div className="rounded-2xl border border-border/50 bg-background/10 p-4">
                <div className={BODY_TEXT}>
                  Create split opens in full screen. Use the button above.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`${CARD_SECTION_GAP} md:col-span-2`}>
                    <Label>Workout name</Label>
                    <Input
                      value={customWorkoutName}
                      onChange={(e) => setCustomWorkoutName(e.target.value)}
                      placeholder="Quick Workout"
                    />
                  </div>
                  <div className={CARD_SECTION_GAP}>
                    <Label>Date</Label>
                    <DatePickerField
                      value={sessionDate}
                      onChange={setSessionDate}
                      ariaLabel="Session date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={CARD_SECTION_GAP}>
                    <Label>Units</Label>
                    <Select
                      value={state.settings.units}
                      onValueChange={(v) =>
                        setState((p: any) => ({
                          ...p,
                          settings: { ...p.settings, units: v as any },
                        }))
                      }
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

                  <div className={`${CARD_SECTION_GAP} md:col-span-2`}>
                    <Label>Add exercise</Label>
                    <div className="flex items-center gap-2">
                      <Select
                        onValueChange={(v) => {
                          const preset = (COMMON_EXERCISES || []).find((x: any) => x.name === v);
                          if (!preset) return;
                          setCustomExercises((prev: any) => [
                            ...(prev || []),
                            { id: uid(), ...preset },
                          ]);
                        }}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Pick from common exercises" />
                        </SelectTrigger>
                        <SelectContent>
                          {(COMMON_EXERCISES || []).map((item: any) => (
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
                          setCustomExercises((prev: any) => [
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
                  <div className={BODY_TEXT}>
                    Add a few exercises to start building your workout.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(customExercises || []).map((ex: any) => (
                      <div key={ex.id} className="rounded-2xl border p-3">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="ff-caption">Name</Label>
                              <Input
                                value={ex.name}
                                onChange={(e) =>
                                  setCustomExercises((prev: any) =>
                                    (prev || []).map((x: any) =>
                                      x.id === ex.id ? { ...x, name: e.target.value } : x
                                    )
                                  )
                                }
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="ff-caption">Sets</Label>
                                <Input
                                  inputMode="numeric"
                                  value={ex.defaultSets}
                                  onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 1, 1, 12);
                                    setCustomExercises((prev: any) =>
                                      (prev || []).map((x: any) =>
                                        x.id === ex.id ? { ...x, defaultSets: v } : x
                                      )
                                    );
                                  }}
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="ff-caption">Min</Label>
                                <Input
                                  inputMode="numeric"
                                  value={ex.repRange?.min ?? 8}
                                  onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 1, 1, 999);
                                    setCustomExercises((prev: any) =>
                                      (prev || []).map((x: any) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              repRange: {
                                                min: v,
                                                max: Math.max(v, x.repRange?.max ?? 12),
                                              },
                                            }
                                          : x
                                      )
                                    );
                                  }}
                                />
                              </div>

                              <div className="space-y-1">
                                <Label className="ff-caption">Max</Label>
                                <Input
                                  inputMode="numeric"
                                  value={ex.repRange?.max ?? 12}
                                  onChange={(e) => {
                                    const v = clamp(Number(e.target.value) || 1, 1, 999);
                                    setCustomExercises((prev: any) =>
                                      (prev || []).map((x: any) =>
                                        x.id === ex.id
                                          ? {
                                              ...x,
                                              repRange: {
                                                min: Math.min(x.repRange?.min ?? 8, v),
                                                max: v,
                                              },
                                            }
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
                              setCustomExercises((prev: any) =>
                                (prev || []).filter((x: any) => x.id !== ex.id)
                              )
                            }
                            aria-label="Delete exercise"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="space-y-1">
                            <Label className="ff-caption">Rest (sec)</Label>
                            <Input
                              inputMode="numeric"
                              value={ex.restSec}
                              onChange={(e) => {
                                const v = clamp(Number(e.target.value) || 0, 0, 600);
                                setCustomExercises((prev: any) =>
                                  (prev || []).map((x: any) =>
                                    x.id === ex.id ? { ...x, restSec: v } : x
                                  )
                                );
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="ff-caption">Weight step</Label>
                            <Input
                              inputMode="decimal"
                              value={ex.weightStep}
                              onChange={(e) => {
                                const v = clamp(Number(e.target.value) || 1, 0, 50);
                                setCustomExercises((prev: any) =>
                                  (prev || []).map((x: any) =>
                                    x.id === ex.id ? { ...x, weightStep: v } : x
                                  )
                                );
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                            <div>
                              <div className="ff-caption font-medium">Auto-progress</div>
                              <div className="ff-caption text-muted-foreground leading-relaxed">
                                Enable coach suggestions
                              </div>
                            </div>
                            <Switch
                              checked={!!ex.autoProgress}
                              onCheckedChange={(v) =>
                                setCustomExercises((prev: any) =>
                                  (prev || []).map((x: any) =>
                                    x.id === ex.id ? { ...x, autoProgress: v } : x
                                  )
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
      )}

      <Card className="rounded-2xl shadow-sm">
        <CardHeader className={CARD_HEADER}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className={SECTION_LABEL}>
                <ClipboardList className="h-5 w-5" /> Log today’s workout
              </CardTitle>
              <CardDescription className={BODY_TEXT}>
                Pick a template, log your sets, and let ForgeFit suggest the next goal.
              </CardDescription>
            </div>
            {scheduleInfo.templateId ? (
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl"
                onClick={() => setTemplateDialogOpen(true)}
              >
                Edit template
              </Button>
            ) : null}
          </div>
        </CardHeader>

        <CardContent className={`${CARD_PADDING} ${CARD_GAP}`}>
          {scheduleInfo.isRestDay && !forceLog ? (
            <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-4 space-y-3 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
              <div className="ff-kicker text-muted-foreground">
                Recovery Ideas
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="font-medium">Mobility Reset</div>
                  <div className={BODY_TEXT}>
                    15-20 min hips, thoracic, ankles + banded shoulder work.
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="font-medium">Easy Cardio</div>
                  <div className={BODY_TEXT}>
                    25-35 min incline walk or bike, conversational pace.
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="font-medium">Soft Tissue</div>
                  <div className={BODY_TEXT}>
                    Foam roll quads, lats, glutes, and calves for 8-10 min.
                  </div>
                </div>
                <div className="rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3">
                  <div className="font-medium">Breath + Core</div>
                  <div className={BODY_TEXT}>
                    3 rounds: dead bug 10/side, side plank 30s/side.
                  </div>
                </div>
              </div>
            </div>
          ) : !scheduleInfo.templateId ? (
            <div className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-4 space-y-3 shadow-[0_16px_34px_rgba(0,0,0,0.16)]">
              <div className="ff-kicker text-muted-foreground">
                No Workout Assigned
              </div>
              <div className={BODY_TEXT}>
                Assign a template to this day in Settings → Weekly schedule, or add a new workout
                template.
              </div>
              <div className={BUTTON_ROW}>
                <Button size="sm" className="rounded-xl" onClick={() => setTemplateDialogOpen(true)}>
                  Manage templates
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => props.ctx.setActiveTab("log")}
                >
                  Log anyway
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {groupedMainEntries.map((group: any, idx: number) => {
                  if (group.type === "superset" || group.type === "triset" || group.type === "circuit") {
                    return (
                      <Card
                        key={`superset_${group.tag}_${idx}`}
                        className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]"
                      >
                        <CardHeader className={`${CARD_HEADER} pb-2`}>
                          <CardTitle className={SECTION_LABEL}>
                            {group.type === "triset"
                              ? "Triset"
                              : group.type === "circuit"
                                ? "Circuit"
                                : "Superset"}{" "}
                            {group.tag}
                          </CardTitle>
                          <CardDescription className={BODY_TEXT}>
                            {group.entries.map((e: any) => e.exerciseName).join(" + ")}
                          </CardDescription>
                          <div className="mt-2 ff-caption text-muted-foreground">
                            {group.type === "triset"
                              ? "Order: A → B → C for set 1, repeat for set 2, etc."
                              : group.type === "circuit"
                                ? "Cycle through each movement before resting, repeat for set 2, etc."
                                : "Order: A then B for set 1, repeat for set 2, etc."}
                          </div>
                        </CardHeader>
                        <CardContent className={`${CARD_PADDING} ${CARD_GAP}`}>
                          {group.type === "superset" && group.entries.length === 2 ? (
                            <ImportedSupersetLogger
                              entries={group.entries as any}
                              units={state.settings.units}
                              suggestions={insights.suggestions}
                              onChange={(id: string, next: any) => {
                                setWorkingEntries((prev: any) =>
                                  prev.map((p: any) => (p.exerciseId === id ? next : p))
                                );
                              }}
                            />
                          ) : group.type === "triset" && group.entries.length === 3 ? (
                            <ImportedTrisetLogger
                              entries={group.entries as any}
                              units={state.settings.units}
                              suggestions={insights.suggestions}
                              onChange={(id: string, next: any) => {
                                setWorkingEntries((prev: any) =>
                                  prev.map((p: any) => (p.exerciseId === id ? next : p))
                                );
                              }}
                            />
                          ) : (
                            group.entries.map((entry: any) => (
                              <ImportedExerciseLogger
                                key={entry.exerciseId}
                                variant="plain"
                                index={mainIndexMap.get(entry.exerciseId) || 0}
                                entry={entry}
                                units={state.settings.units}
                                suggestion={insights.suggestions[entry.exerciseName]}
                                onChange={(next: any) => {
                                  setWorkingEntries((prev: any) =>
                                    prev.map((p: any) =>
                                      p.exerciseId === next.exerciseId ? next : p
                                    )
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
                    <ImportedExerciseLogger
                      key={entry.exerciseId}
                      index={mainIndexMap.get(entry.exerciseId) || 0}
                      entry={entry}
                      units={state.settings.units}
                      suggestion={insights.suggestions[entry.exerciseName]}
                      onChange={(next: any) => {
                        setWorkingEntries((prev: any) =>
                          prev.map((p: any) =>
                            p.exerciseId === next.exerciseId ? next : p
                          )
                        );
                      }}
                    />
                  );
                })}

                {finisherEntries.length > 0 && (
                  <details className="rounded-2xl border bg-muted/30 p-4">
                    <summary className="cursor-pointer font-medium flex items-center justify-between text-sm">
                      <span>Finishers</span>
                      <Badge variant="secondary" className="rounded-xl">
                        5–10 min
                      </Badge>
                    </summary>
                    <div className="mt-4 space-y-3">
                      {finisherEntries.map((entry: any, idx: number) => (
                        <ImportedExerciseLogger
                          key={entry.exerciseId}
                          index={idx}
                          entry={entry}
                          units={state.settings.units}
                          suggestion={insights.suggestions[entry.exerciseName]}
                          onChange={(next: any) => {
                            setWorkingEntries((prev: any) =>
                              prev.map((p: any) =>
                                p.exerciseId === next.exerciseId ? next : p
                              )
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
                <Input
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="How did it feel?"
                />
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className={BODY_TEXT}>
                  Tip: Log your top set — ForgeFit handles the math and progression.
                </div>
                <Button className="rounded-2xl" onClick={saveSession}>
                  <Save className="h-4 w-4 mr-2" /> Save session
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dayExercisePickerOpen} onOpenChange={setDayExercisePickerOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Select workouts for{" "}
              {WEEKDAYS.find((d: any) => d.key === dayExercisePickerDayKey)?.label ||
                dayExercisePickerDayKey}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[220px,1fr] gap-3">
              <Select value={dayExerciseCategory} onValueChange={setDayExerciseCategory}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {EXERCISE_CATALOG.map((category) => (
                    <SelectItem key={category.title} value={category.title}>
                      {category.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={dayExerciseSearch}
                onChange={(e) => setDayExerciseSearch(e.target.value)}
                placeholder="Search exercises"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              {filteredExerciseCatalog.map((category) => (
                <div key={category.title} className="space-y-3">
                  <div className="text-sm font-semibold">{category.title}</div>
                  {category.groups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <div className="ff-kicker text-muted-foreground">{group.title}</div>
                      <div className="flex flex-wrap gap-2">
                        {group.items.map((name) => {
                          const selected = (splitDayExercisesByDay[dayExercisePickerDayKey] || []).some(
                            (item) => item.name === name
                          );
                          return (
                            <Button
                              key={name}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              className="rounded-full gap-2"
                              onClick={() =>
                                selected
                                  ? removeExerciseFromDay(dayExercisePickerDayKey, name)
                                  : addExerciseToDay(dayExercisePickerDayKey, name)
                              }
                            >
                              {selected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                              {name}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setDayExercisePickerOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy day to…</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className={BODY_TEXT}>
              Choose the days that should receive the same slots and finishers.
            </div>
            <div className="flex flex-wrap gap-2">
              {orderedSplitDays.map((dayKey: string) => {
                const active = copyTargets.includes(dayKey);
                return (
                  <Button
                    key={dayKey}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    className="rounded-full"
                    onClick={() =>
                      setCopyTargets((prev) =>
                        prev.includes(dayKey)
                          ? prev.filter((d) => d !== dayKey)
                          : [...prev, dayKey]
                      )
                    }
                  >
                    {(splitDayNames[dayKey] || dayKey).toUpperCase()}
                  </Button>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={copyDayToTargets}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Swap exercise</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <Input
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder="Search exercises..."
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                className="rounded-full"
                onClick={() => setPickerTab("all")}
              >
                All exercises
              </Button>
            </div>
            <Tabs value={pickerTab} onValueChange={(v) => setPickerTab(v as any)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="suggested">Suggested</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <Select value={exercisePatternFilter} onValueChange={setExercisePatternFilter}>
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Pattern" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All patterns</SelectItem>
                    {exercisePatternOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={exerciseMuscleFilter} onValueChange={setExerciseMuscleFilter}>
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Muscle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All muscles</SelectItem>
                    {exerciseMuscleOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={exerciseEquipmentFilter} onValueChange={setExerciseEquipmentFilter}>
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All equipment</SelectItem>
                    {exerciseEquipmentOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-2 flex items-center justify-between rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2">
                <div className="ff-caption text-muted-foreground">
                  Apply this swap to all similar days
                </div>
                <Switch checked={applySwapToAll} onCheckedChange={setApplySwapToAll} />
              </div>

              <TabsContent value="suggested" className="mt-3">
                <div className="space-y-2 max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
                  {suggestedExercises.map((ex: any) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div>
                        <div className="font-medium">{ex.name}</div>
                        <div className="ff-caption text-muted-foreground">
                          {(ex.tags?.patterns || []).join(", ")}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            updateSlotExercise(pickerDayKey, pickerSlotId, ex.name, applySwapToAll);
                            setExercisePickerOpen(false);
                          }}
                        >
                          Select
                        </Button>
                        <Button
                          size="icon-sm"
                          variant={favoriteExercises.includes(ex.name) ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => toggleFavoriteExercise(ex.name)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="recent" className="mt-3">
                <div className="space-y-2 max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
                  {recentExerciseItems.length === 0 ? (
                    <div className={BODY_TEXT}>No recent swaps yet.</div>
                  ) : (
                    recentExerciseItems.map((ex: any) => (
                      <div
                        key={ex.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                      >
                        <div className="font-medium">{ex.name}</div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            updateSlotExercise(pickerDayKey, pickerSlotId, ex.name, applySwapToAll);
                            setExercisePickerOpen(false);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="mt-3">
                <div className="space-y-2 max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
                  {favoriteExerciseItems.length === 0 ? (
                    <div className={BODY_TEXT}>No favorites yet.</div>
                  ) : (
                    favoriteExerciseItems.map((ex: any) => (
                      <div
                        key={ex.name}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                      >
                        <div className="font-medium">{ex.name}</div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            updateSlotExercise(pickerDayKey, pickerSlotId, ex.name, applySwapToAll);
                            setExercisePickerOpen(false);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-3">
                <div className="space-y-2 max-h-[45vh] overflow-y-auto overscroll-contain pr-1">
                  {filteredExercises.map((ex: any) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div>
                        <div className="font-medium">{ex.name}</div>
                        <div className="ff-caption text-muted-foreground">
                          {(ex.tags?.muscles || []).join(", ")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          updateSlotExercise(pickerDayKey, pickerSlotId, ex.name, applySwapToAll);
                          setExercisePickerOpen(false);
                        }}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3 space-y-2">
                  <div className="ff-caption text-muted-foreground">
                    Add a custom exercise (appears in this slot only).
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <Input
                      value={customExerciseName}
                      onChange={(e) => setCustomExerciseName(e.target.value)}
                      placeholder="Custom exercise name"
                    />
                    <Button
                      className="rounded-full"
                      onClick={() => {
                        const name = customExerciseName.trim();
                        if (!name) return;
                        updateSlotExercise(pickerDayKey, pickerSlotId, name, applySwapToAll);
                        setCustomExerciseName("");
                        setExercisePickerOpen(false);
                      }}
                    >
                      Add custom
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={finisherPickerOpen} onOpenChange={setFinisherPickerOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add finisher</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <Input
                value={finisherSearch}
                onChange={(e) => setFinisherSearch(e.target.value)}
                placeholder="Search finishers..."
                className="flex-1"
              />
            </div>
            <Tabs value={finisherTab} onValueChange={(v) => setFinisherTab(v as any)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="suggested">Suggested</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
                <Select
                  value={finisherTypeFilter}
                  onValueChange={(v) => setFinisherTypeFilter(v as any)}
                >
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="pump">Pump</SelectItem>
                    <SelectItem value="conditioning">Conditioning</SelectItem>
                    <SelectItem value="core">Core</SelectItem>
                    <SelectItem value="mobility">Mobility</SelectItem>
                    <SelectItem value="carry">Carry</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={finisherIntensityFilter}
                  onValueChange={(v) => setFinisherIntensityFilter(v as any)}
                >
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Intensity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All intensity</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={finisherDurationFilter}
                  onValueChange={(v) => setFinisherDurationFilter(v as any)}
                >
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All durations</SelectItem>
                    <SelectItem value="5-8">5–8 min</SelectItem>
                    <SelectItem value="8-12">8–12 min</SelectItem>
                    <SelectItem value="12-20">12–20 min</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={finisherEquipmentFilter}
                  onValueChange={setFinisherEquipmentFilter}
                >
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All equipment</SelectItem>
                    {finisherEquipmentOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <TabsContent value="suggested" className="mt-3">
                <div className="space-y-2">
                  {suggestedFinishers.map((fin) => (
                    <div
                      key={fin.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div>
                        <div className="font-medium">{fin.name}</div>
                        <div className="ff-caption text-muted-foreground">
                          {fin.type.toUpperCase()} • {fin.durationMinutes ? `${fin.durationMinutes} min` : `${fin.rounds} rounds`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            addFinisherInstance(pickerDayKey, fin, finisherSwapId || undefined);
                            setFinisherSwapId("");
                            setFinisherPickerOpen(false);
                          }}
                        >
                          Add
                        </Button>
                        <Button
                          size="icon-sm"
                          variant={favoriteFinishers.includes(fin.id) ? "default" : "outline"}
                          className="rounded-full"
                          onClick={() => toggleFavoriteFinisher(fin.id)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="recent" className="mt-3">
                <div className="space-y-2">
                  {recentFinisherItems.length === 0 ? (
                    <div className={BODY_TEXT}>No recent finishers yet.</div>
                  ) : (
                    recentFinisherItems.map((fin: any) => (
                      <div
                        key={fin.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                      >
                        <div className="font-medium">{fin.name}</div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            addFinisherInstance(pickerDayKey, fin, finisherSwapId || undefined);
                            setFinisherSwapId("");
                            setFinisherPickerOpen(false);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="favorites" className="mt-3">
                <div className="space-y-2">
                  {favoriteFinisherItems.length === 0 ? (
                    <div className={BODY_TEXT}>No favorites yet.</div>
                  ) : (
                    favoriteFinisherItems.map((fin: any) => (
                      <div
                        key={fin.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                      >
                        <div className="font-medium">{fin.name}</div>
                        <Button
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            addFinisherInstance(pickerDayKey, fin, finisherSwapId || undefined);
                            setFinisherSwapId("");
                            setFinisherPickerOpen(false);
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="all" className="mt-3">
                <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                  {filteredFinishers.map((fin) => (
                    <div
                      key={fin.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div>
                        <div className="font-medium">{fin.name}</div>
                        <div className="ff-caption text-muted-foreground">
                          {fin.type.toUpperCase()} • {fin.intensity}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => {
                          addFinisherInstance(pickerDayKey, fin, finisherSwapId || undefined);
                          setFinisherSwapId("");
                          setFinisherPickerOpen(false);
                        }}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3 space-y-2">
                  <div className="ff-caption text-muted-foreground">
                    Create a custom finisher.
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input
                      value={customFinisherName}
                      onChange={(e) => setCustomFinisherName(e.target.value)}
                      placeholder="Finisher name"
                    />
                    <Select value={customFinisherType} onValueChange={(v) => setCustomFinisherType(v as any)}>
                      <SelectTrigger className="h-9 rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pump">Pump</SelectItem>
                        <SelectItem value="conditioning">Conditioning</SelectItem>
                        <SelectItem value="core">Core</SelectItem>
                        <SelectItem value="mobility">Mobility</SelectItem>
                        <SelectItem value="carry">Carry</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={customFinisherIntensity}
                      onValueChange={(v) => setCustomFinisherIntensity(v as any)}
                    >
                      <SelectTrigger className="h-9 rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={customFinisherDuration}
                      onChange={(e) => setCustomFinisherDuration(e.target.value)}
                      placeholder="Duration (min)"
                    />
                    <Input
                      value={customFinisherRounds}
                      onChange={(e) => setCustomFinisherRounds(e.target.value)}
                      placeholder="Rounds"
                    />
                  </div>
                  <Button
                    className="rounded-full"
                    onClick={() => {
                      const name = customFinisherName.trim();
                      if (!name) return;
                      const durationMinutes = Number(customFinisherDuration || 0) || undefined;
                      const rounds = Number(customFinisherRounds || 0) || undefined;
                      const nextFinisher: FinisherDefinition = {
                        id: `custom-${uid()}`,
                        name,
                        type: customFinisherType,
                        intensity: customFinisherIntensity,
                        durationMinutes,
                        rounds,
                      };
                      addFinisherInstance(pickerDayKey, nextFinisher, finisherSwapId || undefined);
                      setFinisherSwapId("");
                      setCustomFinisherName("");
                      setCustomFinisherDuration("");
                      setCustomFinisherRounds("");
                      setFinisherPickerOpen(false);
                    }}
                  >
                    Add custom finisher
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      <Separator />
    </div>
    </>
  );
}
