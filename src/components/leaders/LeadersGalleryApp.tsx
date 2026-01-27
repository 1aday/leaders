"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Hash,
  Play,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { loadLeaders, saveLeaders, seedLeadersIfEmpty, markDeleted, type LeaderSummary } from "@/lib/leader-store";
import { syncLeadersFromDbToLocal } from "@/lib/db/leader-sync";

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

// Properly capitalize name (first letter of each word uppercase)
function capitalizeName(name: string): string {
  if (!name) return name;
  return name
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function safeParseJson(s: string): unknown | null {
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function includesAny(haystack: string, needles: string[]) {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

function extractDisclosureFromLeaderRaw(rawJson: string): boolean {
  const parsed = safeParseJson(rawJson);
  if (!parsed || !isPlainObject(parsed)) return false;

  const core = isPlainObject(parsed.coreIdentity) ? (parsed.coreIdentity as Record<string, unknown>) : null;
  const meta = isPlainObject(parsed.metadata) ? (parsed.metadata as Record<string, unknown>) : null;

  const mission = typeof core?.missionStatement === "string" ? core.missionStatement : "";
  const positioning = typeof core?.positioning === "string" ? core.positioning : "";
  const tags = Array.isArray(meta?.tags) ? (meta?.tags as unknown[]).filter((t) => typeof t === "string") as string[] : [];

  const text = [mission, positioning, ...tags].join("\n");
  return (
    includesAny(text, [
      "ai-powered",
      "ai powered",
      "i am an ai",
      "i’m an ai",
      "artificial intelligence",
      "language model",
      "machine learning",
    ]) || tags.some((t) => includesAny(t, ["ai", "transparent-ai"]))
  );
}

function extractStatusFromLeaderRaw(rawJson: string): "Approved" | "Draft" | "Review" | null {
  const parsed = safeParseJson(rawJson);
  if (!parsed || !isPlainObject(parsed)) return null;
  const meta = isPlainObject(parsed.metadata) ? (parsed.metadata as Record<string, unknown>) : null;
  const status = meta && typeof meta.status === "string" ? meta.status : null;
  if (status === "Approved" || status === "Draft" || status === "Review") return status;
  return null;
}

function extractUpdatedFromLeaderRaw(rawJson: string): string | null {
  const parsed = safeParseJson(rawJson);
  if (!parsed || !isPlainObject(parsed)) return null;
  const meta = isPlainObject(parsed.metadata) ? (parsed.metadata as Record<string, unknown>) : null;
  const lastModified = meta && typeof meta.lastModified === "string" ? meta.lastModified : null;
  return lastModified && lastModified.trim() ? lastModified : null;
}

function extractLeaderKeyFromRawJson(rawJson: string): string | null {
  const parsed = safeParseJson(rawJson);
  if (!parsed || !isPlainObject(parsed)) return null;
  const meta = isPlainObject(parsed.metadata) ? (parsed.metadata as Record<string, unknown>) : null;
  const leaderId = meta && typeof meta.leaderId === "string" ? meta.leaderId.trim() : "";
  return leaderId || null;
}

// Check if URL is a valid image URL (not a placeholder)
function isValidImageUrl(url: string | undefined): boolean {
  if (!url || typeof url !== "string" || url.trim().length === 0) return false;
  const lower = url.toLowerCase();
  // Reject placeholder URLs
  if (lower.includes("example.com") || lower.includes("placeholder")) return false;
  // Must be a valid URL format
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Hero media component - large prominent image/video for cards
function HeroMedia({ 
  src, 
  name, 
  videoSrc,
}: { 
  src?: string; 
  name: string; 
  videoSrc?: string;
}) {
  const [error, setError] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const hasVideo = !!videoSrc;
  const hasImage = !!src && !error;

  // Play/pause video on hover with audio
  React.useEffect(() => {
    if (!videoRef.current || !hasVideo) return;
    const video = videoRef.current;
    
    if (isHovered) {
      video.currentTime = 0;
      video.muted = true; // Start muted (browsers require this for autoplay)
      video.play().then(() => {
        // Unmute after play starts - works if user has interacted with page
        video.muted = false;
      }).catch(() => {});
    } else {
      video.pause();
      video.muted = true;
    }
  }, [isHovered, hasVideo]);

  // If there's a video, show video thumbnail (first frame) or image with video overlay on hover
  if (hasVideo) {
    return (
      <div 
        className="relative aspect-square w-full overflow-hidden bg-muted"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Base layer: prefer image, but if none exists show video paused at first frame */}
        {hasImage ? (
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover"
            onError={() => setError(true)}
          />
        ) : (
          // No image - show video as still (paused at first frame) instead of initials
          <video
            src={videoSrc}
            playsInline
            muted
            preload="metadata"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        
        {/* Video overlay - plays on hover with audio */}
        <video
          ref={videoRef}
          src={videoSrc}
          loop
          playsInline
          muted
          preload="metadata"
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        />
        
        {/* Subtle video indicator - desktop only */}
        {!isHovered && (
          <div className="absolute bottom-2 right-2 rounded-full bg-black/40 p-1.5 backdrop-blur-sm hidden md:block">
            <Film className="h-3 w-3 text-white/80" />
          </div>
        )}

        {/* Mobile play button overlay - always visible on touch devices */}
        <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
          <div className="rounded-full bg-black/50 p-3 backdrop-blur-sm">
            <Play className="h-6 w-6 text-white" fill="white" />
          </div>
        </div>
      </div>
    );
  }

  // No video - show image or fallback
  return (
    <div 
      className="relative aspect-square w-full overflow-hidden bg-muted"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={cn(
        "relative h-full w-full transition-transform duration-500",
        isHovered && "scale-105",
      )}>
        {hasImage ? (
          <Image
            src={src}
            alt={name}
            fill
            className="object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white text-6xl",
            getGradient(name),
          )}>
            {getInitials(name)}
          </div>
        )}
      </div>
    </div>
  );
}

type LeaderDerived = LeaderSummary & {
  _status: "Approved" | "Draft" | "Review" | "Unknown";
  _hasDisclosure: boolean;
  _hasAvatar: boolean;
  _hasIntroVideo: boolean;
  _lastModified: string | null;
};

// Leader card component - Hero image layout
function LeaderCard({ leader, onDelete }: { leader: LeaderDerived; onDelete: (id: string) => void | Promise<void> }) {
  return (
    <Link
      href={`/leaders/${encodeURIComponent(leader.id)}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/40",
        "transition-all duration-300 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1",
      )}
    >
      {/* Hero Media Section */}
      <div className="relative">
        <HeroMedia 
          src={leader.profilePicUrl} 
          name={capitalizeName(leader.name)} 
          videoSrc={leader.welcomeVideoUrl} 
        />
        
        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(leader.id);
          }}
          className={cn(
            "absolute top-3 right-3 rounded-full bg-black/50 p-2 text-white/80 backdrop-blur-sm",
            "opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500 hover:text-white",
          )}
          aria-label="Delete leader"
          title="Delete leader"
        >
          <Trash2 className="h-4 w-4" />
        </button>

        {/* Score overlay - bottom left of hero */}
        {typeof leader.compositeScore === "number" && (
          <div className="absolute bottom-3 left-3 flex items-baseline gap-1 rounded-lg bg-black/60 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="font-display text-2xl font-bold tabular-nums text-white">
              {leader.compositeScore}
            </span>
            <span className="text-[9px] font-medium uppercase tracking-wider text-white/70">
              score
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-1 flex-col p-4">
        {/* Name - now below image for better readability */}
        <h3 className="font-display text-xl font-semibold tracking-tight text-foreground group-hover:text-primary transition-colors">
          {capitalizeName(leader.name)}
        </h3>

        {/* Expertise subheading */}
        {leader.expertise && (
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
            {leader.expertise}
          </p>
        )}

        {/* Tagline */}
        {leader.tagline && (
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground line-clamp-2">
            {leader.tagline}
          </p>
        )}

        {/* Tags row */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {leader.tier && (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
              <Star className="h-3 w-3" />
              {leader.tier}
            </span>
          )}
          {leader.vertical && (
            <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
              {leader.vertical}
            </span>
          )}
          {leader.subDomains?.slice(0, 1).map((sd) => (
            <span
              key={sd}
              className="inline-flex items-center gap-0.5 rounded-md bg-foreground/5 px-2 py-1 text-[11px] text-muted-foreground"
            >
              <Hash className="h-2.5 w-2.5 opacity-60" />
              {sd}
            </span>
          ))}
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

// Avatar circle that hides itself on error
function AvatarCircle({
  src,
  alt,
  onError,
  zIndex,
}: {
  src: string;
  alt: string;
  onError: () => void;
  zIndex: number;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) return null;

  return (
    <div
      className="relative h-12 w-12 overflow-hidden rounded-full ring-[3px] ring-[#08080c] transition-transform hover:scale-110 hover:z-10"
      style={{ zIndex }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="48px"
        onError={() => {
          setFailed(true);
          onError();
        }}
      />
    </div>
  );
}

// Collage grid image that hides itself on error
function CollageGridImage({
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) return null;

  return (
    <div className="relative aspect-square overflow-hidden bg-slate-900">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top transition-transform duration-500 hover:scale-110"
        sizes="(max-width: 640px) 25vw, 15vw"
        onError={() => {
          setFailed(true);
          onError();
        }}
      />
    </div>
  );
}

// Collage image that hides itself on error
function CollageImage({
  src,
  alt,
  onError,
  style,
}: {
  src: string;
  alt: string;
  onError: () => void;
  style: React.CSSProperties;
}) {
  const [failed, setFailed] = React.useState(false);

  if (failed) return null;

  return (
    <div
      className="absolute overflow-hidden rounded-xl shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-transform duration-500 hover:scale-105 hover:z-20"
      style={style}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover object-top"
        sizes="200px"
        onError={() => {
          setFailed(true);
          onError();
        }}
      />
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
    </div>
  );
}

export function LeadersGalleryApp() {
  const [leaders, setLeaders] = React.useState<LeaderSummary[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [sort, setSort] = React.useState<"updated" | "score" | "name">("updated");
  const [vertical, setVertical] = React.useState<string>("All");
  const [tier, setTier] = React.useState<string>("All");
  const [status, setStatus] = React.useState<"All" | "Review" | "Approved" | "Draft">("All");
  const [brokenCollageImages, setBrokenCollageImages] = React.useState<Set<string>>(new Set());
  const [brokenAvatarCircles, setBrokenAvatarCircles] = React.useState<Set<string>>(new Set());
  const { confirm, ConfirmDialog } = useConfirm();

  React.useEffect(() => {
    setLeaders(seedLeadersIfEmpty());
    setMounted(true);

    // Hydrate localStorage from Supabase (best-effort).
    syncLeadersFromDbToLocal().then((merged) => {
      setLeaders(merged);
    }).catch(() => {});
  }, []);

  const handleDeleteLeader = React.useCallback(async (leaderId: string) => {
    const l = leaders.find((x) => x.id === leaderId);
    const name = l?.name ?? leaderId;

    const confirmed = await confirm({
      title: `Delete ${name}?`,
      description: "This will permanently remove this leader from your gallery. This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Keep",
      variant: "danger",
    });

    if (!confirmed) return;

    // Mark as deleted FIRST to prevent re-sync/re-seed from adding it back
    markDeleted(leaderId);
    const leaderKey = l ? (extractLeaderKeyFromRawJson(l.rawJson) ?? l.id) : leaderId;
    if (leaderKey !== leaderId) {
      markDeleted(leaderKey);
    }

    // Best-effort: also delete from Supabase (if configured)
    try {
      await fetch(`/api/leader/${encodeURIComponent(leaderKey)}`, { method: "DELETE" });
    } catch {
      // ignore
    }

    const next = loadLeaders().filter((x) => x.id !== leaderId);
    saveLeaders(next);
    setLeaders(next);
  }, [leaders, confirm]);

  const handleClearAll = React.useCallback(async () => {
    const confirmed = await confirm({
      title: "Delete All Leaders?",
      description: `This will permanently remove all ${leaders.length} leaders from your gallery. This action cannot be undone.`,
      confirmText: "Delete All",
      cancelText: "Cancel",
      variant: "danger",
    });

    if (!confirmed) return;

    // Mark all as deleted to prevent re-sync/re-seed
    leaders.forEach((l) => {
      markDeleted(l.id);
      const leaderKey = extractLeaderKeyFromRawJson(l.rawJson) ?? l.id;
      if (leaderKey !== l.id) {
        markDeleted(leaderKey);
      }
    });

    // Best-effort: delete from Supabase (if configured)
    try {
      await Promise.allSettled(
        leaders.map((l) => {
          const leaderKey = extractLeaderKeyFromRawJson(l.rawJson) ?? l.id;
          return fetch(`/api/leader/${encodeURIComponent(leaderKey)}`, { method: "DELETE" });
        })
      );
    } catch {
      // ignore
    }

    // Clear localStorage
    saveLeaders([]);
    setLeaders([]);
  }, [leaders, confirm]);

  const enhanced = React.useMemo((): LeaderDerived[] => {
    return leaders.map((l) => {
      const st = extractStatusFromLeaderRaw(l.rawJson) ?? "Unknown";
      const hasDisclosure = extractDisclosureFromLeaderRaw(l.rawJson);
      const hasAvatar = typeof l.profilePicUrl === "string" && l.profilePicUrl.trim().length > 0;
      const hasIntroVideo = typeof l.welcomeVideoUrl === "string" && l.welcomeVideoUrl.trim().length > 0;
      const lastModified = extractUpdatedFromLeaderRaw(l.rawJson);
      return {
        ...l,
        _status: st,
        _hasDisclosure: hasDisclosure,
        _hasAvatar: hasAvatar,
        _hasIntroVideo: hasIntroVideo,
        _lastModified: lastModified,
      };
    });
  }, [leaders]);

  const verticalOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of enhanced) if (l.vertical) set.add(l.vertical);
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [enhanced]);

  const tierOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const l of enhanced) if (l.tier) set.add(l.tier);
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [enhanced]);

  // Leaders with valid avatars for display in header circles
  const leadersWithValidAvatars = React.useMemo(() => {
    return enhanced.filter(l =>
      l._hasAvatar &&
      isValidImageUrl(l.profilePicUrl) &&
      !brokenAvatarCircles.has(l.id)
    );
  }, [enhanced, brokenAvatarCircles]);

  // Leaders with valid avatars for photo collage grid
  const leadersForCollage = React.useMemo(() => {
    return enhanced.filter(l =>
      l._hasAvatar &&
      isValidImageUrl(l.profilePicUrl) &&
      !brokenCollageImages.has(l.id)
    );
  }, [enhanced, brokenCollageImages]);

  const filtered = React.useMemo(() => {
    return enhanced
      .filter((l) => {
        if (vertical !== "All" && l.vertical !== vertical) return false;
        if (tier !== "All" && l.tier !== tier) return false;
        if (status !== "All" && l._status !== status) return false;
        return true;
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "score") {
          const as = typeof a.compositeScore === "number" ? a.compositeScore : -1;
          const bs = typeof b.compositeScore === "number" ? b.compositeScore : -1;
          return bs - as;
        }
        // updated
        const at = Date.parse(a._lastModified ?? a.updatedAt) || 0;
        const bt = Date.parse(b._lastModified ?? b.updatedAt) || 0;
        return bt - at;
      });
  }, [enhanced, sort, status, tier, vertical]);

  if (!mounted) return null;

  return (
    <>
      {ConfirmDialog}
    <div className="min-h-screen">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-background to-accent/[0.02]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(180,120,60,0.06),transparent)]" />
      </div>

      {/* Hero header */}
      <header className="relative overflow-hidden bg-[#08080c]">
        <div className="relative mx-auto max-w-[1600px]">
          {/* Mobile: stacked, Desktop: side by side */}
          <div className="flex flex-col sm:flex-row sm:items-center">
            {/* Left: Text content */}
            <div className="relative z-10 flex-shrink-0 px-6 py-8 sm:w-[380px] sm:px-10 sm:py-12 lg:w-[480px] lg:px-12 lg:py-16">
              {/* Eyebrow */}
              <div className="mb-4 inline-flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                  Profilemaker
                </span>
              </div>
              
              {/* Title */}
              <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-white">Leader </span>
                <span className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-400 bg-clip-text text-transparent">
                  Gallery
                </span>
              </h1>
              
              {/* Description */}
              <p className="mt-4 text-lg text-slate-400 sm:text-xl">
                <span className="font-semibold text-white/90">{leaders.length}</span> AI leaders
              </p>
              
              {/* CTA + avatars */}
              <div className="mt-8 flex items-center gap-5">
                <Button asChild className="group h-12 gap-2.5 rounded-xl bg-white px-6 text-base font-semibold text-slate-900 shadow-xl shadow-white/20 hover:bg-white/95 hover:shadow-2xl hover:shadow-white/25 transition-all">
                  <Link href="/leaders/new">
                    <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90" />
                    Create Leader
                  </Link>
                </Button>

                {leaders.length > 0 && (
                  <Button
                    onClick={handleClearAll}
                    variant="ghost"
                    className="group h-12 gap-2.5 rounded-xl px-6 text-base font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <Trash2 className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                    Clear All
                  </Button>
                )}
                
                {leadersWithValidAvatars.length > 0 && (
                  <div className="flex -space-x-3">
                    {leadersWithValidAvatars.slice(0, 5).map((leader, idx) => (
                      <AvatarCircle
                        key={leader.id}
                        src={leader.profilePicUrl!}
                        alt={leader.name}
                        zIndex={5 - idx}
                        onError={() => setBrokenAvatarCircles(prev => new Set(prev).add(leader.id))}
                      />
                    ))}
                    {leadersWithValidAvatars.length > 5 && (
                      <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white/90 ring-[3px] ring-[#08080c]">
                        +{leadersWithValidAvatars.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Right: Photo grid - hidden on mobile */}
            <div className="relative flex-1 overflow-hidden hidden sm:block">
              <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-5 gap-0.5">
                {leadersForCollage.slice(0, 10).map((leader) => (
                  <CollageGridImage
                    key={leader.id}
                    src={leader.profilePicUrl!}
                    alt={capitalizeName(leader.name)}
                    onError={() => setBrokenCollageImages(prev => new Set(prev).add(leader.id))}
                  />
                ))}
              </div>
              
              {/* Fade to left */}
              <div className="absolute inset-y-0 left-0 w-8 sm:w-16 bg-gradient-to-r from-[#08080c] to-transparent pointer-events-none" />
              {/* Fade to bottom on mobile */}
              <div className="absolute inset-x-0 bottom-0 h-4 sm:h-0 bg-gradient-to-t from-[#08080c] to-transparent pointer-events-none" />
            </div>
          </div>
        </div>
        
        {/* Bottom edge */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8">
        {leaders.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Compact inline filters */}
            <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Count */}
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{filtered.length}</span> of {leaders.length}
              </span>
              
              <div className="h-4 w-px bg-border" />
              
              {/* Filters */}
              <select
                value={vertical}
                onChange={(e) => setVertical(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              >
                {verticalOptions.map((v) => (
                  <option key={v} value={v}>{v === "All" ? "All Verticals" : v}</option>
                ))}
              </select>
              
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="h-8 rounded-lg border border-border/60 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              >
                {tierOptions.map((t) => (
                  <option key={t} value={t}>{t === "All" ? "All Tiers" : t}</option>
                ))}
              </select>
              
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="h-8 rounded-lg border border-border/60 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              >
                {(["All", "Review", "Approved", "Draft"] as const).map((s) => (
                  <option key={s} value={s}>{s === "All" ? "All Status" : s}</option>
                ))}
              </select>
              
              <div className="h-4 w-px bg-border" />
              
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                className="h-8 rounded-lg border border-border/60 bg-card px-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="updated">Recent</option>
                <option value="score">Score</option>
                <option value="name">Name</option>
              </select>
              
              {/* Reset - only show if filters active */}
              {(vertical !== "All" || tier !== "All" || status !== "All" || sort !== "updated") && (
                <button
                  type="button"
                  onClick={() => {
                    setVertical("All");
                    setTier("All");
                    setStatus("All");
                    setSort("updated");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Grid */}
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">No leaders match your filters.</p>
                <Button
                  variant="ghost"
                  className="mt-4"
                  onClick={() => {
                    setVertical("All");
                    setTier("All");
                    setStatus("All");
                  }}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filtered.map((leader, idx) => (
                  <div
                    key={leader.id}
                    className="animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
                    style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
                  >
                    <LeaderCard leader={leader} onDelete={handleDeleteLeader} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
    </>
  );
}
