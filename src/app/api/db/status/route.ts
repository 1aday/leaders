import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Validate env vars (throws if missing)
    const supabase = getSupabaseAdmin();

    // Verify tables exist + basic connectivity
    const leadersCount = await supabase
      .from("leaders")
      .select("id", { count: "exact", head: true });

    if (leadersCount.error) {
      return NextResponse.json(
        {
          ok: false,
          error: leadersCount.error.message,
          hint:
            "If this says relation does not exist, run supabase/schema.sql in the Supabase SQL editor. If it says missing env, set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      leadersCount: leadersCount.count ?? 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: msg,
        hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and in Vercel env vars.",
      },
      { status: 500 },
    );
  }
}


