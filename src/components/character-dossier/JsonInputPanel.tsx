"use client";

import * as React from "react";
import { Upload, Wand2, Eraser, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";

type Props = {
  raw: string;
  onRawChange: (next: string) => void;
  error: string | null;
  onParsed: (value: unknown) => void;
};

export function JsonInputPanel({ raw, onRawChange, error, onParsed }: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const formatJson = React.useCallback(() => {
    const result = safeJsonParse(raw);
    if (!result.ok) return;
    onRawChange(JSON.stringify(result.value, null, 2));
  }, [onRawChange, raw]);

  const clear = React.useCallback(() => {
    onRawChange("");
    onParsed(null);
  }, [onParsed, onRawChange]);

  const onPickFile = React.useCallback(() => {
    inputRef.current?.click();
  }, []);

  const readFile = React.useCallback(
    async (file: File) => {
      const text = await file.text();
      onRawChange(text);
    },
    [onRawChange],
  );

  const onFileChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await readFile(file);
      e.target.value = "";
    },
    [readFile],
  );

  const onDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await readFile(file);
    },
    [readFile],
  );

  return (
    <TooltipProvider>
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">JSON input</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Paste, drop a file, or load a sample schema.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={formatJson}
                  disabled={!raw.trim() || !!error}
                >
                  <Wand2 className="mr-2 h-4 w-4" />
                  Format
                </Button>
              </TooltipTrigger>
              <TooltipContent>Pretty-print valid JSON</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  disabled={!raw.trim()}
                >
                  <Eraser className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear input and preview</TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div
            className={cn(
              "relative rounded-xl border bg-muted/30 p-3 transition-colors",
              isDragging && "border-primary/50 bg-primary/5",
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={onDrop}
          >
            <Textarea
              value={raw}
              onChange={(e) => onRawChange(e.target.value)}
              placeholder='Paste JSON here… e.g. { "coreIdentity": { "name": "…" } }'
              className={cn(
                "min-h-[420px] resize-y bg-transparent font-mono text-[12.5px] leading-5",
                "placeholder:text-muted-foreground/70",
                error && "border-destructive/60 focus-visible:ring-destructive/30",
              )}
              aria-invalid={!!error}
            />

            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-end">
              <div
                className={cn(
                  "hidden items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur",
                  isDragging && "flex",
                )}
              >
                <Upload className="h-3.5 w-3.5" />
                Drop JSON file to load
              </div>
            </div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json,text/plain"
            className="hidden"
            onChange={onFileChange}
          />

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              {error ? (
                <p className="text-xs font-medium text-destructive">
                  Invalid JSON: <span className="font-normal">{error}</span>
                </p>
              ) : raw.trim() ? (
                <p className="text-xs text-muted-foreground">
                  Parsed successfully. Preview updates automatically.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tip: drag a <span className="font-medium">.json</span> file
                  onto the editor.
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPickFile}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}


