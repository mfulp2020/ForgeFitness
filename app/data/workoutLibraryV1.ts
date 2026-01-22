export type WorkoutLevel = "beginner" | "intermediate" | "advanced";

export type WorkoutExerciseSpec = {
  name: string;
  setsReps: Record<WorkoutLevel, string>;
  notes?: string;
};

export type WorkoutDefinition = {
  name: string;
  exercises: WorkoutExerciseSpec[];
};

export type SplitDefinition = {
  id: string;
  name: string;
  bestFor: string;
  daysMap: Record<string, string[]>;
};

export type WorkoutLibraryV1 = {
  splits: SplitDefinition[];
  workouts: Record<string, WorkoutDefinition>;
};

const fullBodyAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Back Squat",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
    notes: "Strength mode: use back/front squat.",
  },
  {
    name: "Barbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x6-10",
      advanced: "4x5-8",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-20",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const fullBodyBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Trap Bar Deadlift",
    setsReps: {
      beginner: "3x6-8",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
    notes: "Keep technique crisp.",
  },
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
  },
  {
    name: "Barbell Row",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Leg Press",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Hamstring Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Dumbbell Curl + Triceps Pressdown",
    setsReps: {
      beginner: "2 rounds 10-15",
      intermediate: "3 rounds 10-15",
      advanced: "4 rounds 8-15",
    },
  },
];

const fullBodyCExercises: WorkoutExerciseSpec[] = [
  {
    name: "Bulgarian Split Squat",
    setsReps: {
      beginner: "3x8-10/leg",
      intermediate: "4x6-10/leg",
      advanced: "4x6-10/leg",
    },
  },
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Barbell Hip Thrust",
    setsReps: {
      beginner: "2x10-12",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Dumbbell Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const conditioningCoreExercises: WorkoutExerciseSpec[] = [
  {
    name: "Zone 2 Bike",
    setsReps: {
      beginner: "20-30 min",
      intermediate: "25-40 min",
      advanced: "30-45 min",
    },
    notes: "Nasal breathing pace.",
  },
  {
    name: "Core Circuit",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
    notes: "Ab wheel, cable crunch, side plank, pallof.",
  },
  {
    name: "Mobility: Hips/Ankles/T-Spine",
    setsReps: {
      beginner: "8-10 min",
      intermediate: "10-12 min",
      advanced: "12-15 min",
    },
  },
];

const recoveryExercises: WorkoutExerciseSpec[] = [
  {
    name: "Easy Zone 2",
    setsReps: {
      beginner: "20-30 min",
      intermediate: "25-40 min",
      advanced: "30-50 min",
    },
    notes: "Keep it easy.",
  },
  {
    name: "Full-body mobility",
    setsReps: {
      beginner: "10 min",
      intermediate: "12 min",
      advanced: "15 min",
    },
    notes: "Hips, T-spine, shoulders, ankles.",
  },
  {
    name: "Optional: light pump band work",
    setsReps: {
      beginner: "5-8 min",
      intermediate: "5-10 min",
      advanced: "8-12 min",
    },
  },
];

const fullBodyALighterExercises: WorkoutExerciseSpec[] = [
  {
    name: "Leg press",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x10-15",
    },
    notes: "No grinding.",
  },
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x10-15",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Arms Finisher: Curl + Pressdown",
    setsReps: {
      beginner: "1-2 rounds",
      intermediate: "2-3 rounds",
      advanced: "3-4 rounds",
    },
  },
];

const fullBodyAPumpExercises: WorkoutExerciseSpec[] = [
  {
    name: "Leg Press",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x12-15",
      advanced: "3x10-15",
    },
  },
  {
    name: "Incline Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Cable Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const fullBodyBPumpExercises: WorkoutExerciseSpec[] = [
  {
    name: "Hack Squat",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x12-15",
      advanced: "3x10-15",
    },
  },
  {
    name: "Chest-Supported Row Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Dumbbell Shoulder Press",
    setsReps: {
      beginner: "2x10-12",
      intermediate: "3x8-12",
      advanced: "3x6-10",
    },
  },
  {
    name: "Hamstring Curl",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x10-15",
    },
  },
  {
    name: "Triceps Pressdown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const conditioningIntervalsExercises: WorkoutExerciseSpec[] = [
  {
    name: "Bike Intervals",
    setsReps: {
      beginner: "8x:30/:90",
      intermediate: "10x:45/:75",
      advanced: "12x:60/:60",
    },
    notes: "Hard but controlled.",
  },
  {
    name: "Cool-down + mobility",
    setsReps: {
      beginner: "8-10 min",
      intermediate: "10-12 min",
      advanced: "12-15 min",
    },
  },
];

const upperAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Barbell Bench Press",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
    notes: "Strength: barbell bench; Hypertrophy: dumbbell incline swap allowed.",
  },
  {
    name: "Chest-Supported Row Machine",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x6-10",
      advanced: "4x4-8",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-20",
    },
  },
  {
    name: "Biceps Curl + Triceps Pressdown",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
    notes: "10-15 reps each.",
  },
];

const lowerAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Back Squat",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
  },
  {
    name: "Bulgarian Split Squat",
    setsReps: {
      beginner: "2x8-10/leg",
      intermediate: "3x6-10/leg",
      advanced: "4x6-10/leg",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x10-15",
      advanced: "5x8-15",
    },
  },
];

const upperBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Biceps Curl + Triceps Pressdown",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const lowerBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Front Squat",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
  },
  {
    name: "Hip Thrust",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Leg Press High Rep",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "4x10-15",
    },
  },
  {
    name: "Hamstring Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x10-15",
      advanced: "5x8-15",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
];

const weakPointZone2Exercises: WorkoutExerciseSpec[] = [
  {
    name: "Weak-Point Work (Choose 2)",
    setsReps: {
      beginner: "20-25 min",
      intermediate: "25-35 min",
      advanced: "30-40 min",
    },
    notes: "Delts/Arms/Glutes/Upper back/Calves.",
  },
  {
    name: "Zone 2 Bike",
    setsReps: {
      beginner: "20-30 min",
      intermediate: "25-40 min",
      advanced: "30-45 min",
    },
  },
];

const upperPumpExercises: WorkoutExerciseSpec[] = [
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Biceps + Triceps Circuit",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const lowerPumpExercises: WorkoutExerciseSpec[] = [
  {
    name: "Leg press",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x12-15",
      advanced: "4x10-15",
    },
  },
  {
    name: "Light Romanian Deadlift",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x8-10",
      advanced: "3x6-10",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "4x10-15",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x12-20",
      intermediate: "4x10-20",
      advanced: "5x10-20",
    },
  },
];

const pushAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
  {
    name: "Seated Dumbbell Shoulder Press",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x6-10",
      advanced: "4x4-8",
    },
  },
  {
    name: "Cable Lateral Raise",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-25",
    },
  },
  {
    name: "Rope Triceps Pressdown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Overhead Cable Extension",
    setsReps: {
      beginner: "1-2x12-20",
      intermediate: "2-3x12-20",
      advanced: "3-4x10-20",
    },
  },
];

const pullAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Chest-Supported Row Machine",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Neutral-Grip Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Dumbbell Curl",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Hammer Curl",
    setsReps: {
      beginner: "1-2x10-14",
      intermediate: "2-3x10-14",
      advanced: "3-4x8-14",
    },
  },
];

const legsAExercises: WorkoutExerciseSpec[] = [
  {
    name: "Hack Squat",
    setsReps: {
      beginner: "3x10-12",
      intermediate: "4x8-12",
      advanced: "5x6-10",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x10-15",
      advanced: "5x8-15",
    },
  },
  {
    name: "Hip Thrust",
    setsReps: {
      beginner: "2x10-12",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
];

const pushBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Barbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Incline Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
  {
    name: "Landmine Press",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x6-10",
      advanced: "4x4-8",
    },
  },
  {
    name: "Cable Lateral Raise",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "EZ-Bar Skullcrusher",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Dips Finisher",
    setsReps: {
      beginner: "1 set AMRAP",
      intermediate: "1-2 sets AMRAP",
      advanced: "2 sets AMRAP",
    },
  },
];

const pullBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Chin-Up",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Barbell Row",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x5-8",
      advanced: "5x4-8",
    },
  },
  {
    name: "Single-Arm Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x8-12",
    },
  },
  {
    name: "Face Pull",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-25",
    },
  },
  {
    name: "Preacher Curl",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Cable Curl Burn",
    setsReps: {
      beginner: "1x15-25",
      intermediate: "2x15-25",
      advanced: "3x12-25",
    },
  },
];

const legsBExercises: WorkoutExerciseSpec[] = [
  {
    name: "Front Squat",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
  },
  {
    name: "Hip Thrust",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Leg Press High Rep",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "4x10-15",
    },
  },
  {
    name: "Seated Leg Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x12-20",
      intermediate: "4x10-20",
      advanced: "5x10-20",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
];

const chestExercises: WorkoutExerciseSpec[] = [
  {
    name: "Barbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Cable Chest Fly",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-25",
    },
  },
  {
    name: "Triceps Pressdown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const backExercises: WorkoutExerciseSpec[] = [
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Chest-Supported Row Machine",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Biceps Curl",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
];

const broLegsExercises: WorkoutExerciseSpec[] = [
  {
    name: "Back Squat",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x10-15",
      advanced: "5x8-15",
    },
  },
];

const shouldersExercises: WorkoutExerciseSpec[] = [
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "3x12-20",
      intermediate: "4x12-20",
      advanced: "5x12-25",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Upright Row",
    setsReps: {
      beginner: "1-2x10-15",
      intermediate: "2-3x10-15",
      advanced: "3x8-15",
    },
  },
  {
    name: "Dumbbell Shrug",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const armsExercises: WorkoutExerciseSpec[] = [
  {
    name: "EZ-Bar Curl",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-12",
      advanced: "5x6-10",
    },
  },
  {
    name: "Incline Dumbbell Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x8-12",
    },
  },
  {
    name: "Triceps Pressdown",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x8-15",
      advanced: "5x8-12",
    },
  },
  {
    name: "Overhead Triceps Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x10-15",
      advanced: "4x10-15",
    },
  },
  {
    name: "Forearm Curl",
    setsReps: {
      beginner: "1-2x12-20",
      intermediate: "2-3x12-20",
      advanced: "3-4x10-20",
    },
  },
];

const upperPushEmphasisExercises: WorkoutExerciseSpec[] = [
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "2x8-10",
      intermediate: "3x6-10",
      advanced: "4x4-8",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "4x6-10",
    },
  },
  {
    name: "Chest-Supported Row Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Triceps + lateral raises",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const shouldersArmsExercises: WorkoutExerciseSpec[] = [
  {
    name: "Dumbbell Shoulder Press",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x4-8",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "3x12-20",
      intermediate: "4x12-20",
      advanced: "5x12-25",
    },
  },
  {
    name: "Rear Delt Fly",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "EZ-Bar Curl",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Triceps Pressdown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
];

const upperPowerExercises: WorkoutExerciseSpec[] = [
  {
    name: "Barbell Bench Press",
    setsReps: {
      beginner: "4x4-6",
      intermediate: "5x3-5",
      advanced: "6x2-4",
    },
  },
  {
    name: "Weighted Pull-Up",
    setsReps: {
      beginner: "4x4-6",
      intermediate: "5x3-5",
      advanced: "6x3-5",
    },
  },
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "3x4-6",
      intermediate: "4x3-5",
      advanced: "5x2-4",
    },
  },
  {
    name: "Barbell Row",
    setsReps: {
      beginner: "3x4-6",
      intermediate: "4x4-6",
      advanced: "5x3-6",
    },
  },
  {
    name: "Biceps Curl + Triceps Pressdown",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "2-3x8-12",
      advanced: "3x6-12",
    },
  },
];

