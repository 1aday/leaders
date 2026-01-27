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
      .select("leader_key, raw_json, profile_pic_url, welcome_video_url, created_at, updated_at")
      .eq("leader_key", key)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ leader: data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


