import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ leaderKey: string }> }) {
  try {
    const { leaderKey } = await ctx.params;
    const key = typeof leaderKey === "string" ? leaderKey.trim() : "";
    if (!key) return NextResponse.json({ error: "Missing leaderKey" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leaders")
      .select("leader_key, name, tagline, vertical, sub_domains, tier, composite_score, profile_pic_url, welcome_video_url, raw_json, created_at, updated_at")
      .eq("leader_key", key)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Transform database fields to match LeaderSummary type
    const leader = {
      id: data.leader_key,
      name: data.name ?? "Untitled Leader",
      tagline: data.tagline,
      vertical: data.vertical,
      subDomains: data.sub_domains,
      tier: data.tier,
      compositeScore: data.composite_score,
      profilePicUrl: data.profile_pic_url,
      welcomeVideoUrl: data.welcome_video_url,
      rawJson: JSON.stringify(data.raw_json),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return NextResponse.json({ leader });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


