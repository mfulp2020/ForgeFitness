import { WORKOUT_LIBRARY_V1 } from "@/app/data/workoutLibraryV1";
import { EXERCISE_CATALOG } from "./exercise-catalog";
import type { ExperienceLevel, FocusType, RepRange, Template, TemplateExercise } from "./types";

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

type ParsedPrescription = {
  sets: number;
  repRange: RepRange;
  timeUnit?: "seconds" | "minutes";
  restSec?: number;
  isAmrap?: boolean;
};

const defaultRepRange: RepRange = { min: 8, max: 12 };

const coalesceRange = (min: number, max?: number): RepRange => ({
  min,
  max: max ?? min,
});

const parseIntSafe = (value?: string) => {
  if (!value) return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parsePrescription = (raw: string): ParsedPrescription => {
  const text = raw.trim().toLowerCase();

  if (!text) {
    return { sets: 1, repRange: defaultRepRange };
  }

  const intervalMatch = text.match(/(\d+)x:?(\d+)[s]?:\/?(\d+)/i);
  if (intervalMatch) {
    const sets = parseIntSafe(intervalMatch[1]);
    const work = parseIntSafe(intervalMatch[2]);
    const rest = parseIntSafe(intervalMatch[3]);
    return {
      sets,
      repRange: coalesceRange(work),
      timeUnit: "seconds",
      restSec: rest,
    };
  }

  const roundMatch = text.match(/(\d+)(?:-(\d+))?\s*rounds?(?:\s+(\d+)-(\d+))?/i);
  if (roundMatch) {
    const sets = Math.max(parseIntSafe(roundMatch[1]), parseIntSafe(roundMatch[2]) || 0) || 1;
    const repMin = parseIntSafe(roundMatch[3]);
    const repMax = parseIntSafe(roundMatch[4]);
    const repRange = repMin ? coalesceRange(repMin, repMax || repMin) : { min: 1, max: 1 };
    return { sets, repRange };
  }

  const amrapMatch = text.match(/(\d+)(?:-(\d+))?\s*sets?\s*amrap/i);
  if (amrapMatch) {
    const sets = Math.max(parseIntSafe(amrapMatch[1]), parseIntSafe(amrapMatch[2]) || 0) || 1;
    return { sets, repRange: { min: 8, max: 20 }, isAmrap: true };
  }

  const setMatch = text.match(/(\d+)(?:-(\d+))?\s*sets?/i);
  if (setMatch && !text.includes("x")) {
    const sets = Math.max(parseIntSafe(setMatch[1]), parseIntSafe(setMatch[2]) || 0) || 1;
    return { sets, repRange: { min: 1, max: 1 } };
  }

  const timeMatch = text.match(/(\d+)(?:-(\d+))?\s*min/i);
  if (timeMatch) {
    const min = parseIntSafe(timeMatch[1]);
    const max = parseIntSafe(timeMatch[2]) || min;
    return { sets: 1, repRange: coalesceRange(min, max), timeUnit: "minutes" };
  }

  const repSecondsMatch = text.match(/(\d+)(?:-(\d+))?x(\d+)(?:-(\d+))?s/i);
  if (repSecondsMatch) {
    const sets = Math.max(parseIntSafe(repSecondsMatch[1]), parseIntSafe(repSecondsMatch[2]) || 0) || 1;
    const min = parseIntSafe(repSecondsMatch[3]);
    const max = parseIntSafe(repSecondsMatch[4]) || min;
    return { sets, repRange: coalesceRange(min, max), timeUnit: "seconds" };
  }

  const secondsMatch = text.match(/(\d+)(?:-(\d+))?\s*s(?:ec)?/i);
  if (secondsMatch) {
    const min = parseIntSafe(secondsMatch[1]);
    const max = parseIntSafe(secondsMatch[2]) || min;
    return { sets: 1, repRange: coalesceRange(min, max), timeUnit: "seconds" };
  }

  const repMatch = text.match(/(\d+)(?:-(\d+))?x(\d+)(?:-(\d+))?/i);
  if (repMatch) {
    const sets = Math.max(parseIntSafe(repMatch[1]), parseIntSafe(repMatch[2]) || 0) || 1;
    const min = parseIntSafe(repMatch[3]);
    const max = parseIntSafe(repMatch[4]) || min;
    return { sets, repRange: coalesceRange(min, max) };
  }

  return { sets: 1, repRange: defaultRepRange };
};

const isConditioning = (name: string) =>
  /zone 2|conditioning|interval|mobility|primer|cool-down|recovery|carry/i.test(name);

const isCoreMovement = (name: string) =>
  /core|crunch|pallof|plank|ab|carry/i.test(name);

const isCardioMovement = (name: string) =>
  /zone 2|interval|bike|sprint|conditioning|cool-?down|recovery/i.test(name);

const isCoreOrCardio = (name: string) =>
  isCoreMovement(name) || isCardioMovement(name);

const isCompound = (name: string) =>
  /squat|deadlift|hinge|bench|press|row|pull-up|pulldown|chin[- ]?up|hip thrust|split squat|leg press/i.test(
    name
  );

const deriveWeightStep = (name: string, timeUnit?: "seconds" | "minutes") => {
  if (timeUnit) return 0;
  if (/curl|raise|fly|pressdown|extension|face pull/i.test(name)) return 2.5;
  if (/press|row|squat|deadlift|hip thrust/i.test(name)) return 5;
  return 5;
};

const deriveRestSec = (
  focus: FocusType,
  compound: boolean,
  conditioning: boolean,
  override?: number
) => {
  if (override) return override;
  if (conditioning) return 0;

  const base = compound ? 120 : 75;
  if (focus === "strength") return compound ? 180 : 120;
  if (focus === "hypertrophy") return compound ? 150 : 90;
  if (focus === "fat_loss") return compound ? 90 : 60;
  if (focus === "athletic") return compound ? 180 : 90;
  return base;
};

const applyModeAdjustments = (
  exercise: TemplateExercise,
  focus: FocusType,
  isAccessory: boolean
) => {
  const next = { ...exercise };

  if (focus === "strength" && isAccessory) {
    next.defaultSets = Math.max(1, Math.round(next.defaultSets * 0.8));
  }

  if (focus === "hypertrophy" && isAccessory) {
    next.defaultSets += 1;
  }

  if (focus === "general" && isAccessory) {
    next.defaultSets = Math.max(1, next.defaultSets - 1);
  }

  if (focus === "fat_loss" && isAccessory) {
    next.defaultSets = Math.max(1, next.defaultSets);
  }

  return next;
};

const simplifyWorkoutName = (name: string) =>
  name.replace(/\s*\([^)]*\)\s*$/g, "").replace(/\s*[—-]\s*.+$/, "").trim();

