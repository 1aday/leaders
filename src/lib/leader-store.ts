export type LeaderSummary = {
  /** Stable ID used in routes. Prefer metadata.leaderId when present. */
  id: string;
  name: string;
  tagline?: string;
  expertise?: string;
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
import { calculateCompositeScore } from "./utils";

const STORAGE_KEY = "profilemaker.leaders.v1";
const DELETED_IDS_KEY = "profilemaker.deletedLeaderIds.v1";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function getString(obj: Record<string, unknown> | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
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

  // Get leaderId, normalize if needed (replace spaces with hyphens, uppercase)
  let id = getString(metadata, "leaderId");
  if (id) {
    // Normalize: replace spaces with hyphens, convert to uppercase for consistency
    id = id.replace(/\s+/g, "-").toUpperCase();
  } else {
    // Fallback to UUID if no leaderId present
    id = typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now());
  }
  const name = getString(core, "name") ?? "Untitled leader";
  const tagline = getString(core, "tagline");
  const vertical = getString(metadata, "vertical");
  const subDomains = subDomainsRaw
    ? (subDomainsRaw.filter((v) => typeof v === "string") as string[])
    : undefined;
  const tier = getString(scores, "tier");
  // Calculate composite score from individual scores instead of trusting stored value
  const character = getNumber(scores, "character");
  const competence = getNumber(scores, "competence");
  const impact = getNumber(scores, "impact");
  const jobsMultiplier = typeof scores?.jobsRuleMultiplier === "number"
    ? scores.jobsRuleMultiplier
    : 1.0;
  const compositeScore = calculateCompositeScore(character, competence, impact, jobsMultiplier);
  
  // Try to get profile pic URL from various places in the schema
  // Filter out placeholder URLs that aren't real assets
  const isPlaceholderUrl = (url: string | undefined): boolean => {
    if (!url) return true;
    return url.includes("placeholder.example.com") || url.includes("example.com/");
  };
  
  const rawProfilePicUrl = getString(primaryImage, "url")
    ?? getString(visual, "profilePicUrl")
    ?? getString(core, "profilePicUrl");

  const profilePicUrl = isPlaceholderUrl(rawProfilePicUrl) ? undefined : rawProfilePicUrl;

  // Extract expertise domain and derive display label
  const expertiseDomain = root && isPlainObject(root.expertiseDomain)
    ? (root.expertiseDomain as Record<string, unknown>)
    : null;
  const coreDomain = getString(expertiseDomain, "coreDomain");
  const expertise = coreDomain ? deriveExpertiseLabel(coreDomain) : undefined;

  // NOTE: We intentionally do NOT extract welcomeVideoUrl from the JSON schema here.
  // Video URLs should only be set when a video is actually generated via the API.
  // This prevents sample/placeholder video URLs from showing up as playable videos.

  return { id, name, tagline, expertise, vertical, subDomains, tier, compositeScore, profilePicUrl, rawJson };
}

/**
 * Convert expertiseDomain.coreDomain into a display-friendly expertise label
 */
