import { NextResponse } from "next/server";
import { generateLeaderBibleWithOpenAI } from "@/lib/ai/leader-generator";
import { upsertLeaderFromJson } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const name = typeof body.name === "string" ? body.name : undefined;
    const description = typeof body.description === "string" ? body.description : undefined;

    // Create a TransformStream for Server-Sent Events
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start generation in background
    (async () => {
      try {
        const result = await generateLeaderBibleWithOpenAI({
          name,
          description,
          onProgress: (data) => {
            // Send progress updates as SSE
            const sseData = `data: ${JSON.stringify({ type: "progress", ...data })}\n\n`;
            writer.write(encoder.encode(sseData));
          },
        });

        // Best-effort persistence
        try {
          await upsertLeaderFromJson({ leaderJson: result.leader, model: result.model });
        } catch (e) {
          console.warn("[Supabase] Failed to persist leader generation:", e);
        }

        // Send final result
        const sseData = `data: ${JSON.stringify({ type: "complete", leader: result.leader, model: result.model })}\n\n`;
        writer.write(encoder.encode(sseData));
        writer.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        const sseData = `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`;
        writer.write(encoder.encode(sseData));
        writer.close();
      }
    })();

    // Return SSE stream
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg.toLowerCase().includes("missing openai_api_key") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}


