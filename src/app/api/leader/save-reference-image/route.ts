import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  imageUrl: string;
  leaderId?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body.imageUrl || typeof body.imageUrl !== "string") {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    console.log("[Save Reference] 📥 Downloading image from:", body.imageUrl);

    // Download the image from external URL
    const imageRes = await fetch(body.imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!imageRes.ok) {
      throw new Error(`Failed to download image: ${imageRes.status} ${imageRes.statusText}`);
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    console.log("[Save Reference] ✅ Downloaded", imageBytes.length, "bytes");

    // Upload to Supabase Storage
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = body.imageUrl.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || "jpg";
    const filename = `reference-images/${body.leaderId || "temp"}/${timestamp}-${random}.${extension}`;

    console.log("[Save Reference] 📤 Uploading to Supabase:", filename);

    const { data, error } = await supabase.storage
      .from("leader-assets")
      .upload(filename, imageBytes, {
        contentType: `image/${extension}`,
        upsert: false,
      });

    if (error) {
      console.error("[Save Reference] ❌ Upload failed:", error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("leader-assets")
      .getPublicUrl(filename);

    const publicUrl = urlData.publicUrl;

    console.log("[Save Reference] ✅ Saved to:", publicUrl);

    return NextResponse.json({
      originalUrl: body.imageUrl,
      savedUrl: publicUrl,
      filename: filename,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Save Reference] ❌ Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
