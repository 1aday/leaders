import "server-only";

export interface ReferenceImage {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
  width: number;
  height: number;
}

/**
 * Fetches reference images from SerpAPI for a given person name
 * Returns up to 4 professional headshot images
 */
export async function fetchReferenceImages(
  personName: string,
  description?: string
): Promise<ReferenceImage[]> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.warn("[SerpAPI] Missing SERPAPI_API_KEY, skipping image search");
    return [];
  }

  try {
    // Build search query - focus on professional headshots
    const query = `${personName} professional headshot`;

    // Construct SerpAPI URL with parameters
    const params = new URLSearchParams({
      engine: "google_images",
      q: query,
      api_key: apiKey,
      imgar: "s", // Square aspect ratio
      imgsz: "l", // Large images
      num: "20", // Fetch 20 images (SerpAPI returns up to 100)
      gl: "ca", // Search from Canada
      hl: "en", // English language
    });

    const url = `https://serpapi.com/search?${params.toString()}`;

    // Fetch with 10 second timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.warn(`[SerpAPI] Request failed (${response.status}): ${text}`);
      return [];
    }

    const data = await response.json();

    // Extract images from response
    const images = data.images_results || [];
    const results: ReferenceImage[] = [];

    for (const img of images.slice(0, 20)) {
      // Validate required fields
      if (!img.original || !img.thumbnail || typeof img.original !== "string" || typeof img.thumbnail !== "string") {
        continue;
      }

      results.push({
        url: img.original,
        thumbnail: img.thumbnail,
        title: img.title || personName,
        source: img.source || "Unknown",
        width: img.original_width || 800,
        height: img.original_height || 800,
      });
    }

    console.log(`[SerpAPI] Found ${results.length} reference images for "${personName}"`);
    return results;

  } catch (error) {
    // Graceful degradation - don't block generation if image search fails
    if (error instanceof Error && error.name === "AbortError") {
      console.warn("[SerpAPI] Request timed out after 10 seconds");
    } else {
      console.warn("[SerpAPI] Image search failed:", error);
    }
    return [];
  }
}
