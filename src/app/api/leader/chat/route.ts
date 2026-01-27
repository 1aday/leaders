import { NextResponse } from "next/server";
import { chatWithLeader, chatWithLeaderStream } from "@/lib/ai/leader-chat";
import { logLeaderChat, upsertLeaderFromJson } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  stream?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }
    if (!Array.isArray(body.messages)) {
      return NextResponse.json({ error: "messages must be an array" }, { status: 400 });
    }

    let leaderJson: unknown;
    try {
      leaderJson = JSON.parse(body.leaderRawJson);
    } catch {
      return NextResponse.json({ error: "leaderRawJson must be valid JSON" }, { status: 400 });
    }

    const messages = body.messages
      .filter((m) => m && typeof m === "object")
      .map((m) => ({
        role: (m as { role: unknown }).role,
        content: (m as { content: unknown }).content,
      }))
      .filter(
        (m): m is { role: "user" | "assistant"; content: string } =>
          (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
      );

    // Handle streaming request
    if (body.stream) {
      const stream = await chatWithLeaderStream({ leaderJson, messages });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming request (default)
    const result = await chatWithLeader({ leaderJson, messages });

    // Best-effort persistence for chat logs (non-streaming only, awaited for serverless reliability).
    try {
      const { leaderId } = await upsertLeaderFromJson({ leaderJson });
      if (leaderId) {
        await logLeaderChat({
          leaderId,
          messages,
          outputText: result.outputText,
          model: result.model,
          responseId: result.responseId,
        });
      }
    } catch (e) {
      console.warn("[Supabase] Failed to persist chat:", e);
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


