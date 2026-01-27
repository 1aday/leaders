import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/leaders/clear
 *
 * Deletes ALL leaders from Supabase. Use with caution!
 * This is useful for cleaning up legacy data.
 */
export async function DELETE() {
  try {
    const supabase = getSupabaseAdmin();

    // Delete all leaders (FK cascades will delete related assets + chat logs)
    // Use gt with a timestamp to match all rows (created_at is always present)
    const { data, error } = await supabase
      .from("leaders")
      .delete()
      .gt("created_at", "1970-01-01")
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deletedCount = Array.isArray(data) ? data.length : 0;
    return NextResponse.json({
      ok: true,
      deleted: deletedCount,
      message: `Successfully deleted ${deletedCount} leaders from database`
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