const isLibraryWorkoutName = (name: string) => Boolean(WORKOUT_LIBRARY_V1.workouts[name]);

const applySupersets = (exercises: TemplateExercise[], focus: FocusType) => {
  if (focus !== "fat_loss") return exercises;
  const next = exercises.map((ex) => ({ ...ex }));
  let tagIndex = 0;
  let buffer: TemplateExercise[] = [];

  for (const ex of next) {
    if (isConditioning(ex.name) || isCompound(ex.name)) {
      buffer = [];
      continue;
    }
    buffer.push(ex);
    if (buffer.length === 2) {
      const tag = String.fromCharCode(65 + tagIndex);
      buffer.forEach((item) => {
        item.setType = "superset";
        item.supersetTag = tag;
      });
      tagIndex += 1;
      buffer = [];
    }
  }

  return next;
};

const normalizeName = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const catalogNameMap = (() => {
  const map = new Map<string, string>();
  EXERCISE_CATALOG.forEach((category) => {
    category.groups.forEach((group) => {
      group.items.forEach((item) => {
        map.set(normalizeName(item), item);
      });
    });
  });
  return map;
})();

const exerciseAliasMap: Record<string, string> = {
  "lat pulldown wide": "Wide-Grip Lat Pulldown",
  "lat pulldown close": "Close-Grip Lat Pulldown",
  "pull up": "Pull-Ups",
  "chin up": "Chin-Ups",
  "neutral grip pull up": "Neutral-Grip Pull-Ups",
  "barbell bench press": "Barbell Bench Press",
  "incline dumbbell press": "Incline Dumbbell Press",
  "decline dumbbell press": "Decline Dumbbell Press",
  "db curl": "Dumbbell Curl",
  "db shoulder press": "Dumbbell Shoulder Press",
  "seated db shoulder press": "Seated Dumbbell Shoulder Press",
  "incline db press": "Incline Dumbbell Bench Press",
  "romanian deadlift": "Romanian Deadlift",
  rdl: "Romanian Deadlift",
  "chest supported row": "Chest-Supported Row Machine",
  "cable row": "Seated Cable Row",
  "single arm cable row": "Single-Arm Cable Row",
  "lateral raise": "Dumbbell Lateral Raise",
  "rear delts": "Rear Delt Fly",
  calves: "Standing Calf Raise",
  "machine chest press": "Chest Press Machine",
  "machine press": "Chest Press Machine",
  "incline machine press": "Incline Chest Press Machine",
  "cable fly": "Cable Chest Fly",
  "leg press high rep": "Leg Press High Rep",
  "back squat": "Back Squat",
  "front squat": "Front Squat",
};

const simplifyExerciseName = (raw: string) => {
  let name = raw.trim();
  name = name.replace(/\s*\([^)]*\)\s*$/g, "");
  name = name.replace(/\s*(?:—|-|:)\s+.+$/g, "");
  name = name.replace(/\s{2,}/g, " ").trim();

  const normalized = normalizeName(name);
  if (exerciseAliasMap[normalized]) return exerciseAliasMap[normalized];
  const catalogMatch = catalogNameMap.get(normalized);
  if (catalogMatch) return catalogMatch;

  const lower = name.toLowerCase();
  if (lower.includes("romanian deadlift") || lower === "rdl") return "Romanian Deadlift";
  if (lower.includes("conventional deadlift") || lower === "barbell deadlift")
    return "Deadlift";
  if (lower.includes("back squat")) return "Back Squat";
  if (lower.includes("front squat")) return "Front Squat";

  return name;
};

