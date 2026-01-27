"use client";

import * as React from "react";
import { Copy, FileJson2, Hash, Quote, User } from "lucide-react";
import { cn, calculateCompositeScore } from "@/lib/utils";

type Props = {
  value: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-md",
        "text-muted-foreground/60 transition-colors hover:text-foreground",
        "opacity-0 group-hover:opacity-100",
        className,
      )}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1000);
        } catch {
          // ignore
        }
      }}
      aria-label="Copy"
    >
      {copied ? (
        <span className="text-[10px] text-primary">✓</span>
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50">
      <div className="min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="mt-0.5 text-sm text-foreground">{value}</div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

function LongText({ label, value }: { label: string; value: string }) {
  return (
    <div className="group rounded-xl border border-border/60 bg-muted/20 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Quote className="h-3 w-3" />
          {label}
        </div>
        <CopyButton text={value} className="opacity-100" />
      </div>
      <p className="text-sm leading-relaxed text-foreground">{value}</p>
    </div>
  );
}

function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2">
      <div
        className="h-8 w-8 rounded-md border border-border/60"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{name}</div>
        <div className="font-mono text-[10px] text-muted-foreground">{hex}</div>
      </div>
      <CopyButton text={hex} />
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {children}
    </div>
  );
}

export function DossierPreview({ value }: Props) {
  if (!value || !isPlainObject(value)) {
    return (
      <div className="flex h-[540px] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50">
          <FileJson2 className="h-8 w-8 text-muted-foreground/50" />
        </div>
        <h3 className="font-display text-xl font-medium text-foreground">
          Waiting for JSON
        </h3>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Paste or drop a JSON file to see a preview of your leader dossier here.
        </p>
      </div>
    );
  }

  const metadata = isPlainObject(value.metadata) ? value.metadata : null;
  const core = isPlainObject(value.coreIdentity) ? value.coreIdentity : null;
  const visual = isPlainObject(value.visualIdentity) ? value.visualIdentity : null;
  const scores = metadata && isPlainObject(metadata.leadershipScores)
    ? metadata.leadershipScores
    : null;
  const visualStyle = visual && isPlainObject(visual.visualStyle)
    ? visual.visualStyle
    : null;
  const colorPalette = visualStyle && isPlainObject(visualStyle.colorPalette)
    ? visualStyle.colorPalette
    : null;

  const name = (core?.name as string) || "Untitled";
  const tagline = core?.tagline as string | undefined;
  const mission = core?.missionStatement as string | undefined;
  const leaderId = metadata?.leaderId as string | undefined;
  const vertical = metadata?.vertical as string | undefined;
  const tier = scores?.tier as string | undefined;
  
  // Calculate composite score from individual scores instead of trusting stored value
  const character = typeof scores?.character === "number" ? scores.character : undefined;
  const competence = typeof scores?.competence === "number" ? scores.competence : undefined;
  const impact = typeof scores?.impact === "number" ? scores.impact : undefined;
  const composite = calculateCompositeScore(character, competence, impact);

  const primaryColors = Array.isArray(colorPalette?.primary)
    ? (colorPalette.primary as Array<{ name: string; hex: string }>)
    : [];

  return (
    <div className="h-[540px] overflow-y-auto rounded-2xl border border-border/60 bg-card">
      {/* Hero header */}
      <div className="relative border-b border-border/60 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/[0.04] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-2xl font-medium tracking-tight text-foreground">
                {name}
              </h2>
              {tier && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {tier}
                </span>
              )}
            </div>
            {tagline && (
              <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {leaderId && (
                <code className="rounded bg-muted/60 px-2 py-1 font-mono text-[10px] text-muted-foreground">
                  {leaderId}
                </code>
              )}
              {vertical && (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {vertical}
                </span>
              )}
            </div>
          </div>
          
          {typeof composite === "number" && (
            <div className="shrink-0 text-right">
              <div className="font-display text-3xl font-medium tabular-nums text-foreground">
                {composite}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Score
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6 p-6">
        {mission && <LongText label="Mission Statement" value={mission} />}

        {/* Identity fields */}
        <Section title="Identity" icon={User}>
          <div className="space-y-1 rounded-xl border border-border/60 bg-muted/20">
            {leaderId && <FieldRow label="Leader ID" value={leaderId} />}
            {vertical && <FieldRow label="Vertical" value={vertical} />}
            {tier && <FieldRow label="Tier" value={tier} />}
            {typeof composite === "number" && (
              <FieldRow label="Composite Score" value={String(composite)} />
            )}
          </div>
        </Section>

        {/* Colors */}
        {primaryColors.length > 0 && (
          <Section title="Color Palette" icon={Hash}>
            <div className="grid gap-2 sm:grid-cols-2">
              {primaryColors.map((c) => (
                <ColorSwatch key={c.hex} name={c.name} hex={c.hex} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

