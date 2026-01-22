import type { ExperienceLevel, FocusType, SplitType, Template, Units } from "./types";
import { generateProgramFromLibrary } from "./workout-library";

export type FinisherOption = "none" | "core" | "cardio" | "core_cardio";

const finisherMinutesFor = (level: ExperienceLevel, kind: "core" | "cardio") => {
  if (kind === "core") {
    if (level === "advanced") return { min: 10, max: 12 };
    if (level === "intermediate") return { min: 8, max: 10 };
    return { min: 6, max: 8 };
  }
  if (level === "advanced") return { min: 12, max: 15 };
  if (level === "intermediate") return { min: 10, max: 12 };
  return { min: 8, max: 10 };
};

const makeFinisher = (name: string, level: ExperienceLevel, kind: "core" | "cardio") => {
  const minutes = finisherMinutesFor(level, kind);
  return {
    name,
    defaultSets: 1,
    repRange: minutes,
    restSec: 0,
    weightStep: 0,
    autoProgress: false,
    timeUnit: "minutes" as const,
  };
};

export function generateProgramTemplates(opts: {
  experience: ExperienceLevel;
  split: SplitType;
  daysPerWeek: number;
  focus: FocusType;
  finisherOption: FinisherOption;
  units: Units;
}): Template[] {
  const { experience, split, daysPerWeek, focus, finisherOption } = opts;
  let templates = generateProgramFromLibrary({
    experience,
    split,
    daysPerWeek,
    focus,
  });

  if (finisherOption !== "none") {
    const finishers = [
      ...(finisherOption === "core" || finisherOption === "core_cardio"
        ? [makeFinisher("Core Finisher", experience, "core")]
        : []),
      ...(finisherOption === "cardio" || finisherOption === "core_cardio"
        ? [makeFinisher("Cardio Finisher", experience, "cardio")]
        : []),
    ];

    templates = templates.map((t) => ({
      ...t,
      exercises: [...t.exercises, ...finishers],
    }));
  }

  return templates;
}
