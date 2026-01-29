import { NextResponse } from "next/server";
import { generateAvatarPromptWithOpenAI, generateAvatarWithReplicate } from "@/lib/ai/leader-avatar";
import { insertLeaderAsset, upsertLeaderFromJson } from "@/lib/db/leader-persist";
import { uploadReplicateBlobToSupabase, generateImageStoragePath } from "@/lib/storage/replicate-blob";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  leaderRawJson: string;
  leaderId?: string;
  aspectRatio?: string;
  outputFormat?: string;
  isRegeneration?: boolean;
  referenceImageUrl?: string;
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
      isRegeneration: body.isRegeneration ?? false,
      referenceImageUrl: body.referenceImageUrl,
    });

    let img: { imageUrl: string; predictionId: string; usedFallback?: boolean };

    try {
      img = await generateAvatarWithReplicate({
        prompt: promptResult.prompt,
        negativePrompt: promptResult.negativePrompt,
        aspectRatio: body.aspectRatio ?? "1:1",
        outputFormat: body.outputFormat ?? "png",
      });
    } catch (error) {
      // If reference image generation fails, retry without reference enhancement
      if (body.referenceImageUrl) {
        console.warn("[Avatar] Reference-enhanced generation failed, retrying without reference:", error);

        // Regenerate prompt without reference URL
        const fallbackPrompt = await generateAvatarPromptWithOpenAI({
          leaderJson,
          leaderId: body.leaderId,
          isRegeneration: body.isRegeneration ?? false,
        });

        img = await generateAvatarWithReplicate({
          prompt: fallbackPrompt.prompt,
          negativePrompt: fallbackPrompt.negativePrompt,
          aspectRatio: body.aspectRatio ?? "1:1",
          outputFormat: body.outputFormat ?? "png",
        });

        img.usedFallback = true;
      } else {
        // No reference was used, re-throw the error
        throw error;
      }
    }

    // Best-effort persistence: Download blob from Replicate and upload to permanent Supabase Storage
    let finalImageUrl = img.imageUrl; // Default to Replicate URL as fallback
    try {
      const { leaderId } = await upsertLeaderFromJson({ leaderJson, profilePicUrl: img.imageUrl });
      if (leaderId) {
        // Download from Replicate and upload to Supabase Storage for permanent storage
        console.log(`[Avatar] Uploading image blob to Supabase Storage for leader ${leaderId}`);
        const extension = (body.outputFormat ?? "png").toLowerCase();
        const storagePath = generateImageStoragePath({
          leaderId,
          predictionId: img.predictionId,
          extension,
        });

        const { publicUrl, error } = await uploadReplicateBlobToSupabase({
          replicateUrl: img.imageUrl,
          bucket: "leader-assets",
          filePath: storagePath,
          contentType: extension === "png" ? "image/png" : "image/jpeg",
        });

        if (error) {
          console.warn(`[Avatar] Failed to upload image blob, using Replicate URL as fallback:`, error);
          // Use Replicate URL if Supabase upload fails
          finalImageUrl = img.imageUrl;
        } else {
          console.log(`[Avatar] Image uploaded successfully: ${publicUrl}`);
          // Update with permanent Supabase Storage URL
          finalImageUrl = publicUrl;
          await upsertLeaderFromJson({ leaderJson, profilePicUrl: publicUrl });
        }

        // Save asset record with permanent URL
        await insertLeaderAsset({
          leaderId,
          assetType: "avatar",
          url: finalImageUrl,
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
            replicateUrl: img.imageUrl,
            supabaseUrl: finalImageUrl !== img.imageUrl ? finalImageUrl : undefined,
            referenceImageUrl: body.referenceImageUrl ?? undefined,
          },
        });
      }
    } catch (e) {
      console.warn("[Supabase] Failed to persist avatar:", e);
    }

    return NextResponse.json({
      profilePicUrl: finalImageUrl, // Return permanent Supabase URL instead of temporary Replicate URL
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


