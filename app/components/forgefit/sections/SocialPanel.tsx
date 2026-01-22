"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  Flame,
  Heart,
  MessageCircle,
  Plus,
  Send,
  UserRound,
  Zap,
} from "lucide-react";
import type {
  SocialChallenge,
  SocialChallengeStatus,
  SocialComment,
  SocialFocus,
  SocialMessage,
  SocialPost,
  SocialState,
  SocialThread,
} from "../social/types";
import type { FocusType, Template } from "../types";
import { initialsFromHandle, makeHandle, timeAgoShort } from "../social/utils";
import { createSocialAdapter } from "../social/adapter";
import { CARD_GAP, SECTION_GAP } from "../layout/spacing";
import type { AppStateLike as AdapterAppStateLike, TemplateLite, Units } from "../social/adapter";

type SessionLite = {
  id: string;
  dateISO: string;
  templateName: string;
  entries: Array<{
    exerciseName: string;
    sets: Array<{ reps: number; weight: number; setType?: string; supersetTag?: string }>;
  }>;
};

type SessionSummary = {
  sessionId: string;
  templateName: string;
  dateISO: string;
  totalSets: number;
  totalVolume: number;
};

type AppStateLike = {
  social?: SocialState;
  templates?: TemplateLite[];
  sessions?: SessionLite[];
  splits?: any[];
  settings?: {
    units: Units;
    profile?: { name?: string };
  };
} & Record<string, unknown>;

const mapProfileFocusToSocial = (focus?: FocusType): SocialFocus => {
  switch (focus) {
    case "strength":
      return "strength";
    case "hypertrophy":
      return "hypertrophy";
    case "fat_loss":
      return "weight_loss";
    case "athletic":
      return "power";
    case "general":
    default:
      return "general";
  }
};

const coerceSocial = (social?: SocialState): SocialState => ({
  handle: social?.handle || "",
  displayName: social?.displayName || "",
  profile: {
    bio: social?.profile?.bio || "",
    focus: (social?.profile?.focus || "general") as SocialFocus,
    avatarDataUrl: social?.profile?.avatarDataUrl || "",
  },
  friends: Array.isArray(social?.friends) ? social!.friends : [],
  posts: Array.isArray(social?.posts) ? social!.posts : [],
  challenges: Array.isArray(social?.challenges) ? social!.challenges : [],
  groups: Array.isArray(social?.groups) ? social!.groups : [],
  threads: Array.isArray((social as any)?.threads) ? ((social as any).threads as SocialThread[]) : [],
});

function AvatarBubble(props: {
  src?: string;
  fallback: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const { src, fallback, size = 40, ring = true, className } = props;
  const innerSize = Math.max(0, size - 4);

  return (
    <div
      className={
        ring
          ? `rounded-full p-[2px] bg-gradient-to-tr from-primary/70 via-primary/30 to-primary/70 ${className || ""}`
          : `${className || ""}`
      }
      style={{ width: size, height: size }}
    >
      <div
        className="rounded-full bg-background/80 overflow-hidden flex items-center justify-center border border-border/50"
        style={{ width: innerSize, height: innerSize }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <div className="font-display text-sm">{fallback}</div>
        )}
      </div>
    </div>
  );
}

