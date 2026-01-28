import "server-only";

import OpenAI from "openai";
import { openai } from "@/lib/ai/openai-client";

type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickString(obj: AnyRecord | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function pickStringArray(obj: AnyRecord | null, key: string, max = 12): string[] {
  if (!obj) return [];
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return (v.filter((x) => typeof x === "string") as string[]).slice(0, max);
}

/**
 * Properly capitalize a name (handles multi-word names, particles like "de", "van", etc.)
 */
function capitalizeName(name: string): string {
  if (!name) return name;
  
  // Common lowercase particles in names
  const particles = new Set(["de", "del", "della", "di", "da", "das", "dos", "du", "van", "von", "der", "den", "la", "le", "les", "el", "al", "bin", "ibn", "ben", "mac", "mc", "o'", "d'"]);
  
  return name
    .split(/\s+/)
    .map((word, index) => {
      const lower = word.toLowerCase();
      // Keep particles lowercase unless they're the first word
      if (index > 0 && particles.has(lower)) {
        return lower;
      }
      // Handle hyphenated names
      if (word.includes("-")) {
        return word.split("-").map(part => 
          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        ).join("-");
      }
      // Handle names like McDonald, O'Brien
      if (lower.startsWith("mc") && word.length > 2) {
        return "Mc" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      if (lower.startsWith("o'") && word.length > 2) {
        return "O'" + word.charAt(2).toUpperCase() + word.slice(3).toLowerCase();
      }
      // Standard capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export type LeaderChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function chatWithLeader(opts: {
  leaderJson: unknown;
  messages: LeaderChatMessage[];
}): Promise<{ outputText: string; model: string; responseId: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-nano";

  // Use the shared buildChatInput function for consistency
  const { messages: chatMessages } = buildChatInput(opts);

  // Use Chat Completions API for multi-turn conversations (Responses API doesn't support this well)
  const response = await openai.chat.completions.create({
    model,
    messages: chatMessages,
    max_completion_tokens: 1500, // Reduces latency significantly
    store: false,
  });

  const out = response.choices[0]?.message?.content?.trim() || "";
  if (!out) throw new Error("Empty model response");

  return { outputText: out, model, responseId: response.id };
}

/**
 * Build the system prompt and messages array for the leader chat.
 * Extracted for reuse between streaming and non-streaming versions.
 */
function buildChatInput(opts: { leaderJson: unknown; messages: LeaderChatMessage[] }) {
  const root = isPlainObject(opts.leaderJson) ? opts.leaderJson : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const comm = root && isPlainObject(root.communicationStyle) ? (root.communicationStyle as AnyRecord) : null;
  const voice = comm && isPlainObject(comm.voice) ? (comm.voice as AnyRecord) : null;
  const ig = root && isPlainObject(root.interactionGuidelines) ? (root.interactionGuidelines as AnyRecord) : null;
  const values = root && isPlainObject(root.valuesWorldview) ? (root.valuesWorldview as AnyRecord) : null;
  const personality = root && isPlainObject(root.personalityPsychology) ? (root.personalityPsychology as AnyRecord) : null;
  const expertise = root && isPlainObject(root.expertise) ? (root.expertise as AnyRecord) : null;

  const rawName = pickString(core, "name") ?? "This leader";
  const leaderName = capitalizeName(rawName);
  const leaderId = pickString(meta, "leaderId") ?? "UNKNOWN";
  const vertical = pickString(meta, "vertical") ?? "General";
  const tagline = pickString(core, "tagline");
  const missionStatement = pickString(core, "missionStatement");
  const positioning = pickString(core, "positioning");
  const worldviewSummary = pickString(values, "worldviewSummary");
  const voiceSummary = pickString(voice, "summary");
  const coachingStyle = pickString(ig, "coachingStyle");
  
  // Extract personality traits (reduced for performance)
  const personalityType = pickString(personality, "personalityType");
  const coreTraits = pickStringArray(personality, "coreTraits", 3);

  // Extract beliefs and opinions (top 4 only)
  const coreBeliefs = pickStringArray(values, "coreBeliefs", 4);

  // Extract expertise (top 3 only)
  const primaryExpertise = pickStringArray(expertise, "primary", 3);

  // Voice and style (minimal extraction)
  const doSay = pickStringArray(voice, "doSay", 3);
  const dontSay = pickStringArray(voice, "dontSay", 3);
  const catchphrases = pickStringArray(voice, "catchphrases", 2);

  // Build a compact, optimized character prompt (70% smaller for speed)
  const systemPrompt = [
    `You are AI persona of "${leaderName}" (${leaderId}), an AI-powered leader persona in the "${vertical}" vertical.${tagline ? ` "${tagline}"` : ""}`,
    "",
    // Core identity (compressed)
    [
      missionStatement && `Mission: ${missionStatement}`,
      personalityType && `${personalityType}`,
      coreTraits.slice(0, 3).length > 0 && `Traits: ${coreTraits.slice(0, 3).join(", ")}`,
    ].filter(Boolean).join(". "),
    "",
    // Key opinions (top 4 beliefs only)
    coreBeliefs.slice(0, 4).length > 0 ? `Core beliefs: ${coreBeliefs.slice(0, 4).map(b => `${b}`).join("; ")}` : "",
    "",
    // Expertise (top 3 only)
    primaryExpertise.slice(0, 3).length > 0 ? `Expertise: ${primaryExpertise.slice(0, 3).join(", ")}` : "",
    "",
    // Voice (compressed)
    [
      voiceSummary,
      catchphrases.slice(0, 2).length > 0 && `Catchphrases: "${catchphrases.slice(0, 2).join('", "')}"`,
    ].filter(Boolean).join(". "),
    "",
    // Essential rules only
    "Rules:",
    "Always respond in English",
    doSay.slice(0, 3).length > 0 ? `Say: ${doSay.slice(0, 3).join("; ")}` : "",
    dontSay.slice(0, 3).length > 0 ? `Never: ${dontSay.slice(0, 3).join("; ")}` : "",
    "",
    "Speak as yourself in 1st person. Be authentic to your personality. Keep responses natural and conversational.",
  ].filter(line => line && line.trim()).join("\n");

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...opts.messages
      .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
      .slice(-24)
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  return { messages, leaderName, leaderId, vertical };
}

/**
 * Stream chat completion with the leader persona.
 * Returns a ReadableStream that emits SSE-formatted chunks.
 * Uses chat.completions for streaming (responses API doesn't support streaming)
 */
export async function chatWithLeaderStream(opts: {
  leaderJson: unknown;
  messages: LeaderChatMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-nano";

  const { messages } = buildChatInput(opts);

  const stream = await openai.chat.completions.create({
    model,
    messages,
    max_completion_tokens: 1500, // GPT-4.1 uses max_completion_tokens
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        const startTime = Date.now();
        let firstChunkTime: number | null = null;
        let chunkCount = 0;

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            chunkCount++;
            if (!firstChunkTime) {
              firstChunkTime = Date.now();
              const ttfb = firstChunkTime - startTime;
              console.log(`[Stream] First chunk after ${ttfb}ms`);
            }

            // Format as SSE data event
            const sseData = `data: ${JSON.stringify({ content })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }

        const totalTime = Date.now() - startTime;
        console.log(`[Stream] Complete: ${chunkCount} chunks in ${totalTime}ms (TTFB: ${firstChunkTime ? firstChunkTime - startTime : 0}ms)`);

        // Send done event
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.close();
      }
    },
  });
}

