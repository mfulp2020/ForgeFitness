import type { Session, Template, WorkingEntry } from "./types";
import { e1rm, uid } from "./utils";

export function calcEntryVolume(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  return (entry.sets || []).reduce(
    (acc, s) => acc + (Number(s.weight) || 0) * (Number(s.reps) || 0),
    0
  );
}

export function calcTopSet(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  const sets = entry.sets || [];
  if (sets.length === 0) return { weight: 0, reps: 0 };

  let best = { weight: 0, reps: 0, score: 0 };
  for (const s of sets) {
    const weight = Number(s.weight) || 0;
    const reps = Number(s.reps) || 0;
    const score = e1rm(weight, reps);
    if (score > best.score || (score === best.score && weight > best.weight)) {
      best = { weight, reps, score };
    }
  }

  return { weight: best.weight, reps: best.reps };
}

export function calcEntryTopE1RM(entry: { sets?: Array<{ weight: any; reps: any }> }) {
  const top = calcTopSet(entry);
  return e1rm(top.weight, top.reps);
}

export function summarizeSession(session: Session) {
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

export function buildEntriesFromTemplate(
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
