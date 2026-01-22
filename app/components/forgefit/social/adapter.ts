import type {
  SocialChallenge,
  SocialChallengeStatus,
  SocialComment,
  SocialFocus,
  SocialMessage,
  SocialPost,
  SocialState,
  SocialThread,
} from "./types";

export type Units = "lb" | "kg";

export type TemplateLite = { id: string; name: string };

export type SessionLite = {
  id: string;
  dateISO: string;
  templateName: string;
  entries: Array<{
    sets: Array<{ reps: number; weight: number }>;
  }>;
};

export type SessionSummary = {
  sessionId: string;
  templateName: string;
  dateISO: string;
  totalSets: number;
  totalVolume: number;
};

export type AppStateLike = {
  social?: SocialState;
  templates?: TemplateLite[];
  sessions?: SessionLite[];
  settings?: {
    units: Units;
    profile?: { name?: string; username?: string };
  };
} & Record<string, unknown>;

export type SocialAdapter = {
  ensureIdentity(params: {
    profileName?: string;
    profileHandle?: string;
    userId?: string | null;
    userFullName?: string | null;
  }): void;

  updateProfile(params: {
    displayName?: string;
    bio?: string;
    focus?: SocialFocus | null;
    avatarDataUrl?: string | null;
  }): void;

  addFriend(handle: string): void;
  removeFriend(handle: string): void;

  createPost(post: SocialPost): void;
  toggleLike(postId: string, byHandle: string): void;
  addComment(postId: string, comment: SocialComment): void;

  createChallenge(challenge: SocialChallenge, asPost?: SocialPost): void;
  setChallengeStatus(challengeId: string, status: SocialChallengeStatus): void;

  ensureThread(peerHandle: string): void;
  appendMessage(peerHandle: string, message: SocialMessage): void;
};

const mkId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

