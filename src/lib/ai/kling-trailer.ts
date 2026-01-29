import "server-only";

type AnyRecord = Record<string, unknown>;

function isPlainObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function pickString(obj: AnyRecord | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function safeJsonStringify(value: unknown, maxLen: number) {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  } catch {
    return "";
  }
}

function normalizeReplicateOutputToUrl(output: unknown): string | null {
  if (typeof output === "string" && output.startsWith("http")) return output;
  if (Array.isArray(output)) {
    const first = output.find((x) => typeof x === "string" && (x as string).startsWith("http"));
    return typeof first === "string" ? first : null;
  }
  if (isPlainObject(output) && typeof output.url === "string" && output.url.startsWith("http")) {
    return output.url;
  }
  return null;
}

function hashStringToSeed(s: string): number {
  // Deterministic, cheap, stable (FNV-1a-ish)
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Replicate seeds are typically 32-bit ints
  return (h >>> 0) % 2_147_483_647;
}

function oneParagraph(s: string): string {
  return s.replace(/\s*\n+\s*/g, " ").replace(/\s+/g, " ").trim();
}

function stripDurationMentions(s: string): string {
  // Do not let the prompt mention time/duration. Duration should be controlled via model params.
  return (
    s
      // "10-second", "5 sec", "10 seconds", etc.
      .replace(/\b\d+\s*-\s*second\b/gi, "")
      .replace(/\b\d+\s*(seconds?|secs?)\b/gi, "")
      // "ten seconds" etc (limited set)
      .replace(/\b(ten|five|six|seven|eight|nine)\s+seconds?\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function normalizeThisPersonLanguage(s: string): string {
  let out = s;
  out = out.replace(/\bthe leader\b/gi, "this person");
  out = out.replace(/\bthe character\b/gi, "this person");
  out = out.replace(/\bthe subject\b/gi, "this person");
  return out;
}

function stripBeatLabels(s: string): string {
  return s
    .replace(/\b(opening|first|second|third)\s+beat\s*:\s*/gi, "")
    .replace(/\bbeat\s*\d+\s*:\s*/gi, "")
    .trim();
}

function stripTechCineFluff(s: string): string {
  return (
    s
      .replace(/\b(photorealistic|high-end|cinematic|filmic)\b/gi, "")
      .replace(/\b(24\s*fps|60\s*fps|8k|4k)\b/gi, "")
      .replace(/\b(widescreen|aspect\s*ratio\s*16:9|16:9)\b/gi, "")
      .replace(/\b(key light|rim light|catchlights?|clean blacks?)\b/gi, "")
      .replace(/\b(color grade|grade)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function compressReferenceImageClause(s: string): string {
  // Replace long identity anchoring clauses with a short, consistent directive.
  let out = s;
  out = out.replace(
    /anchored\s*(tightly\s*)?to\s*the\s*reference\s*image[^;.,]*/gi,
    "Match the reference image (same face, hair, and wardrobe)."
  );
  out = out.replace(
    /use\s*the\s*provided\s*reference\s*image[^;.,]*/gi,
    "Match the reference image (same face, hair, and wardrobe)."
  );
  return out;
}

function truncateToWords(s: string, maxWords: number): string {
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return s.trim();
  return words.slice(0, maxWords).join(" ").replace(/[;,:-]+$/g, "").trim() + ".";
}

function simplifyKlingPrompt(s: string): string {
  // Goal: speech-first, minimal visual support.
  let out = oneParagraph(s);
  out = normalizeThisPersonLanguage(out);
  out = stripDurationMentions(out);
  out = stripBeatLabels(out);
  out = compressReferenceImageClause(out);
  out = stripTechCineFluff(out);
  // Normalize separators and remove excess punctuation/listing feel.
  out = out.replace(/\s*;\s*/g, ". ");
  out = out.replace(/\s*:\s*/g, ". ");
  out = out.replace(/\s+/g, " ").trim();
  return truncateToWords(out, 85);
}

export type KlingTrailerPromptResult = {
  prompt: string;
  negativePrompt?: string;
  styleId: string;
};

const STYLE_ID = "pmk.trailer.kling.v1";

const STYLE_GUIDE = [
  "Create a cinematic character trailer video.",
  "Primary goals: (1) instantly communicates what the leader is about, (2) looks cohesive across a gallery of leaders, (3) keeps identity consistent with the provided reference image.",
  "",
  "CONSISTENT VIDEO DIRECTION (do not vary):",
  "- photorealistic, high-end cinematic look (NOT animation, NOT illustration, NOT 3D render)",
  "- structure: 3 beats (opening close-up → action/competence moment → hero pose)",
  "- camera: smooth stabilized movement; subtle dolly/track + gentle orbit; no shaky cam",
  "- lighting: clean cinematic key + soft rim; flattering skin; tasteful contrast",
  "- background: minimal, modern, abstract environment (no busy scenery), subtle domain cues only",
  "- color grade: filmic, slightly warm highlights, clean blacks; consistent across leaders",
  "- no text, no subtitles, no logos, no watermarks",
  "",
  "IDENTITY CONSISTENCY (strict):",
  "- Use the reference image to anchor: same person, same face, same hairstyle, same age, same wardrobe vibe.",
  "- Single subject only. No extra people. No clones. No face swaps.",
  "",
  "SAFE + CLEAN:",
  "- safe-for-work only",
  "- no violence, no gore, no weapons, no political symbols, no brand marks",
].join("\n");

export async function generateKlingTrailerPromptWithOpenAI(opts: {
  leaderJson: unknown;
  leaderId?: string;
}): Promise<KlingTrailerPromptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5-nano-2025-08-07";

  const root = isPlainObject(opts.leaderJson) ? opts.leaderJson : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as AnyRecord) : null;
  const visualStyle = visual && isPlainObject(visual.visualStyle) ? (visual.visualStyle as AnyRecord) : null;
  const comm = root && isPlainObject(root.communicationStyle) ? (root.communicationStyle as AnyRecord) : null;
  const voice = comm && isPlainObject(comm.voice) ? (comm.voice as AnyRecord) : null;
  const voiceIdentity = root && isPlainObject(root.voiceIdentity) ? (root.voiceIdentity as AnyRecord) : null;
  const voiceChars = voiceIdentity && isPlainObject(voiceIdentity.voiceCharacteristics) ? (voiceIdentity.voiceCharacteristics as AnyRecord) : null;
  const expertiseDomain = root && isPlainObject(root.expertiseDomain) ? (root.expertiseDomain as AnyRecord) : null;
  const primaryExpertise = expertiseDomain && Array.isArray(expertiseDomain.primary)
    ? (expertiseDomain.primary as unknown[]).filter((v) => typeof v === "string") as string[]
    : [];

  const compact = {
    id: opts.leaderId ?? pickString(meta, "leaderId"),
    vertical: pickString(meta, "vertical"),
    subDomains: Array.isArray(meta?.subDomains) ? (meta?.subDomains as unknown[]).filter((v) => typeof v === "string").slice(0, 6) : undefined,
    expertiseDomain: primaryExpertise.slice(0, 5),
    tagline: pickString(core, "tagline"),
    positioning: pickString(core, "positioning"),
    missionStatement: pickString(core, "missionStatement"),
    archetype: pickString(visualStyle, "archetype") ?? pickString(visual, "archetype"),
    styleNotes: pickString(visualStyle, "styleNotes") ?? pickString(visualStyle, "wardrobe"),
    voiceSummary: pickString(voice, "summary"),
    doSay: Array.isArray(voice?.doSay) ? (voice?.doSay as unknown[]).filter((v) => typeof v === "string").slice(0, 5) : undefined,
    dontSay: Array.isArray(voice?.dontSay) ? (voice?.dontSay as unknown[]).filter((v) => typeof v === "string").slice(0, 5) : undefined,
    catchphrases: Array.isArray(voice?.catchphrases) ? (voice?.catchphrases as unknown[]).filter((v) => typeof v === "string").slice(0, 5) : undefined,
    spokenAccent: pickString(voiceChars, "spokenAccent"),
  };

  const leaderContext = safeJsonStringify(compact, 6000);

  const system = [
    "You are a world-class prompt engineer for cinematic AI video generation.",
    "You MUST follow the style guide exactly to keep outputs consistent across many different leaders.",
    "Write the prompt as NATURAL LANGUAGE, but prioritize the spoken line and performance above everything else.",
    "The prompt should read like: what this person says, how they say it, and the minimal visuals that support it.",
    "Your prompt must be a SINGLE PARAGRAPH with SHORT SENTENCES (2–4 sentences).",
    "CRITICAL: Refer to the subject ONLY as 'this person' (NEVER use a name, NEVER use 'he' or 'she', always 'this person').",
    "CRITICAL: Your prompt MUST start with: 'Match the provided reference image. This person...'",
    "Include exactly ONE short spoken line for this person, written in quotes, and do not include any other quoted text.",
    "The spoken line MUST be first-person and MUST communicate what this person helps with using their EXPERTISE DOMAINS (e.g., 'I help you with blockchain technology and smart contracts' NOT 'I help you with Blockchain Innovator').",
    "CRITICAL: Use expertiseDomain fields to describe WHAT they help with, NOT the tagline (tagline is their role/title). Format: 'I help you with [expertise1, expertise2, and expertise3]' or 'I help you [action based on positioning]'.",
    "Keep the spoken line to 8–16 words. No hype. No clichés. No promises of riches.",
    "IMPORTANT: Do NOT mention duration, seconds, 5s/10s, or timing anywhere in the prompt.",
    "IMPORTANT: Do NOT include any on-screen text. No captions. No subtitles. No logos. No watermarks.",
    "Keep visuals minimal and supportive: at most 1–2 abstract expertise-related visual aids (no readable text, no logos).",
    "Avoid unnecessary cinematography jargon and micro-details (no 'catchlights', 'filmic grade', 'clean blacks', etc).",
    "Avoid beat labeling (no 'opening beat', 'second beat', etc).",
    "Return ONLY valid JSON, no markdown, no commentary.",
    'JSON schema: {"prompt": string, "negativePrompt": string}.',
    "The prompt should be under 90 words.",
  ].join("\n");

  const user = [
    "STYLE GUIDE:",
    STYLE_GUIDE,
    "",
    "LEADER CONTEXT (compact JSON):",
    leaderContext,
    "",
    "Task:",
    "- Produce a single paragraph prompt for a talking-head intro video where the main point is what this person says.",
    "- Dialogue: include exactly ONE spoken line in quotes. Format: 'I help you with [EXPERTISE]' or 'I help you [ACTION]' (8-16 words). CRITICAL: Use expertiseDomain array to describe WHAT they help with (e.g., 'I help you with blockchain technology, smart contracts, and decentralization' NOT 'I help you with Blockchain Innovator'). The tagline describes WHO they are (their role/title), NOT what they help with. Use positioning/mission for the ACTION verb if not using expertiseDomain. Match tone using voice/doSay/catchphrases.",
    "- Performance: specify tone, pacing, and expression so lip-sync feels natural (e.g., calm, confident, warm; direct-to-camera). If spokenAccent is provided, incorporate it naturally (e.g., 'speaking English with a subtle Japanese accent').",
    "- Visuals: keep the scene minimal and non-distracting. ONLY if it clearly supports the expertise, include at most 1–2 abstract visual aids behind/around this person (examples: bitcoin → warm gold coin motif / abstract ledger glow; finance → faint chart-line light patterns; healthcare → abstract pulse waveform light). No readable text/logos.",
    "- Camera/lighting: keep it simple (stable framing; gentle push-in or slight orbit). No technical jargon.",
    "- Identity: anchor strictly to the reference image (same face/hair/age/wardrobe vibe). Single subject only.",
    "- End with an explicit 'Avoid:' clause in the same paragraph covering: on-screen text/subtitles/logos/watermarks, extra people, glitches/warping, distorted faces.",
    "- Do NOT include the leader's name, and do NOT include any JSON in the prompt itself.",
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as unknown;
  const content =
    isPlainObject(data) &&
    Array.isArray(data.choices) &&
    isPlainObject(data.choices[0]) &&
    isPlainObject((data.choices[0] as AnyRecord).message) &&
    typeof ((data.choices[0] as AnyRecord).message as AnyRecord).content === "string"
      ? (((data.choices[0] as AnyRecord).message as AnyRecord).content as string)
      : null;

  if (!content) throw new Error("OpenAI response missing message content");

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("OpenAI returned non-JSON content");
  }

  const prompt =
    isPlainObject(parsed) && typeof parsed.prompt === "string" && parsed.prompt.trim()
      ? parsed.prompt.trim()
      : null;
  const negativePrompt =
    isPlainObject(parsed) && typeof parsed.negativePrompt === "string" && parsed.negativePrompt.trim()
      ? parsed.negativePrompt.trim()
      : undefined;

  if (!prompt) throw new Error("OpenAI JSON missing prompt");

  return {
    prompt: simplifyKlingPrompt(prompt),
    negativePrompt:
      negativePrompt ??
      "text, subtitles, captions, watermark, logo, brand, illustration, cartoon, anime, 3d render, CGI, low quality, blurry, distorted face, deformed anatomy, extra people, multiple faces, clones, noisy background, political symbols, weapons, gore",
    styleId: STYLE_ID,
  };
}

export function buildKlingTrailerPrompt(opts: { leaderJson: unknown; leaderId?: string }): KlingTrailerPromptResult {
  const root = isPlainObject(opts.leaderJson) ? opts.leaderJson : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as AnyRecord) : null;
  const visualStyle = visual && isPlainObject(visual.visualStyle) ? (visual.visualStyle as AnyRecord) : null;
  const comm = root && isPlainObject(root.communicationStyle) ? (root.communicationStyle as AnyRecord) : null;
  const voice = comm && isPlainObject(comm.voice) ? (comm.voice as AnyRecord) : null;
  const voiceIdentity = root && isPlainObject(root.voiceIdentity) ? (root.voiceIdentity as AnyRecord) : null;
  const voiceChars = voiceIdentity && isPlainObject(voiceIdentity.voiceCharacteristics) ? (voiceIdentity.voiceCharacteristics as AnyRecord) : null;
  const spokenAccent = pickString(voiceChars, "spokenAccent");
  const expertiseDomain = root && isPlainObject(root.expertiseDomain) ? (root.expertiseDomain as AnyRecord) : null;
  const primaryExpertise = expertiseDomain && Array.isArray(expertiseDomain.primary)
    ? (expertiseDomain.primary as unknown[]).filter((v) => typeof v === "string") as string[]
    : [];

  const compactLeaderInfo = {
    id: opts.leaderId ?? pickString(meta, "leaderId"),
    // Intentionally exclude leader name from prompts; we always refer to "this person".
    tagline: pickString(core, "tagline"),
    missionStatement: pickString(core, "missionStatement"),
    vertical: pickString(meta, "vertical"),
    expertiseDomain: primaryExpertise.slice(0, 5),
    archetype: pickString(visualStyle, "archetype") ?? pickString(visual, "archetype"),
    styleNotes: pickString(visualStyle, "styleNotes") ?? pickString(visualStyle, "wardrobe"),
    voiceSummary: pickString(voice, "summary"),
    doSay: Array.isArray(voice?.doSay) ? (voice?.doSay as unknown[]).filter((v) => typeof v === "string").slice(0, 3) : undefined,
    catchphrases: Array.isArray(voice?.catchphrases)
      ? (voice?.catchphrases as unknown[]).filter((v) => typeof v === "string").slice(0, 3)
      : undefined,
    spokenAccent,
  };

  const leaderContext = safeJsonStringify(compactLeaderInfo, 2000);

  const mission = pickString(core, "missionStatement");
  const catchphrases = Array.isArray(voice?.catchphrases)
    ? (voice?.catchphrases as unknown[]).filter((v) => typeof v === "string") as string[]
    : [];
  const doSay = Array.isArray(voice?.doSay)
    ? (voice?.doSay as unknown[]).filter((v) => typeof v === "string") as string[]
    : [];
  const tagline = pickString(core, "tagline");

  const spokenLine = (() => {
    // Prefer first-person mission lines (common in your sample bibles).
    const m = mission?.trim();
    const t = tagline?.trim();
    const c0 = catchphrases[0]?.trim();
    const d0 = doSay[0]?.trim();

    // If mission already contains an explicit help statement, use it.
    if (m && /\bi help\b/i.test(m)) return m;

    // Try to coerce mission/tagline into a short "who + help" line.
    // We keep it simple and safe; the OpenAI path is preferred for nuance.
    if (m && /^(i|we)\b/i.test(m)) {
      // If it's too long, shorten to a generic but aligned help statement.
      if (m.split(/\s+/).length <= 16) return m;
      return "I help you make smart, calm decisions in your domain.";
    }

    if (d0 && /\bi help\b/i.test(d0)) return d0;
    if (c0 && /\bi help\b/i.test(c0)) return c0;

    // Fall back: construct a help statement using expertise domains
    // Tagline describes WHO they are, positioning describes HOW, expertise describes WHAT
    const positioning = pickString(core, "positioning");
    const vertical = pickString(meta, "vertical");

    // PRIORITY 1: Use expertise domains to construct "I help you with X, Y, and Z"
    if (primaryExpertise.length > 0) {
      const expertiseList = primaryExpertise.slice(0, 3).map((e) => e.toLowerCase());
      if (expertiseList.length === 1) {
        return `I help you with ${expertiseList[0]}.`;
      } else if (expertiseList.length === 2) {
        return `I help you with ${expertiseList[0]} and ${expertiseList[1]}.`;
      } else {
        const last = expertiseList.pop();
        return `I help you with ${expertiseList.join(", ")}, and ${last}.`;
      }
    }

    // PRIORITY 2: Use positioning to describe what they help with
    if (positioning && positioning.split(/\s+/).length <= 12) {
      return `I help you ${positioning.toLowerCase()}.`;
    }

    // PRIORITY 3: Use vertical + generic help phrase
    if (vertical && vertical.split(/\s+/).length <= 3) {
      return `I help you navigate ${vertical.toLowerCase()} with clarity and confidence.`;
    }

    // LAST RESORT: Generic help statement
    return "I help you get clarity and take the next best step.";
  })();

  // Build accent clause for the spoken line if provided
  const accentClause = spokenAccent ? `, speaking English with a ${spokenAccent}` : "";

  // Deterministic, consistent prompt shell. We avoid calling an LLM here so style stays predictable.
  const prompt = [
    "Cinematic character intro video. Photorealistic, high-end film look, 24fps, square 1:1 aspect ratio.",
    "Use the provided reference image to keep this person's identity strictly consistent (same face, hair, age, wardrobe vibe). Single subject only.",
    "Three beats:",
    `(1) Opening: intimate close-up; subtle dolly-in; confident, approachable expression; clean catchlights; minimal abstract background. This person looks into camera${accentClause} and says:`,
    `"${spokenLine}"`,
    "(2) Competence moment: medium shot; smooth orbit; subtle domain-relevant action gesture (no props with logos); modern minimal environment.",
    "(3) Hero: waist-up hero pose; gentle push-in; calm power; tasteful rim light; cinematic grade. This person ends with a grounded, confident expression after speaking.",
    "No text, no logos, no watermarks, no extra people, no distortions, no surreal elements.",
    `Leader context (for subtle cues only): ${leaderContext}`,
  ].join(" ");

  return {
    prompt,
    negativePrompt:
      "text, subtitles, captions, watermark, logo, brand, illustration, cartoon, anime, 3d render, CGI, low quality, blurry, distorted face, deformed anatomy, extra people, multiple faces, clones, noisy background, political symbols, weapons, gore",
    styleId: STYLE_ID,
  };
}

type ReplicateModel = {
  latest_version?: { id?: string; openapi_schema?: unknown };
};

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: unknown;
  logs?: unknown;
};

type OpenApiSchema = AnyRecord;

function extractInputPropertyKeysFromOpenApi(schema: unknown): string[] {
  // best-effort: schema.components.schemas.Input.properties
  const root = isPlainObject(schema) ? (schema as OpenApiSchema) : null;
  const components = root && isPlainObject(root.components) ? (root.components as AnyRecord) : null;
  const schemas = components && isPlainObject(components.schemas) ? (components.schemas as AnyRecord) : null;
  const input = schemas && isPlainObject(schemas.Input) ? (schemas.Input as AnyRecord) : null;
  const props = input && isPlainObject(input.properties) ? (input.properties as AnyRecord) : null;
  return props ? Object.keys(props) : [];
}

function pickFirstKey(keys: string[], preferred: string[]): string | null {
  const set = new Set(keys.map((k) => k.toLowerCase()));
  for (const p of preferred) {
    if (set.has(p.toLowerCase())) {
      // return original cased key
      const found = keys.find((k) => k.toLowerCase() === p.toLowerCase());
      if (found) return found;
    }
  }
  return null;
}

function pickImageKey(keys: string[]): string | null {
  // Common names across image/video models on Replicate
  const preferred = [
    "image",
    "input_image",
    "init_image",
    "reference_image",
    "ref_image",
    "image_url",
  ];
  const direct = pickFirstKey(keys, preferred);
  if (direct) return direct;

  // Fallback: any key containing 'image'
  const any = keys.find((k) => k.toLowerCase().includes("image"));
  return any ?? null;
}

export async function createKlingTrailerPrediction(opts: {
  prompt: string;
  negativePrompt?: string;
  imageUrl?: string;
  leaderId?: string;
  durationSeconds?: number;
  aspectRatio?: string;
}): Promise<{ predictionId: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  const modelOwner = "kwaivgi";
  const modelName = "kling-v2.6";
  const modelRes = await fetch(`https://api.replicate.com/v1/models/${modelOwner}/${modelName}`, {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!modelRes.ok) {
    const text = await modelRes.text().catch(() => "");
    throw new Error(`Replicate model lookup failed (${modelRes.status}): ${text || modelRes.statusText}`);
  }

  const modelJson = (await modelRes.json()) as ReplicateModel;
  const latestVersion =
    modelJson?.latest_version && typeof modelJson.latest_version.id === "string" ? modelJson.latest_version.id : null;
  const openapi = modelJson?.latest_version?.openapi_schema ?? null;
  if (!latestVersion) throw new Error("Replicate model lookup missing latest_version.id");

  const inputKeys = extractInputPropertyKeysFromOpenApi(openapi);

  const promptKey = pickFirstKey(inputKeys, ["prompt", "text_prompt", "positive_prompt"]) ?? "prompt";
  const negativePromptKey = pickFirstKey(inputKeys, ["negative_prompt", "neg_prompt", "negativePrompt"]);
  const imageKey = pickImageKey(inputKeys);
  const durationKey = pickFirstKey(inputKeys, ["duration", "seconds", "num_seconds", "video_length"]);
  const aspectKey = pickFirstKey(inputKeys, ["aspect_ratio", "aspectRatio"]);
  const seedKey = pickFirstKey(inputKeys, ["seed", "random_seed"]);

  const input: AnyRecord = {
    [promptKey]: opts.prompt,
  };
  if (negativePromptKey && opts.negativePrompt) input[negativePromptKey] = opts.negativePrompt;
  if (imageKey && opts.imageUrl) input[imageKey] = opts.imageUrl;
  if (durationKey) input[durationKey] = opts.durationSeconds ?? 10;
  if (aspectKey) input[aspectKey] = opts.aspectRatio ?? "1:1";
  if (seedKey) input[seedKey] = hashStringToSeed(opts.leaderId ?? "profilemaker");

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: `${modelOwner}/${modelName}:${latestVersion}`,
      input,
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Replicate create prediction failed (${createRes.status}): ${text || createRes.statusText}`);
  }

  const created = (await createRes.json()) as ReplicatePrediction;
  if (!created?.id) throw new Error("Replicate create prediction missing id");
  return { predictionId: created.id };
}

export async function getKlingTrailerPrediction(predictionId: string): Promise<{
  id: string;
  status: ReplicatePrediction["status"];
  outputUrl: string | null;
  error: string | null;
}> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!pollRes.ok) {
    const text = await pollRes.text().catch(() => "");
    throw new Error(`Replicate poll failed (${pollRes.status}): ${text || pollRes.statusText}`);
  }

  const prediction = (await pollRes.json()) as ReplicatePrediction;
  const outputUrl = prediction.status === "succeeded" ? normalizeReplicateOutputToUrl(prediction.output) : null;
  const error =
    prediction.status === "failed" || prediction.status === "canceled"
      ? typeof prediction.error === "string"
        ? prediction.error
        : "Replicate failed"
      : null;

  return {
    id: prediction.id,
    status: prediction.status,
    outputUrl,
    error,
  };
}


