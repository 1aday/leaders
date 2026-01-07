"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileJson2,
  Sparkles,
  Upload,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";
import { deriveLeaderSummary, upsertLeader } from "@/lib/leader-store";
import { SAMPLE_LEADER_BIBLE } from "@/lib/sample-leader-bible";

// Extract identity from parsed JSON
function extractIdentity(parsed: unknown) {
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  const core = p.coreIdentity as Record<string, unknown> | undefined;
  const meta = p.metadata as Record<string, unknown> | undefined;
  const scores = meta?.leadershipScores as Record<string, unknown> | undefined;
  
  return {
    name: (core?.name as string) || "Untitled Leader",
    tagline: core?.tagline as string | undefined,
    leaderId: meta?.leaderId as string | undefined,
    vertical: meta?.vertical as string | undefined,
    tier: scores?.tier as string | undefined,
    compositeScore: scores?.compositeScore as number | undefined,
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

  const loadSample = React.useCallback(() => {
    setRaw(JSON.stringify(SAMPLE_LEADER_BIBLE, null, 2));
    setShowTextarea(false);
  }, []);

  const handleSave = React.useCallback(async () => {
    if (!parsed) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    const summary = deriveLeaderSummary(parsed, raw);
    const saved = upsertLeader(summary);
    router.push(`/leaders/${encodeURIComponent(saved.id)}`);
  }, [parsed, raw, router]);

  const reset = React.useCallback(() => {
    setRaw("");
    setParsed(null);
    setError(null);
    setShowTextarea(false);
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
                Import Leader Schema
              </h2>
              <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
                Drop a JSON file, paste a schema, or load our sample to get started.
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
                        setTimeout(() => textareaRef.current?.focus(), 100);
                      }}
                    >
                      <FileJson2 className="h-4 w-4" />
                      Paste JSON
                    </Button>
                    <Button
                      variant="default"
                      className="gap-2 rounded-full"
                      onClick={loadSample}
                    >
                      <Sparkles className="h-4 w-4" />
                      Load sample
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
                Schema imported successfully
              </span>
            </div>

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
                        {JSON.stringify(parsed).length.toLocaleString()}
                      </span>{" "}
                      characters
                    </span>
                  </div>
                  
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

            {/* Edit option */}
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                className="text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowTextarea(true);
                  setParsed(null);
                }}
              >
                Edit JSON manually
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
