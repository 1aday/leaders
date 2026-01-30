"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  FileJson2,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, calculateCompositeScore } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";
import { createLeader, updateLeader, deriveLeaderSummary } from "@/lib/db/leader-client";

// Simple JSON syntax highlighter with pretty-printing
function JsonSyntaxHighlight({ json }: { json: string }) {
  // First, try to pretty-print the JSON
  let formatted: string;
  try {
    const parsed = JSON.parse(json);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    formatted = json;
  }
  
  const tokens: React.ReactNode[] = [];
  let i = 0;
  const len = formatted.length;
  let tokenKey = 0;
  
  while (i < len) {
    const char = formatted[i];
    
    // Whitespace
    if (/\s/.test(char)) {
      let ws = '';
      while (i < len && /\s/.test(formatted[i])) {
        ws += formatted[i];
        i++;
      }
      tokens.push(<span key={tokenKey++}>{ws}</span>);
      continue;
    }
    
    // String
    if (char === '"') {
      let str = '"';
      i++;
      while (i < len && formatted[i] !== '"') {
        if (formatted[i] === '\\' && i + 1 < len) {
          str += formatted[i] + formatted[i + 1];
          i += 2;
        } else {
          str += formatted[i];
          i++;
        }
      }
      str += '"';
      i++;
      
      // Check if it's a key (followed by colon)
      let j = i;
      while (j < len && /\s/.test(formatted[j])) j++;
      const isKey = formatted[j] === ':';
      
      if (isKey) {
        tokens.push(<span key={tokenKey++} className="text-sky-600 dark:text-sky-400 font-medium">{str}</span>);
      } else {
        tokens.push(<span key={tokenKey++} className="text-emerald-600 dark:text-emerald-400">{str}</span>);
      }
      continue;
    }
    
    // Number
    if (/[0-9-]/.test(char)) {
      let num = '';
      while (i < len && /[0-9.eE+-]/.test(formatted[i])) {
        num += formatted[i];
        i++;
      }
      tokens.push(<span key={tokenKey++} className="text-amber-600 dark:text-amber-400">{num}</span>);
      continue;
    }
    
    // Boolean/null
    if (formatted.slice(i, i + 4) === 'true') {
      tokens.push(<span key={tokenKey++} className="text-violet-600 dark:text-violet-400 font-medium">true</span>);
      i += 4;
      continue;
    }
    if (formatted.slice(i, i + 5) === 'false') {
      tokens.push(<span key={tokenKey++} className="text-violet-600 dark:text-violet-400 font-medium">false</span>);
      i += 5;
      continue;
    }
    if (formatted.slice(i, i + 4) === 'null') {
      tokens.push(<span key={tokenKey++} className="text-rose-500 dark:text-rose-400 font-medium">null</span>);
      i += 4;
      continue;
    }
    
    // Punctuation
    if (/[{}\[\]:,]/.test(char)) {
      tokens.push(<span key={tokenKey++} className="text-muted-foreground/70">{char}</span>);
      i++;
      continue;
    }
    
    // Other
    tokens.push(<span key={tokenKey++}>{char}</span>);
    i++;
  }
  
  return <>{tokens}</>;
}

// Extract identity from parsed JSON
function extractIdentity(parsed: unknown) {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const core = p.coreIdentity as Record<string, unknown> | undefined;
  const meta = p.metadata as Record<string, unknown> | undefined;
  const scores = meta?.leadershipScores as Record<string, unknown> | undefined;
  
  // Calculate composite score from individual scores instead of trusting AI-generated value
  const character = typeof scores?.character === "number" ? scores.character : undefined;
  const competence = typeof scores?.competence === "number" ? scores.competence : undefined;
  const impact = typeof scores?.impact === "number" ? scores.impact : undefined;
  const jobsRuleMultiplier = typeof scores?.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier : 1.0;
  const compositeScore = calculateCompositeScore(character, competence, impact, jobsRuleMultiplier);
  
  return {
    name: (core?.name as string) || "Untitled Leader",
    tagline: core?.tagline as string | undefined,
    leaderId: meta?.leaderId as string | undefined,
    vertical: meta?.vertical as string | undefined,
    tier: scores?.tier as string | undefined,
    compositeScore,
    missionStatement: core?.missionStatement as string | undefined,
  };
}

