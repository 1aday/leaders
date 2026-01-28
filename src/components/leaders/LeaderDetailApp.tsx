"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Download,
  FileText,
  Hash,
  Play,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn, calculateCompositeScore } from "@/lib/utils";
import { safeJsonParse } from "@/lib/safe-json";
import { fetchLeaderById, updateLeader, deleteLeader, fetchLeaderChat, saveLeaderChat, clearLeaderChat, type LeaderSummary } from "@/lib/db/leader-client";

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

function extractLeaderKeyFromRawJson(rawJson: string): string | null {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const meta =
      "metadata" in (parsed as Record<string, unknown>) && typeof (parsed as Record<string, unknown>).metadata === "object"
        ? ((parsed as Record<string, unknown>).metadata as Record<string, unknown>)
        : null;
    const leaderId = meta && typeof meta.leaderId === "string" ? meta.leaderId.trim() : "";
    return leaderId || null;
  } catch {
    return null;
  }
}

type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

function chatStorageKey(leaderId: string) {
  return `profilemaker.leaderChat.v1.${leaderId}`;
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

// Large Profile Picture component
function ProfilePicLarge({
  src,
  name,
  isLoading = false,
  hasVideo = false,
}: {
  src?: string;
  name: string;
  isLoading?: boolean;
  hasVideo?: boolean;
}) {
  const [error, setError] = React.useState(false);

  // Reset error state when src changes
  React.useEffect(() => {
    setError(false);
  }, [src]);

  const showFallback = !src || error;

  return (
    <div className={cn(
      "relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/30",
      isLoading && "ring-4 ring-primary/50 animate-pulse"
    )}>
      {showFallback ? (
        <div className={cn(
          "flex h-full w-full items-center justify-center bg-gradient-to-br text-7xl font-bold text-white",
          getGradient(name),
        )}>
          {getInitials(name)}
        </div>
      ) : (
        <Image
          key={src}
          src={src}
          alt={name}
          width={400}
          height={400}
          className="h-full w-full object-cover"
          onError={() => setError(true)}
        />
      )}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm font-medium text-white">Generating...</p>
          </div>
        </div>
      )}
      {hasVideo && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center md:hidden pointer-events-none">
          <div className="rounded-full bg-black/50 p-4 backdrop-blur-sm">
            <Play className="h-8 w-8 text-white" fill="white" />
          </div>
        </div>
      )}
    </div>
  );
}

// Video Player component - subtle play button, only visible on hover
function VideoPlayer({
  src,
  poster,
  isLoading = false,
}: {
  src: string;
  poster?: string;
  isLoading?: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);

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
    <div className={cn(
      "group relative aspect-square w-full overflow-hidden rounded-2xl bg-muted/30",
      isLoading && "ring-4 ring-primary/50 animate-pulse"
    )}>
      <video
        key={src}
        ref={videoRef}
        src={src}
        poster={poster}
        className="h-full w-full object-cover"
        muted={isMuted}
        playsInline
        loop
      />
      
      {/* Play/Pause button - always visible on mobile, hover on desktop */}
      <div className={cn(
        "absolute inset-0 flex items-center justify-center transition-all duration-200",
        // Mobile: always show when not playing
        "md:opacity-0 md:group-hover:opacity-100",
        // Desktop: show on hover
        isPlaying
          ? "bg-transparent opacity-0 md:group-hover:opacity-100"
          : "bg-black/10 md:opacity-0 md:group-hover:opacity-100 md:group-hover:bg-black/20",
      )}>
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "flex items-center justify-center rounded-full transition-all duration-200",
            isPlaying
              ? "h-10 w-10 bg-black/40 text-white/90 hover:bg-black/60"
              : "h-12 w-12 bg-white/80 text-foreground/80 shadow-md hover:bg-white hover:text-foreground hover:scale-105",
          )}
        >
          {isPlaying ? (
            <div className="flex gap-0.5">
              <div className="h-4 w-1 rounded-sm bg-current" />
              <div className="h-4 w-1 rounded-sm bg-current" />
            </div>
          ) : (
            <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
          )}
        </button>
      </div>

      {/* Bottom controls - only on hover when playing */}
      <div className={cn(
        "absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/50 to-transparent transition-opacity duration-200",
        "opacity-0 group-hover:opacity-100",
      )}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-white/90">Video</span>
          <button
            type="button"
            onClick={toggleMute}
            className="rounded-full bg-white/20 p-1.5 text-white/90 transition-colors hover:bg-white/30 hover:text-white"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center gap-3">
            <Sparkles className="h-8 w-8 animate-spin text-white" />
            <p className="text-sm font-medium text-white">Generating video...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Copy Button
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
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

// Long Text Block
function LongTextBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/10 p-6 border border-border/30">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground/70 uppercase tracking-wide">
          {label}
        </span>
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
    <div className="flex items-center gap-4 p-3 rounded-lg border border-border/30 hover:bg-accent/5 transition-colors">
      <div
        className="h-10 w-10 rounded-lg shadow-sm border border-border/40"
        style={{ backgroundColor: hex }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground">{name}</div>
        <div className="font-mono text-xs text-muted-foreground">{hex}</div>
      </div>
      <CopyButton text={hex} />
    </div>
  );
}

