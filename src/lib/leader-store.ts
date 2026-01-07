export type LeaderSummary = {
  /** Stable ID used in routes. Prefer metadata.leaderId when present. */
  id: string;
  name: string;
  tagline?: string;
  vertical?: string;
  subDomains?: string[];
  tier?: string;
  compositeScore?: number;
  profilePicUrl?: string;
  welcomeVideoUrl?: string;
  updatedAt: string;
  createdAt: string;
  rawJson: string;
};

import { SAMPLE_LEADER_BIBLES } from "./sample-leader-bibles";

const STORAGE_KEY = "profilemaker.leaders.v1";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getString(obj: Record<string, unknown> | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" ? v : undefined;
}

function getNumber(obj: Record<string, unknown> | null, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
}

export function deriveLeaderSummary(parsed: unknown, rawJson: string): Omit<LeaderSummary, "createdAt" | "updatedAt"> {
  const root = isPlainObject(parsed) ? parsed : null;
  const metadata = root && isPlainObject(root.metadata) ? (root.metadata as Record<string, unknown>) : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as Record<string, unknown>) : null;
  const scores =
    metadata && isPlainObject(metadata.leadershipScores)
      ? (metadata.leadershipScores as Record<string, unknown>)
      : null;
  const subDomainsRaw = metadata && Array.isArray(metadata.subDomains) ? metadata.subDomains : null;
  
  // Extract visual identity for profile pic
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as Record<string, unknown>) : null;
  const imagePrompts = visual && isPlainObject(visual.imagePrompts) ? (visual.imagePrompts as Record<string, unknown>) : null;
  const primaryImage = imagePrompts && isPlainObject(imagePrompts.primary) ? (imagePrompts.primary as Record<string, unknown>) : null;
  
  // Extract video identity for welcome video
  const video = root && isPlainObject(root.videoIdentity) ? (root.videoIdentity as Record<string, unknown>) : null;
  const videoPrompts = video && isPlainObject(video.videoPrompts) ? (video.videoPrompts as Record<string, unknown>) : null;
  const standardVideo = videoPrompts && isPlainObject(videoPrompts.standard) ? (videoPrompts.standard as Record<string, unknown>) : null;
  
  // Also check for direct URLs in asset registry
  const assets = root && isPlainObject(root.assetRegistry) ? (root.assetRegistry as Record<string, unknown>) : null;
  const images = assets && Array.isArray(assets.images) ? assets.images : [];
  const videos = assets && Array.isArray(assets.videos) ? assets.videos : [];
  
  const id = getString(metadata, "leaderId") ?? (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now()));
  const name = getString(core, "name") ?? "Untitled leader";
  const tagline = getString(core, "tagline");
  const vertical = getString(metadata, "vertical");
  const subDomains = subDomainsRaw
    ? (subDomainsRaw.filter((v) => typeof v === "string") as string[])
    : undefined;
  const tier = getString(scores, "tier");
  const compositeScore = getNumber(scores, "compositeScore");
  
  // Try to get profile pic URL from various places in the schema
  const profilePicUrl = getString(primaryImage, "url") 
    ?? getString(visual, "profilePicUrl")
    ?? getString(core, "profilePicUrl")
    ?? (images[0] && typeof images[0] === "object" && "url" in (images[0] as object) ? (images[0] as { url: string }).url : undefined);
  
  // Try to get welcome video URL
  const welcomeVideoUrl = getString(standardVideo, "url")
    ?? getString(video, "welcomeVideoUrl")
    ?? getString(core, "welcomeVideoUrl")
    ?? (videos[0] && typeof videos[0] === "object" && "url" in (videos[0] as object) ? (videos[0] as { url: string }).url : undefined);

  return { id, name, tagline, vertical, subDomains, tier, compositeScore, profilePicUrl, welcomeVideoUrl, rawJson };
}

export function loadLeaders(): LeaderSummary[] {
  // This module is imported by client components that still render on the server (SSR).
  // Guard against access during SSR / non-browser environments.
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as LeaderSummary[];
  } catch {
    return [];
  }
}

