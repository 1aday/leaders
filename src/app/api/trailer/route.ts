import { NextResponse } from "next/server";
import {
  buildKlingTrailerPrompt,
  createKlingTrailerPrediction,
  generateKlingTrailerPromptWithOpenAI,
} from "@/lib/ai/kling-trailer";
import { insertLeaderAsset, upsertLeaderFromJson } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  leaderId?: string;
  imageUrl?: string;
  durationSeconds?: number;
  aspectRatio?: string;
};

/** Check if a URL is a placeholder that shouldn't be used */
function isPlaceholderUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes("placeholder.example.com") || url.includes("example.com/");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }
    
    // Reject placeholder URLs that would fail when Replicate tries to fetch them
    if (isPlaceholderUrl(body.imageUrl)) {
      return NextResponse.json({ error: "Cannot use placeholder image URL. Please generate a real avatar first." }, { status: 400 });
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
      aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "1:1",
    });

    // Best-effort persistence (awaited so it works reliably in serverless).
    try {
      const { leaderId } = await upsertLeaderFromJson({ leaderJson });
      if (leaderId) {
        await insertLeaderAsset({
          leaderId,
          assetType: "trailer",
          url: null, // will be filled once prediction succeeds
          provider: "replicate",
          providerPredictionId: created.predictionId,
          prompt: promptResultFinal.prompt,
          negativePrompt: promptResultFinal.negativePrompt ?? null,
          styleId: promptResultFinal.styleId,
          meta: {
            imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : null,
            durationSeconds: typeof body.durationSeconds === "number" ? body.durationSeconds : 10,
            aspectRatio: typeof body.aspectRatio === "string" ? body.aspectRatio : "1:1",
          },
        });
      }
    } catch (e) {
      console.warn("[Supabase] Failed to persist trailer prediction:", e);
    }

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