const lowerPowerExercises: WorkoutExerciseSpec[] = [
  {
    name: "Back Squat",
    setsReps: {
      beginner: "4x4-6",
      intermediate: "5x3-5",
      advanced: "6x2-4",
    },
  },
  {
    name: "Deadlift",
    setsReps: {
      beginner: "3x3-5",
      intermediate: "4x2-4",
      advanced: "5x2-3",
    },
  },
  {
    name: "Bulgarian Split Squat",
    setsReps: {
      beginner: "2x6-10",
      intermediate: "3x6-10",
      advanced: "4x5-8",
    },
  },
  {
    name: "Hamstring Curl",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x8-12",
      advanced: "4x6-12",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "3 sets",
      intermediate: "4 sets",
      advanced: "5 sets",
    },
  },
];

const upperHypertrophyExercises: WorkoutExerciseSpec[] = [
  {
    name: "Incline Dumbbell Bench Press",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x8-12",
      advanced: "5x8-12",
    },
  },
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x8-12",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x8-12",
      advanced: "4x8-12",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "3x12-20",
      intermediate: "4x12-20",
      advanced: "5x12-25",
    },
  },
  {
    name: "Biceps + Triceps Circuit",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const lowerHypertrophyExercises: WorkoutExerciseSpec[] = [
  {
    name: "Leg Press",
    setsReps: {
      beginner: "3x10-15",
      intermediate: "4x8-12",
      advanced: "5x8-12",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "3x8-10",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Leg Curl",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "4x8-15",
    },
  },
  {
    name: "Leg Extension",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "4x10-20",
      intermediate: "5x10-20",
      advanced: "6x8-20",
    },
  },
  {
    name: "Hip Thrust",
    setsReps: {
      beginner: "2x10-12",
      intermediate: "3x8-12",
      advanced: "4x6-10",
    },
  },
];

const powerLowerStrengthExercises: WorkoutExerciseSpec[] = [
  {
    name: "Power Primer: Jumps/Throws",
    setsReps: {
      beginner: "3x3",
      intermediate: "4x3",
      advanced: "5x2-3",
    },
    notes: "Broad jumps, med ball throws, or box jumps.",
  },
  {
    name: "Back Squat (Strength)",
    setsReps: {
      beginner: "4x3-5",
      intermediate: "5x3-5",
      advanced: "6x2-4",
    },
  },
  {
    name: "Romanian Deadlift",
    setsReps: {
      beginner: "3x4-6",
      intermediate: "4x3-6",
      advanced: "5x3-5",
    },
  },
  {
    name: "Bulgarian Split Squat",
    setsReps: {
      beginner: "2x6-10/leg",
      intermediate: "3x6-10/leg",
      advanced: "4x5-8/leg",
    },
  },
  {
    name: "Standing Calf Raise",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x10-20",
    },
  },
];

const upperStrengthExercises: WorkoutExerciseSpec[] = [
  {
    name: "Barbell Bench Press (Strength)",
    setsReps: {
      beginner: "4x3-6",
      intermediate: "5x3-5",
      advanced: "6x2-4",
    },
  },
  {
    name: "Pull-Up (Strength)",
    setsReps: {
      beginner: "4x4-6",
      intermediate: "5x3-6",
      advanced: "6x3-5",
    },
  },
  {
    name: "Barbell Row (Strength)",
    setsReps: {
      beginner: "3x4-6",
      intermediate: "4x4-6",
      advanced: "5x3-6",
    },
  },
  {
    name: "Overhead Press",
    setsReps: {
      beginner: "2x4-6",
      intermediate: "3x4-6",
      advanced: "4x3-5",
    },
  },
  {
    name: "Face Pull",
    setsReps: {
      beginner: "2x12-20",
      intermediate: "3x12-20",
      advanced: "4x12-25",
    },
  },
];

const speedFullBodyExercises: WorkoutExerciseSpec[] = [
  {
    name: "Power Primer: Jumps/Throws",
    setsReps: {
      beginner: "3x3",
      intermediate: "4x3",
      advanced: "5x2-3",
    },
    notes: "Full recovery between.",
  },
  {
    name: "Kettlebell Swing",
    setsReps: {
      beginner: "3x6-10",
      intermediate: "4x6-10",
      advanced: "5x5-8",
    },
  },
  {
    name: "Push Press",
    setsReps: {
      beginner: "3x5-8",
      intermediate: "4x4-8",
      advanced: "5x3-6",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "3x8-12",
      intermediate: "4x6-10",
      advanced: "5x6-10",
    },
  },
  {
    name: "Front Squat (Moderate)",
    setsReps: {
      beginner: "2x8-12",
      intermediate: "3x6-10",
      advanced: "4x5-8",
    },
  },
];

