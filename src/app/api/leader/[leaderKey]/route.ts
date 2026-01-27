import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: { params: Promise<{ leaderKey: string }> }) {
  try {
    const { leaderKey } = await ctx.params;
    const key = typeof leaderKey === "string" ? leaderKey.trim() : "";
    if (!key) return NextResponse.json({ error: "Missing leaderKey" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Delete leader row. FK cascades delete related assets + chat logs.
    const { data, error } = await supabase.from("leaders").delete().eq("leader_key", key).select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, deleted: Array.isArray(data) ? data.length : 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


