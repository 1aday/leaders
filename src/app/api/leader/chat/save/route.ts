import { NextResponse } from "next/server";
import { logLeaderChat } from "@/lib/db/leader-persist";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderKey: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    createdAt: number;
  }>;
};

/**
 * POST /api/leader/chat/save
 * Save chat messages to the database
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body.leaderKey || typeof body.leaderKey !== "string") {
      return NextResponse.json(
        { error: "Missing leaderKey" },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Get leader ID from leader_key
    const { data: leader, error: leaderError } = await supabase
      .from("leaders")
      .select("id")
      .eq("leader_key", body.leaderKey)
      .single();

    if (leaderError || !leader) {
      return NextResponse.json(
        { error: "Leader not found" },
        { status: 404 }
      );
    }

    // Extract last assistant message for output_text
    const lastAssistant = body.messages
      .filter((m) => m.role === "assistant")
      .pop();

    if (!lastAssistant) {
      // If no assistant message, still save the messages but with empty output_text
      // This handles cases where user sends first message before assistant responds
      const simplifiedMessages = body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      await logLeaderChat({
        leaderId: leader.id,
        messages: simplifiedMessages,
        outputText: "",
        model: "unknown",
        responseId: crypto.randomUUID(),
      });

      return NextResponse.json({ success: true });
    }

    // Preserve all message fields including id and createdAt for consistency
    const simplifiedMessages = body.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));

    await logLeaderChat({
      leaderId: leader.id,
      messages: simplifiedMessages,
      outputText: lastAssistant.content,
      model: "gpt-4", // TODO: Track actual model used
      responseId: crypto.randomUUID(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Chat Save] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
