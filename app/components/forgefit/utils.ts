import type {
  Template,
  TemplateExercise,
  WeekSchedule,
  Weekday,
  RepRange,
  SetType,
} from "./types";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

// Epley e1RM: weight * (1 + reps/30)
export const e1rm = (weight: number, reps: number) => {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return w * (1 + r / 30);
};

export const roundTo = (n: number, step = 0.5) => {
  const v = Number(n) || 0;
  return Math.round(v / step) * step;
};

export const formatDate = (d: string) => {
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

export const WEEKDAYS: Array<{ key: Weekday; label: string; short: string; index: number }> = [
  { key: "mon", label: "Monday", short: "Mon", index: 1 },
  { key: "tue", label: "Tuesday", short: "Tue", index: 2 },
  { key: "wed", label: "Wednesday", short: "Wed", index: 3 },
  { key: "thu", label: "Thursday", short: "Thu", index: 4 },
  { key: "fri", label: "Friday", short: "Fri", index: 5 },
  { key: "sat", label: "Saturday", short: "Sat", index: 6 },
  { key: "sun", label: "Sunday", short: "Sun", index: 0 },
];

export const emptySchedule: WeekSchedule = {
  mon: "",
  tue: "",
  wed: "",
  thu: "",
  fri: "",
  sat: "",
  sun: "",
};

export const formatSetTag = (set: { setType?: SetType; supersetTag?: string }) => {
  if (!set.setType || set.setType === "normal") return "";
  if (set.setType === "dropset") return " DS";
  if (set.setType === "superset") {
    return set.supersetTag ? ` SS ${set.supersetTag}` : " SS";
  }
  if (set.setType === "triset") {
    return set.supersetTag ? ` TS ${set.supersetTag}` : " TS";
  }
  if (set.setType === "circuit") {
    return set.supersetTag ? ` CIR ${set.supersetTag}` : " CIR";
  }
  return "";
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const parseISODate = (value: string) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
};

export const getWeekdayKey = (value: string) => {
  const d = parseISODate(value) ?? new Date();
  const idx = d.getDay();
  const match = WEEKDAYS.find((day) => day.index === idx);
  return match?.key ?? "mon";
};

export const addDaysISO = (value: string, days: number) => {
  const base = parseISODate(value) ?? new Date();
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next.toISOString().slice(0, 10);
};

export const getWeekStartMonday = (value: string) => {
  const base = parseISODate(value) ?? new Date();
  const day = base.getDay(); // 0 Sun ... 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  const start = new Date(base);
  start.setDate(base.getDate() + diff);
  return start;
};

export const setDateToWeekday = (value: string, targetDay: number) => {
  const weekStart = getWeekStartMonday(value);
  const offset = targetDay === 0 ? 6 : targetDay - 1;
  const next = new Date(weekStart);
  next.setDate(weekStart.getDate() + offset);
  return next.toISOString().slice(0, 10);
};

export const getScheduleInfo = (
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

export const assignScheduleDays = (
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

export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    const parsed = JSON.parse(str);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

export function formatNumber(n: number) {
  const v = Number(n) || 0;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export const formatRepRange = (range: RepRange) => {
  if (!range) return "";
  return range.min === range.max ? String(range.min) : `${range.min}–${range.max}`;
};

export const SUPERSET_TAGS = ["A", "B", "C", "D"];

export const buildCardioFinisher = (
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

export const appendCardioFinisher = (
  templates: Template[],
  label: string,
  duration?: RepRange
) =>
  templates.map((t) => ({
    ...t,
    exercises: [...(t.exercises || []), buildCardioFinisher(label, duration)],
  }));
