import "server-only";

import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickString(obj: AnyRecord | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function pickStringArray(obj: AnyRecord | null, key: string, max = 50): string[] | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x) => typeof x === "string").map((s) => (s as string).trim()).filter(Boolean);
  return out.length ? out.slice(0, max) : undefined;
}

function pickNumber(obj: AnyRecord | null, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "number" ? v : undefined;
}

function pickNumberRounded(obj: AnyRecord | null, key: string): number | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "number" ? Math.round(v) : undefined;
}

export function extractLeaderKey(leaderJson: unknown): string | null {
  const root = isPlainObject(leaderJson) ? leaderJson : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const leaderKey = pickString(meta, "leaderId");
  return leaderKey ?? null;
}

export function extractLeaderRow(leaderJson: unknown): {
  leader_key: string | null;
  name?: string | null;
  tagline?: string | null;
  vertical?: string | null;
  sub_domains?: string[] | null;
  tier?: string | null;
  composite_score?: number | null;
  profile_pic_url?: string | null;
  welcome_video_url?: string | null;
  raw_json: unknown;
} {
  const root = isPlainObject(leaderJson) ? leaderJson : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const scores =
    meta && isPlainObject(meta.leadershipScores) ? (meta.leadershipScores as AnyRecord) : null;

  const leader_key = pickString(meta, "leaderId") ?? null;
  const name = pickString(core, "name") ?? null;
  const tagline = pickString(core, "tagline") ?? null;
  const vertical = pickString(meta, "vertical") ?? null;
  const sub_domains = pickStringArray(meta, "subDomains") ?? null;
  const tier = pickString(scores, "tier") ?? null;
  const composite_score = pickNumberRounded(scores, "compositeScore") ?? null;

  // Best-effort URLs (your UI also keeps these in localStorage summary objects)
  const profile_pic_url = pickString(core, "profilePicUrl") ?? null;
  const welcome_video_url = pickString(core, "welcomeVideoUrl") ?? null;

  return {
    leader_key,
    name,
    tagline,
    vertical,
    sub_domains,
    tier,
    composite_score,
    profile_pic_url,
    welcome_video_url,
    raw_json: leaderJson,
  };
}

export async function upsertLeaderFromJson(opts: {
  leaderJson: unknown;
  model?: string;
  /** If provided, overrides any extracted profilePicUrl. */
  profilePicUrl?: string;
  /** If provided, overrides any extracted welcomeVideoUrl. */
  welcomeVideoUrl?: string;
}): Promise<{ leaderId: string | null; leaderKey: string | null }> {
  const supabase = getSupabaseAdmin();
  const row = extractLeaderRow(opts.leaderJson);

  // We require leader_key for stable upserts. If it is missing, we skip persistence.
  if (!row.leader_key) return { leaderId: null, leaderKey: null };

  const payload: Record<string, unknown> = {
    leader_key: row.leader_key,
    name: row.name,
    tagline: row.tagline,
    vertical: row.vertical,
    sub_domains: row.sub_domains,
    tier: row.tier,
    composite_score: row.composite_score,
    raw_json: row.raw_json,
    model: opts.model ?? null,
    profile_pic_url: typeof opts.profilePicUrl === "string" ? opts.profilePicUrl : row.profile_pic_url,
    welcome_video_url: typeof opts.welcomeVideoUrl === "string" ? opts.welcomeVideoUrl : row.welcome_video_url,
  };

  const { data, error } = await supabase
    .from("leaders")
    .upsert(payload, { onConflict: "leader_key" })
    .select("id, leader_key")
    .single();

  if (error) throw new Error(error.message);
  return { leaderId: (data as { id?: string } | null)?.id ?? null, leaderKey: row.leader_key };
}

export async function insertLeaderAsset(opts: {
  leaderId: string;
  assetType: "avatar" | "trailer";
  url?: string | null;
  provider?: string | null;
  providerPredictionId?: string | null;
  prompt?: string | null;
  negativePrompt?: string | null;
  styleId?: string | null;
  meta?: unknown;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leader_assets").insert({
    leader_id: opts.leaderId,
    asset_type: opts.assetType,
    url: opts.url ?? null,
    provider: opts.provider ?? null,
    provider_prediction_id: opts.providerPredictionId ?? null,
    prompt: opts.prompt ?? null,
    negative_prompt: opts.negativePrompt ?? null,
    style_id: opts.styleId ?? null,
    meta: opts.meta ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function upsertLeaderAssetByPredictionId(opts: {
  provider: string;
  providerPredictionId: string;
  url?: string | null;
  meta?: unknown;
}): Promise<{ leaderId: string | null }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("leader_assets")
    .update({
      url: opts.url ?? null,
      meta: opts.meta ?? null,
    })
    .eq("provider", opts.provider)
    .eq("provider_prediction_id", opts.providerPredictionId)
    .select("leader_id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return { leaderId: (data as { leader_id?: string } | null)?.leader_id ?? null };
}

export async function updateLeaderWelcomeVideoUrlById(opts: {
  leaderId: string;
  welcomeVideoUrl: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("leaders")
    .update({ welcome_video_url: opts.welcomeVideoUrl })
    .eq("id", opts.leaderId);

  if (error) throw new Error(error.message);
}

export async function logLeaderChat(opts: {
  leaderId: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  outputText: string;
  model: string;
  responseId: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leader_chat_logs").insert({
    leader_id: opts.leaderId,
    messages: opts.messages,
    output_text: opts.outputText,
    model: opts.model,
    response_id: opts.responseId,
  });
  if (error) throw new Error(error.message);
}


