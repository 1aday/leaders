import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory cache for image selections with TTL (5 minutes)
const imageSelectionCache = new Map<string, {
  imageUrl: string | null;
  timestamp: number;
}>();

// Cleanup expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of imageSelectionCache.entries()) {
    if (now - value.timestamp > 300_000) { // 5 minutes
      imageSelectionCache.delete(key);
    }
  }
}, 60_000);

type PostBody = {
  sessionId: string;
  selectedImageUrl: string | null; // null = user skipped selection
};

// POST: Store user's image selection
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<PostBody>;

    if (!body.sessionId || typeof body.sessionId !== "string") {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    // Store selection (null = user skipped)
    imageSelectionCache.set(body.sessionId, {
      imageUrl: body.selectedImageUrl ?? null,
      timestamp: Date.now(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET: Retrieve selection by sessionId
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId query parameter is required" }, { status: 400 });
    }

    const entry = imageSelectionCache.get(sessionId);

    if (!entry) {
      return NextResponse.json({ error: "Selection not found or expired" }, { status: 404 });
    }

    return NextResponse.json({
      imageUrl: entry.imageUrl,
      timestamp: entry.timestamp,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