export const createSocialAdapter = (params: {
  getState: () => AppStateLike;
  setState: React.Dispatch<React.SetStateAction<AppStateLike>>;
  coerceSocial: (social?: SocialState) => SocialState;
  makeHandle: (s: string) => string;
}) => {
  const { setState, coerceSocial, makeHandle } = params;

  const adapter: SocialAdapter = {
    ensureIdentity({ profileName, profileHandle, userId, userFullName }) {
      const base = (profileName || userFullName || userId || "athlete").toString();
      const handleSeed = (profileHandle || base).toString();
      const handle = makeHandle(handleSeed);
      const displayName = (profileName || userFullName || "You").toString();

      setState((p) => {
        const prev = coerceSocial(p.social);
        if (prev.handle?.trim()) return p;
        return {
          ...p,
          social: {
            ...prev,
            handle,
            displayName: prev.displayName?.trim() ? prev.displayName : displayName,
          },
        };
      });
    },

    updateProfile({ displayName, bio, focus, avatarDataUrl }) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        const nextDisplayName =
          typeof displayName === "string" ? displayName.trim() : prev.displayName;

        const nextBio = typeof bio === "string" ? bio.trim() : prev.profile?.bio;
        const nextFocus = focus === null ? undefined : (focus ?? prev.profile?.focus);
        const nextAvatarDataUrl =
          avatarDataUrl === null ? undefined : (avatarDataUrl ?? prev.profile?.avatarDataUrl);

        return {
          ...p,
          social: {
            ...prev,
            displayName: nextDisplayName,
            profile: {
              ...(prev.profile || {}),
              ...(typeof nextBio === "string" ? { bio: nextBio } : {}),
              ...(typeof nextFocus === "string" ? { focus: nextFocus } : {}),
              ...(typeof nextAvatarDataUrl === "string"
                ? { avatarDataUrl: nextAvatarDataUrl }
                : {}),
            },
          },
        };
      });
    },

    addFriend(handle) {
      const h = makeHandle((handle || "").trim().replace(/^@/, ""));
      if (!h) return;
      setState((p) => {
        const prev = coerceSocial(p.social);
        return {
          ...p,
          social: {
            ...prev,
            friends: Array.from(new Set([...(prev.friends || []), h])),
          },
        };
      });
    },

    removeFriend(handle) {
      const h = (handle || "").trim().replace(/^@/, "");
      setState((p) => {
        const prev = coerceSocial(p.social);
        return {
          ...p,
          social: {
            ...prev,
            friends: (prev.friends || []).filter((x) => x !== h),
          },
        };
      });
    },

    createPost(post) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        return {
          ...p,
          social: { ...prev, posts: [post, ...(prev.posts || [])] },
        };
      });
    },

    toggleLike(postId, byHandle) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        const nextPosts = (prev.posts || []).map((post) => {
          if (post.id !== postId) return post;
          const likes = Array.isArray(post.likes) ? post.likes : [];
          const has = likes.includes(byHandle);
          const nextLikes = has ? likes.filter((h) => h !== byHandle) : [byHandle, ...likes];
          return { ...post, likes: nextLikes };
        });
        return { ...p, social: { ...prev, posts: nextPosts } };
      });
    },

    addComment(postId, comment) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        const nextPosts = (prev.posts || []).map((post) => {
          if (post.id !== postId) return post;
          const comments = Array.isArray(post.comments) ? post.comments : [];
          return { ...post, comments: [...comments, comment] };
        });
        return { ...p, social: { ...prev, posts: nextPosts } };
      });
    },

    createChallenge(challenge, asPost) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        return {
          ...p,
          social: {
            ...prev,
            challenges: [challenge, ...(prev.challenges || [])],
            posts: asPost ? [asPost, ...(prev.posts || [])] : prev.posts || [],
          },
        };
      });
    },

    setChallengeStatus(challengeId, status) {
      setState((p) => {
        const prev = coerceSocial(p.social);
        return {
          ...p,
          social: {
            ...prev,
            challenges: (prev.challenges || []).map((c) =>
              c.id === challengeId ? { ...c, status } : c
            ),
          },
        };
      });
    },

    ensureThread(peerHandle) {
      const peer = (peerHandle || "").trim().replace(/^@/, "");
      if (!peer) return;
      setState((s) => {
        const prev = coerceSocial(s.social);
        const threads = Array.isArray((prev as any).threads)
          ? (((prev as any).threads as SocialThread[]) || [])
          : [];
        const existing = threads.find((t) => (t.peerHandle || "").trim() === peer);
        if (existing) return s;
        const now = new Date().toISOString();
        const next: SocialThread = {
          id: mkId(),
          updatedAtISO: now,
          peerHandle: peer,
          messages: [],
        };
        return { ...s, social: { ...prev, threads: [next, ...threads] } };
      });
    },

    appendMessage(peerHandle, message) {
      const peer = (peerHandle || "").trim().replace(/^@/, "");
      if (!peer) return;

      setState((s) => {
        const prev = coerceSocial(s.social);
        const threads = Array.isArray((prev as any).threads)
          ? (((prev as any).threads as SocialThread[]) || [])
          : [];
        const now = new Date().toISOString();

        let nextThreads = threads.map((t) => {
          if ((t.peerHandle || "").trim() !== peer) return t;
          const messages = Array.isArray(t.messages) ? t.messages : [];
          return { ...t, updatedAtISO: now, messages: [...messages, message] };
        });

        const exists = nextThreads.some((t) => (t.peerHandle || "").trim() === peer);
        if (!exists) {
          nextThreads = [
            { id: mkId(), updatedAtISO: now, peerHandle: peer, messages: [message] },
            ...nextThreads,
          ];
        }

        nextThreads.sort(
          (a, b) => new Date(b.updatedAtISO).getTime() - new Date(a.updatedAtISO).getTime()
        );

        return { ...s, social: { ...prev, threads: nextThreads } };
      });
    },
  };

  return adapter;
};
