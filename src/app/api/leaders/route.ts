import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";
import { upsertLeaderFromJson } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitRaw = url.searchParams.get("limit");
    const limit = Math.max(1, Math.min(500, Number(limitRaw ?? "200") || 200));

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leaders")
      .select("leader_key, name, tagline, vertical, sub_domains, tier, composite_score, profile_pic_url, welcome_video_url, raw_json, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Transform database fields to match LeaderSummary type
    const leaders = (data ?? []).map((row: any) => ({
      id: row.leader_key,
      name: row.name ?? "Untitled Leader",
      tagline: row.tagline,
      vertical: row.vertical,
      subDomains: row.sub_domains,
      tier: row.tier,
      compositeScore: row.composite_score,
      profilePicUrl: row.profile_pic_url,
      welcomeVideoUrl: row.welcome_video_url,
      rawJson: JSON.stringify(row.raw_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ leaders });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

type SyncBody = {
  leaderRawJson: string;
  profilePicUrl?: string;
  welcomeVideoUrl?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<SyncBody>;
    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }

    let leaderJson: unknown;
    try {
      leaderJson = JSON.parse(body.leaderRawJson);
    } catch {
      return NextResponse.json({ error: "leaderRawJson must be valid JSON" }, { status: 400 });
    }

    // Sync the leader to Supabase
    const result = await upsertLeaderFromJson({
      leaderJson,
      profilePicUrl: body.profilePicUrl,
      welcomeVideoUrl: body.welcomeVideoUrl,
    });

    return NextResponse.json({
      success: true,
      leaderId: result.leaderId,
      leaderKey: result.leaderKey,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


