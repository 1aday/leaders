import { NextResponse } from "next/server";
import {
  buildKlingTrailerPrompt,
  createKlingTrailerPrediction,
  generateKlingTrailerPromptWithOpenAI,
} from "@/lib/ai/kling-trailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  leaderId?: string;
  imageUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
};

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

    const promptResult = buildKlingTrailerPrompt({
      leaderJson,
      leaderId: body.leaderId,
    });
    const promptResultFinal = await generateKlingTrailerPromptWithOpenAI({
      leaderJson,
      leaderId: body.leaderId,
    }).catch(() => promptResult);

    const created = await createKlingTrailerPrediction({
      prompt: promptResultFinal.prompt,
      negativePrompt: promptResultFinal.negativePrompt,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : undefined,
      leaderId: body.leaderId,
      durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 10,
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "16:9",
    });

    return NextResponse.json({
      predictionId: created.predictionId,
      styleId: promptResultFinal.styleId,
      prompt: promptResultFinal.prompt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


