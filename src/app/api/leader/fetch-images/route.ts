import { NextResponse } from "next/server";
import { fetchReferenceImages } from "@/lib/search/serpapi-images";
import { downloadAndUploadImage } from "@/lib/storage/image-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name: string;
  searchTerm?: string;
  description?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Use searchTerm if provided, otherwise fall back to name
    const searchQuery = body.searchTerm?.trim() || body.name;
    console.log(`[Fetch Images] 🔍 Searching for images of: ${searchQuery}`);
    if (body.searchTerm && body.searchTerm !== body.name) {
      console.log(`[Fetch Images] ℹ️  Using custom search term (leader name: ${body.name})`);
    }

    // Fetch images from SerpAPI
    const serpImages = await fetchReferenceImages(searchQuery, body.description);

    if (serpImages.length === 0) {
      console.log("[Fetch Images] ⚠️  No images found");
      return NextResponse.json({ images: [] });
    }

    console.log(`[Fetch Images] ✅ Found ${serpImages.length} images from SerpAPI`);
    console.log(`[Fetch Images] ℹ️  Returning proxy URLs for stable image loading`);

    // Use proxy URLs to solve CORS and expiration issues
    const images = serpImages.map(img => {
      const thumbnailProxy = `/api/proxy-image?url=${encodeURIComponent(img.thumbnail)}`;
      const fullProxy = `/api/proxy-image?url=${encodeURIComponent(img.original)}`;

      return {
        url: fullProxy, // Proxied full-size URL for selection
        thumbnail: thumbnailProxy, // Proxied thumbnail for display
        title: img.title,
        source: img.source,
      };
    });

    return NextResponse.json({
      images,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Fetch Images] ❌ Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
