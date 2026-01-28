"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  const [generating, setGenerating] = React.useState(false);
  const [generatingMode, setGeneratingMode] = React.useState<"random" | "custom" | null>(null);
  const [genError, setGenError] = React.useState<string | null>(null);
  const [genProgress, setGenProgress] = React.useState(0);
  const [previewTab, setPreviewTab] = React.useState<"overview" | "json">("overview");
  const [editingJson, setEditingJson] = React.useState(false);

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


  const handleGenerate = React.useCallback(async (forceRandom = false) => {
    setGenError(null);
    setGenProgress(0);
    const name = forceRandom ? "" : genName.trim();
    const description = forceRandom ? "" : genDescription.trim();

    setGenerating(true);
    setGeneratingMode(forceRandom ? "random" : "custom");

    try {
      const res = await fetch("/api/leader/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE messages are separated by double newlines
        const messages = buffer.split("\n\n");
        // Keep the last incomplete message in the buffer
        buffer = messages.pop() || "";

        for (const message of messages) {
          const lines = message.split("\n");
          for (const line of lines) {
            if (!line.trim()) continue;

            // SSE data lines start with "data: "
            if (line.startsWith("data: ")) {
              const jsonStr = line.substring(6).trim();
              if (!jsonStr) continue;

              try {
                const json = JSON.parse(jsonStr) as { type: string; percentage?: number; leader?: unknown; error?: string };

                if (json.type === "progress") {
                  const percentage = Math.min(99, Math.max(0, Math.round(json.percentage || 0)));
                  console.log(`[Progress] ${percentage}%`);
                  setGenProgress(percentage);
                } else if (json.type === "complete") {
                  const leader = json.leader;
                  if (!leader) throw new Error("API returned no leader JSON");

                  setRaw(JSON.stringify(leader, null, 2));
                  setShowGenerator(false);
                  setShowTextarea(false);
                  setPreviewTab("json");
                  setEditingJson(false);
                  setGenProgress(100);
                  return;
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
      const msg = e instanceof Error ? e.message : "Unknown error";
      setGenError(msg);
      setGenProgress(0);
    } finally {
      setGenerating(false);
      setGeneratingMode(null);
    }
  }, [genName, genDescription]);

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
                      disabled={generating}
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
                          disabled={generating}
                        >
                          {generatingMode === "random" ? (
                            <>
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                              {genProgress > 0 ? `${genProgress}%` : "Generating..."}
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
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {genProgress <= 1 ? "Waiting for OpenAI..." : "Generating..."}
                            </span>
                            <span className="font-medium tabular-nums text-foreground">{genProgress}%</span>
                          </div>
                          <Progress value={genProgress} className="h-2" />
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
                      disabled={generating}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !generating) {
                          e.preventDefault();
                          void handleGenerate(false);
                        }
                      }}
                    />
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
                      disabled={generating}
                      spellCheck={false}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !generating) {
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
                        disabled={generating}
                      >
                        {generatingMode === "custom" ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                            {genProgress > 0 ? `${genProgress}%` : "Generating..."}
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {genProgress <= 1 ? "Waiting for OpenAI..." : "Generating Leader Bible..."}
                          </span>
                          <span className="font-medium tabular-nums text-foreground">{genProgress}%</span>
                        </div>
                        <Progress value={genProgress} className="h-2" />
                      </div>
                    )}
                    {genError && <p className="text-sm text-destructive">{genError}</p>}
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

            <Tabs value={previewTab} onValueChange={(v) => setPreviewTab(v as "overview" | "json")} className="mx-auto max-w-4xl">
              <div className="flex items-center justify-center">
                <TabsList className="rounded-full">
                  <TabsTrigger value="overview" className="rounded-full">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="json" className="rounded-full">
                    Full JSON
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-6">
                {/* Preview Card */}
                <div className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-xl shadow-primary/5">
                  {/* Hero section */}
                  <div className="relative border-b border-border/40 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.04] px-8 py-10 sm:px-12 sm:py-14">
                    <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                            {identity.name}
                          </h2>
                          {identity.tier && (
                            <span className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                              {identity.tier}
                            </span>
                          )}
                        </div>

                        {identity.tagline && (
                          <p className="mt-4 text-lg text-muted-foreground">
                            {identity.tagline}
                          </p>
                        )}

                        <div className="mt-5 flex flex-wrap items-center gap-3">
                          {identity.leaderId && (
                            <code className="rounded-lg bg-foreground/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                              {identity.leaderId}
                            </code>
                          )}
                          {identity.vertical && (
                            <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
                              {identity.vertical}
                            </span>
                          )}
                        </div>
                      </div>

                      {typeof identity.compositeScore === "number" && (
                        <div className="shrink-0 text-right">
                          <div className="font-display text-6xl font-medium tabular-nums text-foreground">
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
                    <div className="border-b border-border/40 px-8 py-8 sm:px-12">
                      <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Mission Statement
                      </div>
                      <p className="max-w-3xl text-base leading-relaxed text-foreground">
                        {identity.missionStatement}
                      </p>
                    </div>
                  )}

                  {/* Data summary */}
                  <div className="bg-muted/20 px-8 py-6 sm:px-12">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
                          characters
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="gap-2 rounded-full"
                          onClick={() => setPreviewTab("json")}
                        >
                          <FileJson2 className="h-4 w-4" />
                          View full JSON
                        </Button>
                        <Button
                          size="lg"
                          className="gap-2 rounded-full px-8"
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
                              <ArrowRight className="h-4 w-4" />
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
            </Tabs>
          </div>
        )}
      </main>
    </div>
  );
}
