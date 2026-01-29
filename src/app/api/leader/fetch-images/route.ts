import { NextResponse } from "next/server";
import { fetchReferenceImages } from "@/lib/search/serpapi-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name: string;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const images = await fetchReferenceImages(body.name, body.description);

    return NextResponse.json({
      images: images.map(img => ({
        url: img.url,
        thumbnail: img.thumbnail,
        title: img.title,
        source: img.source,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
