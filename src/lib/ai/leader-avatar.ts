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

function pickStringArray(obj: AnyRecord | null, key: string, max = 20): string[] | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x) => typeof x === "string").map((s) => (s as string).trim()).filter(Boolean);
  return out.length ? out.slice(0, max) : undefined;
}

function includesAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

export type LeaderAvatarPromptResult = {
  prompt: string;
  negativePrompt?: string;
  styleId: string;
  isFamousPerson: boolean;
};

const STYLE_ID = "pmk.avatar.v2";

const NEGATIVE_PROMPT = "illustration, cartoon, anime, 3d render, CGI, painterly, stylized, unrealistic skin, beauty filter, overprocessed, text, watermark, logo, signature, blurry, low quality, extra faces, extra heads, cropped head, out of frame, distorted anatomy, deformed hands, nsfw";

/**
 * Extracts visual attributes from the Leader Bible schema and builds a structured prompt
 * for Nano Banana image generation.
 */
function buildVisualAttributesPrompt(opts: {
  physical: AnyRecord | null;
  visualStyle: AnyRecord | null;
  isRegeneration?: boolean;
}): string {
  const { physical, visualStyle, isRegeneration } = opts;

  // Extract physical attributes
  const apparentAge = pickString(physical, "apparentAge");
  const genderPresentation = pickString(physical, "genderPresentation");
  const ethnicity = pickString(physical, "ethnicity");
  const buildBodyType = pickString(physical, "buildBodyType");
  const facialFeatures = pickString(physical, "facialFeatures");
  const typicalAttire = pickString(physical, "typicalAttire");
  const distinguishingFeatures = pickStringArray(physical, "distinguishingFeatures");

  // Extract hair attributes
  const hair = physical && isPlainObject(physical.hair) ? (physical.hair as AnyRecord) : null;
  let hairColor = pickString(hair, "color");
  let hairStyle = pickString(hair, "style");
  let hairLength = pickString(hair, "length");

  // Extract eye attributes
  const eyes = physical && isPlainObject(physical.eyes) ? (physical.eyes as AnyRecord) : null;
  let eyeColor = pickString(eyes, "color");
  const eyeFeatures = pickString(eyes, "notableFeatures");

  // Extract style attributes
  const moodEnergy = pickString(visualStyle, "moodEnergy");

  // Extract color palette for accent colors
  const colorPalette = visualStyle && isPlainObject(visualStyle.colorPalette)
    ? (visualStyle.colorPalette as AnyRecord)
    : null;
  const primaryColors = Array.isArray(colorPalette?.primary)
    ? (colorPalette.primary as Array<{ name?: string; hex?: string }>)
    : [];
  const accentColor = primaryColors[0]?.name || primaryColors[0]?.hex;

  // When regenerating, add variation while keeping ethnicity/gender consistent
  if (isRegeneration) {
    // Randomize hair color/style for variety
    const hairColors = ["black", "dark brown", "brown", "light brown", "auburn", "blonde", "gray", "salt and pepper"];
    const hairStyles = ["straight", "wavy", "curly", "slicked back", "messy", "styled", "natural"];
    const hairLengths = ["short", "medium", "long", "shoulder-length"];
    const eyeColors = ["brown", "dark brown", "hazel", "blue", "green", "amber"];

    hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    hairStyle = hairStyles[Math.floor(Math.random() * hairStyles.length)];
    hairLength = hairLengths[Math.floor(Math.random() * hairLengths.length)];
    eyeColor = eyeColors[Math.floor(Math.random() * eyeColors.length)];
  }
  
  // Build the structured prompt parts
  const parts: string[] = [];
  
  // Core subject description
  parts.push("Professional photorealistic studio headshot");
  
  // Physical appearance
  if (genderPresentation) {
    const genderTerm = genderPresentation.toLowerCase() === "male" ? "man" 
      : genderPresentation.toLowerCase() === "female" ? "woman" 
      : "person";
    
    if (ethnicity && apparentAge) {
      parts.push(`${ethnicity} ${genderTerm} in their ${apparentAge.toLowerCase().replace("early ", "early-").replace("late ", "late-").replace("mid ", "mid-")}`);
    } else if (apparentAge) {
      parts.push(`${genderTerm} in their ${apparentAge.toLowerCase()}`);
    } else if (ethnicity) {
      parts.push(`${ethnicity} ${genderTerm}`);
    } else {
      parts.push(genderTerm);
    }
  }
  
  // Build type
  if (buildBodyType) {
    parts.push(buildBodyType.toLowerCase());
  }
  
  // Hair description
  const hairParts: string[] = [];
  if (hairColor) hairParts.push(hairColor.toLowerCase());
  if (hairLength) hairParts.push(hairLength.toLowerCase());
  if (hairStyle) hairParts.push(hairStyle.toLowerCase());
  if (hairParts.length > 0) {
    parts.push(`${hairParts.join(" ")} hair`);
  }
  
  // Eyes description
  const eyeParts: string[] = [];
  if (eyeColor) eyeParts.push(eyeColor.toLowerCase());
  if (eyeFeatures) eyeParts.push(eyeFeatures.toLowerCase());
  if (eyeParts.length > 0) {
    parts.push(`${eyeParts.join(", ")} eyes`);
  }
  
  // Facial features
  if (facialFeatures) {
    parts.push(facialFeatures.toLowerCase());
  }
  
  // Attire
  if (typicalAttire) {
    parts.push(`wearing ${typicalAttire.toLowerCase()}`);
  }
  
  // Distinguishing features
  if (distinguishingFeatures && distinguishingFeatures.length > 0) {
    parts.push(distinguishingFeatures.slice(0, 3).join(", ").toLowerCase());
  }
  
  // Mood/expression
  if (moodEnergy) {
    parts.push(`${moodEnergy.toLowerCase()} expression`);
  } else {
    parts.push("confident approachable expression");
  }
  
  // Accent color from palette
  if (accentColor && typicalAttire) {
    parts.push(`subtle ${accentColor.toLowerCase()} accent`);
  }
  
  // Technical specifications (always include)
  parts.push("85mm portrait lens");
  parts.push("soft key light with subtle rim light");
  parts.push("clean neutral gray gradient background");
  parts.push("head and shoulders framing");
  parts.push("looking at camera");
  parts.push("high detail");
  parts.push("natural skin texture");
  
  return parts.join(", ");
}

