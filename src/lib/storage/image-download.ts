import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Downloads an image from an external URL and uploads it to Supabase Storage
 * Returns the permanent public URL
 */
export async function downloadAndUploadImage(opts: {
  imageUrl: string;
  bucket: string;
  folder: string;
  filename?: string;
}): Promise<{ publicUrl: string; error: string | null }> {
  try {
    console.log("[Image Download] 📥 Downloading from:", opts.imageUrl);

    // Download the image with timeout and retry
    const downloadStartTime = Date.now();
    let imageRes: Response | null = null;
    let lastError: string = "";

    // Try up to 2 times
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      try {
        imageRes = await fetch(opts.imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Accept": "image/*",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (imageRes.ok) {
          break; // Success!
        } else {
          lastError = `HTTP ${imageRes.status}: ${imageRes.statusText}`;
          if (attempt < 2) {
            console.log(`[Image Download] Retry ${attempt}/2 after ${lastError}`);
            await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if (err instanceof Error && err.name === "AbortError") {
          lastError = "Download timed out after 20 seconds";
        } else {
          lastError = err instanceof Error ? err.message : "Download failed";
        }
        if (attempt < 2) {
          console.log(`[Image Download] Retry ${attempt}/2 after ${lastError}`);
          await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        }
      }
    }

    if (!imageRes || !imageRes.ok) {
      return { publicUrl: "", error: lastError || "Download failed" };
    }

    const downloadTime = Date.now() - downloadStartTime;

    const imageBuffer = await imageRes.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    // Validate image data
    if (imageBytes.length === 0) {
      return { publicUrl: "", error: "Empty image data" };
    }

    if (imageBytes.length < 1000) {
      console.warn("[Image Download] ⚠️  Suspiciously small image:", imageBytes.length, "bytes");
    }

    console.log(`[Image Download] ✅ Downloaded ${imageBytes.length} bytes in ${downloadTime}ms`);

    // Upload to Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return { publicUrl: "", error: "Missing Supabase credentials" };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate filename if not provided
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = opts.imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || "jpg";
    const filename = opts.filename || `${timestamp}-${random}.${extension}`;
    const filePath = `${opts.folder}/${filename}`;

    console.log("[Image Download] 📤 Uploading to Supabase:", filePath);

    const uploadStartTime = Date.now();
    const { data, error } = await supabase.storage
      .from(opts.bucket)
      .upload(filePath, imageBytes, {
        contentType: `image/${extension}`,
        upsert: false,
      });

    const uploadTime = Date.now() - uploadStartTime;

    if (error) {
      console.error("[Image Download] ❌ Upload failed:", error);
      return { publicUrl: "", error: error.message };
    }

    if (!data || !data.path) {
      return { publicUrl: "", error: "Upload returned no data" };
    }

    console.log(`[Image Download] ✅ Uploaded in ${uploadTime}ms`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(opts.bucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Validate public URL
    if (!publicUrl || !publicUrl.startsWith("http")) {
      return { publicUrl: "", error: "Invalid public URL generated" };
    }

    console.log("[Image Download] ✅ Public URL:", publicUrl);

    return { publicUrl, error: null };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Image Download] ❌ Error:", msg);
    return { publicUrl: "", error: msg };
  }
}
