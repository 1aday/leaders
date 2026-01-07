"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Download,
  Hash,
  MoreHorizontal,
  Play,
  Quote,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";
import { getLeaderById, loadLeaders, saveLeaders } from "@/lib/leader-store";

// Helper functions
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function titleCase(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function getString(obj: Record<string, unknown> | null, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === "string" && v.trim() ? v : undefined;
}

function getStringArray(obj: Record<string, unknown> | null, key: string): string[] | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x) => typeof x === "string") as string[];
  return out.length ? out : undefined;
}

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const omit = new Set(keys);
  for (const [k, v] of Object.entries(obj)) {
    if (!omit.has(k)) out[k] = v;
  }
  return out;
}

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
  size = "xl" 
}: { 
  src?: string; 
  name: string; 
  size?: "lg" | "xl" | "2xl";
}) {
  const [error, setError] = React.useState(false);
  const showFallback = !src || error;
  
  const sizeClasses = {
    lg: "h-24 w-24 text-3xl",
    xl: "h-32 w-32 text-4xl",
    "2xl": "h-56 w-56 text-7xl sm:h-64 sm:w-64 sm:text-8xl",
  };
  
  const imageSizes = {
    lg: 96,
    xl: 128,
    "2xl": 256,
  };

  return (
    <div className={cn(
      "relative shrink-0 overflow-hidden rounded-2xl ring-4 ring-background shadow-2xl",
      sizeClasses[size],
    )}>
      {showFallback ? (
        <div className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br font-bold text-white",
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

// Video Player component
function VideoPlayer({ 
  src, 
  poster,
  title = "Welcome Video" 
}: { 
  src: string; 
  poster?: string;
  title?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);
  const [showControls, setShowControls] = React.useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-2xl bg-foreground/5"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(isPlaying ? false : true)}
    >
      <div className="aspect-video w-full">
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          className="h-full w-full object-cover"
          muted={isMuted}
          playsInline
          loop
          onEnded={() => setIsPlaying(false)}
        />
      </div>
      
      <div className={cn(
        "absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity",
        !showControls && isPlaying ? "opacity-0" : "opacity-100",
      )}>
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            "bg-white/90 text-foreground shadow-lg transition-transform hover:scale-105",
          )}
        >
          {isPlaying ? (
            <div className="flex gap-1">
              <div className="h-5 w-1.5 rounded-full bg-foreground" />
              <div className="h-5 w-1.5 rounded-full bg-foreground" />
            </div>
          ) : (
            <Play className="h-6 w-6 ml-1" fill="currentColor" />
          )}
        </button>
      </div>

      <div className={cn(
        "absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent transition-opacity",
        !showControls && isPlaying ? "opacity-0" : "opacity-100",
      )}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">{title}</span>
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// Copy Button
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-xs text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground",
      )}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // ignore
        }
      }}
    >
      {copied ? (
        <span className="text-primary">Copied!</span>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label || "Copy"}
        </>
      )}
    </button>
  );
}

// Score Card
function ScoreCard({
  label,
  value,
  max = 100,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="font-display text-2xl font-medium tabular-nums">
          {value}
        </span>
      </div>
      <Progress value={(value / max) * 100} className="mt-3 h-1.5" />
    </div>
  );
}

// Field Row
function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="group flex items-start justify-between gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted/30">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={cn("mt-1 text-sm text-foreground", mono && "font-mono text-xs")}>
          {value}
        </div>
      </div>
      <CopyButton text={value} />
    </div>
  );
}

// Long Text Block
function LongTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Quote className="h-3.5 w-3.5" />
          {label}
        </div>
        <CopyButton text={value} />
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {value}
      </p>
    </div>
  );
}

// Color Swatch
function ColorSwatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 transition-colors hover:border-border">
      <div
        className="h-10 w-10 rounded-lg border border-border/60 shadow-inner"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">{name}</div>
        <div className="font-mono text-xs text-muted-foreground">{hex}</div>
      </div>
      <CopyButton text={hex} />
    </div>
  );
}

