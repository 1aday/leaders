import { NextResponse } from "next/server";
import { getKlingTrailerPrediction } from "@/lib/ai/kling-trailer";
import { updateLeaderWelcomeVideoUrlById, upsertLeaderAssetByPredictionId } from "@/lib/db/leader-persist";
import { uploadReplicateBlobToSupabase, generateVideoStoragePath } from "@/lib/storage/replicate-blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const p = await getKlingTrailerPrediction(id);

    // Best-effort persistence: when the trailer succeeds, download the video blob from Replicate
    // and upload it to permanent Supabase Storage, then save the permanent URL
    const replicateUrl = p.outputUrl;
    if (p.status === "succeeded" && replicateUrl) {
      try {
        const { leaderId } = await upsertLeaderAssetByPredictionId({
          provider: "replicate",
          providerPredictionId: id,
          url: replicateUrl, // Save temporary URL first
          meta: { status: p.status, replicateUrl },
        });

        if (leaderId) {
          // Download from Replicate and upload to Supabase Storage for permanent storage
          console.log(`[Trailer] Uploading video blob to Supabase Storage for leader ${leaderId}`);
          const storagePath = generateVideoStoragePath({
            leaderId,
            predictionId: id,
            extension: "mp4"
          });

          const { publicUrl, error } = await uploadReplicateBlobToSupabase({
            replicateUrl,
            bucket: "leader-assets",
            filePath: storagePath,
            contentType: "video/mp4",
          });

          if (error) {
            console.warn(`[Trailer] Failed to upload video blob, using Replicate URL as fallback:`, error);
            // Fallback: use Replicate URL if Supabase upload fails
            await updateLeaderWelcomeVideoUrlById({ leaderId, welcomeVideoUrl: replicateUrl });
          } else {
            console.log(`[Trailer] Video uploaded successfully: ${publicUrl}`);
            // Success: use permanent Supabase Storage URL
            await updateLeaderWelcomeVideoUrlById({ leaderId, welcomeVideoUrl: publicUrl });

            // Update the asset record with the permanent URL
            await upsertLeaderAssetByPredictionId({
              provider: "replicate",
              providerPredictionId: id,
              url: publicUrl, // Update with permanent URL
              meta: { status: p.status, replicateUrl, supabaseUrl: publicUrl },
            });
          }
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