function deriveExpertiseLabel(coreDomain: string): string {
  // If already has role suffix, use as-is
  const hasRole = /\b(expert|coach|guide|mentor|specialist|educator|advisor|consultant)\b/i.test(coreDomain);
  if (hasRole) return coreDomain;

  const lower = coreDomain.toLowerCase();

  // Education domains -> "Educator"
  if (lower.includes("education") || lower.includes("teaching")) {
    return coreDomain.replace(/education/i, "Educator").replace(/teaching/i, "Educator");
  }

  // Finance domains -> "Expert"
  if (lower.includes("finance") || lower.includes("investing") || lower.includes("wealth")) {
    return `${coreDomain} Expert`;
  }

  // Health/Wellness -> "Coach"
  if (lower.includes("fitness") || lower.includes("nutrition") || lower.includes("wellness")) {
    return `${coreDomain} Coach`;
  }

  // Mindfulness/Mental Health -> "Guide"
  if (lower.includes("mindfulness") || lower.includes("meditation") || lower.includes("mental")) {
    return `${coreDomain} Guide`;
  }

  // Technical/Business -> "Expert"
  if (lower.includes("technology") || lower.includes("business") || lower.includes("programming")) {
    return `${coreDomain} Expert`;
  }

  // Default: append "Expert"
  return `${coreDomain} Expert`;
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

/** Load the set of deleted leader IDs (to prevent re-adding them via sync/seed). */
export function loadDeletedIds(): Set<string> {
  if (typeof window === "undefined" || !window.localStorage) return new Set();
  try {
    const raw = window.localStorage.getItem(DELETED_IDS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string") as string[]);
  } catch {
    return new Set();
  }
}

/** Mark a leader ID as deleted (to prevent re-adding via sync/seed). */
export function markDeleted(id: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const deleted = loadDeletedIds();
  deleted.add(id);
  // Keep only the most recent 500 deleted IDs to avoid unbounded growth
  const arr = Array.from(deleted).slice(-500);
  window.localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(arr));
}

/** Remove an ID from the deleted set (e.g., if re-creating a leader with same ID). */
export function unmarkDeleted(id: string) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const deleted = loadDeletedIds();
  deleted.delete(id);
  window.localStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deleted)));
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

  // Sample/placeholder URLs that should be cleared (not actual generated assets)
  const sampleUrlPatterns = [
    "storage.googleapis.com/gtv-videos-bucket/sample",
    "example.com",
    "placeholder",
  ];
  
  const isSampleUrl = (url: string | undefined): boolean => {
    if (!url) return false;
    return sampleUrlPatterns.some((pattern) => url.includes(pattern));
  };

  let mutated = false;
  const hydratedExisting = existing.map((l) => {
    let updated = l;
    
    // Migration: Clear sample video URLs - only keep actually generated videos
    if (isSampleUrl(l.welcomeVideoUrl)) {
      updated = { ...updated, welcomeVideoUrl: undefined };
      mutated = true;
    }
    
    // Migration: Clear sample/placeholder profile pic URLs - only keep actually generated avatars
    if (isSampleUrl(l.profilePicUrl)) {
      updated = { ...updated, profilePicUrl: undefined };
      mutated = true;
    }
    
    // Hydrate missing summary fields from rawJson if possible.
    if (!updated.subDomains || !updated.vertical || !updated.tier || typeof updated.compositeScore !== "number") {
      try {
        const parsed = JSON.parse(updated.rawJson) as unknown;
        const derived = deriveLeaderSummary(parsed, updated.rawJson);
        // Only fill missing fields; keep user's current values if present.
        const next: LeaderSummary = {
          ...updated,
          vertical: updated.vertical ?? derived.vertical,
          subDomains: updated.subDomains ?? derived.subDomains,
          tier: updated.tier ?? derived.tier,
          compositeScore: typeof updated.compositeScore === "number" ? updated.compositeScore : derived.compositeScore,
          profilePicUrl: updated.profilePicUrl ?? derived.profilePicUrl,
          // NOTE: Don't copy welcomeVideoUrl from derived - only keep explicitly generated ones
        };
        if (JSON.stringify(next) !== JSON.stringify(updated)) mutated = true;
        return next;
      } catch {
        // ignore
      }
    }

    // Upgrade old seeded JSON to the current full template if it looks "legacy".
    const seed = seedById.get(updated.id);
    if (
      seed &&
      typeof updated.rawJson === "string" &&
      (!updated.rawJson.includes('"communicationStyle"') ||
        updated.rawJson.includes("photo-1524503033411-f7a2fe8c7f1d"))
    ) {
      const rawJson = JSON.stringify(seed, null, 2);
      const base = deriveLeaderSummary(seed, rawJson);
      mutated = true;
      // Preserve existing welcomeVideoUrl and profilePicUrl if they were generated
      return { 
        ...updated, 
        ...base, 
        profilePicUrl: updated.profilePicUrl ?? base.profilePicUrl,
        welcomeVideoUrl: updated.welcomeVideoUrl, // Preserve any generated video URL
        rawJson, 
        updatedAt: now 
      };
    }

    return updated;
  });

  const seen = new Set(hydratedExisting.map((l) => l.id));
  const deletedIds = loadDeletedIds();
  const additions: LeaderSummary[] = [];

  for (const b of SAMPLE_LEADER_BIBLES.slice(0, desired)) {
    const rawJson = JSON.stringify(b, null, 2);
    const base = deriveLeaderSummary(b, rawJson);
    if (seen.has(base.id)) continue;
    // Don't re-add leaders that were explicitly deleted
    if (deletedIds.has(base.id)) continue;
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
  // First try to load directly from storage
  const current = loadLeaders();

  // Try exact match first
  let found = current.find((l) => l.id === id);
  if (found) return found;

  // Try normalized match (for backward compatibility with bad IDs)
  const normalizedId = id.replace(/\s+/g, "-").toUpperCase();
  found = current.find((l) => l.id === normalizedId);
  if (found) return found;

  // Try case-insensitive match as last resort
  const lowerSearchId = id.toLowerCase();
  found = current.find((l) => l.id.toLowerCase() === lowerSearchId);
  if (found) return found;

  // Don't auto-seed sample leaders - just return null if not found
  return null;
}
