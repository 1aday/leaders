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

    console.log(`[Avatar API] 📥 RAW Request body:`, JSON.stringify(body, null, 2));

    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }

    let leaderJson: unknown;
    try {
      leaderJson = JSON.parse(body.leaderRawJson);
    } catch {
      return NextResponse.json({ error: "leaderRawJson must be valid JSON" }, { status: 400 });
    }

    console.log(`[Avatar API] 🎨 Starting generation for ${body.leaderId || 'unknown'}`);
    console.log(`[Avatar API] 📸 body.referenceImageUrl:`, body.referenceImageUrl);
    console.log(`[Avatar API] 📸 body.referenceImageUrl type:`, typeof body.referenceImageUrl);
    console.log(`[Avatar API] 📸 body.referenceImageUrl length:`, body.referenceImageUrl?.length);
    console.log(`[Avatar API] 📸 Reference image: ${body.referenceImageUrl ? 'YES' : 'NO'}`);
    if (body.referenceImageUrl) {
      console.log(`[Avatar API] 🖼️  Reference URL: ${body.referenceImageUrl}`);
      console.log(`[Avatar API] ✅ Will use: google/nano-banana-pro (image-to-image)`);

      // Validate URL format
      try {
        new URL(body.referenceImageUrl);
        console.log(`[Avatar API] ✅ URL is valid`);
      } catch (e) {
        console.error(`[Avatar API] ❌ Invalid URL format:`, e);
        return NextResponse.json({ error: "Invalid reference image URL format" }, { status: 400 });
      }
    } else {
      console.log(`[Avatar API] ✅ Will use: google/imagen-3 (text-to-image)`);
    }

    console.log(`[Avatar API] Step 1: Generating prompt with OpenAI...`);
    const promptResult = await generateAvatarPromptWithOpenAI({
      leaderJson,
      leaderId: body.leaderId,
      isRegeneration: body.isRegeneration ?? false,
      referenceImageUrl: body.referenceImageUrl,
    });
    console.log(`[Avatar API] ✅ Prompt generated:`, promptResult.prompt.substring(0, 100) + "...");

    let img: { imageUrl: string; predictionId: string; usedFallback?: boolean; model?: string };

    // If reference image provided, upload it to Supabase first for stable access
    let finalReferenceUrl = body.referenceImageUrl;
    if (body.referenceImageUrl) {
      console.log(`[Avatar API] Step 1.5: Uploading reference image to Supabase...`);
      const { downloadAndUploadImage } = await import("@/lib/storage/image-download");

      const { publicUrl, error } = await downloadAndUploadImage({
        imageUrl: body.referenceImageUrl,
        bucket: "leader-assets",
        folder: `reference-images/${body.leaderId || "temp"}`,
      });

      if (error) {
        console.error(`[Avatar API] ⚠️  Failed to upload reference image:`, error);
        console.log(`[Avatar API] Continuing with original URL as fallback`);
        // Continue with original URL as fallback
      } else {
        console.log(`[Avatar API] ✅ Reference image uploaded to Supabase:`, publicUrl);
        finalReferenceUrl = publicUrl;
      }
    }

    console.log(`[Avatar API] Step 2: Generating image with Replicate...`);
    console.log(`[Avatar API] Using imageInput:`, finalReferenceUrl || "NONE");
    // NO FALLBACK - if flux-dev fails with reference image, let it fail
    img = await generateAvatarWithReplicate({
      prompt: promptResult.prompt,
      negativePrompt: promptResult.negativePrompt,
      aspectRatio: body.aspectRatio ?? "1:1",
      outputFormat: body.outputFormat ?? "png",
      imageInput: finalReferenceUrl, // Pass Supabase URL
    });
    console.log(`[Avatar API] ✅ Image generated:`, img.imageUrl);

    console.log(`[Avatar API] ✅ Generation complete using model: ${img.model || 'unknown'}`);

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
            model: img.model ?? "unknown",
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
      model: img.model ?? "unknown",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[Avatar API] ❌ Error:", msg);
    if (stack) {
      console.error("[Avatar API] Stack trace:", stack);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}