export function saveLeaders(next: LeaderSummary[]) {
  // Guard against access during SSR / non-browser environments.
  if (typeof window === "undefined" || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

/**
 * Seed helper: ensures the gallery has at least `minCount` leaders by adding built-in
 * fictional sample leaders without overwriting existing ones.
 *
 * Returns the resulting list (existing or newly extended).
 */
export function seedLeadersIfEmpty(minCount = 20): LeaderSummary[] {
  const existing = loadLeaders();
  const desired = Math.min(minCount, SAMPLE_LEADER_BIBLES.length);
  const now = new Date().toISOString();

  // If we already have leaders, we still "hydrate" missing derived fields and
  // upgrade old seeded JSON to the latest seed template (without touching non-seed leaders).
  const seedById = new Map<string, unknown>();
  for (const b of SAMPLE_LEADER_BIBLES.slice(0, desired) as unknown[]) {
    const root = b && typeof b === "object" ? (b as Record<string, unknown>) : null;
    const meta = root && typeof root.metadata === "object" ? (root.metadata as Record<string, unknown>) : null;
    const id = meta && typeof meta.leaderId === "string" ? meta.leaderId : null;
    if (id) seedById.set(id, b);
  }

  let mutated = false;
  const hydratedExisting = existing.map((l) => {
    // Hydrate missing summary fields from rawJson if possible.
    if (!l.subDomains || !l.vertical || !l.tier || typeof l.compositeScore !== "number") {
      try {
        const parsed = JSON.parse(l.rawJson) as unknown;
        const derived = deriveLeaderSummary(parsed, l.rawJson);
        // Only fill missing fields; keep user's current values if present.
        const next: LeaderSummary = {
          ...l,
          vertical: l.vertical ?? derived.vertical,
          subDomains: l.subDomains ?? derived.subDomains,
          tier: l.tier ?? derived.tier,
          compositeScore: typeof l.compositeScore === "number" ? l.compositeScore : derived.compositeScore,
          profilePicUrl: l.profilePicUrl ?? derived.profilePicUrl,
          welcomeVideoUrl: l.welcomeVideoUrl ?? derived.welcomeVideoUrl,
        };
        if (next !== l) mutated = true;
        return next;
      } catch {
        // ignore
      }
    }

    // Upgrade old seeded JSON to the current full template if it looks "legacy".
    const seed = seedById.get(l.id);
    if (
      seed &&
      typeof l.rawJson === "string" &&
      (!l.rawJson.includes('"communicationStyle"') ||
        l.rawJson.includes("photo-1524503033411-f7a2fe8c7f1d"))
    ) {
      const rawJson = JSON.stringify(seed, null, 2);
      const base = deriveLeaderSummary(seed, rawJson);
      mutated = true;
      return { ...l, ...base, rawJson, updatedAt: now };
    }

    return l;
  });

  const seen = new Set(hydratedExisting.map((l) => l.id));
  const additions: LeaderSummary[] = [];

  for (const b of SAMPLE_LEADER_BIBLES.slice(0, desired)) {
    const rawJson = JSON.stringify(b, null, 2);
    const base = deriveLeaderSummary(b, rawJson);
    if (seen.has(base.id)) continue;
    seen.add(base.id);
    additions.push({ ...base, createdAt: now, updatedAt: now });
    if (hydratedExisting.length + additions.length >= desired) break;
  }

  const next = [...hydratedExisting, ...additions];
  if (mutated || additions.length > 0) saveLeaders(next);
  return next;
}

export function upsertLeader(summary: Omit<LeaderSummary, "createdAt" | "updatedAt">): LeaderSummary {
  const now = new Date().toISOString();
  const current = loadLeaders();
  const existingIdx = current.findIndex((l) => l.id === summary.id);

  if (existingIdx >= 0) {
    const updated: LeaderSummary = {
      ...current[existingIdx],
      ...summary,
      updatedAt: now,
    };
    const next = [...current];
    next[existingIdx] = updated;
    saveLeaders(next);
    return updated;
  }

  const created: LeaderSummary = {
    ...summary,
    createdAt: now,
    updatedAt: now,
  };
  saveLeaders([created, ...current]);
  return created;
}

export function getLeaderById(id: string): LeaderSummary | null {
  // If the user lands directly on a leader detail route before visiting the gallery,
  // localStorage may be empty. Seed once to ensure sample leaders resolve.
  const current = seedLeadersIfEmpty();
  return current.find((l) => l.id === id) ?? null;
}
