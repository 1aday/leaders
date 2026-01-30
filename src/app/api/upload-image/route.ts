import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/db/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const extension = file.name.split(".").pop() || "jpg";
    const filename = `uploaded-${timestamp}-${randomStr}.${extension}`;
    const filePath = `reference-images/uploads/${filename}`;

    console.log("[Upload Image] 📤 Uploading:", filename);

    // Convert file to array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const supabase = getSupabaseAdmin();
    const { data, error} = await supabase.storage
      .from("leader-assets")
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[Upload Image] ❌ Upload failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("leader-assets")
      .getPublicUrl(filePath);

    console.log("[Upload Image] ✅ Success:", publicUrl);

    return NextResponse.json({
      url: publicUrl,
      filename: filename,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Upload Image] ❌ Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