// Section wrapper
function Section({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        <h3 className="font-display text-lg font-medium tracking-tight text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// Render any value recursively
function RenderValue({ value, depth = 0 }: { value: unknown; depth?: number }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }

  if (typeof value === "string") {
    if (value.length > 200) {
      return <LongTextBlock label="Content" value={value} />;
    }
    return <span className="text-foreground">{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="font-mono text-foreground">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    // Array of strings -> badges
    if (value.every((v) => typeof v === "string")) {
      return (
        <div className="flex flex-wrap gap-2">
          {(value as string[]).map((v, i) => (
            <Badge key={i} variant="secondary" className="rounded-full">
              {v}
            </Badge>
          ))}
        </div>
      );
    }
    // Array of objects with name/hex -> color swatches
    if (value.every((v) => isPlainObject(v) && typeof v.name === "string" && typeof v.hex === "string")) {
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          {(value as Array<{ name: string; hex: string }>).map((c, i) => (
            <ColorSwatch key={i} name={c.name} hex={c.hex} />
          ))}
        </div>
      );
    }
    // Generic array
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-lg border border-border/40 bg-muted/20 p-3">
            <RenderValue value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const scalars = entries.filter(
      ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean"
    );
    const complex = entries.filter(
      ([, v]) => !(typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    );

    return (
      <div className="space-y-4">
        {scalars.length > 0 && (
          <div className="divide-y divide-border/40 rounded-xl border border-border/60 bg-card">
            {scalars.map(([k, v]) => (
              <FieldRow key={k} label={titleCase(k)} value={String(v)} />
            ))}
          </div>
        )}
        {complex.map(([k, v]) => (
          <Section key={k} title={titleCase(k)} className="mt-6">
            <RenderValue value={v} depth={depth + 1} />
          </Section>
        ))}
      </div>
    );
  }

  return <span className="text-muted-foreground">{String(value)}</span>;
}

// Extract media URLs from schema
function extractMediaUrls(parsed: unknown): {
  profilePicUrl?: string;
  welcomeVideoUrl?: string;
} {
  const root = isPlainObject(parsed) ? parsed : null;
  const core = root && isPlainObject(root.coreIdentity) ? (root.coreIdentity as Record<string, unknown>) : null;
  const visual = root && isPlainObject(root.visualIdentity) ? (root.visualIdentity as Record<string, unknown>) : null;
  const imagePrompts = visual && isPlainObject(visual.imagePrompts) ? (visual.imagePrompts as Record<string, unknown>) : null;
  const primaryImage = imagePrompts && isPlainObject(imagePrompts.primary) ? (imagePrompts.primary as Record<string, unknown>) : null;
  const video = root && isPlainObject(root.videoIdentity) ? (root.videoIdentity as Record<string, unknown>) : null;
  const videoPrompts = video && isPlainObject(video.videoPrompts) ? (video.videoPrompts as Record<string, unknown>) : null;
  const standardVideo = videoPrompts && isPlainObject(videoPrompts.standard) ? (videoPrompts.standard as Record<string, unknown>) : null;
  const assets = root && isPlainObject(root.assetRegistry) ? (root.assetRegistry as Record<string, unknown>) : null;
  const images = assets && Array.isArray(assets.images) ? assets.images : [];
  const videos = assets && Array.isArray(assets.videos) ? assets.videos : [];

  const profilePicUrl = getString(primaryImage, "url") 
    ?? getString(visual, "profilePicUrl")
    ?? getString(core, "profilePicUrl")
    ?? (images[0] && typeof images[0] === "object" && "url" in (images[0] as object) ? (images[0] as { url: string }).url : undefined);
  
  const welcomeVideoUrl = getString(standardVideo, "url")
    ?? getString(video, "welcomeVideoUrl")
    ?? getString(core, "welcomeVideoUrl")
    ?? (videos[0] && typeof videos[0] === "object" && "url" in (videos[0] as object) ? (videos[0] as { url: string }).url : undefined);

  return { profilePicUrl, welcomeVideoUrl };
}

export function LeaderDetailApp({ id }: { id: string }) {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [leader, setLeader] = React.useState<ReturnType<typeof getLeaderById>>(null);
  const [mounted, setMounted] = React.useState(false);

  // Avoid reading localStorage (via leader-store) during SSR/render.
  React.useEffect(() => {
    setLeader(getLeaderById(id));
    setMounted(true);
  }, [id, refreshKey]);
  const parsed = React.useMemo(() => {
    if (!leader) return null;
    const res = safeJsonParse(leader.rawJson);
    return res.ok ? res.value : null;
  }, [leader]);

  const [showActions, setShowActions] = React.useState(false);
  const [generatingAvatar, setGeneratingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [generatingIntroVideo, setGeneratingIntroVideo] = React.useState(false);
  const [introVideoError, setIntroVideoError] = React.useState<string | null>(null);
  const [introVideoPredictionId, setIntroVideoPredictionId] = React.useState<string | null>(null);

  // Extract media URLs
  const mediaUrls = React.useMemo(() => extractMediaUrls(parsed), [parsed]);
  const leaderProfilePicUrl = leader?.profilePicUrl;
  const leaderWelcomeVideoUrl = leader?.welcomeVideoUrl;
  const profilePicUrl: string | undefined =
    (typeof leaderProfilePicUrl === "string" ? leaderProfilePicUrl : undefined) ?? mediaUrls.profilePicUrl;
  const welcomeVideoUrl: string | undefined =
    (typeof leaderWelcomeVideoUrl === "string" ? leaderWelcomeVideoUrl : undefined) ?? mediaUrls.welcomeVideoUrl;

  // Extract structured data
  const root = isPlainObject(parsed) ? parsed : null;
  const metadata = root && isPlainObject(root.metadata) ? root.metadata : null;
  const core = root && isPlainObject(root.coreIdentity) ? root.coreIdentity : null;
  const scores = metadata && isPlainObject(metadata.leadershipScores) ? metadata.leadershipScores : null;
  const subDomains: string[] = getStringArray(metadata, "subDomains") ?? leader?.subDomains ?? [];
  const voiceSummary: string | undefined = (() => {
    if (!root || !isPlainObject(root.communicationStyle)) return undefined;
    const comm = root.communicationStyle as Record<string, unknown>;
    if (!isPlainObject(comm.voice)) return undefined;
    const voice = comm.voice as Record<string, unknown>;
    const summary = voice.summary;
    if (typeof summary !== "string") return undefined;
    const trimmed = summary.trim();
    return trimmed.length ? trimmed : undefined;
  })();
  const missionStatement = getString(core, "missionStatement");

  // Top-level sections for tabs
  const sections = React.useMemo(() => {
    if (!root) return [];
    return Object.entries(root)
      .filter(([k]) => k !== "$schema")
      .map(([key, value]) => {
        // Render *all* meaningful JSON fields, but avoid duplicating the hero/scores/video blocks.
        if (key === "coreIdentity" && isPlainObject(value)) {
          return {
            key,
            title: titleCase(key),
            value: omitKeys(value, ["name", "tagline", "profilePicUrl", "welcomeVideoUrl", "missionStatement"]),
          };
        }
        if (key === "metadata" && isPlainObject(value)) {
          return {
            key,
            title: titleCase(key),
            value: omitKeys(value, [
              // already surfaced elsewhere (hero + score cards)
              "leadershipScores",
              // usually just bookkeeping
              "bibleVersion",
              "createdDate",
              "lastModified",
              "status",
              "approvedBy",
            ]),
          };
        }
        return { key, title: titleCase(key), value };
      })
      .filter((s) => {
        // If we stripped everything from a section, don't show an empty tab.
        if (isPlainObject(s.value)) return Object.keys(s.value).length > 0;
        if (Array.isArray(s.value)) return s.value.length > 0;
        return s.value !== null && s.value !== undefined;
      });
  }, [root]);

  if (!mounted) return null;

  if (!leader) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-md text-center">
          <h2 className="font-display text-2xl font-medium text-foreground">
            Leader not found
          </h2>
          <p className="mt-2 text-muted-foreground">
            This leader doesn&apos;t exist in your gallery.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to gallery
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    const next = loadLeaders().filter((l) => l.id !== leader.id);
    saveLeaders(next);
    router.push("/");
  };

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(leader.rawJson);
    } catch {
      // ignore
    }
  };

  const handleDownload = () => {
    const blob = new Blob([leader.rawJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${leader.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateAvatar = async () => {
    setAvatarError(null);
    setGeneratingAvatar(true);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderRawJson: leader.rawJson,
          leaderId: leader.id,
          aspectRatio: "1:1",
          outputFormat: "png",
        }),
      });

      const data = (await res.json()) as unknown;
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Avatar generation failed";
        throw new Error(msg);
      }

      const url =
        data &&
        typeof data === "object" &&
        "profilePicUrl" in data &&
        typeof (data as { profilePicUrl: unknown }).profilePicUrl === "string"
          ? (data as { profilePicUrl: string }).profilePicUrl
          : null;

      if (!url) throw new Error("Avatar generation returned no URL");

      const now = new Date().toISOString();
      const current = loadLeaders();
      const idx = current.findIndex((l) => l.id === leader.id);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = { ...next[idx], profilePicUrl: url, updatedAt: now };
        saveLeaders(next);
      }

      setRefreshKey((k) => k + 1);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Avatar generation failed");
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const handleGenerateIntroVideo = async () => {
    setIntroVideoError(null);
    setIntroVideoPredictionId(null);

    if (!profilePicUrl) {
      setIntroVideoError("Generate a profile pic first (we use it as the reference image for identity consistency).");
      return;
    }

    setGeneratingIntroVideo(true);
    try {
      const res = await fetch("/api/trailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderRawJson: leader.rawJson,
          leaderId: leader.id,
          imageUrl: profilePicUrl,
          durationSeconds: 10,
          aspectRatio: "16:9",
        }),
      });

      const data = (await res.json()) as unknown;
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Intro video generation failed";
        throw new Error(msg);
      }

      const predictionId =
        data && typeof data === "object" && "predictionId" in data && typeof (data as { predictionId: unknown }).predictionId === "string"
          ? (data as { predictionId: string }).predictionId
          : null;
      if (!predictionId) throw new Error("Intro video generation returned no predictionId");
      setIntroVideoPredictionId(predictionId);

      const deadline = Date.now() + 5 * 60_000; // 5 minutes
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000));

        const poll = await fetch(`/api/trailer/${predictionId}`, { cache: "no-store" });
        const pollData = (await poll.json()) as unknown;
        if (!poll.ok) {
          const msg =
            pollData && typeof pollData === "object" && "error" in pollData && typeof (pollData as { error: unknown }).error === "string"
              ? (pollData as { error: string }).error
              : "Intro video status check failed";
          throw new Error(msg);
        }

        const status =
          pollData && typeof pollData === "object" && "status" in pollData && typeof (pollData as { status: unknown }).status === "string"
            ? (pollData as { status: string }).status
            : null;
        const outputUrl =
          pollData && typeof pollData === "object" && "outputUrl" in pollData && typeof (pollData as { outputUrl: unknown }).outputUrl === "string"
            ? (pollData as { outputUrl: string }).outputUrl
            : null;
        const errMsg =
          pollData && typeof pollData === "object" && "error" in pollData && typeof (pollData as { error: unknown }).error === "string"
            ? (pollData as { error: string }).error
            : null;

        if (status === "succeeded") {
          if (!outputUrl) throw new Error("Intro video succeeded but returned no outputUrl");

          const now = new Date().toISOString();
          const current = loadLeaders();
          const idx = current.findIndex((l) => l.id === leader.id);
          if (idx >= 0) {
            const next = [...current];
            next[idx] = { ...next[idx], welcomeVideoUrl: outputUrl, updatedAt: now };
            saveLeaders(next);
          }

          setRefreshKey((k) => k + 1);
          return;
        }

        if (status === "failed" || status === "canceled") {
          throw new Error(errMsg || "Intro video generation failed");
        }
      }

      throw new Error("Intro video generation timed out (still processing on Replicate). Try again in a bit.");
    } catch (e) {
      setIntroVideoError(e instanceof Error ? e.message : "Intro video generation failed");
    } finally {
      setGeneratingIntroVideo(false);
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/[0.04] via-transparent to-transparent" />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <nav className="mb-8 flex items-center gap-2 text-sm">
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Gallery
            </Link>
          </Button>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
          <span className="truncate text-muted-foreground">{leader.name}</span>
        </nav>

        <header className="mb-10 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/[0.04] via-card to-accent/[0.02] p-6 sm:p-10">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
            <div className="lg:pt-1">
              <ProfilePic src={profilePicUrl} name={leader.name} size="2xl" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-4xl font-medium tracking-tight text-foreground sm:text-5xl">
                  {leader.name}
                </h1>
                {leader.tier && (
                  <Badge className="rounded-full bg-primary text-primary-foreground">
                    {leader.tier}
                  </Badge>
                )}
              </div>

              {leader.tagline && (
                <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
                  {leader.tagline}
                </p>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <code className="rounded-lg bg-foreground/5 px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  {leader.id}
                </code>
                {leader.vertical && (
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    {leader.vertical}
                  </span>
                )}
                {subDomains.slice(0, 3).map((sd) => (
                  <span
                    key={sd}
                    className="inline-flex items-center gap-1 rounded-full bg-foreground/5 px-3 py-1 text-xs text-muted-foreground"
                  >
                    <Hash className="h-3 w-3 opacity-60" />
                    {sd}
                  </span>
                ))}
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(leader.updatedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button
                  variant="default"
                  size="sm"
                  className="rounded-full"
                  onClick={handleGenerateAvatar}
                  disabled={generatingAvatar}
                >
                  {generatingAvatar ? (
                    <>
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />
                      Generate pic
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleGenerateIntroVideo}
                  disabled={generatingIntroVideo}
                >
                  {generatingIntroVideo ? (
                    <>
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70" />
                      Generating intro...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Generate intro video
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleCopyJson}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  Copy JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-3.5 w-3.5" />
                  Download
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => setShowActions(!showActions)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                  
                  {showActions && (
                    <div className="absolute left-0 top-full z-10 mt-2 w-40 rounded-xl border border-border bg-card p-1 shadow-lg">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                        onClick={handleDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete leader
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {avatarError && (
                <p className="mt-3 text-sm text-destructive">{avatarError}</p>
              )}
              {introVideoError && (
                <p className="mt-3 text-sm text-destructive">{introVideoError}</p>
              )}
              {!introVideoError && generatingIntroVideo && introVideoPredictionId && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Replicate prediction: <span className="font-mono">{introVideoPredictionId}</span>
                </p>
              )}
            </div>

            {typeof leader.compositeScore === "number" && (
              <div className="shrink-0 text-center lg:text-right">
                <div className="font-display text-6xl font-semibold tabular-nums text-foreground">
                  {leader.compositeScore}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Composite Score
                </div>
              </div>
            )}
          </div>
        </header>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-medium text-foreground">Intro Video</h2>
          </div>

          {typeof welcomeVideoUrl === "string" && welcomeVideoUrl.length > 0 ? (
            <VideoPlayer src={welcomeVideoUrl} title={`${leader.name} - Intro`} />
          ) : (
            <div className="rounded-2xl border border-border/60 bg-card p-6">
              <p className="text-sm text-muted-foreground">
                Generate a cohesive ~10s intro video using the leader’s profile photo as the identity anchor.
              </p>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleGenerateIntroVideo}
                  disabled={generatingIntroVideo}
                >
                  {generatingIntroVideo ? (
                    <>
                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3.5 w-3.5" />
                      Generate intro video
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </section>

        {scores && (
          <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {typeof scores.character === "number" && (
              <ScoreCard label="Character" value={scores.character} />
            )}
            {typeof scores.competence === "number" && (
              <ScoreCard label="Competence" value={scores.competence} />
            )}
            {typeof scores.impact === "number" && (
              <ScoreCard label="Impact" value={scores.impact} />
            )}
            {typeof scores.compositeScore === "number" && (
              <ScoreCard label="Composite" value={scores.compositeScore} />
            )}
          </div>
        )}

        {missionStatement ? (
          <div className="mb-10">
            <LongTextBlock label="Mission Statement" value={missionStatement} />
          </div>
        ) : null}

        {sections.length > 0 && (
          <Tabs defaultValue={sections[0]?.key} className="w-full">
            <TabsList className="mb-6 h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              {sections.map((s) => (
                <TabsTrigger
                  key={s.key}
                  value={s.key}
                  className={cn(
                    "rounded-full border border-border/60 bg-card px-4 py-2 text-sm font-medium",
                    "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  )}
                >
                  {s.title}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key} className="mt-0">
                <div className="rounded-2xl border border-border/60 bg-card p-6">
                  <RenderValue value={s.value} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
