import { NextResponse } from "next/server";
import { downloadAndUploadImage } from "@/lib/storage/image-download";

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

    console.log("[Save Reference] 📥 Starting download for:", body.imageUrl);

    const { publicUrl, error } = await downloadAndUploadImage({
      imageUrl: body.imageUrl,
      bucket: "leader-assets",
      folder: `reference-images/${body.leaderId || "temp"}`,
    });

    if (error) {
      console.error("[Save Reference] ❌ Failed:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    console.log("[Save Reference] ✅ Success:", publicUrl);

    return NextResponse.json({
      originalUrl: body.imageUrl,
      savedUrl: publicUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Save Reference] ❌ Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