const buildExercise = (
  name: string,
  level: "beginner" | "intermediate" | "advanced",
  focus: FocusType,
  prescription: string
): TemplateExercise => {
  const parsed = parsePrescription(prescription);
  const conditioning = isConditioning(name);
  const compound = isCompound(name);
  const restSec = deriveRestSec(focus, compound, conditioning, parsed.restSec);
  const displayName = simplifyExerciseName(name);

  return {
    id: makeId(),
    name: displayName,
    defaultSets: parsed.sets,
    repRange: parsed.repRange,
    restSec,
    weightStep: deriveWeightStep(name, parsed.timeUnit),
    autoProgress: !conditioning,
    timeUnit: parsed.timeUnit,
  };
};

const expandExerciseForLevel = (
  exercise: { name: string; setsReps: Record<"beginner" | "intermediate" | "advanced", string> },
  level: "beginner" | "intermediate" | "advanced"
) => {
  const prescription = exercise.setsReps[level];
  if (level === "advanced" && /lat pulldown/i.test(exercise.name)) {
    return [
      { name: "Pull-Ups", prescription },
      { name: "Lat Pulldown", prescription },
    ];
  }
  return [{ name: exercise.name, prescription }];
};

export const buildTemplateFromWorkout = (
  workoutName: string,
  level: "beginner" | "intermediate" | "advanced",
  focus: FocusType
): Template | null => {
  const workout = WORKOUT_LIBRARY_V1.workouts[workoutName];
  if (!workout) return null;

  const baseExercises = workout.exercises
    .flatMap((ex) => expandExerciseForLevel(ex, level))
    .filter((entry) => !isCoreOrCardio(entry.name))
    .map((entry) => buildExercise(entry.name, level, focus, entry.prescription));

  const adjusted = baseExercises.map((ex) =>
    applyModeAdjustments(ex, focus, !isCompound(ex.name) && !isConditioning(ex.name))
  );

  const withSupersets = applySupersets(adjusted, focus);

  return {
    id: makeId(),
    name: simplifyWorkoutName(workoutName),
    exercises: withSupersets,
  };
};


export const generateProgramFromLibrary = (opts: {
  experience: ExperienceLevel;
  split: string;
  daysPerWeek: number;
  focus: FocusType;
}): Template[] => {
  const splitDef = WORKOUT_LIBRARY_V1.splits.find((s) => s.id === opts.split);
  const dayKey = String(Math.min(Math.max(opts.daysPerWeek, 1), 7));
  const dayNames = splitDef?.daysMap[dayKey] || ["Full Body A"];

  let templates = dayNames
    .map((name) => buildTemplateFromWorkout(name, opts.experience, opts.focus))
    .filter((t): t is Template => !!t);

  return templates;
};

export const WORKOUT_LIBRARY_EXERCISES: Array<Omit<TemplateExercise, "id">> = (() => {
  const unique = new Map<string, TemplateExercise>();
  const level: "beginner" | "intermediate" | "advanced" = "intermediate";

  Object.values(WORKOUT_LIBRARY_V1.workouts).forEach((workout) => {
    workout.exercises.forEach((exercise) => {
      if (isCoreOrCardio(exercise.name)) return;
      const parsed = parsePrescription(exercise.setsReps[level]);
      const displayName = simplifyExerciseName(exercise.name);
      if (!unique.has(displayName)) {
        unique.set(displayName, {
          name: displayName,
          defaultSets: parsed.sets,
          repRange: parsed.repRange,
          restSec: isConditioning(exercise.name)
            ? 0
            : deriveRestSec("general", isCompound(exercise.name), isConditioning(exercise.name)),
          weightStep: deriveWeightStep(exercise.name, parsed.timeUnit),
          autoProgress: !isConditioning(exercise.name),
          timeUnit: parsed.timeUnit,
        });
      }
    });
  });

  return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
})();

export const buildWorkoutLibraryTemplates = (
  level: ExperienceLevel = "intermediate",
  focus: FocusType = "general"
) => {
  return Object.keys(WORKOUT_LIBRARY_V1.workouts)
    .filter((name) => !/\(from /i.test(name))
    .map((name) => buildTemplateFromWorkout(name, level, focus))
    .filter((t): t is Template => !!t);
};

export const verifyWorkoutLibrary = () => {
  const errors: string[] = [];
  for (const split of WORKOUT_LIBRARY_V1.splits) {
    for (let days = 1; days <= 7; days += 1) {
      const dayNames = split.daysMap[String(days)] || [];
      if (dayNames.length !== days) {
        errors.push(
          `Split ${split.id} expected ${days} days but got ${dayNames.length} for ${days} days/week.`
        );
      }
      for (const name of dayNames) {
        if (!WORKOUT_LIBRARY_V1.workouts[name]) {
          errors.push(`Split ${split.id} references missing workout: ${name}`);
        }
      }
    }
  }
  return errors;
};

export { WORKOUT_LIBRARY_V1, simplifyWorkoutName, isLibraryWorkoutName, simplifyExerciseName };