const zone2CoreExercises: WorkoutExerciseSpec[] = [
  {
    name: "Zone 2 Cardio",
    setsReps: {
      beginner: "25-35 min",
      intermediate: "30-45 min",
      advanced: "35-60 min",
    },
  },
  {
    name: "Core Circuit",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const accessoryPumpMobilityExercises: WorkoutExerciseSpec[] = [
  {
    name: "Upper Pump: Delts/Arms/Back",
    setsReps: {
      beginner: "25-35 min",
      intermediate: "30-40 min",
      advanced: "35-50 min",
    },
  },
  {
    name: "Mobility",
    setsReps: {
      beginner: "10 min",
      intermediate: "12 min",
      advanced: "15 min",
    },
  },
];

const accessoryPumpExercises: WorkoutExerciseSpec[] = [
  {
    name: "Chest Press Machine",
    setsReps: {
      beginner: "2x12-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Lat Pulldown",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Seated Cable Row",
    setsReps: {
      beginner: "2x10-15",
      intermediate: "3x10-15",
      advanced: "3x8-12",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    setsReps: {
      beginner: "2x15-25",
      intermediate: "3x15-25",
      advanced: "4x12-25",
    },
  },
  {
    name: "Biceps + Triceps Circuit",
    setsReps: {
      beginner: "2 rounds",
      intermediate: "3 rounds",
      advanced: "4 rounds",
    },
  },
];

const intervalsMobilityExercises: WorkoutExerciseSpec[] = [
  {
    name: "Bike Intervals",
    setsReps: {
      beginner: "8x:30/:90",
      intermediate: "10x:45/:75",
      advanced: "12x:60/:60",
    },
    notes: "Hard but controlled.",
  },
  {
    name: "Cool-down + mobility",
    setsReps: {
      beginner: "8-10 min",
      intermediate: "10-12 min",
      advanced: "12-15 min",
    },
  },
];

export const WORKOUT_LIBRARY_V1: WorkoutLibraryV1 = {
  splits: [
    {
      id: "full_body",
      name: "Full Body (A/B/C)",
      bestFor: "1-4 days/week, general fitness, busy schedules, beginners.",
      daysMap: {
        "1": ["Full Body A"],
        "2": ["Full Body A", "Full Body B"],
        "3": ["Full Body A", "Full Body B", "Full Body C"],
        "4": [
          "Full Body A",
          "Full Body B",
          "Full Body C",
          "Full Body A (lighter/pump)",
        ],
        "5": [
          "Full Body A",
          "Full Body B",
          "Full Body C",
          "Full Body A (pump)",
          "Full Body B (pump)",
        ],
        "6": [
          "Full Body A",
          "Full Body B",
          "Full Body C",
          "Full Body A (pump)",
          "Full Body B (pump)",
          "Full Body A (lighter/pump)",
        ],
        "7": [
          "Full Body A",
          "Full Body B",
          "Full Body C",
          "Full Body A (pump)",
          "Full Body B (pump)",
          "Full Body A (lighter/pump)",
          "Full Body B (pump)",
        ],
      },
    },
    {
      id: "upper_lower",
      name: "Upper/Lower (Strength or Hypertrophy)",
      bestFor: "2-6 days/week, simple progression, balanced development.",
      daysMap: {
        "1": ["Full Body A (from Full Body split)"],
        "2": ["Upper A", "Lower A"],
        "3": ["Upper A", "Lower A", "Upper B"],
        "4": ["Upper A", "Lower A", "Upper B", "Lower B"],
        "5": ["Upper A", "Lower A", "Upper B", "Lower B", "Upper Pump"],
        "6": [
          "Upper A",
          "Lower A",
          "Upper B",
          "Lower B",
          "Upper Pump",
          "Lower Pump",
        ],
        "7": [
          "Upper A",
          "Lower A",
          "Upper B",
          "Lower B",
          "Upper Pump",
          "Lower Pump",
          "Upper Pump",
        ],
      },
    },
    {
      id: "ppl",
      name: "Push / Pull / Legs (PPL)",
      bestFor: "3-6 days/week, hypertrophy-focused, straightforward.",
      daysMap: {
        "1": ["Full Body A (from Full Body split)"],
        "2": ["Upper (from Upper/Lower)", "Lower (from Upper/Lower)"],
        "3": ["Push A", "Pull A", "Legs A"],
        "4": ["Push A", "Pull A", "Legs A", "Push B"],
        "5": ["Push A", "Pull A", "Legs A", "Push B", "Pull B"],
        "6": ["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"],
        "7": [
          "Push A",
          "Pull A",
          "Legs A",
          "Push B",
          "Pull B",
          "Legs B",
          "Upper Pump",
        ],
      },
    },
    {
      id: "bro_split",
      name: "Bro Split (Body Part Days)",
      bestFor: "5-6 days/week hypertrophy, lifters who like focus days.",
      daysMap: {
        "1": ["Full Body A"],
        "2": ["Upper", "Lower"],
        "3": ["Full Body A", "Full Body B", "Full Body C"],
        "4": ["Upper (push emphasis)", "Back", "Legs", "Shoulders+Arms"],
        "5": ["Chest", "Back", "Legs", "Shoulders", "Arms"],
        "6": ["Chest", "Back", "Legs", "Shoulders", "Arms", "Accessory Pump"],
        "7": [
          "Chest",
          "Back",
          "Legs",
          "Shoulders",
          "Arms",
          "Accessory Pump",
          "Upper Pump",
        ],
      },
    },
    {
      id: "phul",
      name: "PHUL (Power Hypertrophy Upper/Lower)",
      bestFor: "4 days/week base; scales well to 5-7 with add-ons.",
      daysMap: {
        "1": ["Full Body A"],
        "2": ["Upper Power", "Lower Power"],
        "3": ["Upper Power", "Lower Power", "Upper Hypertrophy"],
        "4": [
          "Upper Power",
          "Lower Power",
          "Upper Hypertrophy",
          "Lower Hypertrophy",
        ],
        "5": ["Upper Power", "Lower Power", "Upper Hypertrophy", "Lower Hypertrophy", "Upper Pump"],
        "6": [
          "Upper Power",
          "Lower Power",
          "Upper Hypertrophy",
          "Lower Hypertrophy",
          "Upper Pump",
          "Lower Pump",
        ],
        "7": [
          "Upper Power",
          "Lower Power",
          "Upper Hypertrophy",
          "Lower Hypertrophy",
          "Upper Pump",
          "Lower Pump",
          "Upper Pump",
        ],
      },
    },
    {
      id: "performance",
      name: "Performance Hybrid (Strength + Power + Conditioning)",
      bestFor: "3-7 days/week, athletes and performance-focused users.",
      daysMap: {
        "1": ["Speed + Full Body"],
        "2": ["Upper Strength", "Power + Lower Strength"],
        "3": [
          "Power + Lower Strength",
          "Upper Strength",
          "Speed + Full Body",
        ],
        "4": [
          "Power + Lower Strength",
          "Upper Strength",
          "Speed + Full Body",
          "Accessory Pump",
        ],
        "5": [
          "Power + Lower Strength",
          "Upper Strength",
          "Speed + Full Body",
          "Accessory Pump",
          "Upper Pump",
        ],
        "6": [
          "Power + Lower Strength",
          "Upper Strength",
          "Speed + Full Body",
          "Accessory Pump",
          "Upper Pump",
          "Lower Pump",
        ],
        "7": [
          "Power + Lower Strength",
          "Upper Strength",
          "Speed + Full Body",
          "Accessory Pump",
          "Upper Pump",
          "Lower Pump",
          "Upper Pump",
        ],
      },
    },
  ],
  workouts: {
    "Full Body A": { name: "Full Body A", exercises: fullBodyAExercises },
    "Full Body B": { name: "Full Body B", exercises: fullBodyBExercises },
    "Full Body C": { name: "Full Body C", exercises: fullBodyCExercises },
    "Conditioning + Core": { name: "Conditioning + Core", exercises: conditioningCoreExercises },
    "Recovery (Zone 2 + Mobility)": { name: "Recovery (Zone 2 + Mobility)", exercises: recoveryExercises },
    "Full Body A (lighter/pump)": { name: "Full Body A (lighter/pump)", exercises: fullBodyALighterExercises },
    "Full Body A (pump)": { name: "Full Body A (pump)", exercises: fullBodyAPumpExercises },
    "Full Body B (pump)": { name: "Full Body B (pump)", exercises: fullBodyBPumpExercises },
    Conditioning: { name: "Conditioning", exercises: conditioningIntervalsExercises },
    "Conditioning + Mobility": { name: "Conditioning + Mobility", exercises: conditioningCoreExercises },
    "Upper A": { name: "Upper A", exercises: upperAExercises },
    "Lower A": { name: "Lower A", exercises: lowerAExercises },
    "Upper B": { name: "Upper B", exercises: upperBExercises },
    "Lower B": { name: "Lower B", exercises: lowerBExercises },
    "Weak Point + Zone 2": { name: "Weak Point + Zone 2", exercises: weakPointZone2Exercises },
    "Upper Pump": { name: "Upper Pump", exercises: upperPumpExercises },
    "Lower Pump": { name: "Lower Pump", exercises: lowerPumpExercises },
    "Push A": { name: "Push A", exercises: pushAExercises },
    "Pull A": { name: "Pull A", exercises: pullAExercises },
    "Legs A": { name: "Legs A", exercises: legsAExercises },
    "Push B": { name: "Push B", exercises: pushBExercises },
    "Pull B": { name: "Pull B", exercises: pullBExercises },
    "Legs B": { name: "Legs B", exercises: legsBExercises },
    Chest: { name: "Chest", exercises: chestExercises },
    Back: { name: "Back", exercises: backExercises },
    Legs: { name: "Legs", exercises: broLegsExercises },
    Shoulders: { name: "Shoulders", exercises: shouldersExercises },
    Arms: { name: "Arms", exercises: armsExercises },
    Upper: { name: "Upper", exercises: upperAExercises },
    Lower: { name: "Lower", exercises: lowerAExercises },
    "Upper (push emphasis)": { name: "Upper (push emphasis)", exercises: upperPushEmphasisExercises },
    "Shoulders+Arms": { name: "Shoulders+Arms", exercises: shouldersArmsExercises },
    "Upper Power": { name: "Upper Power", exercises: upperPowerExercises },
    "Lower Power": { name: "Lower Power", exercises: lowerPowerExercises },
    "Upper Hypertrophy": { name: "Upper Hypertrophy", exercises: upperHypertrophyExercises },
    "Lower Hypertrophy": { name: "Lower Hypertrophy", exercises: lowerHypertrophyExercises },
    "Power + Lower Strength": { name: "Power + Lower Strength", exercises: powerLowerStrengthExercises },
    "Upper Strength": { name: "Upper Strength", exercises: upperStrengthExercises },
    "Speed + Full Body": { name: "Speed + Full Body", exercises: speedFullBodyExercises },
    "Zone 2 + Core": { name: "Zone 2 + Core", exercises: zone2CoreExercises },
    "Accessory Pump + Mobility": { name: "Accessory Pump + Mobility", exercises: accessoryPumpMobilityExercises },
    "Accessory Pump": { name: "Accessory Pump", exercises: accessoryPumpExercises },
    "Intervals + Mobility": { name: "Intervals + Mobility", exercises: intervalsMobilityExercises },
    "Full Body A (from Full Body split)": {
      name: "Full Body A (from Full Body split)",
      exercises: fullBodyAExercises,
    },
    "Upper (from Upper/Lower)": { name: "Upper (from Upper/Lower)", exercises: upperAExercises },
    "Lower (from Upper/Lower)": { name: "Lower (from Upper/Lower)", exercises: lowerAExercises },
  },
};
