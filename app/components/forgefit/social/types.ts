export type SocialComment = {
  id: string;
  createdAtISO: string;
  authorHandle: string;
  text: string;
};

export type SocialMessage = {
  id: string;
  createdAtISO: string;
  authorHandle: string;
  text: string;
};

export type SocialThread = {
  id: string;
  updatedAtISO: string;
  peerHandle: string;
  messages: SocialMessage[];
};

export type SocialPostKind = "workout" | "challenge" | "group" | "split";

export type SocialPost = {
  id: string;
  createdAtISO: string;
  authorHandle: string;
  kind: SocialPostKind;
  text?: string;
  toHandle?: string;
  workout?: {
    sessionId: string;
    templateName: string;
    dateISO: string;
    totalSets: number;
    totalVolume: number;
  };
  split?: {
    templateId: string;
    templateName: string;
  };
  challengeId?: string;
  groupId?: string;
  likes: string[];
  comments: SocialComment[];
};

export type SocialChallengeStatus = "pending" | "active" | "complete" | "declined";

export type SocialChallenge = {
  id: string;
  createdAtISO: string;
  createdByHandle: string;
  toHandle: string;
  title: string;
  description?: string;
  status: SocialChallengeStatus;
};

export type SocialGroupWorkout = {
  id: string;
  createdAtISO: string;
  createdByHandle: string;
  name: string;
  templateId: string;
  templateName: string;
  code: string;
  members: string[];
};

export type SocialFocus =
  | "general"
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "power"
  | "weight_loss";

export type SocialState = {
  handle: string;
  displayName: string;
  profile?: {
    bio?: string;
    focus?: SocialFocus;
    avatarDataUrl?: string;
  };
  friends: string[];
  posts: SocialPost[];
  challenges: SocialChallenge[];
  groups: SocialGroupWorkout[];
  threads?: SocialThread[];
};