export function NewLeaderApp() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const [raw, setRaw] = React.useState("");
  const [parsed, setParsed] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [showTextarea, setShowTextarea] = React.useState(false);
  const [showGenerator, setShowGenerator] = React.useState(false);
  const [genName, setGenName] = React.useState("");
  const [genDescription, setGenDescription] = React.useState("");
  const [webSearchEnabled, setWebSearchEnabled] = React.useState(false);
  const [findPhotosEnabled, setFindPhotosEnabled] = React.useState(false);
  const [referenceImages, setReferenceImages] = React.useState<Array<{
    url: string;
    thumbnail: string;
    title: string;
    source: string;
  }>>([]);
  const [selectedImageIndex, setSelectedImageIndex] = React.useState<number | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = React.useState<string | null>(null);
  const selectedImageUrlRef = React.useRef<string | null>(null); // Backup ref - NEVER gets cleared accidentally
  const [savingImage] = React.useState(false); // No longer used - instant selection now
  const [imageSelectionStage, setImageSelectionStage] = React.useState<
    "idle" | "fetching" | "selecting" | "selected"
  >("idle");
  const [generating, setGenerating] = React.useState(false);
  const [generatingMode, setGeneratingMode] = React.useState<"random" | "custom" | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [genProgress, setGenProgress] = React.useState(0);
  const [maxGenProgress, setMaxGenProgress] = React.useState(0);
  const [genStage, setGenStage] = React.useState<"waiting" | "streaming" | null>(null);
  const [researchStage, setResearchStage] = React.useState<{
    active: boolean;
    sourcesFound: number;
    message: string;
  } | null>(null);
  const [researchResults, setResearchResults] = React.useState<{
    keyFacts: string[];
    achievements: string[];
    expertise: string[];
    sources: Array<{ title: string; url: string }>;
  } | null>(null);
  const [genStartTime, setGenStartTime] = React.useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = React.useState(0);
  const [previewTab, setPreviewTab] = React.useState<"overview" | "json" | "research">("overview");
  const [editingJson, setEditingJson] = React.useState(false);

  // Smooth interpolated progress (animates towards genProgress)
  const [displayProgress, setDisplayProgress] = React.useState(0);

  React.useEffect(() => {
    if (genProgress === displayProgress) return;

    // Smooth interpolation - move 10% of the distance every 50ms
    const interval = setInterval(() => {
      setDisplayProgress((current) => {
        const diff = genProgress - current;
        if (Math.abs(diff) < 0.5) {
          return genProgress;
        }
        return current + diff * 0.15;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [genProgress, displayProgress]);

  // Update elapsed time ticker when generating
  React.useEffect(() => {
    if (!generating || !genStartTime) return;

    const interval = setInterval(() => {
      setElapsedTime((Date.now() - genStartTime) / 1000);
    }, 100);

    return () => clearInterval(interval);
  }, [generating, genStartTime]);

  // Parse JSON with debounce
  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      if (!raw.trim()) {
        setParsed(null);
        setError(null);
        return;
      }
      const result = safeJsonParse(raw);
      if (result.ok) {
        setParsed(result.value);
        setError(null);
      } else {
        setParsed(null);
        setError(result.error);
      }
    }, 150);
    return () => window.clearTimeout(handle);
  }, [raw]);

  const identity = React.useMemo(() => extractIdentity(parsed), [parsed]);
  const canSave = !!parsed && !error;

  // File handling
  const handleFile = React.useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        setRaw(content);
        setShowTextarea(false);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileSelect = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // Fetch images with debounce - wait for user to stop typing
  React.useEffect(() => {
    // Clear images immediately when toggle is disabled
    if (!findPhotosEnabled) {
      setReferenceImages([]);
      setSelectedImageIndex(null);
      setSelectedImageUrl(null);
      selectedImageUrlRef.current = null; // Also clear ref
      setImageSelectionStage("idle");
      return;
    }

    // Don't fetch if name is empty or already generating
    if (!genName.trim() || generating) {
      return;
    }

    // Debounce: wait 800ms after user stops typing
    const debounceTimer = setTimeout(() => {
      console.log('[Images] Starting fetch for:', genName);

      // Only reset if user hasn't selected an image yet
      // Once selected, keep it unless toggle is disabled
      if (imageSelectionStage !== "selected") {
        setImageSelectionStage("fetching");
        setReferenceImages([]);
        setSelectedImageIndex(null);
        setSelectedImageUrl(null);
      } else {
        console.log('[Images] Keeping existing selection, skipping new fetch');
        return; // Don't fetch new images if already selected
      }

      fetch("/api/leader/fetch-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: genName.trim(),
          description: genDescription.trim() || undefined,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errorText = await res.text();
            console.error('[Images] API error:', res.status, errorText);
            throw new Error(`API returned ${res.status}: ${errorText}`);
          }
          return res.json();
        })
        .then(data => {
          console.log('[Images] Response data:', data);
          if (data.error) {
            console.error('[Images] API returned error:', data.error);
            setImageSelectionStage("idle");
            return;
          }
          if (data.images && Array.isArray(data.images) && data.images.length > 0) {
            console.log('[Images] Successfully received', data.images.length, 'images');
            setReferenceImages(data.images);
            setImageSelectionStage("selecting");
          } else {
            console.warn('[Images] No images returned');
            setImageSelectionStage("idle");
          }
        })
        .catch(error => {
          console.error('[Images] Fetch failed:', error);
          setImageSelectionStage("idle");
        });
    }, 800); // 800ms debounce

    return () => clearTimeout(debounceTimer);
  }, [findPhotosEnabled, genName, genDescription, generating]);

  // Helper function to save image selection
  const continueGenerationWithImage = React.useCallback(async (imageUrl: string) => {
    console.log("[Image Selection] 📸 User clicked image:", imageUrl);

    try {
      let originalUrl = imageUrl;

      // Extract original URL from proxy if needed
      if (imageUrl.startsWith("/api/proxy-image")) {
        const params = new URLSearchParams(imageUrl.split("?")[1]);
        const extracted = params.get("url");

        if (extracted) {
          originalUrl = extracted;
          console.log("[Image Selection] ✅ Extracted original URL from proxy:", originalUrl);
        } else {
          throw new Error("Failed to extract URL from proxy");
        }
      }

      // Validate URL
      if (!originalUrl || typeof originalUrl !== "string" || !originalUrl.startsWith("http")) {
        console.error("[Image Selection] ❌ Invalid URL:", originalUrl);
        throw new Error("Invalid image URL");
      }

      console.log("[Image Selection] ✅ Selected:", originalUrl);

      // Store the original URL - we'll upload to Supabase later during generation
      // This avoids Supabase timeout issues when displaying the selected image
      setImageSelectionStage("selected");
      setSelectedImageUrl(originalUrl); // Store original URL for now
      selectedImageUrlRef.current = originalUrl;
      console.log("[Image Selection] ✅ Stored original URL:", originalUrl);
    } catch (e) {
      console.error("Failed to save image:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to save image";
      setGenError(`⚠️ ${errorMsg}`);
      // Clear selection on error
      setImageSelectionStage("selecting");
      setSelectedImageUrl(null);
      selectedImageUrlRef.current = null;
      setSelectedImageIndex(null);
    }
  }, [genName]);

  // Helper function to skip image selection
  const continueGenerationWithoutImage = React.useCallback(async () => {
    try {
      await fetch("/api/leader/select-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: String(genStartTime),
          selectedImageUrl: null,
        }),
      });
      setImageSelectionStage("idle");
      setReferenceImages([]);
      setSelectedImageIndex(null);
      console.log("[UI] Image selection skipped");
    } catch (e) {
      console.error("Failed to skip image selection:", e);
    }
  }, [genStartTime]);

  const handleGenerate = React.useCallback(async (forceRandom = false) => {
    console.log('[GENERATE] ===== BUTTON CLICKED =====');
    console.log('[GENERATE] forceRandom:', forceRandom);
    console.log('[GENERATE] generating state BEFORE:', generating);
    console.log('[GENERATE] generatingMode BEFORE:', generatingMode);

    setGenError(null);
    setGenProgress(0);
    setDisplayProgress(0);
    setMaxGenProgress(0);
    setGenStage("waiting");
    setResearchStage(null);
    setResearchResults(null);
    // DON'T reset selected image - keep it visible during generation
    setGenStartTime(Date.now());
    const name = forceRandom ? "" : genName.trim();
    const description = forceRandom ? "" : genDescription.trim();
    const useWebSearch = !forceRandom && webSearchEnabled && name.length > 0;

    console.log('[GENERATE] name:', name);
    console.log('[GENERATE] useWebSearch:', useWebSearch);
    console.log('[GENERATE] webSearchEnabled:', webSearchEnabled);
    console.log('[GENERATE] findPhotosEnabled:', findPhotosEnabled);
    console.log('[GENERATE] selectedImageUrl:', selectedImageUrl);

    // ❌ VALIDATION: If user enabled "Find reference photos", they MUST select an image first
    const hasSelectedImage = selectedImageUrl || selectedImageUrlRef.current;
    if (findPhotosEnabled && !hasSelectedImage && !forceRandom) {
      console.error('[GENERATE] ❌ BLOCKED: findPhotosEnabled=true but no image selected');
      console.error('[GENERATE]   - selectedImageUrl state:', selectedImageUrl);
      console.error('[GENERATE]   - selectedImageUrlRef.current:', selectedImageUrlRef.current);
      setGenError("⚠️ Please select a reference image first, or disable 'Find reference photos'");
      return; // DON'T proceed
    }

    if (findPhotosEnabled && hasSelectedImage) {
      console.log('[GENERATE] ✅ VALIDATED: User selected image:', hasSelectedImage);
    }

    setGenerating(true);
    setGeneratingMode(forceRandom ? "random" : "custom");

    console.log('[GENERATE] State set, about to start fetch...');

    // Simulate research progress if web search enabled
    let researchProgressInterval: NodeJS.Timeout | null = null;
    if (useWebSearch) {
      console.log('[UI] Web search enabled, initializing research stage');
      // Initialize research stage immediately so progress bar shows
      setResearchStage({
        active: true,
        sourcesFound: 0,
        message: `Researching ${name} on the web...`,
      });
      console.log('[UI] Research stage initialized, starting progress simulation');

      let simulatedProgress = 0;
      researchProgressInterval = setInterval(() => {
        // Gradually increase to 45% over ~35 seconds
        // Slower at start, faster in middle, slower near end
        simulatedProgress += Math.random() * 2;
        if (simulatedProgress > 45) simulatedProgress = 45;
        setGenProgress(simulatedProgress);
        console.log('[UI] Simulated progress:', simulatedProgress);
      }, 500);
      console.log('[UI] Interval created with ID:', researchProgressInterval);
    }

    try {
      console.log('[GENERATE] Starting fetch to /api/leader/generate');
      // Use ref as backup if state is somehow null (shouldn't happen but defensive)
      const imageUrlToSend = selectedImageUrl || selectedImageUrlRef.current;

      console.log('[GENERATE] 📊 State before sending:');
      console.log('[GENERATE]   - selectedImageUrl (state):', selectedImageUrl);
      console.log('[GENERATE]   - selectedImageUrl (ref):', selectedImageUrlRef.current);
      console.log('[GENERATE]   - selectedImageUrl (final):', imageUrlToSend);
      console.log('[GENERATE]   - selectedImageIndex:', selectedImageIndex);
      console.log('[GENERATE]   - imageSelectionStage:', imageSelectionStage);
      console.log('[GENERATE]   - referenceImages count:', referenceImages.length);
      console.log('[GENERATE]   - savingImage:', savingImage);

      // CRITICAL: If user already selected an image, DON'T fetch new ones
      // This prevents the backend from clearing the selection with a new images_fetching event
      const shouldFetchPhotos = findPhotosEnabled && !imageUrlToSend && genName.trim().length > 0;

      const requestBody = {
        name,
        description,
        webSearch: useWebSearch,
        findReferencePhotos: shouldFetchPhotos, // Only fetch if NO image selected yet
        selectedImageUrl: imageUrlToSend || undefined, // Pass selected image directly
      };

      console.log('[GENERATE] 📤 Request body:', requestBody);
      console.log('[GENERATE] 📤 Request body.selectedImageUrl:', requestBody.selectedImageUrl);
      console.log('[GENERATE] 📤 Stringified body:', JSON.stringify(requestBody));

      const res = await fetch("/api/leader/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log('[GENERATE] Fetch completed, status:', res.status);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      console.log('[GENERATE] Getting reader from response body...');
      const reader = res.body?.getReader();
      console.log('[GENERATE] Reader obtained:', reader ? 'YES' : 'NO');
      if (!reader) throw new Error("No response body");

      console.log('[GENERATE] Starting SSE stream reading...');
      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCount = 0;
      let streamComplete = false;

      while (true && !streamComplete) {
        const { done, value } = await reader.read();
        chunkCount++;
        console.log('[GENERATE] Chunk', chunkCount, '- done:', done, ', bytes:', value?.length);
        if (done) {
          console.log('[GENERATE] Stream ended after', chunkCount, 'chunks');
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const messages = buffer.split("\n\n");
        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || "";

        console.log('[GENERATE] Chunk has', messages.length, 'complete messages');

        for (const message of messages) {
          const lines = message.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;

            // SSE data lines start with "data: "
            if (line.startsWith("data: ")) {
              const jsonStr = line.substring(6).trim();
              if (!jsonStr) continue;

              try {
                const json = JSON.parse(jsonStr) as {
                  type: string;
                  percentage?: number;
                  leader?: unknown;
                  leaderId?: string;
                  selectedImageUrl?: string;
                  error?: string;
                  stage?: string;
                  message?: string;
                  sourcesFound?: number;
                  keyFacts?: string[];
                  achievements?: string[];
                  expertise?: string[];
                  sources?: Array<{ title: string; url: string }>;
                  rawSummary?: string;
                  images?: Array<{
                    url: string;
                    thumbnail: string;
                    title: string;
                    source: string;
                  }>;
                };

                console.log('[SSE] Message type:', json.type);

                if (json.type === "stage") {
                  console.log('[UI] Stage message received:', json);
                  // Handle stage transitions
                  if (json.stage === "research") {
                    console.log('[UI] Setting research stage to active');
                    setResearchStage({
                      active: true,
                      sourcesFound: 0,
                      message: json.message || "Researching...",
                    });
                  } else if (json.stage === "generation") {
                    console.log('[UI] Transitioning to generation stage');
                    // Clear research progress simulation
                    if (researchProgressInterval) {
                      clearInterval(researchProgressInterval);
                      researchProgressInterval = null;
                    }

                    if (researchStage) {
                      setResearchStage({
                        ...researchStage,
                        active: false,
                      });
                    }
                    setGenStage("streaming");
                  }
                } else if (json.type === "research_complete") {
                  console.log('[UI] Research complete, showing 100%', json);
                  // Clear research progress simulation
                  if (researchProgressInterval) {
                    clearInterval(researchProgressInterval);
                    researchProgressInterval = null;
                  }

                  // Show research at 100% completion
                  setGenProgress(50);

                  // Research completion with results
                  const sourcesCount = json.sourcesFound || json.sources?.length || 0;
                  console.log('[UI] Sources found:', sourcesCount);
                  setResearchStage((prev) =>
                    prev
                      ? {
                          ...prev,
                          active: false, // Mark as inactive but keep data for display
                          sourcesFound: sourcesCount,
                          message: json.message || `Research complete`,
                        }
                      : null
                  );

                  // Store research results - parse rawSummary if available
                  let keyFacts = json.keyFacts || [];
                  let achievements = json.achievements || [];
                  let expertise = json.expertise || [];

                  // CLIENT-SIDE PARSER for rawSummary
                  if (json.rawSummary && (keyFacts.length === 0 || achievements.length === 0)) {
                    const lines = json.rawSummary.split('\n');
                    let section: string | null = null;
                    let item = "";

                    const save = () => {
                      const cleaned = item.trim();
                      if (cleaned.length >= 30) {
                        if (section === "facts") keyFacts.push(cleaned);
                        else if (section === "achievements") achievements.push(cleaned);
                        else if (section === "expertise") expertise.push(cleaned);
                      }
                      item = "";
                    };

                    for (const line of lines) {
                      const trimmed = line.trim();
                      if (!trimmed) { save(); continue; }

                      if (/^##.*Key Facts/i.test(trimmed)) { save(); section = "facts"; }
                      else if (/^##.*Achievement/i.test(trimmed)) { save(); section = "achievements"; }
                      else if (/^##.*Expertise/i.test(trimmed)) { save(); section = "expertise"; }
                      else if (section && trimmed.startsWith("-")) {
                        const isIndented = line.startsWith("  ");
                        if (isIndented) {
                          item += (item ? " " : "") + trimmed.substring(1).trim();
                        } else {
                          save();
                        }
                      } else if (section) {
                        item += (item ? " " : "") + trimmed;
                      }
                    }
                    save();
                    console.log('[CLIENT PARSER] Extracted:', keyFacts.length, 'facts,', achievements.length, 'achievements,', expertise.length, 'expertise');
                  }

                  if (keyFacts.length > 0 || achievements.length > 0 || expertise.length > 0) {
                    setResearchResults({
                      keyFacts,
                      achievements,
                      expertise,
                      sources: json.sources || [],
                    });
                  }
                } else if (json.type === "research_failed") {
                  // Clear research progress simulation
                  if (researchProgressInterval) {
                    clearInterval(researchProgressInterval);
                    researchProgressInterval = null;
                  }

                  // Research failed, continue anyway
                  setResearchStage(null);
                  setGenStage("streaming");
                } else if (json.type === "images_fetching") {
                  console.log('[UI] Images fetching started');
                  // DON'T clear selected image if user already selected one
                  if (!selectedImageUrl && !selectedImageUrlRef.current) {
                    setImageSelectionStage("fetching");
                  }
                } else if (json.type === "images_ready") {
                  console.log('[UI] Images ready:', json.images?.length);
                  // DON'T overwrite selected image if user already selected one
                  if (!selectedImageUrl && !selectedImageUrlRef.current) {
                    if (json.images && json.images.length > 0) {
                      setReferenceImages(json.images);
                      setImageSelectionStage("selecting");
                    } else {
                      setImageSelectionStage("idle");
                    }
                  }
                } else if (json.type === "images_failed") {
                  console.log('[UI] Image search failed');
                  // DON'T clear selected image if user already selected one
                  if (!selectedImageUrl && !selectedImageUrlRef.current) {
                    setImageSelectionStage("idle");
                  }
                } else if (json.type === "progress") {
                  const percentage = Math.min(99, Math.max(0, Math.round(json.percentage || 0)));

                  // Skip the initial 1% signal from API (only show when streaming really starts)
                  const shouldSkipInitial = percentage === 1 && !researchStage?.active && genProgress === 0;
                  if (shouldSkipInitial) {
                    console.log('[Progress] Skipping initial 1% signal - continuing stream');
                  } else {
                    // Only move progress forward (never backwards) for smooth UX
                    setMaxGenProgress((prev) => {
                      const newMax = Math.max(prev, percentage);
                      setGenProgress(newMax);
                      return newMax;
                    });

                    // Transition to streaming stage once we get real progress (if not in research)
                    if (percentage > 2 && !researchStage?.active && genStage !== "streaming") {
                      setGenStage("streaming");
                    }
                  }
                } else if (json.type === "complete") {
                  console.log('[SSE] ✅ Generation complete, finishing stream');
                  const leader = json.leader;
                  if (!leader) throw new Error("API returned no leader JSON");

                  setRaw(JSON.stringify(leader, null, 2));
                  setShowGenerator(false);
                  setShowTextarea(false);
                  setPreviewTab("json");
                  setEditingJson(false);
                  setGenProgress(100);
                  setResearchStage(null);

                  // Get leaderId and selectedImageUrl from response
                  const leaderId = json.leaderId;
                  const imageUrlFromResponse = json.selectedImageUrl;

                  console.log('[Navigation] 📦 Complete event data:');
                  console.log('[Navigation]   - leaderId:', leaderId);
                  console.log('[Navigation]   - selectedImageUrl from response:', imageUrlFromResponse);
                  console.log('[Navigation]   - selectedImageUrl from state:', selectedImageUrl);
                  console.log('[Navigation]   - selectedImageUrl from ref:', selectedImageUrlRef.current);

                  if (leaderId && typeof leaderId === 'string') {
                    console.log('[Navigation] ✅ Navigating to leader detail page:', leaderId);

                    // Build URL with avatar generation params
                    const params = new URLSearchParams({ generating: 'avatar' });

                    // Use selectedImageUrl from multiple sources (response > state > ref)
                    const finalImageUrl = imageUrlFromResponse || selectedImageUrl || selectedImageUrlRef.current;

                    if (finalImageUrl) {
                      console.log('[Navigation] 📸 Adding referenceImageUrl to params:', finalImageUrl);
                      params.set('referenceImageUrl', finalImageUrl);
                    } else {
                      console.warn('[Navigation] ⚠️  NO reference image URL found');
                    }

                    const finalUrl = `/leaders/${leaderId}?${params.toString()}`;
                    console.log('[Navigation] 🚀 Final URL:', finalUrl);

                    // Navigate immediately - avatar will be generated on detail page
                    router.push(finalUrl);
                  } else {
                    console.warn('[Navigation] No leaderId in response');
                  }

                  // Signal to exit the stream reading loop
                  streamComplete = true;
                } else if (json.type === "error") {
                  throw new Error(json.error || "Unknown error");
                }
              } catch (parseError) {
                console.warn("Failed to parse SSE message:", jsonStr, parseError);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[GENERATE] ===== ERROR CAUGHT =====');
      console.error('[GENERATE] Error:', e);
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error('[GENERATE] Error message:', msg);

      // Parse error into user-friendly message
      let userFriendlyError = msg;
      if (msg.includes('rate limit') || msg.includes('429')) {
        userFriendlyError = 'Rate limited. Please wait a moment and try again.';
      } else if (msg.includes('timeout') || msg.includes('timed out')) {
        userFriendlyError = 'Request timed out. Please try again.';
      } else if (msg.includes('network') || msg.includes('Network') || msg.includes('Failed to fetch')) {
        userFriendlyError = 'Network error. Check your connection and try again.';
      } else if (msg.includes('Invalid JSON') || msg.includes('Unexpected token')) {
        userFriendlyError = 'Invalid response from server. Please try again.';
      } else if (msg.includes('403') || msg.includes('Forbidden')) {
        userFriendlyError = 'Access denied. Please try again or contact support.';
      }

      setGenError(userFriendlyError);
      setGenProgress(0);
      setGenStage(null);
      setResearchStage(null);

      // Clear research progress interval on error
      if (researchProgressInterval) {
        clearInterval(researchProgressInterval);
      }
    } finally {
      console.log('[GENERATE] ===== FINALLY BLOCK =====');
      console.log('[GENERATE] Setting generating to false');
      setGenerating(false);
      setGeneratingMode(null);

      // Clear research progress interval on completion
      if (researchProgressInterval) {
        clearInterval(researchProgressInterval);
      }
    }
  }, [genName, genDescription, webSearchEnabled, researchStage]);

  const handleSave = React.useCallback(async () => {
    if (!parsed) return;
    setSaving(true);

    try {
      await new Promise((r) => setTimeout(r, 400));
      const summary = deriveLeaderSummary(parsed, raw);

      // Create leader in database
      const { leaderId, leaderKey } = await createLeader(raw);

      // Auto-generate avatar after saving leader
      try {
        const avatarRes = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leaderRawJson: raw,
            leaderId: leaderId,
            aspectRatio: "1:1",
            outputFormat: "png",
          }),
        });

        if (avatarRes.ok) {
          const avatarData = await avatarRes.json() as { profilePicUrl?: string };
          if (avatarData.profilePicUrl) {
            // Update the leader with the avatar URL
            const urlWithCacheBust = avatarData.profilePicUrl + (avatarData.profilePicUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;

            // Update raw JSON to include profilePicUrl in coreIdentity
            try {
              const leaderJson = JSON.parse(raw) as Record<string, unknown>;
              if (!leaderJson.coreIdentity || typeof leaderJson.coreIdentity !== 'object') {
                leaderJson.coreIdentity = {};
              }
              (leaderJson.coreIdentity as Record<string, unknown>).profilePicUrl = urlWithCacheBust;

              const updatedRawJson = JSON.stringify(leaderJson, null, 2);

              // Update in database
              await updateLeader(leaderKey, updatedRawJson, {
                profilePicUrl: urlWithCacheBust,
              });
            } catch (e) {
              console.warn('[Auto-Avatar] Failed to update leader with avatar URL:', e);
            }
          }
        }
      } catch (e) {
        // Avatar generation is best-effort, don't block navigation
        console.warn('[Auto-Avatar] Failed to generate avatar:', e);
      }

      // Navigate to detail page
      router.push(`/leaders/${encodeURIComponent(leaderKey)}`);
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Failed to save leader");
      console.error("Failed to save leader:", e);
    }
  }, [parsed, raw, router]);

  const reset = React.useCallback(() => {
    setRaw("");
    setParsed(null);
    setError(null);
    setShowTextarea(false);
    setShowGenerator(false);
    setGenError(null);
    setPreviewTab("overview");
    setEditingJson(false);
  }, []);

  // Has valid data to show preview
  const hasData = !!identity;

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-accent/[0.02]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,120,60,0.08),transparent)]" />
      </div>

      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Gallery</span>
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-sm font-medium text-foreground">New Leader</h1>
          </div>

          {hasData && (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={reset}>
                Start over
              </Button>
              <Button
                size="sm"
                disabled={!canSave || saving}
                onClick={handleSave}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save to Gallery
                    <ArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {!hasData ? (
          /* ========== IMPORT STAGE ========== */
          <div className="mx-auto max-w-2xl">
            {/* Hero */}
            <div className="mb-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
                Create a Leader
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
                Upload JSON, generate with AI, or start from our sample schema.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              className={cn(
                "relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-200",
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : error
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-border/60 bg-card/50 hover:border-primary/40 hover:bg-card",
              )}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              {showTextarea ? (
                /* Textarea mode */
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Paste JSON
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => setShowTextarea(false)}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={raw}
                    onChange={(e) => setRaw(e.target.value)}
                    placeholder='{"coreIdentity": {"name": "..."}}'
                    className={cn(
                      "h-64 w-full resize-none rounded-xl border bg-background p-4",
                      "font-mono text-sm leading-relaxed",
                      "placeholder:text-muted-foreground/40",
                      "outline-none focus:ring-2 focus:ring-primary/20",
                      error && "border-destructive/50",
                    )}
                    autoFocus
                    spellCheck={false}
                  />
                  {error && (
                    <p className="mt-2 text-sm text-destructive">{error}</p>
                  )}
                </div>
              ) : showGenerator ? (
                /* Generator mode */
                <div className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Generate Leader Bible
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={() => { setShowGenerator(false); setGenError(null); }}
                      disabled={generating || savingImage}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {/* Random Generation - prominent option */}
                    <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
                      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground">Want a surprise?</div>
                          <div className="text-xs text-muted-foreground">
                            Generate a random leader aligned with our values—finance, health, tech, education, and more.
                          </div>
                        </div>
                        <Button
                          variant="default"
                          className="gap-2 rounded-full"
                          onClick={() => void handleGenerate(true)}
                          disabled={generating || savingImage}
                        >
                          {generatingMode === "random" ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                              {Math.round(displayProgress) > 0 ? `${Math.round(displayProgress)}%` : "Generating..."}
                            </>
                          ) : (
                            <>
                              <Zap className="h-4 w-4" />
                              Random Leader
                            </>
                          )}
                        </Button>
                      </div>
                      {generatingMode === "random" && (
                        <div className="mt-3 space-y-3">
                          {researchStage?.active ? (
                            /* Research Stage: Active web search with progress */
                            <div className="space-y-3 animate-in fade-in duration-300">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                  <span className="text-foreground font-medium">
                                    {researchStage.message}
                                  </span>
                                </div>
                                <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                  {Math.round(displayProgress)}%
                                </span>
                              </div>
                              {/* Progress bar with amber theme */}
                              <div className="relative h-2.5 overflow-hidden rounded-full bg-amber-500/10">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 ease-out"
                                  style={{ width: `${displayProgress}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <div className="space-y-0.5">
                                  <p className="text-amber-600 dark:text-amber-400 font-medium">
                                    🔍 Searching web sources...
                                  </p>
                                  <p className="text-muted-foreground/70">
                                    Gathering biographical info, achievements, expertise
                                  </p>
                                </div>
                                <span className="text-muted-foreground/70 shrink-0 ml-2">
                                  {elapsedTime.toFixed(1)}s
                                </span>
                              </div>
                            </div>
                          ) : researchStage && !researchStage.active ? (
                            /* Research Complete + JSON Generation Progress */
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                              {/* Research Complete Section */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Check className="h-4 w-4 text-emerald-500" />
                                    <span className="text-muted-foreground">
                                      {researchStage.message}
                                    </span>
                                  </div>
                                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    {researchStage.sourcesFound} sources • 100%
                                  </span>
                                </div>
                                <Progress value={100} className="h-2 bg-emerald-500/10">
                                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                                </Progress>
                              </div>

                              {/* JSON Generation Progress Section */}
                              <div className="space-y-2 border-t border-border/60 pt-3">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-foreground font-medium">
                                      Generating Leader Bible...
                                    </span>
                                  </div>
                                  <span className="font-semibold tabular-nums text-primary">
                                    {Math.round((displayProgress - 50) * 2)}%
                                  </span>
                                </div>
                                <Progress
                                  value={(displayProgress - 50) * 2}
                                  className="h-2.5"
                                />
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    Using research insights...
                                  </span>
                                  <span className="text-muted-foreground/70">
                                    {elapsedTime.toFixed(1)}s total
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : genStage === "waiting" ? (
                            /* Stage 1: Waiting for first token */
                            <div className="space-y-3 animate-in fade-in duration-300">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground animate-pulse">
                                  Connecting to OpenAI...
                                </span>
                                <span className="text-xs text-muted-foreground/60">
                                  {elapsedTime.toFixed(1)}s
                                </span>
                              </div>
                              {/* Shimmer effect progress bar */}
                              <div className="relative h-2 overflow-hidden rounded-full bg-muted/30">
                                <div className="absolute inset-0 shimmer" />
                              </div>
                              <p className="text-xs text-muted-foreground/70">
                                Initializing AI model (typically ~0.7s)
                              </p>
                            </div>
                          ) : (
                            /* Stage 2: Streaming with real progress */
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  <span className="text-foreground font-medium">
                                    Generating Leader Bible...
                                  </span>
                                </div>
                                <span className="font-semibold tabular-nums text-primary">
                                  {Math.round(displayProgress) > 0 ? `${Math.round(displayProgress)}%` : "..."}
                                </span>
                              </div>
                              <Progress
                                value={Math.max(1, displayProgress)}
                                className="h-2.5"
                              />
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Streaming JSON schema...
                                </span>
                                <span className="text-muted-foreground/70">
                                  {elapsedTime.toFixed(1)}s elapsed
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative flex items-center py-2">
                      <div className="flex-1 border-t border-border/60" />
                      <span className="px-3 text-xs text-muted-foreground">or customize</span>
                      <div className="flex-1 border-t border-border/60" />
                    </div>

                    <input
                      value={genName}
                      onChange={(e) => setGenName(e.target.value)}
                      placeholder="Leader name (optional)"
                      className={cn(
                        "h-10 w-full rounded-xl border bg-background px-3 text-sm",
                        "outline-none focus:ring-2 focus:ring-primary/20",
                        genError && "border-destructive/50",
                      )}
                      disabled={generating || savingImage}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !generating) {
                          e.preventDefault();
                          void handleGenerate(false);
                        }
                      }}
                    />

                    {/* Web Search Toggle */}
                    <div
                      className={cn(
                        "rounded-xl border border-border/60 bg-card/50 p-3 transition-colors",
                        !genName.trim() || generating
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-card/80 hover:border-border"
                      )}
                      onClick={() => {
                        if (!generating && genName.trim()) {
                          setWebSearchEnabled(!webSearchEnabled);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="webSearchToggle"
                          checked={webSearchEnabled}
                          onChange={(e) => setWebSearchEnabled(e.target.checked)}
                          disabled={generating || !genName.trim()}
                          className="mt-0.5 h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20 pointer-events-none"
                          tabIndex={-1}
                        />
                        <div className="flex-1">
                          <div
                            className={cn(
                              "block text-sm font-medium",
                              !genName.trim()
                                ? "text-muted-foreground/50"
                                : "text-foreground"
                            )}
                          >
                            🌐 Enable Web Search
                          </div>
                          <p className={cn(
                            "mt-1 text-xs",
                            !genName.trim()
                              ? "text-muted-foreground/40"
                              : "text-muted-foreground"
                          )}>
                            Research current biographical info from the web for accuracy. Adds ~2-3 seconds.
                            {!genName.trim() && (
                              <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Requires a leader name to enable
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reference Photos Toggle */}
                    <div
                      className={cn(
                        "rounded-xl border border-border/60 bg-card/50 p-3 transition-colors",
                        !genName.trim() || generating
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-card/80"
                      )}
                      onClick={() => {
                        if (!generating && genName.trim()) {
                          setFindPhotosEnabled(!findPhotosEnabled);
                        }
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="findPhotosToggle"
                          checked={findPhotosEnabled}
                          onChange={(e) => setFindPhotosEnabled(e.target.checked)}
                          disabled={generating || !genName.trim()}
                          className="mt-0.5 h-4 w-4 rounded border-border bg-background text-primary focus:ring-2 focus:ring-primary/20 pointer-events-none"
                          tabIndex={-1}
                        />
                        <div className="flex-1">
                          <div
                            className={cn(
                              "block text-sm font-medium",
                              !genName.trim()
                                ? "text-muted-foreground/50"
                                : "text-foreground"
                            )}
                          >
                            📸 Find reference photos
                          </div>
                          <p
                            className={cn(
                              "mt-1 text-xs",
                              !genName.trim()
                                ? "text-muted-foreground/40"
                                : "text-muted-foreground"
                            )}
                          >
                            Search for photos to use as visual reference for avatar generation. You'll select one before generation continues.
                            {!genName.trim() && (
                              <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                                ⚠️ Requires a leader name to enable
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Image Selection Gallery - Appears when images are ready */}
                    {(imageSelectionStage === "selecting" || imageSelectionStage === "selected") && referenceImages.length > 0 && !generating && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl border border-border/60 bg-card/50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                              <span className="text-sm">📸</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                Select Reference Photo
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Found {referenceImages.length} images • Scroll to see more
                              </div>
                            </div>
                          </div>
                          {imageSelectionStage === "selecting" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void continueGenerationWithoutImage()}
                              className="h-7 gap-1.5 rounded-full text-xs"
                            >
                              <X className="h-3 w-3" />
                              Skip
                            </Button>
                          )}
                        </div>

                        {/* Show selected image prominently after selection */}
                        {selectedImageIndex !== null && imageSelectionStage === "selected" ? (
                          <div className="space-y-3">
                            <div className="flex items-center justify-center">
                              <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-lg max-w-[240px] w-full aspect-square">
                                <img
                                  src={referenceImages[selectedImageIndex].thumbnail}
                                  alt={referenceImages[selectedImageIndex].title}
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute top-2 right-2 rounded-full bg-primary p-2 shadow-lg">
                                  <Check className="h-5 w-5 text-primary-foreground" />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
                              <Check className="h-4 w-4 text-primary" />
                              <span className="text-xs text-foreground">
                                Using this photo as reference for avatar generation
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setSelectedImageIndex(null);
                                setSelectedImageUrl(null);
                                selectedImageUrlRef.current = null; // Also clear ref
                                setImageSelectionStage("selecting");
                              }}
                              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-2 min-h-[44px] flex items-center justify-center"
                            >
                              Change selection
                            </button>
                          </div>
                        ) : (
                          <>
                            {/* Scrollable image grid */}
                            <div className="relative -mx-1 overflow-x-auto pb-2 scroll-smooth scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                              <div className="flex gap-2 px-1 min-[400px]:gap-2.5 sm:gap-3">
                                {referenceImages.map((img, i) => (
                                  <button
                                    key={i}
                                    disabled={savingImage} // Disable all images while saving
                                    onClick={() => {
                                      if (!savingImage) {
                                        setSelectedImageIndex(i);
                                        void continueGenerationWithImage(img.url);
                                      }
                                    }}
                                    className={cn(
                                      "relative flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200",
                                      "w-[100px] h-[100px] min-[400px]:w-[110px] min-[400px]:h-[110px] sm:w-[120px] sm:h-[120px]",
                                      selectedImageIndex === i
                                        ? "border-primary ring-2 ring-primary/20"
                                        : "border-border hover:border-primary/50",
                                      savingImage && "opacity-60 cursor-not-allowed"
                                    )}
                                  >
                                    <img
                                      src={img.thumbnail}
                                      alt={img.title}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        // Hide broken images completely
                                        console.warn('[Image] Failed to load:', img.thumbnail, img.title);
                                        const button = e.currentTarget.closest('button');
                                        if (button) {
                                          button.style.display = 'none';
                                        }
                                      }}
                                    />
                                    {selectedImageIndex === i && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                                        {savingImage ? (
                                          <div className="rounded-full bg-primary p-1.5 animate-pulse">
                                            <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                          </div>
                                        ) : (
                                          <div className="rounded-full bg-primary p-1.5">
                                            <Check className="h-4 w-4 text-primary-foreground" />
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>

                          </>
                        )}
                      </div>
                    )}

                    {/* Show selected image during generation */}
                    {selectedImageUrl && generating && (
                      <div className="rounded-xl border border-border/60 bg-card/50 p-3 sm:p-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="relative h-14 w-14 sm:h-16 sm:w-16 flex-shrink-0 overflow-hidden rounded-lg border border-border/60">
                            <img
                              src={selectedImageUrl}
                              alt="Selected reference"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">Using reference photo</div>
                            <div className="text-xs text-muted-foreground">Avatar will be generated with this image as reference</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image fetching indicator */}
                    {imageSelectionStage === "fetching" && (
                      <div className="animate-in fade-in duration-300 rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                          <span className="text-sm text-muted-foreground">
                            Searching for reference photos...
                          </span>
                        </div>
                      </div>
                    )}

                    <textarea
                      value={genDescription}
                      onChange={(e) => setGenDescription(e.target.value)}
                      placeholder="Describe the leader (what they do, audience, vibe, domain). Leave empty for random."
                      className={cn(
                        "h-32 w-full resize-none rounded-xl border bg-background p-3",
                        "text-sm leading-relaxed",
                        "placeholder:text-muted-foreground/40",
                        "outline-none focus:ring-2 focus:ring-primary/20",
                        genError && "border-destructive/50",
                      )}
                      disabled={generating || savingImage}
                      spellCheck={false}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !generating && !savingImage) {
                          e.preventDefault();
                          void handleGenerate(false);
                        }
                      }}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        className="gap-2 rounded-full"
                        onClick={() => void handleGenerate(false)}
                        disabled={generating || savingImage}
                      >
                        {generatingMode === "custom" ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                            {Math.round(displayProgress) > 0 ? `${Math.round(displayProgress)}%` : "Generating..."}
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Generate Custom
                          </>
                        )}
                      </Button>
                    </div>
                    {generatingMode === "custom" && (
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        {researchStage?.active ? (
                          /* Research Stage: Active web search with progress */
                          <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-foreground font-medium">
                                  {researchStage.message}
                                </span>
                              </div>
                              <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                                {Math.round(displayProgress) > 0 ? `${Math.round(displayProgress)}%` : "..."}
                              </span>
                            </div>
                            {/* Progress bar with amber theme */}
                            <div className="relative h-2.5 overflow-hidden rounded-full bg-amber-500/10">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300 ease-out"
                                style={{ width: `${Math.max(1, displayProgress)}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="space-y-0.5">
                                <p className="text-amber-600 dark:text-amber-400 font-medium">
                                  🔍 Searching web sources...
                                </p>
                                <p className="text-muted-foreground/70">
                                  Gathering biographical info, achievements, expertise
                                </p>
                              </div>
                              <span className="text-muted-foreground/70 shrink-0 ml-2">
                                {elapsedTime.toFixed(1)}s
                              </span>
                            </div>
                          </div>
                        ) : researchStage && !researchStage.active ? (
                          /* Research Complete + JSON Generation Progress */
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            {/* Research Complete Section */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <Check className="h-4 w-4 text-emerald-500" />
                                  <span className="text-muted-foreground">
                                    {researchStage.message}
                                  </span>
                                </div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                  {researchStage.sourcesFound} sources • 100%
                                </span>
                              </div>
                              <Progress value={100} className="h-2 bg-emerald-500/10">
                                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                              </Progress>
                            </div>

                            {/* JSON Generation Progress Section */}
                            <div className="space-y-2 border-t border-border/60 pt-3">
                              <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                  <span className="text-foreground font-medium">
                                    Generating Leader Bible...
                                  </span>
                                </div>
                                <span className="font-semibold tabular-nums text-primary">
                                  {Math.round((displayProgress - 50) * 2)}%
                                </span>
                              </div>
                              <Progress
                                value={(displayProgress - 50) * 2}
                                className="h-2.5"
                              />
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">
                                  Using research insights...
                                </span>
                                <span className="text-muted-foreground/70">
                                  {elapsedTime.toFixed(1)}s total
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : genStage === "waiting" ? (
                          /* Stage 1: Waiting for first token */
                          <div className="space-y-3 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground animate-pulse">
                                Connecting to OpenAI...
                              </span>
                              <span className="text-xs text-muted-foreground/60">
                                {elapsedTime.toFixed(1)}s
                              </span>
                            </div>
                            {/* Shimmer effect progress bar */}
                            <div className="relative h-2 overflow-hidden rounded-full bg-muted/30">
                              <div className="absolute inset-0 shimmer" />
                            </div>
                            <p className="text-xs text-muted-foreground/70">
                              Initializing AI model (typically ~0.7s)
                            </p>
                          </div>
                        ) : (
                          /* Stage 2: Streaming with real progress */
                          <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-foreground font-medium">
                                  Generating Leader Bible...
                                </span>
                              </div>
                              <span className="font-semibold tabular-nums text-primary">
                                {Math.round(displayProgress) > 0 ? `${Math.round(displayProgress)}%` : "..."}
                              </span>
                            </div>
                            <Progress
                              value={Math.max(1, displayProgress)}
                              className="h-2.5"
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                Streaming JSON schema...
                              </span>
                              <span className="text-muted-foreground/70">
                                {elapsedTime.toFixed(1)}s elapsed
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {genError && (
                      <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                        <div className="flex items-start gap-2">
                          <svg className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-destructive">{genError}</p>
                            <button
                              onClick={() => setGenError(null)}
                              className="mt-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Uses OpenAI Structured Outputs to generate a complete Leader Bible JSON.
                    </p>
                  </div>
                </div>
              ) : (
                /* Drop zone mode */
                <div className="flex flex-col items-center px-6 py-16 text-center sm:py-20">
                  <div className={cn(
                    "mb-6 flex h-20 w-20 items-center justify-center rounded-2xl transition-colors",
                    isDragging ? "bg-primary/20" : "bg-muted/50",
                  )}>
                    <FileJson2 className={cn(
                      "h-10 w-10 transition-colors",
                      isDragging ? "text-primary" : "text-muted-foreground/60",
                    )} />
                  </div>

                  <h3 className="text-xl font-medium text-foreground">
                    {isDragging ? "Drop your file here" : "Drop JSON file here"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    or choose another option below
                  </p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4" />
                      Browse files
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => {
                        setShowTextarea(true);
                        setShowGenerator(false);
                        setTimeout(() => textareaRef.current?.focus(), 100);
                      }}
                    >
                      <FileJson2 className="h-4 w-4" />
                      Paste JSON
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-2 rounded-full"
                      onClick={() => {
                        setShowGenerator(true);
                        setShowTextarea(false);
                        setGenError(null);
                      }}
                    >
                      <Sparkles className="h-4 w-4" />
                      Generate with AI
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Help text */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Leader schemas follow the{" "}
              <span className="font-medium text-foreground">Leader Bible v1.0</span>{" "}
              format with identity, visual, and personality data.
            </p>
          </div>
        ) : (
          /* ========== PREVIEW STAGE ========== */
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Success indicator */}
            <div className="mb-8 flex items-center justify-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">
                Leader JSON ready
              </span>
            </div>

            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "overview" | "json" | "research")} className="mx-auto max-w-6xl px-4 sm:px-0">
              <div className="flex items-center justify-center mb-0">
                <TabsList className="rounded-full w-full sm:w-auto grid grid-cols-2 sm:flex gap-1 p-1">
                  <TabsTrigger value="overview" className="rounded-full text-xs sm:text-sm px-3 sm:px-4">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="json" className="rounded-full text-xs sm:text-sm px-3 sm:px-4">
                    Full JSON
                  </TabsTrigger>
                  {researchResults && (
                    <TabsTrigger value="research" className="rounded-full text-xs sm:text-sm px-3 sm:px-4 col-span-2 sm:col-span-1">
                      🔍 Research
                    </TabsTrigger>
                  )}
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-0">
                {/* Preview Card */}
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-primary/5">
                  {/* Hero section */}
                  <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.04] px-4 py-8 sm:px-8 sm:py-12">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h2 className="font-display text-3xl font-medium tracking-tight text-foreground sm:text-4xl lg:text-5xl break-words">
                            {identity.name}
                          </h2>
                          {identity.tier && (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-xs sm:text-sm font-medium text-primary-foreground">
                              {identity.tier}
                            </span>
                          )}
                        </div>

                        {identity.tagline && (
                          <p className="mt-3 sm:mt-4 text-base sm:text-lg text-muted-foreground">
                            {identity.tagline}
                          </p>
                        )}

                        <div className="mt-4 sm:mt-5 flex flex-wrap items-center gap-2">
                          {identity.leaderId && (
                            <code className="rounded-lg bg-foreground/5 px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
                              {identity.leaderId}
                            </code>
                          )}
                          {identity.vertical && (
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs sm:text-sm text-muted-foreground">
                              {identity.vertical}
                            </span>
                          )}
                          {selectedImageUrl && (
                            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs sm:text-sm text-primary">
                              📸 Reference Enhanced
                            </span>
                          )}
                        </div>
                      </div>

                      {typeof identity.compositeScore === "number" && (
                        <div className="shrink-0 text-left lg:text-right">
                          <div className="font-display text-5xl sm:text-6xl font-medium tabular-nums text-foreground">
                            {identity.compositeScore}
                          </div>
                          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Composite Score
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mission Statement */}
                  {identity.missionStatement && (
                    <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Mission Statement
                      </div>
                      <p className="text-sm sm:text-base leading-relaxed text-foreground">
                        {identity.missionStatement}
                      </p>
                    </div>
                  )}

                  {/* Reference Image Used */}
                  {selectedImageUrl && (
                    <div className="border-b border-border/40 px-8 py-8 sm:px-12">
                      <div className="mb-4 flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                          <span className="text-sm">📸</span>
                        </div>
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Reference Photo Used for Avatar
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="relative overflow-hidden rounded-xl border border-border/60 shadow-lg flex-shrink-0">
                          <img
                            src={selectedImageUrl}
                            alt="Reference photo"
                            className="h-48 w-48 object-cover"
                          />
                          <div className="absolute top-2 right-2 rounded-full bg-primary p-1.5 shadow-lg">
                            <Check className="h-4 w-4 text-primary-foreground" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-3">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            This photo was used as visual reference during avatar generation. The image was passed to the AI model via the <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">image_input</code> parameter, guiding it to create similar facial features, appearance, and style while following the character description.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                              <Check className="h-3 w-3" />
                              Image-to-Image Generation
                            </span>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                              Model: google/imagen-3
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leadership Scores Breakdown */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const scores = leaderRoot?.metadata?.leadershipScores;
                    if (!scores) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Leadership Scores
                        </div>
                        <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 mb-5">
                          {typeof scores.character === "number" && (
                            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-blue-500/5 to-transparent p-4 sm:p-5">
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Character</div>
                              <div className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground">{scores.character}</div>
                              {scores.scoringReasoning?.character && (
                                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">{scores.scoringReasoning.character}</p>
                              )}
                            </div>
                          )}
                          {typeof scores.competence === "number" && (
                            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-purple-500/5 to-transparent p-4 sm:p-5">
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Competence</div>
                              <div className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground">{scores.competence}</div>
                              {scores.scoringReasoning?.competence && (
                                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">{scores.scoringReasoning.competence}</p>
                              )}
                            </div>
                          )}
                          {typeof scores.impact === "number" && (
                            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-amber-500/5 to-transparent p-4 sm:p-5">
                              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Impact</div>
                              <div className="text-3xl sm:text-4xl font-bold tabular-nums text-foreground">{scores.impact}</div>
                              {scores.scoringReasoning?.impact && (
                                <p className="mt-3 text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">{scores.scoringReasoning.impact}</p>
                              )}
                            </div>
                          )}
                        </div>
                        {typeof scores.jobsRuleMultiplier === "number" && (
                          <div className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-5">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                              <div className="flex-1">
                                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Jobs Rule Multiplier</div>
                                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{scores.scoringReasoning?.jobsRule || "Ethical conduct assessment"}</p>
                              </div>
                              <div className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground shrink-0">{scores.jobsRuleMultiplier.toFixed(2)}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Expertise Domains */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const expertise = leaderRoot?.expertiseDomain?.primary;
                    if (!Array.isArray(expertise) || expertise.length === 0) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Areas of Expertise
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {expertise.map((domain: string, i: number) => (
                            <span key={i} className="rounded-full bg-primary/10 px-3 py-1.5 text-xs sm:text-sm font-medium text-primary">
                              {domain}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Primary Audience */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const audience = leaderRoot?.coreIdentity?.primaryAudience;
                    if (!audience) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Primary Audience
                        </div>
                        <div className="space-y-5">
                          {audience.description && (
                            <p className="text-sm sm:text-base text-foreground leading-relaxed">{audience.description}</p>
                          )}
                          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                            {audience.demographics && (
                              <div className="rounded-lg bg-muted/30 p-3.5">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Demographics</div>
                                <div className="space-y-1 text-xs sm:text-sm text-foreground">
                                  {audience.demographics.ageRange && <div><span className="text-muted-foreground">Age:</span> {audience.demographics.ageRange}</div>}
                                  {audience.demographics.geography && <div><span className="text-muted-foreground">Location:</span> {audience.demographics.geography}</div>}
                                </div>
                              </div>
                            )}
                            {audience.knowledgeLevel && (
                              <div className="rounded-lg bg-muted/30 p-3.5">
                                <div className="text-xs font-semibold text-muted-foreground mb-2">Knowledge Level</div>
                                <div className="text-xs sm:text-sm text-foreground font-medium">{audience.knowledgeLevel}</div>
                              </div>
                            )}
                          </div>
                          {Array.isArray(audience.painPoints) && audience.painPoints.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Pain Points</div>
                              <ul className="space-y-1.5">
                                {audience.painPoints.map((pain: string, i: number) => (
                                  <li key={i} className="text-xs sm:text-sm text-foreground flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    <span className="flex-1">{pain}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {Array.isArray(audience.aspirations) && audience.aspirations.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Aspirations</div>
                              <ul className="space-y-1.5">
                                {audience.aspirations.map((asp: string, i: number) => (
                                  <li key={i} className="text-xs sm:text-sm text-foreground flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">•</span>
                                    <span className="flex-1">{asp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Personality & Traits */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const personality = leaderRoot?.personalityMatrix;
                    if (!personality) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Personality & Core Traits
                        </div>
                        <div className="space-y-4">
                          {personality.personalityType && (
                            <p className="text-sm sm:text-base text-foreground leading-relaxed">{personality.personalityType}</p>
                          )}
                          {Array.isArray(personality.coreTraits) && personality.coreTraits.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {personality.coreTraits.map((trait: string, i: number) => (
                                <span key={i} className="rounded-full bg-muted px-3 py-1.5 text-xs sm:text-sm text-muted-foreground border border-border/60">
                                  {trait}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Values & Worldview */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const values = leaderRoot?.valuesWorldview;
                    if (!values) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Values & Worldview
                        </div>
                        <div className="space-y-4">
                          {values.worldviewSummary && (
                            <p className="text-sm sm:text-base text-foreground leading-relaxed">{values.worldviewSummary}</p>
                          )}
                          {Array.isArray(values.coreBeliefs) && values.coreBeliefs.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Core Beliefs</div>
                              <ul className="space-y-2">
                                {values.coreBeliefs.map((belief: string, i: number) => (
                                  <li key={i} className="text-xs sm:text-sm text-foreground flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span className="flex-1">{belief}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Communication Style */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const comm = leaderRoot?.communicationStyle?.voice;
                    if (!comm) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Communication Style
                        </div>
                        <div className="space-y-5">
                          {comm.summary && (
                            <p className="text-sm sm:text-base text-foreground leading-relaxed">{comm.summary}</p>
                          )}
                          <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-3">
                            {Array.isArray(comm.doSay) && comm.doSay.length > 0 && (
                              <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3.5">
                                <div className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2.5">✓ Do Say</div>
                                <ul className="space-y-1.5">
                                  {comm.doSay.slice(0, 5).map((phrase: string, i: number) => (
                                    <li key={i} className="text-xs sm:text-sm text-foreground leading-relaxed flex items-start gap-1.5">
                                      <span className="text-green-600 dark:text-green-400 mt-0.5 shrink-0">•</span>
                                      <span className="flex-1">{phrase}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {Array.isArray(comm.dontSay) && comm.dontSay.length > 0 && (
                              <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3.5">
                                <div className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2.5">✗ Don't Say</div>
                                <ul className="space-y-1.5">
                                  {comm.dontSay.slice(0, 5).map((phrase: string, i: number) => (
                                    <li key={i} className="text-xs sm:text-sm text-foreground leading-relaxed flex items-start gap-1.5">
                                      <span className="text-red-600 dark:text-red-400 mt-0.5 shrink-0">•</span>
                                      <span className="flex-1">{phrase}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          {Array.isArray(comm.catchphrases) && comm.catchphrases.length > 0 && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-2">Catchphrases</div>
                              <div className="flex flex-wrap gap-2">
                                {comm.catchphrases.map((phrase: string, i: number) => (
                                  <span key={i} className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-1.5 text-xs sm:text-sm text-foreground italic">
                                    "{phrase}"
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Visual Identity */}
                  {(() => {
                    const leaderRoot = parsed as any;
                    const visual = leaderRoot?.visualIdentity;
                    if (!visual) return null;

                    return (
                      <div className="border-b border-border/40 px-4 py-6 sm:px-8 sm:py-8">
                        <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Visual Identity
                        </div>
                        <div className="space-y-5">
                          {visual.physicalDescription && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {visual.physicalDescription.apparentAge && (
                                <div><span className="text-xs text-muted-foreground">Age:</span> <span className="text-sm text-foreground ml-1">{visual.physicalDescription.apparentAge}</span></div>
                              )}
                              {visual.physicalDescription.genderPresentation && (
                                <div><span className="text-xs text-muted-foreground">Gender:</span> <span className="text-sm text-foreground ml-1">{visual.physicalDescription.genderPresentation}</span></div>
                              )}
                              {visual.physicalDescription.ethnicity && (
                                <div><span className="text-xs text-muted-foreground">Ethnicity:</span> <span className="text-sm text-foreground ml-1">{visual.physicalDescription.ethnicity}</span></div>
                              )}
                              {visual.physicalDescription.buildBodyType && (
                                <div><span className="text-xs text-muted-foreground">Build:</span> <span className="text-sm text-foreground ml-1">{visual.physicalDescription.buildBodyType}</span></div>
                              )}
                            </div>
                          )}
                          {visual.visualStyle?.colorPalette && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-3">Color Palette</div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.isArray(visual.visualStyle.colorPalette.primary) && visual.visualStyle.colorPalette.primary.length > 0 && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-2">Primary</div>
                                    <div className="flex flex-wrap gap-2">
                                      {visual.visualStyle.colorPalette.primary.map((color: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full border border-border/60 shadow-sm" style={{ backgroundColor: color.hex }} />
                                          <span className="text-xs text-foreground">{color.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {Array.isArray(visual.visualStyle.colorPalette.accent) && visual.visualStyle.colorPalette.accent.length > 0 && (
                                  <div>
                                    <div className="text-xs text-muted-foreground mb-2">Accent</div>
                                    <div className="flex flex-wrap gap-2">
                                      {visual.visualStyle.colorPalette.accent.map((color: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2">
                                          <div className="h-6 w-6 rounded-full border border-border/60 shadow-sm" style={{ backgroundColor: color.hex }} />
                                          <span className="text-xs text-foreground">{color.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Data summary */}
                  <div className="bg-muted/20 px-4 py-5 sm:px-8 sm:py-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                        <span>
                          <span className="font-medium text-foreground">
                            {Object.keys(parsed as object).filter(k => k !== "$schema").length}
                          </span>{" "}
                          sections
                        </span>
                        <span>
                          <span className="font-medium text-foreground">
                            {raw.length.toLocaleString()}
                          </span>{" "}
                          chars
                        </span>
                        {researchResults && (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <span>🌐</span> Web researched
                          </span>
                        )}
                        {selectedImageUrl && (
                          <span className="flex items-center gap-1 text-xs text-primary">
                            <span>📸</span> Image enhanced
                          </span>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2 rounded-full text-xs sm:text-sm"
                          onClick={() => setPreviewTab("json")}
                        >
                          <FileJson2 className="h-3 w-3 sm:h-4 sm:w-4" />
                          View full JSON
                        </Button>
                        <Button
                          size="lg"
                          className="gap-2 rounded-full px-6 sm:px-8 text-sm sm:text-base"
                          disabled={!canSave || saving}
                          onClick={handleSave}
                        >
                          {saving ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                              Saving...
                            </>
                          ) : (
                            <>
                              Save to Gallery
                              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="json" className="mt-6">
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-5 py-4">
                    <div className="text-sm font-medium text-foreground">Full Leader JSON</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(raw);
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                        Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-full"
                        onClick={() => setEditingJson((v) => !v)}
                      >
                        {editingJson ? "Done" : "Edit"}
                      </Button>
                      <Button
                        size="sm"
                        className="gap-2 rounded-full"
                        disabled={!canSave || saving}
                        onClick={handleSave}
                      >
                        {saving ? (
                          <>
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                            Saving...
                          </>
                        ) : (
                          <>
                            Save to Gallery
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4">
                    {editingJson ? (
                      <>
                        <textarea
                          value={raw}
                          onChange={(e) => setRaw(e.target.value)}
                          className={cn(
                            "h-[420px] w-full resize-none rounded-xl border bg-background p-4",
                            "font-mono text-sm leading-relaxed",
                            "placeholder:text-muted-foreground/40",
                            "outline-none focus:ring-2 focus:ring-primary/20",
                            error && "border-destructive/50",
                          )}
                          spellCheck={false}
                        />
                        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                        <p className="mt-2 text-xs text-muted-foreground">
                          This is the exact JSON that will be saved. Fix any validation errors above before saving.
                        </p>
                      </>
                    ) : (
                      <>
                        <ScrollArea className="h-[420px] rounded-xl border bg-foreground/[0.02]">
                          <pre className="p-4 font-mono text-xs leading-relaxed">
                            <JsonSyntaxHighlight json={raw} />
                          </pre>
                        </ScrollArea>
                        <p className="mt-2 text-xs text-muted-foreground">
                          This is the exact JSON that will be saved.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="research" className="mt-6">
                {researchResults && (
                  <div className="overflow-hidden rounded-3xl border border-border/60 bg-card">
                    <div className="border-b border-border/40 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-amber-600/[0.04] px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium text-foreground">🔍 Web Search Results</div>
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          {researchResults.sources.length} sources
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Research data gathered from the web and used to inform the Leader Bible generation
                      </p>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Key Facts */}
                      {researchResults.keyFacts.filter(f => f && f.length > 5).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs">📋</span>
                            Key Facts ({researchResults.keyFacts.filter(f => f && f.length > 5).length})
                          </h3>
                          <ul className="space-y-3">
                            {researchResults.keyFacts.filter(f => f && f.length > 5).map((fact, i) => (
                              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                <span className="text-primary font-medium mt-0.5 shrink-0">•</span>
                                <div className="flex-1 prose prose-sm dark:prose-invert prose-p:my-0 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold">
                                  <ReactMarkdown>{fact}</ReactMarkdown>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Notable Achievements */}
                      {researchResults.achievements.filter(a => a && a.length > 5).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs">🏆</span>
                            Notable Achievements ({researchResults.achievements.filter(a => a && a.length > 5).length})
                          </h3>
                          <ul className="space-y-3">
                            {researchResults.achievements.filter(a => a && a.length > 5).map((achievement, i) => (
                              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                <span className="text-primary font-medium mt-0.5 shrink-0">•</span>
                                <div className="flex-1 prose prose-sm dark:prose-invert prose-p:my-0 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold">
                                  <ReactMarkdown>{achievement}</ReactMarkdown>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Areas of Expertise */}
                      {researchResults.expertise.filter(e => e && e.length > 5).length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs">💼</span>
                            Areas of Expertise ({researchResults.expertise.filter(e => e && e.length > 5).length})
                          </h3>
                          <ul className="space-y-3">
                            {researchResults.expertise.filter(e => e && e.length > 5).map((exp, i) => (
                              <li key={i} className="text-sm text-foreground/90 flex gap-2">
                                <span className="text-primary font-medium mt-0.5 shrink-0">•</span>
                                <div className="flex-1 prose prose-sm dark:prose-invert prose-p:my-0 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-strong:font-semibold">
                                  <ReactMarkdown>{exp}</ReactMarkdown>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sources */}
                      {researchResults.sources.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs">📚</span>
                            Sources
                          </h3>
                          <ul className="space-y-2">
                            {researchResults.sources.map((source, i) => (
                              <li key={i} className="text-sm">
                                <a
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline flex items-start gap-2"
                                >
                                  <span className="text-muted-foreground font-medium mt-0.5">{i + 1}.</span>
                                  <span>{source.title}</span>
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
