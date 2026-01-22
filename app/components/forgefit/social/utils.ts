export const makeHandle = (nameOrId: string) => {
  const base = (nameOrId || "").toLowerCase().trim();
  const stripped = base.replace(/[^a-z0-9_]/g, "").slice(0, 16);
  return stripped || "athlete";
};

export const initialsFromHandle = (handle: string) => {
  const h = (handle || "").replace(/^@/, "").trim();
  if (!h) return "??";
  return h.slice(0, 2).toUpperCase();
};

export const timeAgoShort = (iso: string) => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
};
