// Shared ForgeFit types

export type Units = "lb" | "kg";

export type RepRange = { min: number; max: number };
export type SetType = "normal" | "dropset" | "superset" | "triset" | "circuit";

export type TemplateExercise = {
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

export type Template = {
  id: string;
  name: string;
  exercises: TemplateExercise[];
};

export type SetEntry = {
  reps: string | number;
  weight: string | number;
  rpe?: string | number;
  notes?: string;
  setType?: SetType;
  supersetTag?: string;
};

export type SessionExerciseEntry = {
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

export type Session = {
  id: string;
  dateISO: string;
  templateId: string;
  templateName: string;
  entries: SessionExerciseEntry[];
  notes?: string;
};

export type GoalMetric = "e1rm" | "top_set_weight" | "volume";

export type GoalStatus = "active" | "done" | "archived";

export type Goal = {
  id: string;
  exerciseName: string;
  metric: GoalMetric;
  targetValue: number;
  dueDateISO?: string;
  status: GoalStatus;
};

export type UserRole = "athlete" | "coach";
export type Theme = "neon" | "iron" | "dune" | "noir";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type WeekSchedule = Record<Weekday, string>;
export type SplitType =
  | "full_body"
  | "upper_lower"
  | "ppl"
  | "phul"
  | "bro_split"
  | "performance"
  | "custom";

export type Profile = {
  name: string;
  username?: string;
  age: string;
  height: string;
  weight: string;
  preferredSplit?: SplitType;
  focus?: FocusType;
  completed: boolean;
  introSeen: boolean;
};

export type Settings = {
  units: Units;
  autoGoalMode: boolean;
  autoGoalHorizonWeeks: number;
  strictRepRangeForProgress: boolean;
  powerliftingMode: boolean;
  darkMode: boolean;
  role: UserRole;
  theme: Theme;
  uiVersion?: number;
  schedule: WeekSchedule;
  profile: Profile;
};

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type FocusType = "general" | "strength" | "hypertrophy" | "fat_loss" | "athletic";

export type AppState = {
  templates: Template[];
  sessions: Session[];
  goals: Goal[];
  splits: SplitPlan[];
  settings: Settings;
};

export type SplitDayPlan = {
  day: Weekday;
  label: string;
  templateId: string;
  slots?: SplitDaySlot[];
  finishers?: FinisherInstance[];
};

export type SplitPlan = {
  id: string;
  name: string;
  createdAtISO: string;
  days: SplitDayPlan[];
};

export type ExerciseTag = {
  muscles?: string[];
  patterns?: string[];
  equipment?: string[];
};

export type SplitDaySlot = {
  id: string;
  slotType: "main" | "secondary" | "accessory" | "arms_core" | "conditioning";
  patternTag: string;
  exerciseName: string;
};

export type FinisherDefinition = {
  id: string;
  name: string;
  type: "pump" | "conditioning" | "core" | "mobility" | "carry";
  durationMinutes?: number;
  rounds?: number;
  intensity: "easy" | "moderate" | "hard";
  equipment?: string[];
  notes?: string;
};

export type FinisherInstance = {
  id: string;
  finisherId?: string;
  name: string;
  type: FinisherDefinition["type"];
  params?: {
    durationMinutes?: number;
    rounds?: number;
    restSec?: number;
    notes?: string;
  };
  order: number;
};

export type WorkingEntry = {
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
