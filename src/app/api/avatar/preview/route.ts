import { NextResponse } from "next/server";
import { generateAvatarPromptWithOpenAI } from "@/lib/ai/leader-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  leaderId?: string;
};

/**
 * Preview the avatar prompt without actually generating the image.
 * Useful for seeing what prompt will be sent to Nano Banana.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }

    let leaderJson: unknown;
    try {
      leaderJson = JSON.parse(body.leaderRawJson);
    } catch {
      return NextResponse.json({ error: "leaderRawJson must be valid JSON" }, { status: 400 });
    }

    const promptResult = await generateAvatarPromptWithOpenAI({
      leaderJson,
      leaderId: body.leaderId,
    });

    return NextResponse.json({
      prompt: promptResult.prompt,
      negativePrompt: promptResult.negativePrompt,
      isFamousPerson: promptResult.isFamousPerson,
      styleId: promptResult.styleId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

