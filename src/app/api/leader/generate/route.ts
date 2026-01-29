import { NextResponse } from "next/server";
import { generateLeaderBibleWithOpenAI } from "@/lib/ai/leader-generator";
import { upsertLeaderFromJson } from "@/lib/db/leader-persist";
import { researchPerson } from "@/lib/ai/leader-research";
import type { ResearchResult } from "@/lib/ai/leader-research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name?: string;
  description?: string;
  webSearch?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    const name = typeof body.name === "string" ? body.name : undefined;
    const description = typeof body.description === "string" ? body.description : undefined;
    const webSearch = body.webSearch === true;

    // Create a TransformStream for Server-Sent Events
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

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

        // STAGE 1: Web Search Research (if enabled and name provided)
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

            // Call avatar API
            const avatarRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/avatar`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leaderRawJson: result.leader,
                leaderId,
                aspectRatio: "1:1",
                outputFormat: "png",
                isRegeneration: false,
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


