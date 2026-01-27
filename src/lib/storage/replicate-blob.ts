import "server-only";
import { getSupabaseAdmin } from "../db/supabase-admin";

/**
 * Downloads a file from a Replicate URL and uploads it to Supabase Storage.
 * Returns the permanent public URL from Supabase Storage.
 *
 * This is critical because Replicate URLs are temporary and expire.
 */
export async function uploadReplicateBlobToSupabase(opts: {
  replicateUrl: string;
  bucket: string;
  filePath: string;
  contentType?: string;
}): Promise<{ publicUrl: string; error: Error | null }> {
  try {
    // Step 1: Download the blob from Replicate
    console.log(`[Blob] Downloading from Replicate: ${opts.replicateUrl}`);
    const fetchRes = await fetch(opts.replicateUrl);

    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch Replicate blob: ${fetchRes.status} ${fetchRes.statusText}`);
    }

    const blob = await fetchRes.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`[Blob] Downloaded ${buffer.length} bytes, uploading to Supabase Storage...`);

    // Step 2: Upload to Supabase Storage
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.storage
      .from(opts.bucket)
      .upload(opts.filePath, buffer, {
        contentType: opts.contentType || blob.type || "application/octet-stream",
        upsert: true, // Overwrite if exists
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    // Step 3: Get the public URL
    const { data: urlData } = supabase.storage
      .from(opts.bucket)
      .getPublicUrl(opts.filePath);

    console.log(`[Blob] Successfully uploaded to: ${urlData.publicUrl}`);

    return {
      publicUrl: urlData.publicUrl,
      error: null,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error(`[Blob] Error uploading Replicate blob:`, error);
    return {
      publicUrl: "", // Return empty string on error
      error,
    };
  }
}

/**
 * Generates a storage path for a video file
 */
export function generateVideoStoragePath(opts: {
  leaderId: string;
  predictionId: string;
  extension?: string;
}): string {
  const ext = opts.extension || "mp4";
  return `videos/${opts.leaderId}/${opts.predictionId}.${ext}`;
}

/**
 * Generates a storage path for an image file
 */
export function generateImageStoragePath(opts: {
  leaderId: string;
  predictionId: string;
  extension?: string;
}): string {
  const ext = opts.extension || "png";
  return `images/${opts.leaderId}/${opts.predictionId}.${ext}`;
}
