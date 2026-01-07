"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Users, Sparkles, ArrowRight, Star, Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { seedLeadersIfEmpty, type LeaderSummary } from "@/lib/leader-store";

// Generate initials from name
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Generate a deterministic gradient from name
function getGradient(name: string) {
  const gradients = [
    "from-amber-400 to-orange-500",
    "from-rose-400 to-pink-500",
    "from-violet-400 to-purple-500",
    "from-blue-400 to-indigo-500",
    "from-emerald-400 to-teal-500",
    "from-cyan-400 to-blue-500",
  ];
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
}

// Profile Picture component with fallback
function ProfilePic({ 
  src, 
  name, 
  size = "md" 
}: { 
  src?: string; 
  name: string; 
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}) {
  const [error, setError] = React.useState(false);
  const showFallback = !src || error;
  
  const sizeClasses = {
    sm: "h-10 w-10 text-sm",
    md: "h-16 w-16 text-xl",
    lg: "h-24 w-24 text-3xl",
    xl: "h-32 w-32 text-4xl",
    "2xl": "h-36 w-36 text-5xl",
  };
  
  const imageSizes = {
    sm: 40,
    md: 64,
    lg: 96,
    xl: 128,
    "2xl": 144,
  };

  return (
    <div className={cn(
      "relative shrink-0 overflow-hidden rounded-full ring-4 ring-background shadow-lg",
      sizeClasses[size],
    )}>
      {showFallback ? (
        <div className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br font-semibold text-white",
          getGradient(name),
        )}>
          {getInitials(name)}
        </div>
      ) : (
        <Image
          src={src}
          alt={name}
          width={imageSizes[size]}
          height={imageSizes[size]}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// Leader card component
function LeaderCard({ leader }: { leader: LeaderSummary }) {
  return (
    <Link
      href={`/leaders/${encodeURIComponent(leader.id)}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border/50 bg-card",
        "transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1",
      )}
    >
      {/* Subtle background glow */}
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -inset-24 bg-[radial-gradient(ellipse_at_center,rgba(180,120,60,0.14),transparent_60%)]" />
      </div>

      {/* Top gradient accent */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/80 to-accent opacity-0 transition-opacity group-hover:opacity-100" />
      
      {/* Card content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Header */}
        <div className="flex items-start gap-5">
          <ProfilePic src={leader.profilePicUrl} name={leader.name} size="2xl" />

          <div className="min-w-0 flex-1 pt-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate font-display text-2xl font-medium text-foreground transition-colors group-hover:text-primary">
                  {leader.name}
                </h3>
                {leader.tagline && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {leader.tagline}
                  </p>
                )}
              </div>

              {typeof leader.compositeScore === "number" && (
                <div className="shrink-0 text-right">
                  <div className="inline-flex items-end gap-2 rounded-2xl border border-border/60 bg-foreground/5 px-3 py-2">
                    <div className="font-display text-4xl font-semibold tabular-nums text-foreground">
                      {leader.compositeScore}
                    </div>
                    <div className="pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Score
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick tags */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {leader.tier && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <Star className="h-3.5 w-3.5" />
                  {leader.tier}
                </span>
              )}
              {leader.vertical && (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                  {leader.vertical}
                </span>
              )}
              {leader.subDomains?.slice(0, 2).map((sd) => (
                <span
                  key={sd}
                  className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <Hash className="h-3 w-3 opacity-60" />
                  {sd}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
          <code className="text-[10px] text-muted-foreground/70 font-mono">
            {leader.id.length > 28 ? `${leader.id.slice(0, 28)}...` : leader.id}
          </code>
          <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            View dossier
            <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Empty state
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/10">
        <Users className="h-12 w-12 text-primary/60" />
      </div>
      <h2 className="font-display text-2xl font-medium text-foreground">
        No leaders yet
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
        Create your first leader dossier by importing a JSON schema.
      </p>
      <Button asChild size="lg" className="mt-8 gap-2 rounded-full px-8">
        <Link href="/leaders/new">
          <Sparkles className="h-4 w-4" />
          Create your first leader
        </Link>
      </Button>
    </div>
  );
}

export function LeadersGalleryApp() {
  const [leaders, setLeaders] = React.useState<LeaderSummary[]>([]);
  const [search, setSearch] = React.useState("");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setLeaders(seedLeadersIfEmpty());
    setMounted(true);
  }, []);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return leaders;
    const q = search.toLowerCase();
    return leaders.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q) ||
        l.tagline?.toLowerCase().includes(q) ||
        l.vertical?.toLowerCase().includes(q)
    );
  }, [leaders, search]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,120,60,0.06),transparent)]" />
      </div>

      {/* Hero header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Profilemaker
                </span>
              </div>
              <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                Leader Gallery
              </h1>
              <p className="mt-3 max-w-lg text-lg text-muted-foreground">
                Your collection of AI character profiles. Each leader has a unique personality, voice, and visual identity.
              </p>
            </div>
            
            <Button asChild size="lg" className="gap-2 rounded-full px-6 shadow-lg shadow-primary/20">
              <Link href="/leaders/new">
                <Plus className="h-4 w-4" />
                New leader
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        {leaders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Search and count */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search leaders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(
                    "h-12 w-full rounded-full border border-border/60 bg-card pl-11 pr-4",
                    "text-sm placeholder:text-muted-foreground/50",
                    "outline-none transition-all",
                    "focus:border-primary/40 focus:ring-4 focus:ring-primary/10",
                  )}
                />
              </div>
              
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{filtered.length}</span>
                {" "}of{" "}
                <span className="font-medium text-foreground">{leaders.length}</span>
                {" "}leader{leaders.length !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No leaders match your search.</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => setSearch("")}
                >
                  Clear search
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((leader) => (
                  <LeaderCard key={leader.id} leader={leader} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
