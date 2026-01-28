import { deriveLeaderSummary, loadLeaders, saveLeaders, loadDeletedIds, type LeaderSummary } from "@/lib/leader-store";

type DbLeaderRow = {
  leader_key: string;
  raw_json: unknown;
  profile_pic_url: string | null;
  welcome_video_url: string | null;
  created_at: string;
  updated_at: string;
};

function toIso(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}

function leaderFromDb(row: DbLeaderRow): LeaderSummary | null {
  const leaderKey = typeof row.leader_key === "string" ? row.leader_key : "";
  if (!leaderKey) return null;

  const rawJson = JSON.stringify(row.raw_json, null, 2);
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch {
    parsed = null;
  }

  const base = deriveLeaderSummary(parsed, rawJson);
  return {
    ...base,
    id: leaderKey, // local routing key matches metadata.leaderId
    profilePicUrl: row.profile_pic_url ?? base.profilePicUrl,
    welcomeVideoUrl: row.welcome_video_url ?? undefined,
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
    rawJson,
  };
}

function mergeLeader(local: LeaderSummary, remote: LeaderSummary): LeaderSummary {
  const lt = Date.parse(local.updatedAt) || 0;
  const rt = Date.parse(remote.updatedAt) || 0;

  // Prefer the most recently updated source, but keep non-empty media URLs.
  const newer = rt >= lt ? remote : local;
  const older = rt >= lt ? local : remote;

  // Merge leadership scores: if newer version lacks scores but older has them, preserve scores
  let finalRawJson = newer.rawJson || older.rawJson;
  try {
    const newerParsed = JSON.parse(newer.rawJson || "{}");
    const olderParsed = JSON.parse(older.rawJson || "{}");

    const newerHasScores = newerParsed?.metadata?.leadershipScores;
    const olderHasScores = olderParsed?.metadata?.leadershipScores;

    // If newer lacks scores but older has them, inject scores into newer
    if (!newerHasScores && olderHasScores) {
      if (!newerParsed.metadata) newerParsed.metadata = {};
      newerParsed.metadata.leadershipScores = olderHasScores;
    }

    // Ensure scoringReasoning exists (generate fallback if missing)
    const scores = newerParsed?.metadata?.leadershipScores;
    if (scores && typeof scores === "object" && !scores.scoringReasoning) {
      const char = typeof scores.character === "number" ? scores.character : 50;
      const comp = typeof scores.competence === "number" ? scores.competence : 50;
      const imp = typeof scores.impact === "number" ? scores.impact : 50;
      const jobs = typeof scores.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier : 1.0;
      const name = newerParsed?.coreIdentity?.name || "this leader";

      scores.scoringReasoning = {
        character: `Character score of ${char} reflects the demonstrated integrity, beneficence, and accountability in ${name}'s approach. The score is calibrated relative to Jesus Christ (100), who represents perfect integrity and ethical conduct.`,
        competence: `Competence score of ${comp} reflects the expertise, communication ability, and vision demonstrated. This is measured against Jesus Christ (100) as the baseline for perfect wisdom and communication.`,
        impact: `Impact score of ${imp} reflects the value created and trustworthiness established. Measured against Jesus Christ's perfect 100 (2.4B followers, 2000+ years of influence).`,
        jobsRule: `Jobs Rule multiplier of ${jobs.toFixed(2)} reflects the ethical approach and conduct. ${jobs >= 0.95 ? "Very high ethical standards with minimal concerns." : jobs >= 0.85 ? "Strong ethical approach with minor imperfections." : jobs >= 0.70 ? "Notable ethical considerations that affect overall leadership credibility." : "Significant ethical concerns that impact the final score."}`
      };
    }

    finalRawJson = JSON.stringify(newerParsed, null, 2);
  } catch {
    // If JSON parsing fails, just use the newer rawJson as-is
  }

  return {
    ...newer,
    profilePicUrl: newer.profilePicUrl ?? older.profilePicUrl,
    welcomeVideoUrl: newer.welcomeVideoUrl ?? older.welcomeVideoUrl,
    tagline: newer.tagline ?? older.tagline,
    vertical: newer.vertical ?? older.vertical,
    subDomains: newer.subDomains ?? older.subDomains,
    tier: newer.tier ?? older.tier,
    compositeScore: typeof newer.compositeScore === "number" ? newer.compositeScore : older.compositeScore,
    rawJson: finalRawJson,
    createdAt: newer.createdAt || older.createdAt,
    updatedAt: newer.updatedAt || older.updatedAt,
  };
}

export async function syncLeadersFromDbToLocal(opts?: { limit?: number }): Promise<LeaderSummary[]> {
  if (typeof window === "undefined") return [];

  const limit = typeof opts?.limit === "number" ? opts.limit : 200;
  const res = await fetch(`/api/leaders?limit=${encodeURIComponent(String(limit))}`, { cache: "no-store" });
  if (!res.ok) return loadLeaders();

  const json = (await res.json()) as unknown;
  const rows =
    json && typeof json === "object" && "leaders" in json && Array.isArray((json as { leaders: unknown }).leaders)
      ? ((json as { leaders: DbLeaderRow[] }).leaders as DbLeaderRow[])
      : [];

  const remote = rows.map(leaderFromDb).filter(Boolean) as LeaderSummary[];

  const current = loadLeaders();
  const deletedIds = loadDeletedIds();
  const byId = new Map<string, LeaderSummary>(current.map((l) => [l.id, l]));

  for (const r of remote) {
    // Don't re-add leaders that were explicitly deleted locally
    if (deletedIds.has(r.id)) continue;
    const existing = byId.get(r.id);
    byId.set(r.id, existing ? mergeLeader(existing, r) : r);
  }

  const merged = Array.from(byId.values()).sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
  saveLeaders(merged);
  return merged;
}

export async function syncLeaderFromDbToLocal(leaderKey: string): Promise<LeaderSummary | null> {
  if (typeof window === "undefined") return null;
  const key = leaderKey.trim();
  if (!key) return null;

  // Don't sync leaders that were explicitly deleted locally
  const deletedIds = loadDeletedIds();
  if (deletedIds.has(key)) return null;

  const res = await fetch(`/api/leaders/${encodeURIComponent(key)}`, { cache: "no-store" });
  if (!res.ok) return null;

  const json = (await res.json()) as unknown;
  const row =
    json && typeof json === "object" && "leader" in json ? ((json as { leader: DbLeaderRow }).leader as DbLeaderRow) : null;
  if (!row) return null;

  const remote = leaderFromDb(row);
  if (!remote) return null;

  // Double-check the derived ID isn't deleted
  if (deletedIds.has(remote.id)) return null;

  const current = loadLeaders();
  const idx = current.findIndex((l) => l.id === remote.id);
  const next =
    idx >= 0 ? current.map((l, i) => (i === idx ? mergeLeader(l, remote) : l)) : [remote, ...current];

  saveLeaders(next);
  return remote;
}


