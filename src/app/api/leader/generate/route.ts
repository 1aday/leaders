import { NextResponse } from "next/server";
import { generateLeaderBibleWithOpenAI } from "@/lib/ai/leader-generator";
import { upsertLeaderFromJson } from "@/lib/db/leader-persist";
import { researchPerson } from "@/lib/ai/leader-research";
import type { ResearchResult } from "@/lib/ai/leader-research";
import { fetchReferenceImages } from "@/lib/search/serpapi-images";
import type { ReferenceImage } from "@/lib/search/serpapi-images";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  description?: string;
  webSearch?: boolean;
  findReferencePhotos?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const name = typeof body.name === "string" ? body.name : undefined;
    const description = typeof body.description === "string" ? body.description : undefined;
    const webSearch = body.webSearch === true;
    const findReferencePhotos = body.findReferencePhotos === true;

    // Create a TransformStream for Server-Sent Events
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Generate session ID for image selection cache
    const genStartTime = Date.now();

    // Helper to send SSE messages
    const sendSSE = (type: string, data: Record<string, unknown>) => {
      const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
      writer.write(encoder.encode(message));
    };

    // Send immediate start signal
    sendSSE("progress", { tokens: 0, estimatedTotal: 9000, percentage: 1 });

    // Start generation in background
    (async () => {
      try {
        let research: ResearchResult | undefined;
        let referenceImages: ReferenceImage[] = [];

        // STAGE 1: Parallel execution of research + image fetching
        // Process each independently so images show immediately when ready

        // Start image fetching (don't await - let it run in background)
        if (findReferencePhotos && name) {
          sendSSE("images_fetching", { message: "Searching for reference photos..." });

          fetchReferenceImages(name, description)
            .then((images) => {
              referenceImages = images;
              if (images.length > 0) {
                sendSSE("images_ready", {
                  images: images.map(img => ({
                    url: img.url,
                    thumbnail: img.thumbnail,
                    title: img.title,
                    source: img.source,
                  })),
                });
              } else {
                sendSSE("images_failed", {
                  message: "No reference photos found, continuing with text-to-image...",
                });
              }
            })
            .catch((error) => {
              console.error("[SerpAPI] Failed:", error);
              sendSSE("images_failed", {
                message: "Reference photo search failed, continuing with text-to-image...",
              });
            });
        }

        // Handle research (await this one)
        if (webSearch && name) {
          sendSSE("stage", { stage: "research", message: `Researching ${name} on the web...` });

          try {
            const rawResearch = await researchPerson(name, description);

            // INLINE PARSER FIX - Parse multi-line content properly
            console.log("[INLINE PARSER] Starting inline parse v3");
            const keyFacts: string[] = [];
            const achievements: string[] = [];
            const expertise: string[] = [];
            let currentSection: string | null = null;
            let currentItem = "";

            const saveItem = () => {
              if (!currentItem || !currentSection) return;
              const cleaned = currentItem.trim();
              if (cleaned.length >= 30) {
                console.log(`[INLINE PARSER] Saving to ${currentSection}: "${cleaned.substring(0, 60)}..."`);
                if (currentSection === "facts") keyFacts.push(cleaned);
                else if (currentSection === "achievements") achievements.push(cleaned);
                else if (currentSection === "expertise") expertise.push(cleaned);
              }
              currentItem = "";
            };

            const lines = rawResearch.summary.split("\n");
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) {
                saveItem();
                continue;
              }

              if (/^##.*Key Facts/i.test(trimmed)) {
                saveItem();
                currentSection = "facts";
              } else if (/^##.*Achievement/i.test(trimmed)) {
                saveItem();
                currentSection = "achievements";
              } else if (/^##.*Expertise/i.test(trimmed)) {
                saveItem();
                currentSection = "expertise";
              } else if (currentSection && trimmed.startsWith("-")) {
                const content = trimmed.substring(1).trim();
                const isIndented = line.startsWith("  ") || line.startsWith("\t");

                // If indented bullet = actual content, not category header
                if (isIndented) {
                  currentItem += (currentItem ? " " : "") + content;
                } else {
                  // Top-level bullet = category header, skip it
                  saveItem();
                }
              } else if (currentSection) {
                // Plain text continuation
                currentItem += (currentItem ? " " : "") + trimmed;
              }
            }
            saveItem();

            research = {
              ...rawResearch,
              keyFacts: keyFacts.length > 0 ? keyFacts : rawResearch.keyFacts,
              notableAchievements: achievements.length > 0 ? achievements : rawResearch.notableAchievements,
              expertise: expertise.length > 0 ? expertise : rawResearch.expertise,
            };

            console.log(`[API] Research completed successfully:`);
            console.log(`[API]   • Sources: ${research.sources.length}`);
            console.log(`[API]   • Key Facts: ${research.keyFacts.length}`);
            console.log(`[API]   • Achievements: ${research.notableAchievements.length}`);
            console.log(`[API]   • Expertise: ${research.expertise.length}`);

            // Report research completion with results
            sendSSE("research_complete", {
              sourcesFound: research.sources.length,
              message: `Found ${research.sources.length} sources`,
              keyFacts: research.keyFacts,
              achievements: research.notableAchievements,
              expertise: research.expertise,
              sources: research.sources.map(s => ({ title: s.title, url: s.url })),
              rawSummary: research.summary, // NEW: Send raw markdown for client parsing
            });

            // Progress: research complete = 50%
            sendSSE("progress", { percentage: 50, tokens: 0, estimatedTotal: 9000 });
          } catch (researchError) {
            console.error("[Research] Failed:", researchError);
            sendSSE("research_failed", {
              message: "Web search failed, continuing with generation...",
            });
            // Continue without research - don't fail entire generation
          }
        }

        // STAGE 1.5: Wait for image selection if images were found
        let selectedImageUrl: string | null = null;
        if (referenceImages.length > 0) {
          sendSSE("stage", {
            stage: "image_selection",
            message: "Waiting for image selection...",
          });

          // Poll for selection with timeout (60 seconds)
          const selectionDeadline = Date.now() + 60_000;
          while (Date.now() < selectionDeadline) {
            try {
              const selectionRes = await fetch(
                `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/leader/select-image?sessionId=${genStartTime}`,
                { cache: "no-store" }
              );

              if (selectionRes.ok) {
                const selectionData = await selectionRes.json();
                selectedImageUrl = selectionData.imageUrl;
                console.log(`[Generation] User selected image:`, selectedImageUrl ?? "skipped");
                break;
              }
            } catch (e) {
              // Selection not ready yet, continue polling
            }

            // Wait 500ms before next poll
            await new Promise(r => setTimeout(r, 500));
          }

          if (selectedImageUrl === null && Date.now() >= selectionDeadline) {
            console.warn("[Generation] Image selection timed out, continuing without reference");
          }
        }

        // STAGE 2: Generate Leader Bible JSON
        sendSSE("stage", {
          stage: "generation",
          message: research
            ? "Generating Leader Bible with research insights..."
            : "Generating Leader Bible...",
        });

        const result = await generateLeaderBibleWithOpenAI({
          name,
          description,
          research,
          onProgress: (data) => {
            // Map generation progress to 50-100% range if research was done
            const mappedPercentage = webSearch && name && research
              ? 50 + (data.percentage / 2) // 50-100%
              : data.percentage; // 0-100%

            sendSSE("progress", {
              tokens: data.tokens,
              estimatedTotal: data.estimatedTotal,
              percentage: mappedPercentage,
            });
          },
        });

        // Best-effort persistence
        try {
          await upsertLeaderFromJson({ leaderJson: result.leader, model: result.model });
        } catch (e) {
          console.warn("[Supabase] Failed to persist leader generation:", e);
        }

        // Auto-generate avatar (best-effort, don't block completion)
        (async () => {
          try {
            // Extract leaderId from generated JSON
            if (typeof result.leader !== 'string') return;
            const parsed = JSON.parse(result.leader) as unknown;
            const metadata = parsed && typeof parsed === "object" && "metadata" in (parsed as Record<string, unknown>)
              ? (parsed as Record<string, unknown>).metadata
              : null;
            const leaderId = metadata && typeof metadata === "object" && "leaderId" in (metadata as Record<string, unknown>)
              ? String((metadata as Record<string, unknown>).leaderId).replace(/\s+/g, "-").toUpperCase()
              : null;

            if (!leaderId) {
              console.warn("[Avatar] Cannot auto-generate: no leaderId in generated JSON");
              return;
            }

            // Call avatar API with reference image if selected
            const avatarRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/avatar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leaderRawJson: result.leader,
                leaderId,
                aspectRatio: "1:1",
                outputFormat: "png",
                isRegeneration: false,
                referenceImageUrl: selectedImageUrl ?? undefined,
              }),
            });

            if (!avatarRes.ok) {
              const err = await avatarRes.json().catch(() => ({}));
              console.warn("[Avatar] Auto-generation failed:", err);
            } else {
              console.log("[Avatar] Auto-generated successfully for", leaderId);
            }
          } catch (err) {
            console.warn("[Avatar] Auto-generation error:", err);
          }
        })();

        // Send final result with timing metrics
        const sseData = `data: ${JSON.stringify({
          type: "complete",
          leader: result.leader,
          model: result.model,
          timing: result.timing,
        })}\n\n`;
        writer.write(encoder.encode(sseData));
        writer.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        const sseData = `data: ${JSON.stringify({ type: "error", error: msg })}\n\n`;
        writer.write(encoder.encode(sseData));
        writer.close();
      }
    })();

    // Return SSE stream
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg.toLowerCase().includes("missing openai_api_key") ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}


