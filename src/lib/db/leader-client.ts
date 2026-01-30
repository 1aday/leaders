/**
 * Database-first client layer for leader operations.
 * Replaces localStorage with direct API calls to Supabase.
 */

import { calculateCompositeScore } from "@/lib/utils";

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

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Fetch all leaders from the database with optional filtering.
 * @param opts - Optional filters (limit, vertical, tier)
 * @returns Array of LeaderSummary objects
 */
export async function fetchLeaders(opts?: {
  limit?: number;
  vertical?: string;
  tier?: string;
}): Promise<LeaderSummary[]> {
  const params = new URLSearchParams();
  if (opts?.limit) params.set('limit', String(opts.limit));
  if (opts?.vertical) params.set('vertical', opts.vertical);
  if (opts?.tier) params.set('tier', opts.tier);

  const res = await fetch(`/api/leaders?${params}`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch leaders: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.leaders || [];
}

/**
 * Fetch a single leader by ID/key.
 * @param id - Leader ID or leader_key
 * @returns LeaderSummary or null if not found
 */
export async function fetchLeaderById(id: string): Promise<LeaderSummary | null> {
  const res = await fetch(`/api/leaders/${encodeURIComponent(id)}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch leader: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.leader || null;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Create a new leader in the database.
 * @param leaderJson - Raw JSON string of leader data
 * @param opts - Optional media URLs (profilePicUrl, welcomeVideoUrl)
 * @returns Object with leaderId and leaderKey
 */
export async function createLeader(leaderJson: string, opts?: {
  profilePicUrl?: string;
  welcomeVideoUrl?: string;
}): Promise<{ leaderId: string; leaderKey: string }> {
  const res = await fetch('/api/leaders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      leaderRawJson: leaderJson,
      profilePicUrl: opts?.profilePicUrl,
      welcomeVideoUrl: opts?.welcomeVideoUrl,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create leader: ${res.status} ${errorText}`);
  }

  return res.json();
}

/**
 * Update an existing leader in the database.
 * Uses the same upsert endpoint as create - Supabase handles conflict resolution.
 * @param leaderKey - Leader key to update
 * @param leaderJson - Updated raw JSON string
 * @param opts - Optional media URLs (profilePicUrl, welcomeVideoUrl)
 */
export async function updateLeader(leaderKey: string, leaderJson: string, opts?: {
  profilePicUrl?: string;
  welcomeVideoUrl?: string;
}): Promise<void> {
  // Use same endpoint - upsert handles both create and update
  await createLeader(leaderJson, opts);
}

/**
 * Delete a leader from the database.
 * Cascade deletes all related assets and chat logs.
 * @param leaderKey - Leader key to delete
 */
export async function deleteLeader(leaderKey: string): Promise<void> {
  const res = await fetch(`/api/leader/${encodeURIComponent(leaderKey)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to delete leader: ${res.status} ${errorText}`);
  }
}

// =============================================================================
// Chat Operations
// =============================================================================

/**
 * Fetch chat history for a leader.
 * @param leaderKey - Leader key
 * @returns Array of chat messages (max 80)
 */
export async function fetchLeaderChat(leaderKey: string): Promise<ChatMsg[]> {
  const res = await fetch(`/api/leader/chat/${encodeURIComponent(leaderKey)}`, {
    cache: 'no-store'
  });

  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`Failed to fetch chat: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  return json.messages || [];
}

/**
 * Save chat messages to the database.
 * @param leaderKey - Leader key
 * @param messages - Array of chat messages (will be limited to last 80)
 */
export async function saveLeaderChat(leaderKey: string, messages: ChatMsg[]): Promise<void> {
  const res = await fetch('/api/leader/chat/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leaderKey, messages }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to save chat: ${res.status} ${errorText}`);
  }
}

/**
 * Clear all chat history for a leader.
 * @param leaderKey - Leader key
 */
export async function clearLeaderChat(leaderKey: string): Promise<void> {
  const res = await fetch(`/api/leader/chat/${encodeURIComponent(leaderKey)}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to clear chat: ${res.status} ${errorText}`);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Helper to check if value is a plain object
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Safely extract string value from object
 */
function getString(obj: Record<string, unknown> | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

/**
 * Safely extract number value from object
 */
function getNumber(obj: Record<string, unknown> | null, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
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

/**
 * Derive a LeaderSummary from parsed JSON.
 * Used when creating new leaders from generated JSON.
 * @param parsed - Parsed leader JSON object
 * @param rawJson - Raw JSON string
 * @returns LeaderSummary without timestamps (those are set by database)
 */
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

  // Calculate composite score from individual scores
  const character = getNumber(scores, "character");
  const competence = getNumber(scores, "competence");
  const impact = getNumber(scores, "impact");
  const jobsMultiplier = typeof scores?.jobsRuleMultiplier === "number"
    ? scores.jobsRuleMultiplier
    : 1.0;

  // Calculate composite score using correct weighted formula (Character 39%, Competence 30%, Impact 31%)
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