/**
 * Builds a descriptive prompt for famous people
 */
function buildFamousPersonPrompt(name: string, vertical?: string): string {
  const parts: string[] = [];
  
  parts.push(`Professional photorealistic studio headshot of ${name} as they would look in real life`);
  parts.push("authentic likeness");
  parts.push("confident approachable expression");
  parts.push("85mm portrait lens");
  parts.push("soft key light with subtle rim light");
  parts.push("clean neutral gray gradient background");
  parts.push("head and shoulders framing");
  parts.push("looking at camera");
  parts.push("high detail");
  parts.push("natural skin texture");
  
  if (vertical) {
    parts.push(`professional ${vertical.toLowerCase()} leader aesthetic`);
  }
  
  return parts.join(", ");
}

/**
 * Detects if a leader is based on a famous person.
 * Primary: checks the `basedOnFamousPerson` boolean field in coreIdentity
 * Fallback: checks tags for backward compatibility
 */
function isFamousPersonProfile(basedOnFamousPerson: boolean | undefined, tags: string[]): boolean {
  // Primary check: explicit boolean field
  if (typeof basedOnFamousPerson === "boolean") {
    return basedOnFamousPerson;
  }
  
  // Fallback: check tags for backward compatibility
  const famousTags = [
    "based-on-real-person",
    "based-on-fictional-character", 
    "public-figure",
    "real-person",
    "celebrity",
    "historical-figure",
    "not-affiliated", // Usually indicates it's based on someone real
  ];
  
  if (tags.some((t) => famousTags.some((ft) => includesAny(t, [ft])))) {
    return true;
  }
  
  // If explicitly marked as fictional, it's not a famous person
  if (tags.some((t) => includesAny(t, ["fictional", "archetype", "ai-generated"]))) {
    return false;
  }
  
  return false;
}

