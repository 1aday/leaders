import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/leader/chat/[leaderKey]
 * Fetch chat history for a specific leader (last 80 messages)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leaderKey: string }> }
) {
  try {
    const { leaderKey } = await params;
    const supabase = getSupabaseAdmin();

    // Get leader ID from leader_key
    const { data: leader, error: leaderError } = await supabase
      .from("leaders")
      .select("id")
      .eq("leader_key", leaderKey)
      .single();

    if (leaderError || !leader) {
      return NextResponse.json(
        { error: "Leader not found", messages: [] },
        { status: 404 }
      );
    }

    // Fetch chat logs for this leader (limit to last 80 messages across all logs)
    const { data: chatLogs, error: chatError } = await supabase
      .from("leader_chat_logs")
      .select("messages, created_at")
      .eq("leader_id", leader.id)
      .order("created_at", { ascending: false })
      .limit(10); // Each log can have multiple messages

    if (chatError) {
      console.error("[Chat GET] Supabase error:", chatError);
      return NextResponse.json(
        { error: chatError.message, messages: [] },
        { status: 500 }
      );
    }

    // Flatten messages from all logs and limit to 80 total
    const allMessages = chatLogs
      ?.flatMap((log) => (Array.isArray(log.messages) ? log.messages : []))
      .slice(0, 80) || [];

    return NextResponse.json({ messages: allMessages });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Chat GET] Error:", msg);
    return NextResponse.json(
      { error: msg, messages: [] },
      { status: 500 }
    );
  }
}
