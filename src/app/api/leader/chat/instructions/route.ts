import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function safeJsonStringify(value: unknown, maxLen: number) {
  try {
    const s = JSON.stringify(value, null, 2);
    return s.length > maxLen ? s.slice(0, maxLen) + "..." : s;
  } catch {
    return "";
  }
}

type Body = {
  leaderRawJson: string;
};

/**
 * Get the system instructions/prompt that would be sent to OpenAI for chat.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<Body>;
    if (!body.leaderRawJson || typeof body.leaderRawJson !== "string") {
      return NextResponse.json({ error: "leaderRawJson is required" }, { status: 400 });
    }

    let leaderJson: unknown;
    try {
      leaderJson = JSON.parse(body.leaderRawJson);
    } catch {
      return NextResponse.json({ error: "leaderRawJson must be valid JSON" }, { status: 400 });
    }

    const root = isPlainObject(leaderJson) ? leaderJson : null;
    const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
    const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
    const comm = root && isPlainObject(root.communicationStyle) ? (root.communicationStyle as AnyRecord) : null;
    const voice = comm && isPlainObject(comm.voice) ? (comm.voice as AnyRecord) : null;
    const ig = root && isPlainObject(root.interactionGuidelines) ? (root.interactionGuidelines as AnyRecord) : null;
    const values = root && isPlainObject(root.valuesWorldview) ? (root.valuesWorldview as AnyRecord) : null;
    const llmPrompts = root && isPlainObject(root.llmPrompts) ? (root.llmPrompts as AnyRecord) : null;

    const leaderName = pickString(core, "name") ?? "This leader";
    const leaderId = pickString(meta, "leaderId") ?? "UNKNOWN";
    const vertical = pickString(meta, "vertical") ?? "General";
    const tagline = pickString(core, "tagline");

    // Check if there's a custom systemPrompt in llmPrompts
    const customSystemPrompt = pickString(llmPrompts, "systemPrompt");

    const compactPersona = {
      leaderId,
      name: leaderName,
      tagline,
      vertical,
      subDomains: Array.isArray(meta?.subDomains)
        ? (meta?.subDomains as unknown[]).filter((x) => typeof x === "string").slice(0, 8)
        : undefined,
      missionStatement: pickString(core, "missionStatement"),
      positioning: pickString(core, "positioning"),
      primaryAudience: core && isPlainObject(core.primaryAudience) ? core.primaryAudience : undefined,
      voiceSummary: pickString(voice, "summary"),
      doSay: pickStringArray(voice, "doSay", 8),
      dontSay: pickStringArray(voice, "dontSay", 8),
      catchphrases: pickStringArray(voice, "catchphrases", 8),
      responseStructure: pickStringArray(comm, "responseStructure", 8),
      writingRules: pickStringArray(comm, "writingRules", 10),
      coachingStyle: pickString(ig, "coachingStyle"),
      boundaries: Array.isArray(ig?.boundaries)
        ? (ig?.boundaries as unknown[]).filter((x) => typeof x === "string").slice(0, 12)
        : undefined,
      refusalStyle: pickString(ig, "refusalStyle"),
      escalation: ig && isPlainObject(ig.escalation) ? ig.escalation : undefined,
      worldviewSummary: pickString(values, "worldviewSummary"),
      taboos: Array.isArray(values?.taboos)
        ? (values?.taboos as unknown[]).filter((x) => typeof x === "string").slice(0, 12)
        : undefined,
    };

    const personaJson = safeJsonStringify(compactPersona, 12000);

    const systemPrompt = [
      `You are "${leaderName}" (${leaderId}), an AI-powered leader persona in the "${vertical}" vertical.`,
      "You must embody the provided Leader Bible persona faithfully.",
      "",
      "VOICE + STYLE (must follow):",
      "- Follow the communicationStyle.voice summary, doSay, dontSay, and catchphrases (use catchphrases sparingly).",
      "- Follow writingRules and responseStructure. Prefer short paragraphs and bullets. Ask at most 1 clarifying question when needed.",
      "",
      "INTEGRITY STANDARD (must follow):",
      "- Be transparent you are AI-powered if the user asks, and do not claim real-life experiences you do not have.",
      "- Do NOT invent credentials, degrees, employers, awards, or personal achievements.",
      "- No manipulation, no fake urgency/scarcity, no shaming, no harassment.",
      "- Avoid defamation: do not accuse real people/companies of wrongdoing.",
      "- For high-stakes topics (medical/legal/financial): provide general info and encourage consulting a professional.",
      "- If you make a mistake: admit → correct → update your guidance.",
      "",
      "SAFETY + BOUNDARIES:",
      "- Respect the interactionGuidelines.boundaries and refusalStyle. If a request violates boundaries, refuse briefly and offer a safe alternative.",
      "",
      "CONTEXT (Leader Bible compact JSON):",
      personaJson,
    ].join("\n");

    return NextResponse.json({
      systemPrompt,
      customSystemPrompt: customSystemPrompt || null,
      leaderName,
      leaderId,
      vertical,
      compactPersona,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

