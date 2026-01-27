import { NextResponse } from "next/server";
import { getKlingTrailerPrediction } from "@/lib/ai/kling-trailer";
import { updateLeaderWelcomeVideoUrlById, upsertLeaderAssetByPredictionId } from "@/lib/db/leader-persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const p = await getKlingTrailerPrediction(id);

    // Best-effort persistence: when the trailer succeeds, attach outputUrl to the stored asset,
    // and also mirror it onto the leader row as welcome_video_url for convenience.
    const outputUrl = p.outputUrl;
    if (p.status === "succeeded" && outputUrl) {
      try {
        const { leaderId } = await upsertLeaderAssetByPredictionId({
          provider: "replicate",
          providerPredictionId: id,
          url: outputUrl,
          meta: { status: p.status },
        });
        if (leaderId) {
          await updateLeaderWelcomeVideoUrlById({ leaderId, welcomeVideoUrl: outputUrl });
        }
      } catch (e) {
        console.warn("[Supabase] Failed to persist trailer output:", e);
      }
    }

    return NextResponse.json(p);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