// Section wrapper
function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <h3 className="mb-4 text-sm font-semibold text-foreground/80 uppercase tracking-wide">
        {title}
      </h3>
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
    return <span className="text-sm text-foreground">{value}</span>;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span className="font-mono text-sm text-foreground">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.every((v) => typeof v === "string")) {
      return (
        <div className="flex flex-wrap gap-2">
          {(value as string[]).map((v, i) => (
            <Badge key={i} variant="secondary" className="rounded-full text-sm font-normal px-3 py-1">
              {v}
            </Badge>
          ))}
        </div>
      );
    }
    if (value.every((v) => isPlainObject(v) && typeof v.name === "string" && typeof v.hex === "string")) {
      return (
        <div className="space-y-3">
          {(value as Array<{ name: string; hex: string }>).map((c, i) => (
            <ColorSwatch key={i} name={c.name} hex={c.hex} />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {value.map((item, i) => (
          <div key={i} className="rounded-xl bg-muted/10 p-4 border border-border/30">
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
      <div className="space-y-6">
        {scalars.length > 0 && (
          <div className="rounded-xl border border-border/50 overflow-hidden shadow-sm">
            <table className="w-full">
              <tbody>
                {scalars.map(([k, v], idx) => (
                  <tr
                    key={k}
                    className={cn(
                      "transition-colors hover:bg-accent/8",
                      idx % 2 === 0 ? "bg-muted/5" : "bg-transparent"
                    )}
                  >
                    <td className="w-[200px] px-6 py-3.5 text-sm font-medium text-muted-foreground align-top border-r border-border/30">
                      {titleCase(k)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-foreground">
                      {String(v)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {complex.map(([k, v]) => (
          <Section key={k} title={titleCase(k)} className="mt-6 pt-6 border-t border-border/40">
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

  const profilePicUrl = getString(primaryImage, "url")
    ?? getString(visual, "profilePicUrl")
    ?? getString(core, "profilePicUrl");

  const welcomeVideoUrl = getString(standardVideo, "url")
    ?? getString(video, "welcomeVideoUrl")
    ?? getString(core, "welcomeVideoUrl");

  return { profilePicUrl, welcomeVideoUrl };
}

export function LeaderDetailApp({ id }: { id: string }) {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();
  const [leader, setLeader] = React.useState<LeaderSummary | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load leader from database
  React.useEffect(() => {
    async function loadLeader() {
      try {
        setLoading(true);
        const data = await fetchLeaderById(id);
        setLeader(data);

        // Also load chat history
        if (data) {
          try {
            const chatData = await fetchLeaderChat(data.id);
            justLoadedRef.current = true; // Prevent immediate save after load
            setChatMessages(chatData);
          } catch (e) {
            console.warn("Failed to load chat history:", e);
          }
        }

        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load leader");
        console.error("Failed to load leader:", e);
      } finally {
        setLoading(false);
        setMounted(true);
      }
    }
    loadLeader();
  }, [id]);

  const parsed = React.useMemo(() => {
    if (!leader) return null;
    const res = safeJsonParse(leader.rawJson);
    return res.ok ? res.value : null;
  }, [leader]);

  const [chatMessages, setChatMessages] = React.useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = React.useState("");
  const [chatSending, setChatSending] = React.useState(false);
  const [chatError, setChatError] = React.useState<string | null>(null);

  // Track if messages were just loaded to prevent immediate save
  const justLoadedRef = React.useRef(false);

  // Chat is now loaded in the main loadLeader useEffect above

  // Debounced save to database
  React.useEffect(() => {
    if (!leader || chatMessages.length === 0) return;

    // Don't save while chat is sending (avoid saving empty placeholder messages)
    if (chatSending) return;

    // Don't save immediately after loading from database
    if (justLoadedRef.current) {
      justLoadedRef.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      try {
        // Filter out empty messages (placeholders during streaming)
        const messagesToSave = chatMessages
          .filter(m => m.content.trim().length > 0)
          .slice(-80);

        if (messagesToSave.length > 0) {
          await saveLeaderChat(leader.id, messagesToSave);
        }
      } catch (e) {
        console.warn("Failed to save chat:", e);
        // Non-blocking - chat continues to work in memory
      }
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timer);
  }, [chatMessages, leader, chatSending]);

  // Intelligent auto-scroll: only scroll if user is already at bottom
  const [isUserScrolledUp, setIsUserScrolledUp] = React.useState(false);
  const lastScrollTopRef = React.useRef(0);

  // Check if user is at bottom of chat
  const checkIfAtBottom = React.useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return true;
    const threshold = 50; // pixels from bottom
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    return isAtBottom;
  }, []);

  // Track user scroll intent
  const handleChatScroll = React.useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const isAtBottom = checkIfAtBottom();
    const scrollingUp = el.scrollTop < lastScrollTopRef.current;

    lastScrollTopRef.current = el.scrollTop;

    // User is scrolled up if they're not at bottom
    setIsUserScrolledUp(!isAtBottom);
  }, [checkIfAtBottom]);

  // Auto-scroll only if user hasn't scrolled up
  React.useEffect(() => {
    if (chatScrollRef.current && !isUserScrolledUp) {
      // Use instant scroll during streaming to avoid blocking user input
      // Smooth scroll animations would override user's manual scrolling
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "auto",
      });
    }
  }, [chatMessages, isUserScrolledUp]);

  // Scroll to bottom on demand
  const scrollChatToBottom = () => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: "smooth",
      });
      setIsUserScrolledUp(false);
    }
  };

  const [generatingAvatar, setGeneratingAvatar] = React.useState(false);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [avatarPrompt, setAvatarPrompt] = React.useState<string | null>(null);
  const [showAvatarPrompt, setShowAvatarPrompt] = React.useState(false);
  const [loadingPromptPreview, setLoadingPromptPreview] = React.useState(false);
  const [generatingIntroVideo, setGeneratingIntroVideo] = React.useState(false);
  const [introVideoError, setIntroVideoError] = React.useState<string | null>(null);
  const [introVideoPredictionId, setIntroVideoPredictionId] = React.useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = React.useState<string | null>(null);
  const [showVideoPrompt, setShowVideoPrompt] = React.useState(false);
  
  // Refs to track async operation state (survives re-renders)
  const generatingVideoRef = React.useRef(false);
  const [chatInstructions, setChatInstructions] = React.useState<string | null>(null);
  const [showChatInstructions, setShowChatInstructions] = React.useState(false);
  const [loadingChatInstructions, setLoadingChatInstructions] = React.useState(false);

  // Show/hide scoring reasoning breakdown
  const [showScoringReasoning, setShowScoringReasoning] = React.useState(true);

  // Chat scroll state - auto-scroll to bottom on new messages
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  // Tabs scroll state
  const tabsScrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const dragStartX = React.useRef(0);
  const dragScrollLeft = React.useRef(0);

  const updateTabsScrollState = React.useCallback(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  React.useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;
    updateTabsScrollState();
    el.addEventListener("scroll", updateTabsScrollState);
    window.addEventListener("resize", updateTabsScrollState);
    return () => {
      el.removeEventListener("scroll", updateTabsScrollState);
      window.removeEventListener("resize", updateTabsScrollState);
    };
  }, [updateTabsScrollState]);

  const scrollTabs = (direction: "left" | "right") => {
    const el = tabsScrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.6;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Mouse drag scrolling for tabs
  const handleTabsMouseDown = React.useCallback((e: React.MouseEvent) => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setIsDragging(true);
    dragStartX.current = e.pageX - el.offsetLeft;
    dragScrollLeft.current = el.scrollLeft;
    el.style.scrollBehavior = 'auto'; // Disable smooth scroll during drag
  }, []);

  const handleTabsMouseMove = React.useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = tabsScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - dragStartX.current) * 1.5; // Multiply for faster drag
    el.scrollLeft = dragScrollLeft.current - walk;
  }, [isDragging]);

  const handleTabsMouseUpOrLeave = React.useCallback(() => {
    if (isDragging) {
      const el = tabsScrollRef.current;
      if (el) {
        el.style.scrollBehavior = 'smooth'; // Re-enable smooth scroll
      }
    }
    setIsDragging(false);
  }, [isDragging]);

  // Prevent click event when dragging
  const handleTabsClick = React.useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [isDragging]);

  // Extract media URLs
  const mediaUrls = React.useMemo(() => extractMediaUrls(parsed), [parsed]);
  const leaderProfilePicUrl = leader?.profilePicUrl;
  const leaderWelcomeVideoUrl = leader?.welcomeVideoUrl;
  // Profile pic: use saved URL first, then fallback to JSON schema URL
  const profilePicUrl: string | undefined =
    (typeof leaderProfilePicUrl === "string" && leaderProfilePicUrl.trim() ? leaderProfilePicUrl : undefined) ?? mediaUrls.profilePicUrl;
  // Video: ONLY use explicitly saved/generated video URL - don't fallback to JSON schema URLs
  // This ensures we only show video player when a video was actually generated
  const welcomeVideoUrl: string | undefined =
    (typeof leaderWelcomeVideoUrl === "string" && leaderWelcomeVideoUrl.trim() ? leaderWelcomeVideoUrl : undefined);

  // Extract structured data
  const root = isPlainObject(parsed) ? parsed : null;
  const metadata = root && isPlainObject(root.metadata) ? root.metadata : null;
  const core = root && isPlainObject(root.coreIdentity) ? root.coreIdentity : null;
  const scores = metadata && isPlainObject(metadata.leadershipScores) ? metadata.leadershipScores : null;
  const subDomains: string[] = getStringArray(metadata, "subDomains") ?? leader?.subDomains ?? [];
  const missionStatement = getString(core, "missionStatement");

  // Top-level sections for tabs
  const sections = React.useMemo(() => {
    if (!root) return [];
    return Object.entries(root)
      .filter(([k]) => k !== "$schema" && k !== "metadata") // Exclude metadata tab entirely
      .map(([key, value]) => {
        if (key === "coreIdentity" && isPlainObject(value)) {
          return {
            key,
            title: titleCase(key),
            value: omitKeys(value, ["name", "tagline", "profilePicUrl", "welcomeVideoUrl", "missionStatement"]),
          };
        }
        return { key, title: titleCase(key), value };
      })
      .filter((s) => {
        if (isPlainObject(s.value)) return Object.keys(s.value).length > 0;
        if (Array.isArray(s.value)) return s.value.length > 0;
        return s.value !== null && s.value !== undefined;
      });
  }, [root]);

  if (!mounted) return null;

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leader...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <h2 className="font-display text-2xl font-medium text-destructive mb-4">
            Error loading leader
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Retry
            </button>
            <Button asChild variant="outline">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to gallery
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

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

  const handleDelete = async () => {
    const leaderKey = extractLeaderKeyFromRawJson(leader.rawJson) ?? leader.id;

    try {
      // Delete from database (single source of truth)
      await deleteLeader(leaderKey);
      router.push("/");
    } catch (e) {
      console.error("Failed to delete leader:", e);
      setError(e instanceof Error ? e.message : "Failed to delete leader");
    }
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

  const handleSendChat = async () => {
    const text = chatInput.trim();
    if (!text) return;

    setChatError(null);
    setChatSending(true);
    const userMsg: ChatMsg = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setChatInput("");
    setChatMessages((prev) => [...prev, userMsg]);

    // Create placeholder assistant message for streaming
    const assistantMsgId =
      typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + 1);
    const assistantMsg: ChatMsg = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    setChatMessages((prev) => [...prev, assistantMsg]);

    try {
      const payload = {
        leaderRawJson: leader.rawJson,
        messages: [...chatMessages, userMsg].slice(-24).map((m) => ({ role: m.role, content: m.content })),
        stream: true,
      };

      const res = await fetch("/api/leader/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json()) as unknown;
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Chat failed";
        throw new Error(msg);
      }

      // Read the stream
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events from buffer
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || ""; // Keep incomplete chunk in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data) as { content?: string; error?: string };
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.content) {
              // Update the assistant message with new content
              setChatMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMsgId ? { ...msg, content: msg.content + parsed.content } : msg,
                ),
              );
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setChatError(msg);
      // Remove empty assistant message on error
      setChatMessages((prev) => prev.filter((msg) => msg.id !== assistantMsgId || msg.content.length > 0));
    } finally {
      setChatSending(false);
    }
  };

  const handlePreviewPrompt = async () => {
    setAvatarError(null);
    setLoadingPromptPreview(true);
    try {
      const res = await fetch("/api/avatar/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderRawJson: leader.rawJson,
          leaderId: leader.id,
        }),
      });

      const data = (await res.json()) as unknown;
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to preview prompt";
        throw new Error(msg);
      }

      const prompt =
        data &&
        typeof data === "object" &&
        "prompt" in data &&
        typeof (data as { prompt: unknown }).prompt === "string"
          ? (data as { prompt: string }).prompt
          : null;

      if (prompt) {
        setAvatarPrompt(prompt);
        setShowAvatarPrompt(true);
      }
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Failed to preview prompt");
    } finally {
      setLoadingPromptPreview(false);
    }
  };

  const handleViewChatInstructions = async () => {
    if (chatInstructions) {
      setShowChatInstructions(true);
      return;
    }
    
    setLoadingChatInstructions(true);
    try {
      const res = await fetch("/api/leader/chat/instructions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderRawJson: leader.rawJson,
        }),
      });

      const data = (await res.json()) as unknown;
      if (!res.ok) {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Failed to load instructions";
        throw new Error(msg);
      }

      const systemPrompt =
        data &&
        typeof data === "object" &&
        "systemPrompt" in data &&
        typeof (data as { systemPrompt: unknown }).systemPrompt === "string"
          ? (data as { systemPrompt: string }).systemPrompt
          : null;

      if (systemPrompt) {
        setChatInstructions(systemPrompt);
        setShowChatInstructions(true);
      }
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Failed to load instructions");
    } finally {
      setLoadingChatInstructions(false);
    }
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
          isRegeneration: !!profilePicUrl, // Generate varied avatar if regenerating
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

      const prompt =
        data &&
        typeof data === "object" &&
        "prompt" in data &&
        typeof (data as { prompt: unknown }).prompt === "string"
          ? (data as { prompt: string }).prompt
          : null;
      
      if (prompt) {
        setAvatarPrompt(prompt);
      }

      if (!url) throw new Error("Avatar generation returned no URL");

      // Add cache-busting timestamp to URL for mobile browsers
      const urlWithCacheBust = url + (url.includes('?') ? '&' : '?') + `t=${Date.now()}`;

      // Update the leader's raw JSON to embed the profilePicUrl in coreIdentity
      const now = new Date().toISOString();
      let updatedRawJson = leader.rawJson;

      try {
        const leaderJson = JSON.parse(leader.rawJson) as unknown;
        if (leaderJson && typeof leaderJson === 'object') {
          const leaderObj = leaderJson as Record<string, unknown>;

          // Ensure coreIdentity exists
          if (!leaderObj.coreIdentity || typeof leaderObj.coreIdentity !== 'object') {
            leaderObj.coreIdentity = {};
          }

          // Update profilePicUrl in coreIdentity with cache-busting timestamp
          (leaderObj.coreIdentity as Record<string, unknown>).profilePicUrl = urlWithCacheBust;

          // Also update lastModified if metadata exists
          if (leaderObj.metadata && typeof leaderObj.metadata === 'object') {
            (leaderObj.metadata as Record<string, unknown>).lastModified = now;
          }

          updatedRawJson = JSON.stringify(leaderObj, null, 2);
        }
      } catch (e) {
        console.warn('[Avatar] Failed to update raw JSON with profilePicUrl:', e);
      }

      // Update in database
      await updateLeader(leader.id, updatedRawJson, {
        profilePicUrl: urlWithCacheBust,
      });

      // Reload leader to show updated data
      const refreshed = await fetchLeaderById(leader.id);
      setLeader(refreshed);
    } catch (e) {
      setAvatarError(e instanceof Error ? e.message : "Avatar generation failed");
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const handleGenerateIntroVideo = async () => {
    // Prevent double-clicking using ref (survives async/re-renders)
    if (generatingVideoRef.current || generatingIntroVideo) return;
    
    setIntroVideoError(null);
    setIntroVideoPredictionId(null);

    if (!profilePicUrl) {
      setIntroVideoError("Generate a profile pic first.");
      return;
    }

    generatingVideoRef.current = true;
    setGeneratingIntroVideo(true);
    let completed = false;
    
    try {
      const res = await fetch("/api/trailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaderRawJson: leader.rawJson,
          leaderId: leader.id,
          imageUrl: profilePicUrl,
          durationSeconds: 10,
          aspectRatio: "1:1",
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

      const videoPromptFromResponse =
        data && typeof data === "object" && "prompt" in data && typeof (data as { prompt: unknown }).prompt === "string"
          ? (data as { prompt: string }).prompt
          : null;
      if (videoPromptFromResponse) {
        setVideoPrompt(videoPromptFromResponse);
      }

      const deadline = Date.now() + 15 * 60_000; // 15 minutes - video generation can take 10+ mins
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

          // Add cache-busting timestamp to URL for mobile browsers
          const videoUrlWithCacheBust = outputUrl + (outputUrl.includes('?') ? '&' : '?') + `t=${Date.now()}`;

          // Update the leader's raw JSON to embed the welcomeVideoUrl in coreIdentity
          const now = new Date().toISOString();
          let updatedRawJson = leader.rawJson;

          try {
            const leaderJson = JSON.parse(leader.rawJson) as unknown;
            if (leaderJson && typeof leaderJson === 'object') {
              const leaderObj = leaderJson as Record<string, unknown>;

              // Ensure coreIdentity exists
              if (!leaderObj.coreIdentity || typeof leaderObj.coreIdentity !== 'object') {
                leaderObj.coreIdentity = {};
              }

              // Update welcomeVideoUrl in coreIdentity with cache-busting timestamp
              (leaderObj.coreIdentity as Record<string, unknown>).welcomeVideoUrl = videoUrlWithCacheBust;

              // Also update lastModified if metadata exists
              if (leaderObj.metadata && typeof leaderObj.metadata === 'object') {
                (leaderObj.metadata as Record<string, unknown>).lastModified = now;
              }

              updatedRawJson = JSON.stringify(leaderObj, null, 2);
            }
          } catch (e) {
            console.warn('[Video] Failed to update raw JSON with welcomeVideoUrl:', e);
          }

          // Update in database
          await updateLeader(leader.id, updatedRawJson, {
            welcomeVideoUrl: videoUrlWithCacheBust,
          });

          // Reload leader to show updated data
          const refreshed = await fetchLeaderById(leader.id);
          setLeader(refreshed);

          completed = true;
          generatingVideoRef.current = false;
          setGeneratingIntroVideo(false);
          return;
        }

        if (status === "failed" || status === "canceled") {
          throw new Error(errMsg || "Intro video generation failed");
        }
      }

      throw new Error("Intro video generation timed out. Try again in a bit.");
    } catch (e) {
      setIntroVideoError(e instanceof Error ? e.message : "Intro video generation failed");
    } finally {
      if (!completed) {
        generatingVideoRef.current = false;
        setGeneratingIntroVideo(false);
      }
    }
  };

  const calculatedComposite = scores
    ? calculateCompositeScore(
        scores.character as number | undefined,
        scores.competence as number | undefined,
        scores.impact as number | undefined,
        typeof scores.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier : 1.0
      )
    : undefined;

  return (
    <>
      {ConfirmDialog}
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Left: Back button */}
          <Button asChild variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Gallery</span>
            </Link>
          </Button>

          {/* Center: Logo */}
          <Link href="/" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 group">
            <span className="text-lg font-semibold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent group-hover:from-accent group-hover:via-primary group-hover:to-accent transition-all duration-300">
              Leaders.ai
            </span>
          </Link>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {leader && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  const shouldDelete = await confirm({
                    title: "Delete this leader?",
                    description: "This action cannot be undone.",
                    confirmText: "Delete",
                    cancelText: "Cancel",
                    variant: "danger",
                  });
                  if (shouldDelete) await handleDelete();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">

        <div className="grid gap-10 lg:grid-cols-[340px_1fr]">
          {/* LEFT SIDEBAR */}
          <aside className="space-y-6">
            {/* Profile Image or Video - only show VideoPlayer if there's an actual video URL */}
            {welcomeVideoUrl && welcomeVideoUrl.trim() ? (
              <VideoPlayer
                src={welcomeVideoUrl}
                poster={profilePicUrl}
                isLoading={generatingIntroVideo}
              />
            ) : (
              <ProfilePicLarge
                src={profilePicUrl}
                name={leader.name}
                isLoading={generatingAvatar || generatingIntroVideo}
                hasVideo={false}
              />
            )}
            
            {/* Generation Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2 rounded-xl h-10 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                onClick={handleGenerateAvatar}
                disabled={generatingAvatar || loadingPromptPreview}
              >
                <Sparkles className="h-4 w-4" />
                {generatingAvatar ? "Generating…" : (profilePicUrl ? "Regenerate Avatar" : "Generate Avatar")}
              </Button>
              {profilePicUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-2 rounded-xl h-10 border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                  onClick={handleGenerateIntroVideo}
                  disabled={generatingIntroVideo}
                >
                  <Play className="h-4 w-4" />
                  {generatingIntroVideo ? "Generating…" : (welcomeVideoUrl ? "Regenerate Video" : "Generate Video")}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-10 px-3"
                onClick={handlePreviewPrompt}
                disabled={generatingAvatar || loadingPromptPreview}
                title="Preview image prompt"
              >
                {loadingPromptPreview ? "…" : "?"}
              </Button>
            </div>
            
            {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
            {introVideoError && <p className="text-xs text-destructive">{introVideoError}</p>}
            {generatingIntroVideo && introVideoPredictionId && (
              <p className="text-[10px] text-muted-foreground font-mono break-all">{introVideoPredictionId}</p>
            )}
            
            {/* Prompt viewers */}
            {avatarPrompt && (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  onClick={() => setShowAvatarPrompt(!showAvatarPrompt)}
                >
                  <span className="font-medium">Image Prompt</span>
                  {showAvatarPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showAvatarPrompt && (
                  <div className="border-t border-border/40 px-4 py-4 bg-muted/10">
                    <p className="text-[11px] leading-relaxed text-foreground/80 font-mono whitespace-pre-wrap break-all max-w-full">
                      {avatarPrompt}
                    </p>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(avatarPrompt); } catch {}
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {videoPrompt && (
              <div className="rounded-xl border border-border/40 overflow-hidden">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                  onClick={() => setShowVideoPrompt(!showVideoPrompt)}
                >
                  <span className="font-medium">Video Prompt</span>
                  {showVideoPrompt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showVideoPrompt && (
                  <div className="border-t border-border/40 px-4 py-4 bg-muted/10">
                    <p className="text-[11px] leading-relaxed text-foreground/80 font-mono whitespace-pre-wrap break-all max-w-full">
                      {videoPrompt}
                    </p>
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(videoPrompt); } catch {}
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Identity */}
            <div className="pt-2">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
                {leader.name}
              </h1>
              {leader.tagline && (
                <p className="mt-2 text-base text-muted-foreground leading-relaxed">
                  {leader.tagline}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {leader.tier && <Badge variant="default" className="rounded-full">{leader.tier}</Badge>}
                {leader.vertical && <Badge variant="secondary" className="rounded-full">{leader.vertical}</Badge>}
              </div>

              {subDomains.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {subDomains.slice(0, 6).map((sd) => (
                    <span
                      key={sd}
                      className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-1 text-[11px] text-muted-foreground"
                    >
                      <Hash className="h-2.5 w-2.5" />
                      {sd}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Scores */}
            {scores ? (
              <>
                <div className="grid grid-cols-4 gap-3 py-4 border-y border-border/40">
                  {typeof scores.character === "number" && (
                    <div className="text-center">
                      <div className="text-2xl font-semibold tabular-nums">{scores.character}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Char</div>
                    </div>
                  )}
                  {typeof scores.competence === "number" && (
                    <div className="text-center">
                      <div className="text-2xl font-semibold tabular-nums">{scores.competence}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Comp</div>
                    </div>
                  )}
                  {typeof scores.impact === "number" && (
                    <div className="text-center">
                      <div className="text-2xl font-semibold tabular-nums">{scores.impact}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Impact</div>
                    </div>
                  )}
                  {typeof calculatedComposite === "number" && (
                    <div className="text-center">
                      <div className="text-2xl font-semibold tabular-nums text-primary">{calculatedComposite}</div>
                      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Total</div>
                      {typeof scores.jobsRuleMultiplier === "number" && scores.jobsRuleMultiplier < 1.0 && (
                        <div className="text-[9px] text-primary/60 mt-0.5 font-semibold">
                          ×{scores.jobsRuleMultiplier.toFixed(2)}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Scoring Reasoning - collapsible */}
                {scores.scoringReasoning && typeof scores.scoringReasoning === "object" && (
                  <div className="rounded-xl border border-border/40 overflow-hidden">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      onClick={() => setShowScoringReasoning(!showScoringReasoning)}
                    >
                      <span className="font-medium">Scoring Breakdown</span>
                      {showScoringReasoning ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {showScoringReasoning && (
                      <div className="border-t border-border/40 px-4 py-4 bg-muted/10 space-y-4">
                        {typeof (scores.scoringReasoning as any).character === "string" && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                              Character ({typeof scores.character === "number" ? scores.character : "?"}) • 39% weight
                            </div>
                            <p className="text-[11px] leading-relaxed text-foreground/80">
                              {(scores.scoringReasoning as any).character}
                            </p>
                          </div>
                        )}
                        {typeof (scores.scoringReasoning as any).competence === "string" && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                              Competence ({typeof scores.competence === "number" ? scores.competence : "?"}) • 30% weight
                            </div>
                            <p className="text-[11px] leading-relaxed text-foreground/80">
                              {(scores.scoringReasoning as any).competence}
                            </p>
                          </div>
                        )}
                        {typeof (scores.scoringReasoning as any).impact === "string" && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                              Impact ({typeof scores.impact === "number" ? scores.impact : "?"}) • 31% weight
                            </div>
                            <p className="text-[11px] leading-relaxed text-foreground/80">
                              {(scores.scoringReasoning as any).impact}
                            </p>
                          </div>
                        )}
                        {typeof (scores.scoringReasoning as any).jobsRule === "string" && (
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                              Jobs Rule (×{typeof scores.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier.toFixed(2) : "1.00"})
                            </div>
                            <p className="text-[11px] leading-relaxed text-foreground/80">
                              {(scores.scoringReasoning as any).jobsRule}
                            </p>
                          </div>
                        )}
                        {typeof scores.character === "number" && typeof scores.competence === "number" && typeof scores.impact === "number" && (
                          <div className="pt-3 border-t border-border/20">
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
                              Final Calculation
                            </div>
                            <p className="text-[11px] leading-relaxed text-foreground/80 font-mono">
                              Achievement = ({scores.character} × 0.39) + ({scores.competence} × 0.30) + ({scores.impact} × 0.31) = {Math.round((scores.character * 0.39) + (scores.competence * 0.30) + (scores.impact * 0.31))}
                              <br />
                              Final = {Math.round((scores.character * 0.39) + (scores.competence * 0.30) + (scores.impact * 0.31))} × {typeof scores.jobsRuleMultiplier === "number" ? scores.jobsRuleMultiplier.toFixed(2) : "1.00"} = {calculatedComposite}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-amber-600 dark:text-amber-400 mb-1">
                      No Leadership Scores
                    </div>
                    <div className="text-xs text-foreground/70 leading-relaxed">
                      This leader was generated before the Jesus Christ baseline scoring system was implemented. Delete and regenerate this leader to get proper Character, Competence, Impact, and Jobs Rule scores (100/100/100 baseline).
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1 rounded-xl" onClick={handleCopyJson}>
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button variant="ghost" size="sm" className="flex-1 rounded-xl" onClick={handleDownload}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  const confirmed = await confirm({
                    title: `Delete ${leader.name}?`,
                    description: "This will permanently remove this leader from your gallery. This action cannot be undone.",
                    confirmText: "Delete",
                    cancelText: "Keep",
                    variant: "danger",
                  });
                  if (confirmed) await handleDelete();
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Meta */}
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>ID</span>
                <code className="text-[10px] font-mono">{leader.id}</code>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main className="min-w-0 space-y-8">
            {/* Chat */}
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-medium text-foreground">
                  Chat with {leader.name}
                </h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={handleViewChatInstructions}
                    disabled={loadingChatInstructions}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {loadingChatInstructions ? "…" : "Instructions"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={async () => {
                      if (!leader) return;
                      try {
                        await clearLeaderChat(leader.id);
                        setChatMessages([]);
                      } catch (e) {
                        console.error("Failed to clear chat:", e);
                        // Still clear UI even if DB clear fails
                        setChatMessages([]);
                      }
                    }}
                    disabled={chatSending || chatMessages.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              {/* Chat Instructions Panel */}
              {showChatInstructions && chatInstructions && (
                <div className="mb-4 rounded-2xl border border-border/40 overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 bg-muted/30">
                    <span className="text-sm font-medium">System Instructions</span>
                    <button
                      type="button"
                      onClick={() => setShowChatInstructions(false)}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-5 max-h-[300px] overflow-y-auto">
                    <pre className="text-xs leading-relaxed text-foreground/80 font-mono whitespace-pre-wrap">
                      {chatInstructions}
                    </pre>
                  </div>
                  <div className="px-5 py-3 border-t border-border/40 bg-muted/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(chatInstructions); } catch {}
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/40 bg-card/30 relative">
                {/* Scroll to bottom button - appears when user scrolls up */}
                {isUserScrolledUp && (
                  <button
                    type="button"
                    onClick={scrollChatToBottom}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200 text-sm font-medium animate-in fade-in-0 slide-in-from-bottom-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    New messages
                  </button>
                )}
                <div
                  ref={chatScrollRef}
                  onScroll={handleChatScroll}
                  className="max-h-[400px] overflow-y-auto scroll-smooth overscroll-contain scrollbar-thin"
                >
                  <div className="space-y-4 p-6 min-h-[120px]">
                    {chatMessages.length === 0 ? (
                      <p className="text-muted-foreground">Start the conversation…</p>
                    ) : (
                      chatMessages.map((m) => (
                        <div
                          key={m.id}
                          className={cn(
                            "flex gap-3 items-start",
                            m.role === "user" ? "justify-end" : "justify-start"
                          )}
                        >
                          {/* AI Avatar - only show for assistant messages */}
                          {m.role === "assistant" && (
                            <div className="flex-shrink-0 mt-1">
                              {leader?.profilePicUrl ? (
                                <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-border/30 bg-muted">
                                  <Image
                                    src={leader.profilePicUrl}
                                    alt={leader.name}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 ring-2 ring-border/30 flex items-center justify-center">
                                  <span className="text-xs font-semibold text-primary">
                                    {leader?.name?.charAt(0) || "AI"}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          <div
                            className={cn(
                              "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                              m.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground",
                            )}
                          >
                            {m.role === "assistant" ? (
                              m.content.trim() ? (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-headings:my-2 prose-code:bg-black/10 prose-code:dark:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/10 prose-pre:dark:bg-white/10">
                                  <ReactMarkdown>{m.content}</ReactMarkdown>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-muted-foreground/60">
                                  <div className="flex gap-1">
                                    <span className="inline-block w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "0ms", animationDuration: "1.4s" }} />
                                    <span className="inline-block w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "200ms", animationDuration: "1.4s" }} />
                                    <span className="inline-block w-2 h-2 rounded-full bg-primary/40 animate-pulse" style={{ animationDelay: "400ms", animationDuration: "1.4s" }} />
                                  </div>
                                  <span className="text-xs">Thinking…</span>
                                </div>
                              )
                            ) : (
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="border-t border-border/40 p-4">
                  {chatError && <p className="mb-3 text-sm text-destructive">{chatError}</p>}
                  
                  <div className="flex gap-3">
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Write a message…"
                      className="min-h-[48px] flex-1 resize-none rounded-xl border-0 bg-muted/40 px-4 py-3 text-sm placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/20"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (!chatSending) void handleSendChat();
                        }
                      }}
                      disabled={chatSending}
                      spellCheck={false}
                    />
                    <Button
                      className="h-[48px] rounded-xl px-6"
                      onClick={() => void handleSendChat()}
                      disabled={chatSending || !chatInput.trim()}
                    >
                      {chatSending ? "…" : "Send"}
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {/* Mission */}
            {missionStatement && (
              <section>
                <LongTextBlock label="Mission Statement" value={missionStatement} />
              </section>
            )}

            {/* Tabs */}
            {sections.length > 0 && (
              <section>
                <Tabs defaultValue={sections[0]?.key} className="w-full">
                  <div className="relative mb-6">
                    {/* Left gradient fade indicator */}
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background via-background/80 to-transparent z-10 pointer-events-none transition-opacity duration-300",
                        canScrollLeft ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />

                    {/* Right gradient fade indicator */}
                    <div
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-background via-background/80 to-transparent z-10 pointer-events-none transition-opacity duration-300",
                        canScrollRight ? "opacity-100" : "opacity-0"
                      )}
                      aria-hidden="true"
                    />

                    {/* Left scroll button - subtle, appears on hover */}
                    <button
                      type="button"
                      onClick={() => scrollTabs("left")}
                      className={cn(
                        "absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-card/95 backdrop-blur border border-border/60 shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-md transition-all duration-200",
                        canScrollLeft ? "opacity-0 hover:opacity-100" : "opacity-0 pointer-events-none"
                      )}
                      aria-label="Scroll tabs left"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    {/* Right scroll button - subtle, appears on hover */}
                    <button
                      type="button"
                      onClick={() => scrollTabs("right")}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-card/95 backdrop-blur border border-border/60 shadow-sm text-muted-foreground hover:text-primary hover:border-primary/30 hover:shadow-md transition-all duration-200",
                        canScrollRight ? "opacity-0 hover:opacity-100" : "opacity-0 pointer-events-none"
                      )}
                      aria-label="Scroll tabs right"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>

                    {/* Scrollable tabs container with smooth scroll and drag support */}
                    <div
                      ref={tabsScrollRef}
                      className={cn(
                        "overflow-x-auto scrollbar-none scroll-smooth select-none",
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                      )}
                      style={{ scrollBehavior: 'smooth' }}
                      onMouseDown={handleTabsMouseDown}
                      onMouseMove={handleTabsMouseMove}
                      onMouseUp={handleTabsMouseUpOrLeave}
                      onMouseLeave={handleTabsMouseUpOrLeave}
                      onClick={handleTabsClick}
                    >
                      <TabsList className="inline-flex h-auto gap-2 bg-transparent p-1 justify-start min-w-full">
                        {sections.map((s) => (
                          <TabsTrigger
                            key={s.key}
                            value={s.key}
                            className="relative shrink-0 px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-200 rounded-lg border border-transparent data-[state=active]:text-[oklch(0.55_0.16_45)] data-[state=active]:font-semibold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[oklch(0.55_0.16_45)] after:opacity-0 after:transition-opacity after:duration-200 data-[state=active]:after:opacity-100 hover:bg-accent/5"
                          >
                            {s.title}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </div>

                  {sections.map((s) => (
                    <TabsContent
                      key={s.key}
                      value={s.key}
                      className="mt-0 text-left animate-in fade-in-0 slide-in-from-bottom-2 duration-300 scroll-mt-0 focus:outline-none"
                    >
                      <div className="rounded-2xl bg-muted/10 p-8 text-left border border-border/20 min-h-[200px]">
                        <RenderValue value={s.value} />
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
    </>
  );
}
