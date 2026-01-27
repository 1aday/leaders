"use client";

import * as React from "react";
import { CornerDownRight, FileJson, Sparkles } from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn, calculateCompositeScore } from "@/lib/utils";

type Props = {
  value: unknown;
};

type Section = {
  id: string;
  title: string;
  value: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function titleCase(key: string) {
  const withSpaces = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ");
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function isScalar(v: unknown): v is string | number | boolean | null {
  return (
    v === null ||
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  );
}

function snippetForValue(v: unknown): string {
  if (typeof v === "string") {
    const oneLine = v.replace(/\s+/g, " ").trim();
    return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
  }
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null) return "null";
  if (Array.isArray(v)) return `${v.length} items`;
  if (isPlainObject(v)) return `${Object.keys(v).length} fields`;
  return "value";
}

function getTopSections(value: unknown): Section[] {
  if (!isPlainObject(value)) return [];
  const entries = Object.entries(value).filter(([k]) => k !== "$schema");
  return entries.map(([key, sectionValue]) => ({
    id: `section-${key}`,
    title: titleCase(key),
    value: sectionValue,
  }));
}

function Scalar({ value }: { value: string }) {
  const isLong = value.length > 140 || value.includes("\n");
  if (isLong) {
    return (
      <div className="rounded-xl border bg-muted/25 p-3">
        <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-foreground">
          {value}
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="min-w-0 truncate text-sm text-foreground">{value}</div>
    </div>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="font-mono text-xs text-muted-foreground">{hex}</div>
      </div>
      <div
        className="h-7 w-7 rounded-md border"
        style={{ backgroundColor: hex }}
        aria-label={name}
      />
    </div>
  );
}

function JsonBlock({ value }: { value: unknown }) {
  const text = React.useMemo(() => JSON.stringify(value, null, 2), [value]);
  return (
    <div className="rounded-xl border bg-muted/20 p-3">
      <pre className="min-w-0 overflow-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-5 text-foreground">
        {text}
      </pre>
    </div>
  );
}

function RenderValue({ value }: { value: unknown }) {
  const scalar = asString(value);
  if (scalar !== null) return <Scalar value={scalar} />;
  if (Array.isArray(value)) {
    // array of strings -> badges
    if (value.every((v) => typeof v === "string")) {
      return (
        <div className="flex flex-wrap gap-2">
          {(value as string[]).map((v) => (
            <Badge key={v} variant="secondary" className="rounded-full">
              {v}
            </Badge>
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {(value as unknown[]).map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <CornerDownRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <RenderValue value={item} />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (isPlainObject(value)) {
    // Special case: palette items with name/hex
    if (typeof value.name === "string" && typeof value.hex === "string") {
      return <ColorSwatch name={value.name} hex={value.hex} />;
    }

    const entries = Object.entries(value);
    const scalarEntries = entries.filter(([, v]) => isScalar(v));
    const complexEntries = entries.filter(([, v]) => !isScalar(v));

    return (
      <div className="space-y-4">
        {scalarEntries.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {scalarEntries.map(([k, v]) => (
              <div key={k} className="space-y-1.5">
                <div className="text-xs font-medium tracking-wide text-muted-foreground">
                  {titleCase(k)}
                </div>
                <RenderValue value={v} />
              </div>
            ))}
          </div>
        ) : null}

        {complexEntries.length ? (
          complexEntries.length >= 2 ? (
            <Accordion type="multiple" className="w-full">
              {complexEntries.map(([k, v]) => (
                <AccordionItem key={k} value={k} className="border-b">
                  <AccordionTrigger className="py-3 text-sm">
                    <div className="flex w-full items-center justify-between gap-3 pr-2">
                      <span className="font-medium">{titleCase(k)}</span>
                      <span className="shrink-0 rounded-full border bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">
                        {snippetForValue(v)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <RenderValue value={v} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="space-y-2">
              {complexEntries.map(([k, v]) => (
                <div key={k} className="space-y-1.5">
                  <div className="text-xs font-medium tracking-wide text-muted-foreground">
                    {titleCase(k)}
                  </div>
                  <RenderValue value={v} />
                </div>
              ))}
            </div>
          )
        ) : null}
      </div>
    );
  }

  if (value === null) return <Scalar value="null" />;
  return <Scalar value={String(value)} />;
}

function Hero({ value }: { value: Record<string, unknown> }) {
  const metadata = isPlainObject(value.metadata) ? value.metadata : null;
  const core = isPlainObject(value.coreIdentity) ? value.coreIdentity : null;
  const scores = metadata && isPlainObject(metadata.leadershipScores) ? metadata.leadershipScores : null;

  const name = core?.name && typeof core.name === "string" ? core.name : "Untitled character";
  const tagline = core?.tagline && typeof core.tagline === "string" ? core.tagline : null;
  const leaderId = metadata?.leaderId && typeof metadata.leaderId === "string" ? metadata.leaderId : null;
  const vertical = metadata?.vertical && typeof metadata.vertical === "string" ? metadata.vertical : null;
  const tier = scores?.tier && typeof scores.tier === "string" ? scores.tier : null;

  // Calculate composite score from individual scores instead of trusting stored value
  const character = typeof scores?.character === "number" ? scores.character : undefined;
  const competence = typeof scores?.competence === "number" ? scores.competence : undefined;
  const impact = typeof scores?.impact === "number" ? scores.impact : undefined;
  const composite = calculateCompositeScore(character, competence, impact) ?? null;

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(800px_circle_at_10%_0%,hsl(var(--primary)/0.10),transparent_55%),radial-gradient(700px_circle_at_90%_30%,hsl(var(--primary)/0.06),transparent_50%)]" />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">
                {name}
              </h2>
              {tier ? (
                <Badge className="rounded-full" variant="secondary">
                  {tier}
                </Badge>
              ) : null}
            </div>
            {tagline ? (
              <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
                {tagline}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                Paste a schema to generate a dossier.
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {leaderId ? (
                <span className="rounded-full border bg-card px-2.5 py-1 font-mono">
                  {leaderId}
                </span>
              ) : null}
              {vertical ? (
                <span className="rounded-full border bg-card px-2.5 py-1">
                  {vertical}
                </span>
              ) : null}
            </div>
          </div>
          {typeof composite === "number" ? (
            <div className="w-28">
              <div className="text-right text-xs font-medium text-muted-foreground">
                Composite
              </div>
              <div className="mt-1 text-right text-2xl font-semibold tabular-nums">
                {composite}
              </div>
              <Progress value={composite} className="mt-2 h-2" />
            </div>
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
}

export function DossierView({ value }: Props) {
  const sections = React.useMemo(() => getTopSections(value), [value]);
  const root = isPlainObject(value) ? value : null;

  if (!value) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Your dossier will appear here.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-md border bg-card p-2">
                <FileJson className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Paste JSON to begin</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  We’ll extract key identity fields and format the rest into a
                  clean, readable dossier.
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Minimal by default
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear hierarchy, calm spacing, and scan-friendly fields.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!root) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preview</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Expected a JSON object at the top-level.
          </p>
        </CardHeader>
        <CardContent>
          <JsonBlock value={value} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Hero value={root} />

      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">Dossier</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Navigate sections as needed.
            </p>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="secondary" className="rounded-full">
              {sections.length} sections
            </Badge>
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="p-0">
          <div className="grid md:grid-cols-[210px_1fr]">
            <div className="hidden border-r bg-muted/10 p-3 md:block">
              <div className="sticky top-4 space-y-1">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className={cn(
                      "block rounded-lg px-3 py-2 text-sm text-muted-foreground",
                      "transition-colors hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>

            <ScrollArea className="h-[640px]">
              <div className="space-y-6 p-4">
                {sections.map((s) => (
                  <section key={s.id} id={s.id} className="scroll-mt-6">
                    <div className="mb-3 flex items-end justify-between gap-4">
                      <h3 className="text-base font-semibold tracking-tight">
                        {s.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {isPlainObject(s.value)
                          ? `${Object.keys(s.value).length} fields`
                          : Array.isArray(s.value)
                            ? `${s.value.length} items`
                            : "value"}
                      </span>
                    </div>
                    <RenderValue value={s.value} />
                  </section>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