export function SocialPanel(props: {
  social: SocialState;
  templates: Template[];
  sessions: SessionLite[];
  splits?: Array<{
    id: string;
    name: string;
    createdAtISO: string;
    days: Array<{ day: string; label: string; templateId: string }>;
  }>;
  units: Units;
  profileName?: string;
  profileHandle?: string;
  profileFocus?: FocusType;
  userId?: string | null;
  userFullName?: string | null;
  setStateAction: React.Dispatch<React.SetStateAction<AppStateLike>>;
  onGoHomeAction: () => void;
}) {
  const {
    social,
    sessions,
    templates,
    splits,
    units,
    profileName,
    profileHandle,
    profileFocus,
    userId,
    userFullName,
    setStateAction,
    onGoHomeAction,
  } = props;

  const [challengeDescription, setChallengeDescription] = useState("");
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeToHandle, setChallengeToHandle] = useState("");
  const [postTextInput, setPostTextInput] = useState("");
  const [commentDraftByPostId, setCommentDraftByPostId] = useState<Record<string, string>>({});
  const [connectOpen, setConnectOpen] = useState(false);
  const [createPostOpen, setCreatePostOpen] = useState(false);
  const [connectHandleInput, setConnectHandleInput] = useState("");
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [draftDisplayName, setDraftDisplayName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftFocus, setDraftFocus] = useState<SocialFocus>("general");
  const [draftAvatarDataUrl, setDraftAvatarDataUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarPickModeRef = useRef<"draft" | "save">("draft");

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSourceDataUrl, setCropSourceDataUrl] = useState<string>("");
  const [cropZoomAbs, setCropZoomAbs] = useState(1);
  const [cropPan, setCropPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [cropNatural, setCropNatural] = useState<{ w: number; h: number }>({ w: 1, h: 1 });
  const cropModeRef = useRef<"draft" | "save">("draft");
  const cropGestureRef = useRef<
    | {
        pointers: Map<number, { x: number; y: number }>;
        panStart: { x: number; y: number };
        zoomStart: number;
        distStart: number;
        midStart: { x: number; y: number };
      }
    | undefined
  >(undefined);

  const [socialTab, setSocialTab] = useState<"feed" | "challenges" | "messages" | "profile">(
    "feed"
  );
  const [activeThreadPeer, setActiveThreadPeer] = useState<string>("");
  const [messageDraftByPeer, setMessageDraftByPeer] = useState<Record<string, string>>({});
  const [messageActionsOpen, setMessageActionsOpen] = useState(false);
  const [messageShareSessionByPeer, setMessageShareSessionByPeer] = useState<Record<string, string>>({});
  const [messageShareTemplateByPeer, setMessageShareTemplateByPeer] = useState<Record<string, string>>({});
  const [messageShareSplitByPeer, setMessageShareSplitByPeer] = useState<Record<string, string>>({});
  const [profileShareSessionId, setProfileShareSessionId] = useState("");
  const [profileShareTemplateId, setProfileShareTemplateId] = useState("");
  const [ignoredMessageIds, setIgnoredMessageIds] = useState<Record<string, boolean>>({});

  const socialHandle = (social?.handle || "athlete").replace(/^@/, "");

  const focusLabel = useMemo(() => {
    const v = (social?.profile?.focus || "general") as SocialFocus;
    const map: Record<SocialFocus, string> = {
      general: "General",
      strength: "Strength",
      hypertrophy: "Hypertrophy",
      endurance: "Endurance",
      power: "Power",
      weight_loss: "Weight loss",
    };
    return map[v] || "General";
  }, [social?.profile?.focus]);

  const socialAdapter = useMemo(
    () =>
      createSocialAdapter({
        getState: () => ({}) as AdapterAppStateLike,
        setState: setStateAction as React.Dispatch<React.SetStateAction<AdapterAppStateLike>>,
        coerceSocial,
        makeHandle,
      }),
    [setStateAction]
  );

  useEffect(() => {
    if (social?.profile?.focus) return;
    const mapped = mapProfileFocusToSocial(profileFocus);
    socialAdapter.updateProfile({ focus: mapped });
  }, [profileFocus, social?.profile?.focus, socialAdapter]);

  const openEditProfile = useCallback(() => {
    const next = coerceSocial(social);
    setDraftDisplayName(
      (next.displayName || profileName || userFullName || "You").toString()
    );
    setDraftBio((next.profile?.bio || "").toString());
    setDraftFocus(
      ((next.profile?.focus || mapProfileFocusToSocial(profileFocus) || "general") as SocialFocus) ||
        "general"
    );
    setDraftAvatarDataUrl((next.profile?.avatarDataUrl || "").toString());
    setEditProfileOpen(true);
  }, [social, profileName, profileFocus, userFullName]);

  const saveProfile = useCallback(() => {
    socialAdapter.updateProfile({
      displayName: draftDisplayName,
      bio: draftBio,
      focus: draftFocus,
      avatarDataUrl: draftAvatarDataUrl,
    });
    setEditProfileOpen(false);
  }, [socialAdapter, draftDisplayName, draftBio, draftFocus, draftAvatarDataUrl]);

  const triggerAvatarPicker = useCallback((mode: "draft" | "save") => {
    avatarPickModeRef.current = mode;
    fileInputRef.current?.click();
  }, []);

  const openCropper = useCallback((mode: "draft" | "save", dataUrl: string) => {
    cropModeRef.current = mode;
    setCropSourceDataUrl(dataUrl);
    setCropZoomAbs(1);
    setCropPan({ x: 0, y: 0 });
    setCropOpen(true);
  }, []);

  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

  const onAvatarFilePicked = useCallback(async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert("Image is too large. Please pick one under 2MB.");
      return;
    }

    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });

    openCropper(avatarPickModeRef.current, dataUrl);
  }, [openCropper]);

  const cropViewport = 240;
  const cropOutSize = 512;

  const cropZoomMin = useMemo(() => {
    return Math.max(cropViewport / cropNatural.w, cropViewport / cropNatural.h);
  }, [cropNatural, cropViewport]);

  const cropZoomMax = useMemo(() => {
    return cropZoomMin * 4;
  }, [cropZoomMin]);

  useEffect(() => {
    if (!cropOpen) return;
    setCropZoomAbs((z) => {
      const next = z <= 1 ? cropZoomMin : z;
      return clamp(next, cropZoomMin, cropZoomMax);
    });
  }, [cropOpen, cropZoomMin, cropZoomMax]);

  const cropDisplayed = useMemo(() => {
    return {
      w: cropNatural.w * cropZoomAbs,
      h: cropNatural.h * cropZoomAbs,
    };
  }, [cropNatural, cropZoomAbs]);

  useEffect(() => {
    if (!cropOpen) return;
    const w = cropDisplayed.w;
    const h = cropDisplayed.h;
    const loX = (cropViewport - w) / 2;
    const hiX = -loX;
    const loY = (cropViewport - h) / 2;
    const hiY = -loY;
    setCropPan((p) => ({ x: clamp(p.x, loX, hiX), y: clamp(p.y, loY, hiY) }));
  }, [cropOpen, cropDisplayed.w, cropDisplayed.h]);

  const applyCrop = useCallback(async () => {
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = cropSourceDataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
      });

      const displayedW = img.naturalWidth * cropZoomAbs;
      const displayedH = img.naturalHeight * cropZoomAbs;

      const offsetX = (cropViewport - displayedW) / 2 + cropPan.x;
      const offsetY = (cropViewport - displayedH) / 2 + cropPan.y;

      const srcX = clamp((-offsetX) / cropZoomAbs, 0, img.naturalWidth);
      const srcY = clamp((-offsetY) / cropZoomAbs, 0, img.naturalHeight);
      const srcSize = clamp(
        cropViewport / cropZoomAbs,
        1,
        Math.min(img.naturalWidth, img.naturalHeight)
      );

      const canvas = document.createElement("canvas");
      canvas.width = cropOutSize;
      canvas.height = cropOutSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no canvas ctx");

      ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, cropOutSize, cropOutSize);
      const out = canvas.toDataURL("image/jpeg", 0.92);

      if (cropModeRef.current === "save") {
        socialAdapter.updateProfile({ avatarDataUrl: out });
        setDraftAvatarDataUrl(out);
      } else {
        setDraftAvatarDataUrl(out);
      }

      setCropOpen(false);
    } catch {
      alert("Could not crop image.");
    }
  }, [cropSourceDataUrl, cropZoomAbs, cropPan.x, cropPan.y, socialAdapter]);

  const socialFriends = useMemo(() => {
    const raw = Array.isArray(social?.friends) ? social.friends : [];
    const cleaned = raw
      .map((h) => (h || "").trim().replace(/^@/, ""))
      .filter(Boolean);
    return Array.from(new Set(cleaned)).sort((a, b) => a.localeCompare(b));
  }, [social?.friends]);

  const toTitleCase = (value: string) =>
    value
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const socialPosts = useMemo(() => {
    const raw = Array.isArray(social?.posts) ? social.posts : [];
    return [...raw].sort(
      (a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
    );
  }, [social?.posts]);

  const myPosts = useMemo(() => {
    return socialPosts.filter(
      (post) => (post.authorHandle || "").trim().replace(/^@/, "") === socialHandle
    );
  }, [socialPosts, socialHandle]);

  const socialChallenges = useMemo(() => {
    const raw = Array.isArray(social?.challenges) ? social.challenges : [];
    return [...raw].sort(
      (a, b) => new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime()
    );
  }, [social?.challenges]);

  const socialThreads = useMemo(() => {
    const raw = Array.isArray((social as any)?.threads) ? (((social as any).threads as SocialThread[]) || []) : [];
    return [...raw].sort(
      (a, b) => new Date(b.updatedAtISO).getTime() - new Date(a.updatedAtISO).getTime()
    );
  }, [social]);

  const latestSessionSummary = useMemo(() => {
    const nextSessions = Array.isArray(sessions) ? [...sessions] : [];
    nextSessions.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));
    const s = nextSessions[0];
    if (!s) return null;

    let totalSets = 0;
    let totalVolume = 0;
    for (const e of s.entries || []) {
      for (const set of e.sets || []) {
        totalSets += 1;
        totalVolume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
      }
    }

    const summary: SessionSummary = {
      sessionId: s.id,
      templateName: s.templateName,
      dateISO: s.dateISO,
      totalSets,
      totalVolume,
    };

    return summary;
  }, [sessions]);

  const sessionSummaries = useMemo<SessionSummary[]>(() => {
    const nextSessions = Array.isArray(sessions) ? [...sessions] : [];
    nextSessions.sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));

    return nextSessions.map((s) => {
      let totalSets = 0;
      let totalVolume = 0;
      for (const e of s.entries || []) {
        for (const set of e.sets || []) {
          totalSets += 1;
          totalVolume += (Number(set.reps) || 0) * (Number(set.weight) || 0);
        }
      }

      const summary: SessionSummary = {
        sessionId: s.id,
        templateName: s.templateName,
        dateISO: s.dateISO,
        totalSets,
        totalVolume,
      };

      return summary;
    });
  }, [sessions]);

  const sessionSummaryById = useMemo(() => {
    const m = new Map<string, SessionSummary>();
    for (const s of sessionSummaries) m.set(s.sessionId, s);
    return m;
  }, [sessionSummaries]);

  const templateById = useMemo(() => {
    const m = new Map<string, Template>();
    for (const t of templates || []) m.set(t.id, t);
    return m;
  }, [templates]);

  useEffect(() => {
    if (!profileShareSessionId) {
      setProfileShareSessionId(latestSessionSummary?.sessionId || "");
    }
  }, [latestSessionSummary, profileShareSessionId]);

  useEffect(() => {
    if (!profileShareTemplateId) {
      setProfileShareTemplateId(templates?.[0]?.id || "");
    }
  }, [templates, profileShareTemplateId]);

  const splitById = useMemo(() => {
    const m = new Map<string, NonNullable<typeof splits>[number]>();
    for (const s of splits || []) m.set(s.id, s);
    return m;
  }, [splits]);

  const sessionById = useMemo(() => {
    const m = new Map<string, SessionLite>();
    for (const s of sessions || []) m.set(s.id, s);
    return m;
  }, [sessions]);

  const profileStats = useMemo(() => {
    const sorted = [...sessionSummaries].sort((a, b) => String(b.dateISO).localeCompare(String(a.dateISO)));

    const today = new Date();
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);

    const sessionDays = new Set<string>();
    let totalVolume = 0;
    for (const s of sorted) {
      sessionDays.add(dayKey(new Date(s.dateISO)));
      totalVolume += Number(s.totalVolume) || 0;
    }

    let streak = 0;
    const cursor = new Date(dayKey(today));
    while (sessionDays.has(dayKey(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const vol7d = sorted
      .filter((s) => new Date(s.dateISO) >= new Date(dayKey(sevenDaysAgo)))
      .reduce((acc, s) => acc + (Number(s.totalVolume) || 0), 0);

    const last = sorted[0]?.dateISO ? new Date(sorted[0].dateISO) : null;
    const lastLabel = last
      ? last.toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : "—";

    return {
      totalSessions: sorted.length,
      streak,
      vol7d,
      totalVolume,
      lastLabel,
    };
  }, [sessionSummaries]);

  const formatDateLabel = useCallback((iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }, []);

  const createWorkoutPostFromSummary = useCallback(
    (summary: SessionSummary, opts?: { text?: string; toHandle?: string }) => {
      const text = (opts?.text || "").trim();
      const toHandle = (opts?.toHandle || "").trim().replace(/^@/, "");

      const post: SocialPost = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        kind: "workout",
        text: text || undefined,
        toHandle: toHandle || undefined,
        workout: summary,
        likes: [],
        comments: [],
      };

      socialAdapter.createPost(post);

      setPostTextInput("");
      setSocialTab("feed");
    },
    [socialAdapter, socialHandle]
  );

  const formatSessionShareText = useCallback(
    (summary: SessionSummary) =>
      `Workout: ${summary.templateName} • ${formatDateLabel(summary.dateISO)} • ${
        summary.totalSets
      } sets • ${Math.round(summary.totalVolume).toLocaleString()} ${units}`,
    [formatDateLabel, units]
  );

  const formatSplitShareText = useCallback(
    (template: Template) => `Split day: ${template.name}`,
    []
  );

  const formatFullSplitShareText = useCallback(
    (splitPlan: NonNullable<typeof splits>[number]) => `Split: ${splitPlan.name}`,
    []
  );

  useEffect(() => {
    const existing = (social?.handle || "").trim();
    if (existing) return;
    socialAdapter.ensureIdentity({ profileName, profileHandle, userId, userFullName });
  }, [profileHandle, profileName, socialAdapter, social?.handle, userFullName, userId]);


  const createWorkoutPost = useCallback(
    (opts?: { text?: string; toHandle?: string }) => {
      if (!latestSessionSummary) {
        alert("Log a workout first so you have something to share.");
        return;
      }
      createWorkoutPostFromSummary(latestSessionSummary, opts);
    },
    [createWorkoutPostFromSummary, latestSessionSummary]
  );

  const createSplitPostFromTemplate = useCallback(
    (template: Template, opts?: { text?: string; toHandle?: string }) => {
      const text = (opts?.text || "").trim();
      const toHandle = (opts?.toHandle || "").trim().replace(/^@/, "");

      const post: SocialPost = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        kind: "split",
        text: text || undefined,
        toHandle: toHandle || undefined,
        split: { templateId: template.id, templateName: template.name },
        likes: [],
        comments: [],
      };

      socialAdapter.createPost(post);

      setPostTextInput("");
      setSocialTab("feed");
    },
    [socialAdapter, socialHandle]
  );

  const createSplitPostFromPlan = useCallback(
    (splitPlan: NonNullable<typeof splits>[number], opts?: { text?: string; toHandle?: string }) => {
      const text = (opts?.text || "").trim();
      const toHandle = (opts?.toHandle || "").trim().replace(/^@/, "");

      const post: SocialPost = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        kind: "split",
        text: text || undefined,
        toHandle: toHandle || undefined,
        split: { templateId: splitPlan.id, templateName: splitPlan.name },
        likes: [],
        comments: [],
      };

      socialAdapter.createPost(post);

      setPostTextInput("");
      setSocialTab("feed");
    },
    [socialAdapter, socialHandle]
  );

  const addTemplateFromSession = useCallback(
    (sessionId: string) => {
      const session = sessionById.get(sessionId);
      if (!session) {
        alert("That workout isn't available.");
        return;
      }
      const exercises = (session.entries || []).map((entry, idx) => {
        const sets = entry.sets || [];
        const setType = sets.find((s) => s.setType && s.setType !== "normal")?.setType || "normal";
        const supersetTag = sets.find((s) => s.supersetTag)?.supersetTag || "";
        return {
          id: `${Date.now()}_${idx}`,
          name: entry.exerciseName || `Exercise ${idx + 1}`,
          defaultSets: sets.length || 3,
          repRange: { min: 8, max: 12 },
          restSec: 90,
          weightStep: 5,
          autoProgress: true,
          setType,
          supersetTag: setType === "superset" || setType === "triset" || setType === "circuit" ? supersetTag || "A" : "",
        };
      });

      setStateAction((p) => ({
        ...p,
        templates: [
          {
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: `${session.templateName} (shared)`,
            exercises,
          },
          ...(p.templates || []),
        ],
      }));
    },
    [sessionById, setStateAction]
  );

  const addTemplateFromTemplate = useCallback(
    (templateId: string) => {
      const template = templateById.get(templateId);
      if (!template) {
        alert("That split isn't available.");
        return;
      }
      setStateAction((p) => ({
        ...p,
        templates: [
          {
            ...template,
            id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
            name: `${template.name} (shared)`,
          },
          ...(p.templates || []),
        ],
      }));
    },
    [setStateAction, templateById]
  );

  const addSplitFromPlan = useCallback(
    (splitId: string) => {
      const splitPlan = splitById.get(splitId);
      if (!splitPlan) {
        alert("That split isn't available.");
        return;
      }
      const templatesToCopy = splitPlan.days
        .map((d) => templateById.get(d.templateId))
        .filter(Boolean) as Template[];
      if (!templatesToCopy.length) {
        alert("Missing split templates.");
        return;
      }

      const templateIdMap = new Map<string, string>();
      const nextTemplates = templatesToCopy.map((t) => {
        const nextId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
        templateIdMap.set(t.id, nextId);
        return { ...t, id: nextId, name: `${t.name} (shared)` };
      });

      const nextSplit = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        name: `${splitPlan.name} (shared)`,
        createdAtISO: new Date().toISOString(),
        days: splitPlan.days.map((d) => ({
          ...d,
          templateId: templateIdMap.get(d.templateId) || d.templateId,
        })),
      };

      setStateAction((p) => ({
        ...p,
        templates: [...nextTemplates, ...(p.templates || [])],
        splits: [nextSplit, ...(p.splits || [])],
      }));
    },
    [setStateAction, splitById, templateById]
  );

  const toggleLikePost = useCallback(
    (postId: string) => {
      socialAdapter.toggleLike(postId, socialHandle);
    },
    [socialAdapter, socialHandle]
  );

  const addCommentToPost = useCallback(
    (postId: string) => {
      const text = (commentDraftByPostId[postId] || "").trim();
      if (!text) return;

      const comment: SocialComment = {
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        text,
      };

      socialAdapter.addComment(postId, comment);

      setCommentDraftByPostId((prev) => ({ ...prev, [postId]: "" }));
    },
    [commentDraftByPostId, socialAdapter, socialHandle]
  );

  const removeFriend = useCallback(
    (handle: string) => {
      const h = (handle || "").trim().replace(/^@/, "");
      socialAdapter.removeFriend(h);
    },
    [socialAdapter]
  );

  const createChallenge = useCallback(() => {
    const to = challengeToHandle.trim().replace(/^@/, "");
    if (!to) {
      alert("Pick a friend to challenge.");
      return;
    }

    const title = (challengeTitle || "").trim();
    if (!title) {
      alert("Enter a challenge title.");
      return;
    }

    const mkId = () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const challenge: SocialChallenge = {
      id: mkId(),
      createdAtISO: new Date().toISOString(),
      createdByHandle: socialHandle,
      toHandle: to,
      title,
      description: (challengeDescription || "").trim() || undefined,
      status: "pending",
    };

    const post: SocialPost = {
      id: mkId(),
      createdAtISO: new Date().toISOString(),
      authorHandle: socialHandle,
      kind: "challenge",
      text: title,
      toHandle: to,
      challengeId: challenge.id,
      likes: [],
      comments: [],
    };

    socialAdapter.createChallenge(challenge, post);

    setChallengeTitle("");
    setChallengeDescription("");
    setChallengeToHandle("");
    setSocialTab("feed");
  }, [challengeDescription, challengeTitle, challengeToHandle, socialAdapter, socialHandle]);

  const setChallengeStatus = useCallback(
    (challengeId: string, status: SocialChallengeStatus) => {
      socialAdapter.setChallengeStatus(challengeId, status);
    },
    [socialAdapter]
  );

  const openThread = useCallback(
    (peer: string) => {
      const p = (peer || "").trim().replace(/^@/, "");
      if (!p) return;
      setActiveThreadPeer(p);
      setSocialTab("messages");

      socialAdapter.ensureThread(p);
    },
    [socialAdapter]
  );

  const openConnect = useCallback(() => {
    setConnectHandleInput("");
    setConnectOpen(true);
  }, []);

  const connectHandle = useMemo(
    () => makeHandle(connectHandleInput.trim().replace(/^@/, "")),
    [connectHandleInput]
  );

  const connectAddFriend = useCallback(() => {
    if (!connectHandle) return;
    socialAdapter.addFriend(connectHandle);
    setConnectOpen(false);
  }, [connectHandle, socialAdapter]);

  const connectMessage = useCallback(() => {
    if (!connectHandle) return;
    socialAdapter.addFriend(connectHandle);
    openThread(connectHandle);
    setConnectOpen(false);
  }, [connectHandle, openThread, socialAdapter]);

  const connectChallenge = useCallback(() => {
    if (!connectHandle) return;
    socialAdapter.addFriend(connectHandle);
    setChallengeToHandle(connectHandle);
    setSocialTab("challenges");
    setConnectOpen(false);
  }, [connectHandle, socialAdapter]);

  const sendMessage = useCallback(
    (peer: string) => {
      const p = (peer || "").trim().replace(/^@/, "");
      const text = (messageDraftByPeer[p] || "").trim();
      if (!p || !text) return;

      const mkId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const msg: SocialMessage = {
        id: mkId(),
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        text,
      };

      socialAdapter.appendMessage(p, msg);

      setMessageDraftByPeer((prev) => ({ ...prev, [p]: "" }));
    },
    [messageDraftByPeer, socialAdapter, socialHandle]
  );

  const sendWorkoutMessage = useCallback(
    (peer: string, summary?: SessionSummary | null) => {
      const p = (peer || "").trim().replace(/^@/, "");
      if (!p || !summary) return;

      const mkId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const msg: SocialMessage = {
        id: mkId(),
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        text: `${formatSessionShareText(summary)}\n[[ff:workout:${summary.sessionId}]]`,
      };

      socialAdapter.appendMessage(p, msg);
    },
    [formatSessionShareText, socialAdapter, socialHandle]
  );

  const sendSplitMessage = useCallback(
    (peer: string, template?: Template | null) => {
      const p = (peer || "").trim().replace(/^@/, "");
      if (!p || !template) return;

      const mkId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const msg: SocialMessage = {
        id: mkId(),
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        text: `${formatSplitShareText(template)}\n[[ff:template:${template.id}]]`,
      };

      socialAdapter.appendMessage(p, msg);
    },
    [formatSplitShareText, socialAdapter, socialHandle]
  );

  const sendFullSplitMessage = useCallback(
    (peer: string, splitPlan?: NonNullable<typeof splits>[number] | null) => {
      const p = (peer || "").trim().replace(/^@/, "");
      if (!p || !splitPlan) return;

      const mkId = () =>
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const msg: SocialMessage = {
        id: mkId(),
        createdAtISO: new Date().toISOString(),
        authorHandle: socialHandle,
        text: `${formatFullSplitShareText(splitPlan)}\n[[ff:split:${splitPlan.id}]]`,
      };

      socialAdapter.appendMessage(p, msg);
    },
    [formatFullSplitShareText, socialAdapter, socialHandle]
  );

  const currentThread = useMemo(() => {
    const p = (activeThreadPeer || "").trim();
    if (!p) return null;
    return socialThreads.find((t) => (t.peerHandle || "").trim() === p) || null;
  }, [activeThreadPeer, socialThreads]);

  useEffect(() => {
    if (!activeThreadPeer) return;
    setMessageShareSessionByPeer((prev) => {
      if (prev[activeThreadPeer]) return prev;
      return {
        ...prev,
        [activeThreadPeer]: latestSessionSummary?.sessionId || "",
      };
    });
    setMessageShareTemplateByPeer((prev) => {
      if (prev[activeThreadPeer]) return prev;
      return {
        ...prev,
        [activeThreadPeer]: templates?.[0]?.id || "",
      };
    });
    setMessageShareSplitByPeer((prev) => {
      if (prev[activeThreadPeer]) return prev;
      return {
        ...prev,
        [activeThreadPeer]: splits?.[0]?.id || "",
      };
    });
  }, [activeThreadPeer, latestSessionSummary, templates, splits]);

  const myAvatarDataUrl = (social?.profile?.avatarDataUrl || "").trim() || undefined;

  const threadByPeer = useMemo(() => {
    const m = new Map<string, SocialThread>();
    for (const t of socialThreads || []) {
      const p = (t.peerHandle || "").trim().replace(/^@/, "");
      if (!p) continue;
      m.set(p, t);
    }
    return m;
  }, [socialThreads]);

  const messagePeers = useMemo(() => {
    const peers = new Set<string>();
    for (const h of socialFriends) peers.add(h);
    for (const t of socialThreads) peers.add((t.peerHandle || "").trim().replace(/^@/, ""));
    return Array.from(peers).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [socialFriends, socialThreads]);

  return (
    <div className="relative -mx-4 md:-mx-8">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onAvatarFilePicked(e.target.files?.[0]);
          e.currentTarget.value = "";
        }}
      />

      <Dialog open={cropOpen} onOpenChange={setCropOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Crop photo</DialogTitle>
            <DialogDescription>Drag to position. Use zoom, then save.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="mx-auto">
              <div
                className="rounded-3xl border border-border/60 bg-background/40 overflow-hidden touch-none"
                style={{ width: cropViewport, height: cropViewport }}
                onPointerDown={(e) => {
                  const el = e.currentTarget;
                  el.setPointerCapture(e.pointerId);

                  const g = cropGestureRef.current || {
                    pointers: new Map<number, { x: number; y: number }>(),
                    panStart: { x: cropPan.x, y: cropPan.y },
                    zoomStart: cropZoomAbs,
                    distStart: 0,
                    midStart: { x: e.clientX, y: e.clientY },
                  };

                  g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                  g.panStart = { x: cropPan.x, y: cropPan.y };
                  g.zoomStart = cropZoomAbs;

                  const pts = Array.from(g.pointers.values());
                  if (pts.length >= 2) {
                    const a = pts[0];
                    const b = pts[1];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    g.distStart = Math.max(1, Math.hypot(dx, dy));
                    g.midStart = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
                  } else {
                    g.distStart = 0;
                    g.midStart = { x: e.clientX, y: e.clientY };
                  }

                  cropGestureRef.current = g;
                }}
                onPointerMove={(e) => {
                  const g = cropGestureRef.current;
                  if (!g) return;
                  g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

                  const pts = Array.from(g.pointers.values());
                  const w = cropDisplayed.w;
                  const h = cropDisplayed.h;
                  const loX = (cropViewport - w) / 2;
                  const hiX = -loX;
                  const loY = (cropViewport - h) / 2;
                  const hiY = -loY;

                  if (pts.length >= 2) {
                    const a = pts[0];
                    const b = pts[1];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.max(1, Math.hypot(dx, dy));
                    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

                    const nextZoom = clamp(
                      g.zoomStart * (dist / Math.max(1, g.distStart || dist)),
                      cropZoomMin,
                      cropZoomMax
                    );

                    const midDx = mid.x - g.midStart.x;
                    const midDy = mid.y - g.midStart.y;

                    setCropZoomAbs(nextZoom);

                    setCropPan({
                      x: clamp(g.panStart.x + midDx, loX, hiX),
                      y: clamp(g.panStart.y + midDy, loY, hiY),
                    });
                    return;
                  }

                  const p = pts[0];
                  const start = g.midStart;
                  const dx = p.x - start.x;
                  const dy = p.y - start.y;
                  setCropPan({
                    x: clamp(g.panStart.x + dx, loX, hiX),
                    y: clamp(g.panStart.y + dy, loY, hiY),
                  });
                }}
                onPointerUp={(e) => {
                  const g = cropGestureRef.current;
                  if (g) {
                    g.pointers.delete(e.pointerId);
                    if (g.pointers.size === 0) cropGestureRef.current = undefined;
                  }
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
              >
                {cropSourceDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={cropSourceDataUrl}
                    alt="Crop"
                    className="select-none"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setCropNatural({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
                    }}
                    style={{
                      width: `${cropDisplayed.w}px`,
                      height: `${cropDisplayed.h}px`,
                      transform: `translate(${(cropViewport - cropDisplayed.w) / 2 + cropPan.x}px, ${(cropViewport - cropDisplayed.h) / 2 + cropPan.y}px)`,
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Zoom</Label>
              <input
                type="range"
                min={cropZoomMin}
                max={cropZoomMax}
                step={0.001}
                value={cropZoomAbs}
                onChange={(e) => {
                  const next = Number(e.target.value) || cropZoomMin;
                  setCropZoomAbs(clamp(next, cropZoomMin, cropZoomMax));
                }}
                className="w-full"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setCropOpen(false)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={() => void applyCrop()} disabled={!cropSourceDataUrl}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social top bar */}
      <div className="sticky top-0 z-[60] border-b border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl">
        <div className="px-4 md:px-8 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={onGoHomeAction}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="ml-1 ff-caption">Back</span>
            </Button>

            <div className="min-w-0 text-center">
              <div className="ff-kicker text-muted-foreground">Social</div>
              <div className="ff-h3 truncate">@{socialHandle}</div>
            </div>

            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setCreatePostOpen(true)}
                  aria-label="Create"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="rounded-full">
                  {socialFriends.length} friends
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Connect</DialogTitle>
            <DialogDescription>Add a friend, message them, or challenge them.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Handle</Label>
            <Input
              value={connectHandleInput}
              onChange={(e) => setConnectHandleInput(e.target.value)}
              placeholder="@mason"
            />
            <div className="ff-caption text-muted-foreground">
              {connectHandle ? `Will use @${connectHandle}` : "Enter a handle"}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={connectAddFriend}
              disabled={!connectHandle}
            >
              Add
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={connectMessage}
              disabled={!connectHandle}
            >
              Message
            </Button>
            <Button className="rounded-xl" onClick={connectChallenge} disabled={!connectHandle}>
              Challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className={`px-4 md:px-8 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] ${SECTION_GAP}`}>
        {socialTab === "feed" ? (
          <div className={CARD_GAP}>
            <div className={CARD_GAP}>
              {socialPosts.length === 0 ? (
                <Card className="rounded-[var(--radius-card)]">
                  <CardHeader>
                    <CardTitle className="ff-h3">Feed</CardTitle>
                    <CardDescription>
                      Your posts and challenges show up here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setSocialTab("profile")}
                    >
                      Go to Profile
                    </Button>
                  </CardContent>
                </Card>
              ) : null}

              {socialPosts.map((post) => (
                <Card key={post.id} className="rounded-[var(--radius-card)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarBubble
                          size={40}
                          ring
                          src={(post.authorHandle || "").trim() === socialHandle ? myAvatarDataUrl : undefined}
                          fallback={initialsFromHandle(post.authorHandle)}
                        />
                        <div className="min-w-0">
                          <div className="font-medium truncate">@{post.authorHandle}</div>
                          <div className="ff-caption text-muted-foreground">
                            {timeAgoShort(post.createdAtISO)}
                            {post.toHandle ? ` • sent to @${post.toHandle}` : ""}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        {toTitleCase(post.kind)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {post.text ? <div className="text-sm">{post.text}</div> : null}

                    {post.kind === "workout" && post.workout ? (
                      <div className="card-inset p-4">
                        <div className="text-sm font-medium">{post.workout.templateName}</div>
                        <div className="ff-caption text-muted-foreground mt-1">
                          {formatDateLabel(post.workout.dateISO)} • {post.workout.totalSets} sets •{" "}
                          {Math.round(post.workout.totalVolume).toLocaleString()} {units} volume
                        </div>
                      </div>
                    ) : null}

                    {post.kind === "split" && post.split ? (
                      <div className="card-inset p-4">
                        <div className="text-sm font-medium">Split</div>
                        <div className="ff-caption text-muted-foreground mt-1">
                          {post.split.templateName}
                        </div>
                      </div>
                    ) : null}

                    {post.kind === "challenge" ? (
                      <div className="card-inset p-4">
                        <div className="text-sm font-medium">Challenge</div>
                        <div className="ff-caption text-muted-foreground mt-1">
                          {post.toHandle ? `To @${post.toHandle}` : ""}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-xl"
                        onClick={() => toggleLikePost(post.id)}
                      >
                        <Heart className="h-4 w-4 mr-2" /> {post.likes?.length || 0}
                      </Button>
                      <div className="ff-caption text-muted-foreground">
                        {post.comments?.length ? `${post.comments.length} comments` : "No comments"}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(post.comments || []).slice(-3).map((c) => (
                        <div key={c.id} className="flex items-start gap-2">
                          <AvatarBubble
                            size={28}
                            ring={false}
                            src={(c.authorHandle || "").trim() === socialHandle ? myAvatarDataUrl : undefined}
                            fallback={initialsFromHandle(c.authorHandle)}
                            className="shrink-0"
                          />
                          <div className="text-sm min-w-0">
                            <span className="font-medium">@{c.authorHandle}</span>{" "}
                            <span className="text-muted-foreground break-words">{c.text}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-2">
                        <Input
                          value={commentDraftByPostId[post.id] || ""}
                          onChange={(e) =>
                            setCommentDraftByPostId((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          placeholder="Add a comment"
                        />
                        <Button className="rounded-xl" onClick={() => addCommentToPost(post.id)}>
                          Post
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {socialTab === "challenges" ? (
          <div className="space-y-4">
            <Card className="rounded-[var(--radius-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5" /> Create challenge
                </CardTitle>
                <CardDescription>
                  Friendly now, backend-ready later. Challenges show up in the feed.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setChallengeTitle("First to 3 sessions");
                      setChallengeDescription("Who logs 3 workouts first?");
                    }}
                  >
                    First to 3
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setChallengeTitle("7-day streak battle");
                      setChallengeDescription("Keep your streak alive for 7 days.");
                    }}
                  >
                    7-day streak
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => {
                      setChallengeTitle("Volume duel (7 days)");
                      setChallengeDescription(`Most ${units} volume in 7 days wins.`);
                    }}
                  >
                    Volume duel
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>To</Label>
                    <Select value={challengeToHandle} onValueChange={setChallengeToHandle}>
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={socialFriends.length ? "Pick a friend" : "Add friends first"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {socialFriends.map((h) => (
                          <SelectItem key={h} value={h}>
                            @{h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input
                      value={challengeTitle}
                      onChange={(e) => setChallengeTitle(e.target.value)}
                      placeholder="e.g. 7-day streak challenge"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description (optional)</Label>
                  <Input
                    value={challengeDescription}
                    onChange={(e) => setChallengeDescription(e.target.value)}
                    placeholder="e.g. Train 4 times this week"
                  />
                </div>
                <Button className="rounded-xl" onClick={createChallenge}>
                  Send challenge
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-[var(--radius-card)]">
              <CardHeader>
                <CardTitle className="ff-h3">Challenges</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {socialChallenges.length === 0 ? (
                  <div className="ff-body-sm text-muted-foreground">No challenges yet.</div>
                ) : (
                  socialChallenges.map((c) => (
                    <div key={c.id} className="card-inset p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.title}</div>
                          <div className="ff-caption text-muted-foreground">
                            To @{c.toHandle} • {timeAgoShort(c.createdAtISO)}
                          </div>
                        </div>
                        <Badge variant="secondary" className="rounded-full">
                          {c.status}
                        </Badge>
                      </div>
                      {c.description ? (
                        <div className="ff-body-sm text-muted-foreground">{c.description}</div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        {(c.toHandle || "").trim().replace(/^@/, "") === socialHandle &&
                        c.status === "pending" ? (
                          <>
                            <Button
                              size="sm"
                              className="rounded-xl"
                              onClick={() => setChallengeStatus(c.id, "active")}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setChallengeStatus(c.id, "declined")}
                            >
                              Decline
                            </Button>
                          </>
                        ) : null}

                        {c.status === "active" ? (
                          <Button
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setChallengeStatus(c.id, "complete")}
                          >
                            Mark complete
                          </Button>
                        ) : null}

                        {c.status === "pending" &&
                        (c.toHandle || "").trim().replace(/^@/, "") !== socialHandle ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => setChallengeStatus(c.id, "active")}
                          >
                            Mark active
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {socialTab === "messages" ? (
          <div className="space-y-4">
            <Card className="rounded-[var(--radius-card)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" /> Messages
                </CardTitle>
                <CardDescription>Local-first DMs with your workout friends.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {messagePeers.length ? (
                  <div className="space-y-1">
                    {messagePeers.map((peer) => {
                      const t = threadByPeer.get(peer);
                      const last = t?.messages?.length ? t.messages[t.messages.length - 1] : null;
                      const preview = last
                        ? `${(last.authorHandle || "").trim() === socialHandle ? "You: " : ""}${last.text}`
                        : "Tap to message";
                      const stamp = last?.createdAtISO
                        ? timeAgoShort(last.createdAtISO)
                        : t?.updatedAtISO
                          ? timeAgoShort(t.updatedAtISO)
                          : "";

                      return (
                        <button
                          key={peer}
                          type="button"
                          className="w-full text-left rounded-2xl hover:bg-background/15 transition-colors px-2 py-3"
                          onClick={() => openThread(peer)}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <AvatarBubble
                                size={44}
                                ring
                                src={undefined}
                                fallback={initialsFromHandle(peer)}
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate">@{peer}</div>
                                <div className="ff-caption text-muted-foreground truncate">{preview}</div>
                              </div>
                            </div>
                            {stamp ? (
                              <div className="ff-caption text-muted-foreground shrink-0">{stamp}</div>
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ff-body-sm text-muted-foreground">Add a friend to start messaging.</div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {socialTab === "messages" && activeThreadPeer && currentThread ? (
          <div className="fixed inset-0 z-[90] bg-background flex flex-col">
            <div className="pt-[env(safe-area-inset-top)] border-b border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl">
              <div className="px-4 md:px-8 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      onClick={() => setActiveThreadPeer("")}
                      aria-label="Back"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>

                    <AvatarBubble
                      size={36}
                      ring
                      src={undefined}
                      fallback={initialsFromHandle(currentThread.peerHandle)}
                      className="shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="font-medium truncate">@{currentThread.peerHandle}</div>
                      <div className="ff-caption text-muted-foreground truncate">New chat</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-4 md:px-8 py-4 space-y-2">
              {(currentThread.messages || []).length === 0 ? (
                <div className="ff-body-sm text-muted-foreground">Send the first message.</div>
              ) : (
                (currentThread.messages || []).map((m) => {
                  const mine = (m.authorHandle || "").trim() === socialHandle;
                  const tokenMatch = (m.text || "").match(/\[\[ff:(workout|template|split):([^\]]+)\]\]/);
                  const tokenKind = tokenMatch?.[1];
                  const tokenId = tokenMatch?.[2];
                  const cleanText = (m.text || "").replace(/\n?\[\[ff:(workout|template|split):[^\]]+\]\]/, "");
                  const ignored = !!ignoredMessageIds[m.id];
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                      {!mine ? (
                        <AvatarBubble
                          size={28}
                          ring={false}
                          src={undefined}
                          fallback={initialsFromHandle(m.authorHandle)}
                          className="mt-1 shrink-0"
                        />
                      ) : null}

                      <div
                        className={`max-w-[85%] rounded-3xl px-4 py-2.5 text-sm border ${
                          mine
                            ? "border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)]"
                            : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]"
                        }`}
                      >
                        <div className="text-[0.7rem] text-muted-foreground mb-1">
                          {mine ? "You" : `@${m.authorHandle}`} • {timeAgoShort(m.createdAtISO)}
                        </div>
                        {cleanText ? (
                          <div className="text-foreground whitespace-pre-wrap break-words">
                            {cleanText}
                          </div>
                        ) : null}

                        {!ignored && tokenKind === "workout" && tokenId ? (
                          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
                            <div className="ff-kicker text-muted-foreground">
                              Shared workout
                            </div>
                            <div className="mt-1 text-sm font-medium">
                              {sessionById.get(tokenId)?.templateName || "Workout"}
                            </div>
                            <div className="ff-caption text-muted-foreground mt-1">
                              {sessionById.get(tokenId)
                                ? `${formatDateLabel(sessionById.get(tokenId)!.dateISO)} • ${
                                    sessionById.get(tokenId)!.entries.reduce(
                                      (acc, e) => acc + (e.sets || []).length,
                                      0
                                    )
                                  } sets`
                                : "Details unavailable"}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => addTemplateFromSession(tokenId)}
                              >
                                Add to templates
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() =>
                                  setIgnoredMessageIds((prev) => ({ ...prev, [m.id]: true }))
                                }
                              >
                                Ignore
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {!ignored && tokenKind === "template" && tokenId ? (
                          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
                            <div className="ff-kicker text-muted-foreground">
                              Shared split day
                            </div>
                            <div className="mt-1 text-sm font-medium">
                              {templateById.get(tokenId)?.name || "Split day"}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => addTemplateFromTemplate(tokenId)}
                              >
                                Add to templates
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() =>
                                  setIgnoredMessageIds((prev) => ({ ...prev, [m.id]: true }))
                                }
                              >
                                Ignore
                              </Button>
                            </div>
                          </div>
                        ) : null}

                        {!ignored && tokenKind === "split" && tokenId ? (
                          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3">
                            <div className="ff-kicker text-muted-foreground">
                              Shared split
                            </div>
                            <div className="mt-1 text-sm font-medium">
                              {splitById.get(tokenId)?.name || "Split"}
                            </div>
                            <div className="ff-caption text-muted-foreground mt-1">
                              {(splitById.get(tokenId)?.days || [])
                                .map((d) => d.label)
                                .filter(Boolean)
                                .join(" • ") || "Details unavailable"}
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                size="sm"
                                className="rounded-full"
                                onClick={() => addSplitFromPlan(tokenId)}
                              >
                                Add split
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() =>
                                  setIgnoredMessageIds((prev) => ({ ...prev, [m.id]: true }))
                                }
                              >
                                Ignore
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {mine ? (
                        <AvatarBubble
                          size={28}
                          ring={false}
                          src={myAvatarDataUrl}
                          fallback={initialsFromHandle(socialHandle)}
                          className="mt-1 shrink-0"
                        />
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl px-4 md:px-8 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] space-y-2">
                {messageActionsOpen ? (
                  <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-3 space-y-3">
                  <Button
                    variant="outline"
                    className="rounded-full h-10 w-full justify-start"
                    onClick={() => {
                      setChallengeToHandle(activeThreadPeer);
                      setSocialTab("challenges");
                      setActiveThreadPeer("");
                      setMessageActionsOpen(false);
                    }}
                  >
                    <Flame className="h-4 w-4 mr-2" /> Challenge
                  </Button>
                  <div className="flex items-center gap-2">
                    <Select
                      value={messageShareSessionByPeer[activeThreadPeer] || ""}
                      onValueChange={(value) =>
                        setMessageShareSessionByPeer((prev) => ({
                          ...prev,
                          [activeThreadPeer]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex-1">
                        <SelectValue placeholder="Share a workout" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessionSummaries.slice(0, 8).map((s) => (
                          <SelectItem key={s.sessionId} value={s.sessionId}>
                            {s.templateName} • {formatDateLabel(s.dateISO)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="rounded-full h-10"
                      onClick={() => {
                        sendWorkoutMessage(
                          activeThreadPeer,
                          sessionSummaryById.get(messageShareSessionByPeer[activeThreadPeer])
                        );
                        setMessageActionsOpen(false);
                      }}
                      disabled={!messageShareSessionByPeer[activeThreadPeer]}
                    >
                      Share
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={messageShareTemplateByPeer[activeThreadPeer] || ""}
                      onValueChange={(value) =>
                        setMessageShareTemplateByPeer((prev) => ({
                          ...prev,
                          [activeThreadPeer]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex-1">
                        <SelectValue placeholder="Share a split" />
                      </SelectTrigger>
                      <SelectContent>
                        {(templates || []).map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="rounded-full h-10"
                      onClick={() => {
                        sendSplitMessage(
                          activeThreadPeer,
                          templateById.get(messageShareTemplateByPeer[activeThreadPeer])
                        );
                        setMessageActionsOpen(false);
                      }}
                      disabled={!messageShareTemplateByPeer[activeThreadPeer]}
                    >
                      Share
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={messageShareSplitByPeer[activeThreadPeer] || ""}
                      onValueChange={(value) =>
                        setMessageShareSplitByPeer((prev) => ({
                          ...prev,
                          [activeThreadPeer]: value,
                        }))
                      }
                    >
                      <SelectTrigger className="h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex-1">
                        <SelectValue placeholder="Share full split" />
                      </SelectTrigger>
                      <SelectContent>
                        {(splits || []).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      className="rounded-full h-10"
                      onClick={() => {
                        sendFullSplitMessage(
                          activeThreadPeer,
                          splitById.get(messageShareSplitByPeer[activeThreadPeer])
                        );
                        setMessageActionsOpen(false);
                      }}
                      disabled={!messageShareSplitByPeer[activeThreadPeer]}
                    >
                      Share
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="flex items-center gap-2">
                <Input
                  className="h-11 rounded-full bg-[rgba(255,255,255,0.03)] flex-1"
                  value={messageDraftByPeer[activeThreadPeer] || ""}
                  onChange={(e) =>
                    setMessageDraftByPeer((prev) => ({
                      ...prev,
                      [activeThreadPeer]: e.target.value,
                    }))
                  }
                  placeholder={`Message @${activeThreadPeer}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage(activeThreadPeer);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full h-11 w-11"
                  onClick={() => setMessageActionsOpen((v) => !v)}
                  aria-label="Message actions"
                >
                  <Plus className="h-5 w-5" />
                </Button>
                <Button className="rounded-full h-11 w-11" onClick={() => sendMessage(activeThreadPeer)} aria-label="Send">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {socialTab === "profile" ? (
            <div className={CARD_GAP}>
            <Card className="rounded-none md:rounded-[var(--radius-card)] md:mx-0 -mx-4">
              <CardContent className="space-y-3 px-4 md:px-5">
                <div className="rounded-none md:rounded-[2rem] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] shadow-[var(--shadow-elev-1)] backdrop-blur-[18px] overflow-hidden">
                  <div className="relative h-16 sm:h-20 bg-[linear-gradient(120deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
                    <div className="absolute inset-0 bg-background/10" />
                  </div>
                  <div className="px-4 pb-4 -mt-8">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-20 w-20 rounded-[1.6rem] border border-border/60 bg-[rgba(255,255,255,0.03)] overflow-hidden flex items-center justify-center font-display text-3xl shrink-0">
                          {social?.profile?.avatarDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={social.profile.avatarDataUrl}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initialsFromHandle(socialHandle)
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-display text-lg sm:text-xl leading-none text-muted-foreground truncate">
                            @{socialHandle}
                          </div>
                          <div className="mt-1 font-display text-2xl sm:text-3xl leading-none truncate">
                            {(social?.displayName || profileName || userFullName || "You").toString()}
                          </div>
                        </div>
                      </div>
                      <Button type="button" className="rounded-full h-10 px-4" onClick={openEditProfile}>
                        Edit
                      </Button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="rounded-full border border-border/60 bg-[rgba(255,255,255,0.03)] px-3 py-1 ff-kicker"
                      >
                        {focusLabel}
                      </Badge>
                      <Badge variant="outline" className="rounded-full px-3 py-1 ff-kicker">
                        {myPosts.length} posts
                      </Badge>
                    </div>

                    {social?.profile?.bio ? (
                      <div className="ff-body-sm text-muted-foreground mt-2 whitespace-pre-wrap break-words">
                        {social.profile.bio}
                      </div>
                    ) : (
                      <div className="ff-body-sm text-muted-foreground mt-2">
                        Build. Track. Earn it.
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium">My Feed</div>
                  </div>

                  {myPosts.length === 0 ? (
                    <div className="card-inset p-4 text-sm text-muted-foreground">
                      No posts yet.
                    </div>
                  ) : (
                    <div className={CARD_GAP}>
                      {myPosts.map((post) => (
                        <Card key={post.id} className="rounded-[var(--radius-card)]">
                          <CardHeader className="pb-2 pt-4 px-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <AvatarBubble
                                  size={36}
                                  ring
                                  src={(post.authorHandle || "").trim() === socialHandle ? myAvatarDataUrl : undefined}
                                  fallback={initialsFromHandle(post.authorHandle)}
                                />
                                <div className="min-w-0">
                                  <div className="font-medium truncate">@{post.authorHandle}</div>
                                  <div className="ff-caption text-muted-foreground">
                                    {timeAgoShort(post.createdAtISO)}
                                  </div>
                                </div>
                              </div>
                              <Badge variant="secondary" className="rounded-full">
                                {toTitleCase(post.kind)}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 px-4 pb-4">
                            {post.text ? <div className="text-sm">{post.text}</div> : null}

                            {post.kind === "workout" && post.workout ? (
                              <div className="card-inset p-3">
                                <div className="text-sm font-medium">{post.workout.templateName}</div>
                                <div className="ff-caption text-muted-foreground mt-1">
                                  {formatDateLabel(post.workout.dateISO)} • {post.workout.totalSets} sets •{" "}
                                  {Math.round(post.workout.totalVolume).toLocaleString()} {units} volume
                                </div>
                              </div>
                            ) : null}

                            {post.kind === "split" && post.split ? (
                              <div className="card-inset p-3">
                                <div className="text-sm font-medium">Split</div>
                                <div className="ff-caption text-muted-foreground mt-1">
                                  {post.split.templateName}
                                </div>
                              </div>
                            ) : null}

                            {post.kind === "challenge" ? (
                              <div className="card-inset p-3">
                                <div className="text-sm font-medium">Challenge</div>
                                <div className="ff-caption text-muted-foreground mt-1">
                                  {post.toHandle ? `To @${post.toHandle}` : ""}
                                </div>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>
                    Customize what friends see. Saved locally for now.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Profile photo</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 rounded-2xl border border-border/60 bg-[rgba(255,255,255,0.03)] overflow-hidden flex items-center justify-center font-display text-lg">
                        {draftAvatarDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={draftAvatarDataUrl}
                            alt="Profile preview"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initialsFromHandle(socialHandle)
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => triggerAvatarPicker("draft")}
                        >
                          Upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => setDraftAvatarDataUrl("")}
                          disabled={!draftAvatarDataUrl}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ff-profile-name">Display name</Label>
                    <Input
                      id="ff-profile-name"
                      className="h-11 rounded-2xl bg-[rgba(255,255,255,0.03)]"
                      value={draftDisplayName}
                      onChange={(e) => setDraftDisplayName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ff-profile-bio">Bio</Label>
                    <Input
                      id="ff-profile-bio"
                      className="h-11 rounded-2xl bg-[rgba(255,255,255,0.03)]"
                      value={draftBio}
                      onChange={(e) => setDraftBio(e.target.value)}
                      placeholder="A line about your training…"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Focus</Label>
                    <Select
                      value={draftFocus}
                      onValueChange={(v) => setDraftFocus(v as SocialFocus)}
                    >
                      <SelectTrigger className="h-11 rounded-2xl bg-[rgba(255,255,255,0.03)]">
                        <SelectValue placeholder="Choose your focus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="strength">Strength</SelectItem>
                        <SelectItem value="hypertrophy">Hypertrophy</SelectItem>
                        <SelectItem value="endurance">Endurance</SelectItem>
                        <SelectItem value="power">Power</SelectItem>
                        <SelectItem value="weight_loss">Weight loss</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" className="rounded-xl" onClick={() => setEditProfileOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-xl" onClick={saveProfile}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      <Dialog open={createPostOpen} onOpenChange={setCreatePostOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>Share workouts, splits, or a quick post.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Post text</Label>
              <Input
                className="h-11 rounded-2xl bg-[rgba(255,255,255,0.03)]"
                value={postTextInput}
                onChange={(e) => setPostTextInput(e.target.value)}
                placeholder="Write a caption…"
              />
              <Button
                className="rounded-2xl w-full"
                onClick={() => {
                  createWorkoutPost({ text: postTextInput });
                  setCreatePostOpen(false);
                }}
                disabled={!latestSessionSummary}
              >
                Post update
              </Button>
              {!latestSessionSummary ? (
                <div className="ff-caption text-muted-foreground">
                  Log a workout to enable sharing.
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label>Share workout</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={profileShareSessionId}
                  onValueChange={setProfileShareSessionId}
                >
                  <SelectTrigger className="h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex-1">
                    <SelectValue placeholder="Pick a workout" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionSummaries.slice(0, 8).map((s) => (
                      <SelectItem key={s.sessionId} value={s.sessionId}>
                        {s.templateName} • {formatDateLabel(s.dateISO)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="rounded-full h-10"
                  onClick={() => {
                    const summary = sessionSummaryById.get(profileShareSessionId);
                    if (!summary) {
                      alert("Pick a workout to share.");
                      return;
                    }
                    createWorkoutPostFromSummary(summary, { text: postTextInput });
                    setCreatePostOpen(false);
                  }}
                  disabled={!sessionSummaries.length}
                >
                  Share
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Share split</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={profileShareTemplateId}
                  onValueChange={setProfileShareTemplateId}
                >
                  <SelectTrigger className="h-10 rounded-full bg-[rgba(255,255,255,0.03)] flex-1">
                    <SelectValue placeholder="Pick a split" />
                  </SelectTrigger>
                  <SelectContent>
                    {(templates || []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="rounded-full h-10"
                  onClick={() => {
                    const template = templateById.get(profileShareTemplateId);
                    if (!template) {
                      alert("Pick a split to share.");
                      return;
                    }
                    createSplitPostFromTemplate(template, { text: postTextInput });
                    setCreatePostOpen(false);
                  }}
                  disabled={!templates?.length}
                >
                  Share
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="rounded-2xl w-full"
                onClick={() => {
                  setCreatePostOpen(false);
                  openConnect();
                }}
              >
                Add friend
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCreatePostOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Social bottom navigation */}
      {!(socialTab === "messages" && activeThreadPeer && currentThread) ? (
        <div className="fixed left-0 right-0 bottom-0 z-[70]">
        <div className="mx-auto max-w-6xl px-4 md:px-8 pb-[env(safe-area-inset-bottom)]">
          <div className="rounded-3xl border border-border/50 bg-[rgba(255,255,255,0.03)] backdrop-blur-xl p-1">
            <div className="grid grid-cols-4 gap-1">
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-2xl h-12 flex-col gap-0.5 ${
                  socialTab === "feed" ? "bg-background/40" : "opacity-90"
                }`}
                onClick={() => setSocialTab("feed")}
              >
                <Zap className="h-[18px] w-[18px]" />
                <span className="text-[11px]">Feed</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-2xl h-12 flex-col gap-0.5 ${
                  socialTab === "challenges" ? "bg-background/40" : "opacity-90"
                }`}
                onClick={() => setSocialTab("challenges")}
              >
                <Flame className="h-[18px] w-[18px]" />
                <span className="text-[11px]">Challenges</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-2xl h-12 flex-col gap-0.5 ${
                  socialTab === "messages" ? "bg-background/40" : "opacity-90"
                }`}
                onClick={() => setSocialTab("messages")}
              >
                <MessageCircle className="h-[18px] w-[18px]" />
                <span className="text-[11px]">Messages</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-2xl h-12 flex-col gap-0.5 ${
                  socialTab === "profile" ? "bg-background/40" : "opacity-90"
                }`}
                onClick={() => setSocialTab("profile")}
              >
                <UserRound className="h-[18px] w-[18px]" />
                <span className="text-[11px]">Profile</span>
              </Button>
            </div>
          </div>
        </div>
        </div>
      ) : null}
    </div>
  );
}