export async function generateAvatarPromptWithOpenAI(opts: {
  leaderJson: unknown;
  leaderId?: string;
  isRegeneration?: boolean;
}): Promise<LeaderAvatarPromptResult> {
  const root = isPlainObject(opts.leaderJson) ? opts.leaderJson : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as AnyRecord) : null;
  const meta = root && isPlainObject(root.metadata) ? (root.metadata as AnyRecord) : null;
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as AnyRecord) : null;
  const physical = visual && isPlainObject(visual.physicalDescription) ? (visual.physicalDescription as AnyRecord) : null;
  const visualStyle = visual && isPlainObject(visual.visualStyle) ? (visual.visualStyle as AnyRecord) : null;

  const tags = pickStringArray(meta, "tags") ?? [];
  const name = pickString(core, "name");
  const vertical = pickString(meta, "vertical");

  // Check the basedOnFamousPerson field (primary) or fall back to tags
  const basedOnFamousPerson = core && typeof core.basedOnFamousPerson === "boolean"
    ? core.basedOnFamousPerson
    : undefined;

  // Determine if this is a famous person
  const isFamous = isFamousPersonProfile(basedOnFamousPerson, tags);

  let prompt: string;

  if (isFamous && name) {
    // For famous people, just use the name - Nano Banana knows them
    prompt = buildFamousPersonPrompt(name, vertical);
  } else {
    // For fictional/non-famous leaders, build detailed prompt from visual attributes
    // Pass isRegeneration flag to add variety when regenerating
    prompt = buildVisualAttributesPrompt({ physical, visualStyle, isRegeneration: opts.isRegeneration });
  }

  return {
    prompt,
    negativePrompt: NEGATIVE_PROMPT,
    styleId: STYLE_ID,
    isFamousPerson: isFamous,
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

/**
 * Check if an error indicates sensitive content was flagged
 */
function isSensitiveContentError(error: unknown): boolean {
  const errorStr = error instanceof Error ? error.message : String(error);
  const sensitiveKeywords = [
    "sensitive",
    "nsfw",
    "safety",
    "content policy",
    "content_policy",
    "blocked",
    "inappropriate",
    "violates",
    "moderation",
    "filtered",
    "rejected",
    "not allowed",
  ];
  const lowerError = errorStr.toLowerCase();
  return sensitiveKeywords.some((kw) => lowerError.includes(kw));
}

/**
 * Fallback image generation using prunaai/z-image-turbo model
 * Used when primary model flags content as sensitive
 */
async function generateAvatarWithFallbackModel(opts: {
  prompt: string;
  aspectRatio?: string;
}): Promise<{ imageUrl: string; predictionId: string; usedFallback: boolean }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  // Determine dimensions based on aspect ratio
  let width = 768;
  let height = 768;
  if (opts.aspectRatio === "16:9") {
    width = 1024;
    height = 576;
  } else if (opts.aspectRatio === "9:16") {
    width = 576;
    height = 1024;
  } else if (opts.aspectRatio === "4:3") {
    width = 896;
    height = 672;
  } else if (opts.aspectRatio === "3:4") {
    width = 672;
    height = 896;
  }

  // Use the run endpoint for simpler interaction with prunaai/z-image-turbo
  const createRes = await fetch("https://api.replicate.com/v1/models/prunaai/z-image-turbo/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      "Prefer": "wait",
    },
    body: JSON.stringify({
      input: {
        prompt: opts.prompt,
        width,
        height,
      },
    }),
  });

  if (!createRes.ok) {
    const text = await createRes.text().catch(() => "");
    throw new Error(`Fallback model failed (${createRes.status}): ${text || createRes.statusText}`);
  }

  const result = (await createRes.json()) as ReplicatePrediction;
  
  // If the prediction is still processing, poll for completion
  if (result.status === "starting" || result.status === "processing") {
    const deadline = Date.now() + 60_000; // 60s timeout for fallback
    let prediction = result;
    
    while (prediction.status === "starting" || prediction.status === "processing") {
      if (Date.now() > deadline) throw new Error("Fallback model timed out");
      await new Promise((r) => setTimeout(r, 1000));

      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });
      if (!pollRes.ok) {
        const text = await pollRes.text().catch(() => "");
        throw new Error(`Fallback poll failed (${pollRes.status}): ${text || pollRes.statusText}`);
      }
      prediction = (await pollRes.json()) as ReplicatePrediction;
    }

    if (prediction.status !== "succeeded") {
      const err = typeof prediction.error === "string" ? prediction.error : "Fallback model failed";
      throw new Error(err);
    }

    const url = normalizeReplicateOutputToUrl(prediction.output);
    if (!url) throw new Error("Fallback model succeeded but returned no image URL");
    return { imageUrl: url, predictionId: prediction.id, usedFallback: true };
  }

  if (result.status !== "succeeded") {
    const err = typeof result.error === "string" ? result.error : "Fallback model failed";
    throw new Error(err);
  }

  const url = normalizeReplicateOutputToUrl(result.output);
  if (!url) throw new Error("Fallback model succeeded but returned no image URL");

  return { imageUrl: url, predictionId: result.id, usedFallback: true };
}

/**
 * Primary image generation using google/imagen-3 model
 */
async function generateAvatarWithPrimaryModel(opts: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  outputFormat?: string;
}): Promise<{ imageUrl: string; predictionId: string }> {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");

  // Fetch latest version so we don't hard-code version IDs.
  const modelOwner = "google";
  const modelName = "imagen-3";
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

  const deadline = Date.now() + 90_000; // 90s timeout
  let prediction: ReplicatePrediction = created;
  while (prediction.status === "starting" || prediction.status === "processing") {
    if (Date.now() > deadline) throw new Error("Replicate prediction timed out");
    await new Promise((r) => setTimeout(r, 1500));

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

export async function generateAvatarWithReplicate(opts: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string; // e.g. "1:1"
  outputFormat?: string; // e.g. "png"
}): Promise<{ imageUrl: string; predictionId: string; usedFallback?: boolean }> {
  try {
    // Try primary model first (google/imagen-3)
    const result = await generateAvatarWithPrimaryModel(opts);
    return { ...result, usedFallback: false };
  } catch (primaryError) {
    // If content was flagged as sensitive, try fallback model
    if (isSensitiveContentError(primaryError)) {
      console.log("[Avatar] Primary model flagged sensitive content, trying fallback model (prunaai/z-image-turbo)");
      try {
        return await generateAvatarWithFallbackModel({
          prompt: opts.prompt,
          aspectRatio: opts.aspectRatio,
        });
      } catch (fallbackError) {
        // If fallback also fails, throw the fallback error
        throw fallbackError;
      }
    }
    // For non-sensitive errors, just re-throw the original error
    throw primaryError;
  }
}
