import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, Download, Plus, Star, Trash2 } from "lucide-react";
import { emptySchedule, uid } from "../utils";
import { WORKOUT_LIBRARY_EXERCISES as COMMON_EXERCISES } from "../workout-library";
import type { AppState, Template, TemplateExercise, WeekSchedule, UserRole } from "../types";

export function TemplateManagerDialog({
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
  const [importText, setImportText] = useState("");
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTab, setPickerTab] = useState<"suggested" | "recent" | "favorites" | "all">("suggested");
  const [exercisePatternFilter, setExercisePatternFilter] = useState("all");
  const [exerciseMuscleFilter, setExerciseMuscleFilter] = useState("all");
  const [exerciseEquipmentFilter, setExerciseEquipmentFilter] = useState("all");
  const [recentExercises, setRecentExercises] = useState<string[]>([]);
  const [favoriteExercises, setFavoriteExercises] = useState<string[]>([]);
  const [pickerSwapId, setPickerSwapId] = useState<string>("");

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

  const exerciseLibrary = useMemo(() => {
    return (COMMON_EXERCISES || []).map((ex) => {
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

  const filteredExercises = useMemo(() => {
    const search = pickerSearch.trim().toLowerCase();
    return exerciseLibrary.filter((ex: any) => {
      if (search && !ex.name.toLowerCase().includes(search)) return false;
      if (exercisePatternFilter !== "all" && !(ex.tags?.patterns || []).includes(exercisePatternFilter))
        return false;
      if (exerciseMuscleFilter !== "all" && !(ex.tags?.muscles || []).includes(exerciseMuscleFilter))
        return false;
      if (exerciseEquipmentFilter !== "all" && !(ex.tags?.equipment || []).includes(exerciseEquipmentFilter))
        return false;
      return true;
    });
  }, [exerciseLibrary, pickerSearch, exercisePatternFilter, exerciseMuscleFilter, exerciseEquipmentFilter]);

  const suggestedExercises = useMemo(
    () => filteredExercises.slice(0, 36),
    [filteredExercises]
  );

  const recentExerciseItems = useMemo(
    () =>
      recentExercises
        .map((name) => exerciseLibrary.find((ex: any) => ex.name === name))
        .filter(Boolean),
    [recentExercises, exerciseLibrary]
  );

  const favoriteExerciseItems = useMemo(
    () =>
      favoriteExercises
        .map((name) => exerciseLibrary.find((ex: any) => ex.name === name))
        .filter(Boolean),
    [favoriteExercises, exerciseLibrary]
  );

  const openExercisePicker = (swapId?: string) => {
    setPickerSwapId(swapId || "");
    setPickerTab("suggested");
    setPickerSearch("");
    setExercisePatternFilter("all");
    setExerciseMuscleFilter("all");
    setExerciseEquipmentFilter("all");
    setExercisePickerOpen(true);
  };

  const applyExerciseSelection = (name: string) => {
    const preset = exerciseLibrary.find((x: any) => x.name === name);
    if (!preset || !selected) return;
    if (pickerSwapId) {
      updateSelected({
        ...selected,
        exercises: selected.exercises.map((x) =>
          x.id === pickerSwapId ? { ...preset, id: x.id } : x
        ),
      });
    } else {
      updateSelected({
        ...selected,
        exercises: [...selected.exercises, { ...preset, id: uid() }],
      });
    }
    setRecentExercises((prev) => [name, ...prev.filter((x) => x !== name)].slice(0, 8));
    setExercisePickerOpen(false);
  };

  const toggleFavoriteExercise = (name: string) => {
    setFavoriteExercises((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [name, ...prev]
    );
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
    // Fallback: download JSON file
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(t.name || "template").replace(/[^a-z0-9_-]+/gi, "_")}.json`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      alert("Export failed. Copy from your console or try again.");
    }
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
    <>
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
              <div className="rounded-xl border p-3 ff-body-sm text-muted-foreground">
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
                    <div className="ff-caption text-muted-foreground">{(t.exercises || []).length} exercises</div>
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
              <div className="rounded-xl border p-4 ff-body-sm text-muted-foreground">
                Select a template or click Add to create your first one.
              </div>
            )}

            <Separator />

            {!isCoach ? (
              <>
                <div className="rounded-xl border p-3 space-y-2">
                  <Label className="text-sm">Import template (from coach)</Label>
                  <Textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    className="min-h-[120px]"
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
                  <div className="ff-caption text-muted-foreground mt-1">
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
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => openExercisePicker()}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Add exercise
                    </Button>
                  </div>
                </div>

                {(selected.exercises || []).length === 0 ? (
                  <div className="ff-body-sm text-muted-foreground">Add exercises to this template.</div>
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
                              <Select
                                onValueChange={(v) => {
                                  const preset = COMMON_EXERCISES.find((x) => x.name === v);
                                  if (!preset) return;
                                  updateSelected({
                                    ...selected,
                                    exercises: selected.exercises.map((x) =>
                                      x.id === ex.id ? { ...x, ...preset, id: ex.id } : x
                                    ),
                                  });
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Swap from library" />
                                </SelectTrigger>
                                <SelectContent>
                                  {COMMON_EXERCISES.map((item) => (
                                    <SelectItem key={item.name} value={item.name}>
                                      {item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <Label>Default sets</Label>
                              <Input
                                inputMode="numeric"
                                value={ex.defaultSets}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 1;
                                  updateSelected({
                                    ...selected,
                                    exercises: selected.exercises.map((x) =>
                                      x.id === ex.id ? { ...x, defaultSets: Math.min(Math.max(v, 1), 12) } : x
                                    ),
                                  });
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => openExercisePicker(ex.id)}
                            >
                              Swap
                            </Button>
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

      <Dialog open={exercisePickerOpen} onOpenChange={setExercisePickerOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{pickerSwapId ? "Swap exercise" : "Add exercise"}</DialogTitle>
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
                      <Button size="sm" className="rounded-full" onClick={() => applyExerciseSelection(ex.name)}>
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
                  <div className="ff-body-sm text-muted-foreground">No recent swaps yet.</div>
                ) : (
                  recentExerciseItems.map((ex: any) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div className="font-medium">{ex.name}</div>
                      <Button size="sm" className="rounded-full" onClick={() => applyExerciseSelection(ex.name)}>
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
                  <div className="ff-body-sm text-muted-foreground">No favorites yet.</div>
                ) : (
                  favoriteExerciseItems.map((ex: any) => (
                    <div
                      key={ex.name}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-2"
                    >
                      <div className="font-medium">{ex.name}</div>
                      <Button size="sm" className="rounded-full" onClick={() => applyExerciseSelection(ex.name)}>
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
                    <div className="font-medium">{ex.name}</div>
                    <Button size="sm" className="rounded-full" onClick={() => applyExerciseSelection(ex.name)}>
                      Select
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <DialogFooter>
          <Button onClick={() => setExercisePickerOpen(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>
    </>
  );
}
