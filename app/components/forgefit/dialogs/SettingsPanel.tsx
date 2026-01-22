import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { clamp, emptySchedule, WEEKDAYS } from "../utils";
import type { Profile, Settings, SplitType, Template, Units } from "../types";

export function SettingsPanel({
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

      <div className="rounded-xl border p-4 space-y-4">
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
              <Label>Username</Label>
              <Input
                value={settings.profile.username || ""}
                onChange={(e) => updateProfile({ username: e.target.value.replace(/\s+/g, "") })}
                placeholder="yourhandle"
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
              <Label>Preferred split</Label>
              <Select
                value={settings.profile.preferredSplit || "ppl"}
                onValueChange={(v) => updateProfile({ preferredSplit: v as SplitType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a split" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ppl">Push / Pull / Legs (PPL)</SelectItem>
                  <SelectItem value="upper_lower">Upper / Lower</SelectItem>
                  <SelectItem value="full_body">Full Body (A/B/C)</SelectItem>
                  <SelectItem value="bro_split">Body-Part Split</SelectItem>
                  <SelectItem value="phul">PHUL</SelectItem>
                  <SelectItem value="performance">Performance Hybrid</SelectItem>
                </SelectContent>
              </Select>
              <div className="ff-caption text-muted-foreground">
                Use Generate in Training Tools to rebuild templates from this split.
              </div>
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
              onValueChange={(v) => onChange({ ...settings, theme: v as Settings["theme"] })}
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
            Reset all data
          </Button>
        </div>
      </div>
    </div>
  );
}
