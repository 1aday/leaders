import { NextResponse } from "next/server";
import { generateAvatarPromptWithOpenAI, generateAvatarWithReplicate } from "@/lib/ai/leader-avatar";
import { insertLeaderAsset, upsertLeaderFromJson } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  leaderId?: string;
  aspectRatio?: string;
  outputFormat?: string;
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

    const promptResult = await generateAvatarPromptWithOpenAI({
      leaderJson,
      leaderId: body.leaderId,
    });

    const img = await generateAvatarWithReplicate({
      prompt: promptResult.prompt,
      negativePrompt: promptResult.negativePrompt,
      aspectRatio: body.aspectRatio ?? "1:1",
      outputFormat: body.outputFormat ?? "png",
    });

    // Best-effort persistence (awaited so it works reliably in serverless).
    try {
      const { leaderId } = await upsertLeaderFromJson({ leaderJson, profilePicUrl: img.imageUrl });
      if (leaderId) {
        await insertLeaderAsset({
          leaderId,
          assetType: "avatar",
          url: img.imageUrl,
          provider: "replicate",
          providerPredictionId: img.predictionId,
          prompt: promptResult.prompt,
          negativePrompt: promptResult.negativePrompt ?? null,
          styleId: promptResult.styleId,
          meta: {
            isFamousPerson: promptResult.isFamousPerson,
            usedFallbackModel: img.usedFallback ?? false,
            aspectRatio: body.aspectRatio ?? "1:1",
            outputFormat: body.outputFormat ?? "png",
          },
        });
      }
    } catch (e) {
      console.warn("[Supabase] Failed to persist avatar:", e);
    }

    return NextResponse.json({
      profilePicUrl: img.imageUrl,
      replicatePredictionId: img.predictionId,
      styleId: promptResult.styleId,
      prompt: promptResult.prompt,
      isFamousPerson: promptResult.isFamousPerson,
      usedFallbackModel: img.usedFallback ?? false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


