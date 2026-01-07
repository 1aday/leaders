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

export type LeaderAvatarPromptResult = {
  prompt: string;
  negativePrompt?: string;
  styleId: string;
};

const STYLE_ID = "pmk.avatar.v1";

const STYLE_GUIDE = [
  "Create a single, stunning PHOTOREALISTIC head-and-shoulders portrait for use as a leader profile picture.",
  "Primary goals: (1) instantly communicates what the leader is about, (2) looks cohesive in a grid next to other leaders.",
  "",
  "CONSISTENT PHOTO DIRECTION (do not vary):",
  "- photorealistic professional studio headshot (NOT illustration, NOT 3D render)",
  "- lens + framing: 85mm portrait lens look, head + upper shoulders, centered, head fully in frame (no crops)",
  "- lighting: soft key light + subtle rim light, clean catchlights, natural skin texture, high detail",
  "- background: simple neutral studio gradient (light gray → darker gray), no scenery, no props, no text",
  "- expression: confident, approachable, subtle personality; looking at camera",
  "- wardrobe: modern, tasteful, aligned to leader vertical; minimal accessories",
  "",
  "CUSTOMIZE PER-LEADER (vary only these):",
  "- subtle styling cues that reflect the leader's domain (e.g., healthcare, defense, fintech) via wardrobe color/accent",
  "- a restrained accent color drawn from the leader's palette (if provided), applied subtly (tie, lapel, shirt edge)",
  "",
  "ABSOLUTE PROHIBITIONS:",
  "- no logos, no brand marks, no watermark, no text, no busy backgrounds, no extra people, no exaggerated stylization",
  "- safe-for-work only",
].join("\n");

export async function generateAvatarPromptWithOpenAI(opts: {
  leaderJson: unknown;
  leaderId?: string;
}): Promise<LeaderAvatarPromptResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_MODEL || "gpt-5.2";
  const root = isPlainObject(opts.leaderJson) ? opts.leaderJson : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as AnyRecord) : null;
  const visualStyle = visual && isPlainObject(visual.visualStyle) ? (visual.visualStyle as AnyRecord) : null;
  const colorPalette = visualStyle && isPlainObject(visualStyle.colorPalette) ? (visualStyle.colorPalette as AnyRecord) : null;

  const compactLeaderInfo = {
    id: opts.leaderId ?? pickString(meta, "leaderId"),
    name: pickString(core, "name"),
    tagline: pickString(core, "tagline"),
    missionStatement: pickString(core, "missionStatement"),
    vertical: pickString(meta, "vertical"),
    archetype: pickString(visualStyle, "archetype") ?? pickString(visual, "archetype"),
    wardrobe: pickString(visualStyle, "wardrobe") ?? pickString(visualStyle, "styleNotes"),
    // keep only a small amount of palette data to avoid overfitting / token bloat
    palettePrimary: Array.isArray(colorPalette?.primary) ? colorPalette?.primary : undefined,
  };

  const leaderContext = safeJsonStringify(compactLeaderInfo, 6000);

  const system = [
    "You are a world-class visual prompt engineer.",
    "You MUST follow the provided style guide exactly to ensure visual consistency across a gallery.",
    "Return ONLY valid JSON, no markdown, no commentary.",
    'JSON schema: {"prompt": string, "negativePrompt": string}.',
    "The prompt must be a single paragraph, under 120 words.",
    "The prompt should read like instructions to a high-end portrait photographer and should explicitly include: photorealistic, studio headshot, neutral gray gradient background, 85mm lens look, soft key + rim light, and consistent framing.",
  ].join("\n");

  const user = [
    "STYLE GUIDE:",
    STYLE_GUIDE,
    "",
    "LEADER (compact JSON):",
    leaderContext,
    "",
    "Task: Write a single image-generation prompt for this leader's profile picture that preserves the shared style.",
    "Do not include any names in the image (no text).",
    "If details are missing, make tasteful, generic assumptions.",
  ].join("\n");

  // Use Chat Completions for widest compatibility with model naming.
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
    prompt,
    negativePrompt:
      negativePrompt ??
      "illustration, cartoon, anime, 3d render, CGI, painterly, stylized, unrealistic skin, beauty filter, overprocessed, text, watermark, logo, signature, blurry, low quality, extra faces, extra heads, cropped head, out of frame, distorted anatomy, deformed hands",
    styleId: STYLE_ID,
  };
}

type ReplicatePrediction = {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: unknown;
  error: unknown;
};

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

export async function generateAvatarWithReplicate(opts: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string; // e.g. "1:1"
  outputFormat?: string; // e.g. "png"
}): Promise<{ imageUrl: string; predictionId: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  // Fetch latest version so we don't hard-code version IDs.
  const modelOwner = "google";
  const modelName = "nano-banana-pro";
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

  const modelJson = (await modelRes.json()) as AnyRecord;
  const latestVersion =
    isPlainObject(modelJson.latest_version) && typeof modelJson.latest_version.id === "string"
      ? (modelJson.latest_version.id as string)
      : null;
  if (!latestVersion) throw new Error("Replicate model lookup missing latest_version.id");

  const createRes = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: `${modelOwner}/${modelName}:${latestVersion}`,
      input: {
        prompt: opts.prompt,
        ...(opts.negativePrompt ? { negative_prompt: opts.negativePrompt } : {}),
        aspect_ratio: opts.aspectRatio ?? "1:1",
        output_format: opts.outputFormat ?? "png",
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Replicate create prediction failed (${createRes.status}): ${text || createRes.statusText}`);
  }

  const created = (await createRes.json()) as ReplicatePrediction;
  if (!created?.id) throw new Error("Replicate create prediction missing id");

  const deadline = Date.now() + 60_000; // 60s
  let prediction: ReplicatePrediction = created;
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() > deadline) throw new Error("Replicate prediction timed out");
    await new Promise((r) => setTimeout(r, 1000));

    const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${created.id}`, {
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
    prediction = (await pollRes.json()) as ReplicatePrediction;
  }

  if (prediction.status !== "succeeded") {
    const err = typeof prediction.error === "string" ? prediction.error : "Replicate failed";
    throw new Error(err);
  }

  const url = normalizeReplicateOutputToUrl(prediction.output);
  if (!url) throw new Error("Replicate succeeded but returned no image URL");

  return { imageUrl: url, predictionId: prediction.id };
}


