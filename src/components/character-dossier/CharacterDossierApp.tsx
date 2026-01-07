"use client";

import * as React from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";
import { JsonInputPanel } from "./JsonInputPanel";
import { DossierView } from "./DossierView";

const STORAGE_KEY = "profilemaker.leaderBibleJson.v1";

export function CharacterDossierApp() {
  const [raw, setRaw] = React.useState<string>("");
  const [parsed, setParsed] = React.useState<unknown>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Load persisted input on mount.
  React.useEffect(() => {
    try {
      const fromStorage = window.localStorage.getItem(STORAGE_KEY);
      if (fromStorage) setRaw(fromStorage);
    } catch {
      // Ignore storage failures (private mode, etc.)
    }
  }, []);

  // Persist raw input.
  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, raw);
    } catch {
      // Ignore storage failures.
    }
  }, [raw]);

  // Parse with a small debounce so typing stays smooth.
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
    }, 350);

    return () => window.clearTimeout(handle);
  }, [raw]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-end justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Character dossier
            </div>
            <h1 className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl">
              Paste a character schema. Get a clean dossier.
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
              Drop JSON on the left. Preview a structured, minimalist profile on
              the right.
            </p>
          </div>
          <div className="hidden text-right text-xs text-muted-foreground md:block">
            <div className="font-medium text-foreground">
              Designed for clarity
            </div>
            <div>Bold type · calm hierarchy · zero clutter</div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Desktop: two panels */}
          <div className="hidden md:block">
            <JsonInputPanel
              raw={raw}
              onRawChange={setRaw}
              error={error}
              onParsed={setParsed}
            />
          </div>
          <div className="hidden md:block">
            <DossierView value={parsed} />
          </div>

          {/* Mobile: tabs */}
          <div className="md:hidden">
            <Tabs defaultValue="input" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="input">Input</TabsTrigger>
                <TabsTrigger value="preview" className={cn(error && "opacity-70")}>
                  Preview
                </TabsTrigger>
              </TabsList>
              <TabsContent value="input" className="mt-4">
                <JsonInputPanel
                  raw={raw}
                  onRawChange={setRaw}
                  error={error}
                  onParsed={setParsed}
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-4">
                <DossierView value={parsed} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}


