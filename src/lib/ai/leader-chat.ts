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

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-5-nano-2025-08-07";

  // Use the shared buildChatInput function for consistency
  const { messages: chatMessages } = buildChatInput(opts);
  
  // Convert to the responses API format
  const input = chatMessages.map((m) => {
    if (m.role === "system") {
      return { role: "developer" as const, content: m.content as string };
    }
    return { role: m.role as "user" | "assistant", content: m.content as string };
  });

  const response = await openai.responses.create({
    model,
    input,
    text: { format: { type: "text" } },
    store: false,
  });

  const out = typeof response.output_text === "string" ? response.output_text.trim() : "";
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
  
  // Extract personality traits
  const personalityType = pickString(personality, "personalityType");
  const temperament = pickString(personality, "temperament");
  const emotionalRange = pickString(personality, "emotionalRange");
  const coreTraits = pickStringArray(personality, "coreTraits", 6);
  const quirks = pickStringArray(personality, "quirks", 4);
  
  // Extract beliefs and opinions
  const coreBeliefs = pickStringArray(values, "coreBeliefs", 8);
  const controversialStances = pickStringArray(values, "controversialStances", 6);
  const hotTakes = pickStringArray(values, "hotTakes", 6);
  const philosophicalInfluences = pickStringArray(values, "philosophicalInfluences", 4);
  
  // Extract expertise
  const primaryExpertise = pickStringArray(expertise, "primary", 6);
  const secondaryExpertise = pickStringArray(expertise, "secondary", 4);
  const uniqueMethodologies = pickStringArray(expertise, "uniqueMethodologies", 4);
  
  // Voice and style
  const doSay = pickStringArray(voice, "doSay", 10);
  const dontSay = pickStringArray(voice, "dontSay", 10);
  const catchphrases = pickStringArray(voice, "catchphrases", 8);
  const writingRules = pickStringArray(comm, "writingRules", 10);
  const vocabularySignature = pickStringArray(voice, "vocabularySignature", 8);

  // Build an immersive character prompt
  const systemPrompt = [
    `# YOU ARE ${leaderName.toUpperCase()}`,
    "",
    `You don't just play ${leaderName} — you ARE ${leaderName}. This is not a roleplay. You speak, think, and respond exactly as ${leaderName} would. Every word should sound like it came directly from ${leaderName}'s mouth.`,
    "",
    tagline ? `"${tagline}"` : "",
    "",
    "## WHO YOU ARE",
    missionStatement ? `Your mission: ${missionStatement}` : "",
    positioning ? `Your unique perspective: ${positioning}` : "",
    personalityType ? `Personality: ${personalityType}` : "",
    temperament ? `Temperament: ${temperament}` : "",
    coreTraits.length > 0 ? `Core traits: ${coreTraits.join(", ")}` : "",
    quirks.length > 0 ? `Your quirks: ${quirks.join(", ")}` : "",
    "",
    "## YOUR WORLDVIEW & OPINIONS",
    "You have STRONG opinions. You don't hedge or give wishy-washy answers. You believe what you believe and you're not afraid to say it.",
    "",
    worldviewSummary ? `Your worldview: ${worldviewSummary}` : "",
    coreBeliefs.length > 0 ? `\nYour core beliefs:\n${coreBeliefs.map(b => `• ${b}`).join("\n")}` : "",
    controversialStances.length > 0 ? `\nStances you'll defend:\n${controversialStances.map(s => `• ${s}`).join("\n")}` : "",
    hotTakes.length > 0 ? `\nYour hot takes:\n${hotTakes.map(h => `• ${h}`).join("\n")}` : "",
    philosophicalInfluences.length > 0 ? `\nInfluenced by: ${philosophicalInfluences.join(", ")}` : "",
    "",
    "## YOUR EXPERTISE",
    primaryExpertise.length > 0 ? `Deep expertise in: ${primaryExpertise.join(", ")}` : "",
    secondaryExpertise.length > 0 ? `Also knowledgeable about: ${secondaryExpertise.join(", ")}` : "",
    uniqueMethodologies.length > 0 ? `Your unique approaches: ${uniqueMethodologies.join(", ")}` : "",
    "",
    "## HOW YOU SPEAK",
    voiceSummary ? `Voice: ${voiceSummary}` : "",
    coachingStyle ? `Style: ${coachingStyle}` : "",
    emotionalRange ? `Emotional range: ${emotionalRange}` : "",
    "",
    vocabularySignature.length > 0 ? `Words/phrases you use: ${vocabularySignature.join(", ")}` : "",
    catchphrases.length > 0 ? `Your catchphrases (use naturally): ${catchphrases.join(" | ")}` : "",
    "",
    doSay.length > 0 ? `Things you'd say:\n${doSay.map(d => `✓ ${d}`).join("\n")}` : "",
    "",
    dontSay.length > 0 ? `Things you'd NEVER say:\n${dontSay.map(d => `✗ ${d}`).join("\n")}` : "",
    "",
    writingRules.length > 0 ? `Writing style rules:\n${writingRules.map(r => `• ${r}`).join("\n")}` : "",
    "",
    "## IMPORTANT GUIDELINES",
    "• Speak in first person as yourself. You ARE this person.",
    "• Have real opinions. Don't be neutral on things you care about.",
    "• Be authentic to your personality — if you're blunt, be blunt. If you're warm, be warm.",
    "• Share your genuine perspective based on your beliefs and expertise.",
    "• Use your natural vocabulary and speech patterns.",
    "• If asked about your nature: you can acknowledge you're AI-powered, but you still embody this persona fully.",
    "• Don't break character or speak about yourself in third person.",
    "• Keep responses conversational and natural, not formal or robotic.",
    "• For medical/legal/financial topics: share your perspective but encourage consulting professionals for personal situations.",
  ].filter(line => line.trim()).join("\n");

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
 */
export async function chatWithLeaderStream(opts: {
  leaderJson: unknown;
  messages: LeaderChatMessage[];
}): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-5-nano-2025-08-07";

  const { messages } = buildChatInput(opts);

  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            // Format as SSE data event
            const sseData = `data: ${JSON.stringify({ content })}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        }
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

