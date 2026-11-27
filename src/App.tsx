import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, Bookmark, CalendarDays, Check, CheckCircle2,
  ChevronLeft, ChevronRight, Copy, Heart, Menu, MessageSquareText, Monitor, Moon, Radio,
  RefreshCw, Repeat2, Search, ShieldCheck, Sparkles, Sun, TrendingUp,
  Users, X, Zap
} from "lucide-react";
import postsData from "./data/posts.json";
import peopleData from "./data/people.json";
import historyData from "./data/history.json";
import statusData from "./data/status.json";

/**
 * ResetRadar
 * Dependencies: react, lucide-react, Tailwind CSS
 * Data comes from src/data/*.json (posts / people / history / status),
 * refreshed every 12 hours by Muse and deployed automatically.
 */

type Provider = "openai" | "google" | "anthropic";
type PostCategory = "reset" | "person";
type ThemeMode = "system" | "light" | "dark";
type NavKey = "feed" | "people" | "probability" | "history" | "bookmarks";

type Post = {
  id: string;
  provider: Provider;
  providerLabel: string;
  category: PostCategory;
  author: string;
  handle: string;
  avatarUrl?: string;
  role: string;
  publishedAt: string; // ISO timestamp or YYYY-MM-DD HH:mm:ss interpreted as Beijing time by the API contract
  timeVerified?: boolean; // true when publishedAt carries a real publish time (via Grok X search); otherwise date-only display
  summary: string;
  originalText: string;
  sourceNote: string;
  sourceUrl?: string;
  sourceVerified: boolean;
  pinned?: boolean;
  reset?: {
    announcedAt?: string;
    effectiveAt?: string;
    expiresAt?: string;
    probability24h?: number;
    probabilityReason?: string;
    resetNote?: string;
  };
  likes: number;
  reposts: number;
  liked: boolean;
  reposted: boolean;
  bookmarked: boolean;
};

type Person = {
  name: string;
  handle: string;
  provider: Provider;
  role: string;
  initials: string;
  avatarUrl?: string;
};

const PROVIDERS: Record<Provider, { name: string; product: string; color: string }> = {
  openai: { name: "OpenAI", product: "ChatGPT / Codex", color: "text-emerald-500" },
  google: { name: "Google", product: "Gemini / Antigravity", color: "text-blue-500" },
  anthropic: { name: "Anthropic", product: "Claude / Claude Code", color: "text-orange-500" },
};

// Brand icons from Lobe Icons (@lobehub/icons-static-svg, MIT): OpenAI / Gemini / Claude.
// Inline SVG paths with fill=currentColor so they follow the provider color in both themes.
const PROVIDER_BORDER: Record<Provider, string> = {
  openai: "border-l-emerald-500",
  google: "border-l-blue-500",
  anthropic: "border-l-orange-500",
};

const PROVIDER_ICON_PATHS: Record<Provider, string> = {
  openai: "M9.205 8.658v-2.26c0-.19.072-.333.238-.428l4.543-2.616c.619-.357 1.356-.523 2.117-.523 2.854 0 4.662 2.212 4.662 4.566 0 .167 0 .357-.024.547l-4.71-2.759a.797.797 0 00-.856 0l-5.97 3.473zm10.609 8.8V12.06c0-.333-.143-.57-.429-.737l-5.97-3.473 1.95-1.118a.433.433 0 01.476 0l4.543 2.617c1.309.76 2.189 2.378 2.189 3.948 0 1.808-1.07 3.473-2.76 4.163zM7.802 12.703l-1.95-1.142c-.167-.095-.239-.238-.239-.428V5.899c0-2.545 1.95-4.472 4.591-4.472 1 0 1.927.333 2.712.928L8.23 5.067c-.285.166-.428.404-.428.737v6.898zM12 15.128l-2.795-1.57v-3.33L12 8.658l2.795 1.57v3.33L12 15.128zm1.796 7.23c-1 0-1.927-.332-2.712-.927l4.686-2.712c.285-.166.428-.404.428-.737v-6.898l1.974 1.142c.167.095.238.238.238.428v5.233c0 2.545-1.974 4.472-4.614 4.472zm-5.637-5.303l-4.544-2.617c-1.308-.761-2.188-2.378-2.188-3.948A4.482 4.482 0 014.21 6.327v5.423c0 .333.143.571.428.738l5.947 3.449-1.95 1.118a.432.432 0 01-.476 0zm-.262 3.9c-2.688 0-4.662-2.021-4.662-4.519 0-.19.024-.38.047-.57l4.686 2.71c.286.167.571.167.856 0l5.97-3.448v2.26c0 .19-.07.333-.237.428l-4.543 2.616c-.619.357-1.356.523-2.117.523zm5.899 2.83a5.947 5.947 0 005.827-4.756C22.287 18.339 24 15.84 24 13.296c0-1.665-.713-3.282-1.998-4.448.119-.5.19-.999.19-1.498 0-3.401-2.759-5.947-5.946-5.947-.642 0-1.26.095-1.88.31A5.962 5.962 0 0010.205 0a5.947 5.947 0 00-5.827 4.757C1.713 5.447 0 7.945 0 10.49c0 1.666.713 3.283 1.998 4.448-.119.5-.19 1-.19 1.499 0 3.401 2.759 5.946 5.946 5.946.642 0 1.26-.095 1.88-.309a5.96 5.96 0 004.162 1.713z",
  google: "M20.616 10.835a14.147 14.147 0 01-4.45-3.001 14.111 14.111 0 01-3.678-6.452.503.503 0 00-.975 0 14.134 14.134 0 01-3.679 6.452 14.155 14.155 0 01-4.45 3.001c-.65.28-1.318.505-2.002.678a.502.502 0 000 .975c.684.172 1.35.397 2.002.677a14.147 14.147 0 014.45 3.001 14.112 14.112 0 013.679 6.453.502.502 0 00.975 0c.172-.685.397-1.351.677-2.003a14.145 14.145 0 013.001-4.45 14.113 14.113 0 016.453-3.678.503.503 0 000-.975 13.245 13.245 0 01-2.003-.678z",
  anthropic: "M4.709 15.955l4.72-2.647.08-.23-.08-.128H9.2l-.79-.048-2.698-.073-2.339-.097-2.266-.122-.571-.121L0 11.784l.055-.352.48-.321.686.06 1.52.103 2.278.158 1.652.097 2.449.255h.389l.055-.157-.134-.098-.103-.097-2.358-1.596-2.552-1.688-1.336-.972-.724-.491-.364-.462-.158-1.008.656-.722.881.06.225.061.893.686 1.908 1.476 2.491 1.833.365.304.145-.103.019-.073-.164-.274-1.355-2.446-1.446-2.49-.644-1.032-.17-.619a2.97 2.97 0 01-.104-.729L6.283.134 6.696 0l.996.134.42.364.62 1.414 1.002 2.229 1.555 3.03.456.898.243.832.091.255h.158V9.01l.128-1.706.237-2.095.23-2.695.08-.76.376-.91.747-.492.584.28.48.685-.067.444-.286 1.851-.559 2.903-.364 1.942h.212l.243-.242.985-1.306 1.652-2.064.73-.82.85-.904.547-.431h1.033l.76 1.129-.34 1.166-1.064 1.347-.881 1.142-1.264 1.7-.79 1.36.073.11.188-.02 2.856-.606 1.543-.28 1.841-.315.833.388.091.395-.328.807-1.969.486-2.309.462-3.439.813-.042.03.049.061 1.549.146.662.036h1.622l3.02.225.79.522.474.638-.079.485-1.215.62-1.64-.389-3.829-.91-1.312-.329h-.182v.11l1.093 1.068 2.006 1.81 2.509 2.33.127.578-.322.455-.34-.049-2.205-1.657-.851-.747-1.926-1.62h-.128v.17l.444.649 2.345 3.521.122 1.08-.17.353-.608.213-.668-.122-1.374-1.925-1.415-2.167-1.143-1.943-.14.08-.674 7.254-.316.37-.729.28-.607-.461-.322-.747.322-1.476.389-1.924.315-1.53.286-1.9.17-.632-.012-.042-.14.018-1.434 1.967-2.18 2.945-1.726 1.845-.414.164-.717-.37.067-.662.401-.589 2.388-3.036 1.44-1.882.93-1.086-.006-.158h-.055L4.132 18.56l-1.13.146-.487-.456.061-.746.231-.243 1.908-1.312-.006.006z",
};

type ProviderStatus = { probability24h: number; probabilityReason: string; summary: string; lastResetAt: string; lastResetTitle: string };
const STATUS = statusData as { updatedAt: string; providers: Record<Provider, ProviderStatus> };

const PEOPLE = peopleData as Person[];

const INITIAL_POSTS = postsData as unknown as Post[];

const HISTORY = historyData as { at: string; provider: Provider; title: string; detail: string }[];

const TIME_ZONE = "Asia/Shanghai";
const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hourCycle: "h23",
});

function formatBeijingTime(value?: string) {
  if (!value) return "待确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "待确认";
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatBeijingDate(value?: string) {
  if (!value) return "待确认";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "待确认";
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem("resetradar-theme");
      return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
      return "system";
    }
  });
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("resetradar-theme", mode); } catch { /* storage may be unavailable */ }
  }, [mode]);

  return { mode, setMode, isDark: mode === "system" ? systemDark : mode === "dark" };
}

function useToast() {
  const [message, setMessage] = useState("");
  const show = useCallback((next: string) => {
    setMessage(next);
    window.setTimeout(() => setMessage((current) => current === next ? "" : current), 2600);
  }, []);
  return { message, show };
}

function Avatar({ name, provider, avatarUrl, small = false }: { name: string; provider: Provider; avatarUrl?: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const colors: Record<Provider, string> = {
    openai: "from-emerald-500 to-teal-700",
    google: "from-blue-500 to-indigo-600",
    anthropic: "from-amber-500 to-orange-700",
  };
  const size = small ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs";
  if (avatarUrl && !failed) {
    return <img src={avatarUrl} alt={`${name} 的头像`} loading="lazy" onError={() => setFailed(true)} className={`shrink-0 rounded-full object-cover ${size}`} />;
  }
  return (
    <div className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${colors[provider]} font-bold text-white ${size}`}>
      {initials}
    </div>
  );
}

function ProviderMark({ provider, small = false, medium = false }: { provider: Provider; small?: boolean; medium?: boolean }) {
  const item = PROVIDERS[provider];
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={item.name} className={`${small ? "h-3.5 w-3.5" : medium ? "h-[18px] w-[18px]" : "h-5 w-5"} shrink-0 ${item.color}`} fill="currentColor" fillRule="evenodd">
      <path d={PROVIDER_ICON_PATHS[provider]} />
    </svg>
  );
}

function ThemeControl({ mode, onChange, compact = false }: { mode: ThemeMode; onChange: (mode: ThemeMode) => void; compact?: boolean }) {
  const options = [
    { id: "system" as const, label: "系统", Icon: Monitor },
    { id: "light" as const, label: "浅色", Icon: Sun },
    { id: "dark" as const, label: "深色", Icon: Moon },
  ];
  return (
    <div className={`grid grid-cols-3 gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] p-1 ${compact ? "w-full" : ""}`}>
      {options.map(({ id, label, Icon }) => (
        <button key={id} onClick={() => onChange(id)} aria-pressed={mode === id}
          className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${mode === id ? "bg-[var(--surface)] text-[var(--text)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--text)]"}`}>
          <Icon size={14} /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}

function ResetDetails({ post }: { post: Post }) {
  const reset = post.reset;
  if (!reset) return null;
  const probability = Math.max(0, Math.min(100, reset.probability24h ?? 0));
  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3">
        <div className="flex items-center gap-2 text-sm font-bold"><Activity size={16} className="text-emerald-500" />额度重置详情</div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">RESET EVENT</span>
      </div>
      <div className="space-y-4 p-3.5">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <TimeField label="宣布时间" value={reset.announcedAt} />
          <TimeField label="生效 / 到账时间" value={reset.effectiveAt} />
          {reset.expiresAt && <TimeField label="额度有效期至" value={reset.expiresAt} />}
        </div>
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <span className="text-xs text-[var(--muted)]">未来 24h 再次重置概率 · 社区估算</span>
            <strong className={`font-mono text-xl ${probability >= 50 ? "text-amber-500" : "text-emerald-500"}`}>~{probability}%</strong>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
            <div className={`h-full rounded-full ${probability >= 50 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${probability}%` }} />
          </div>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">判断依据：{reset.probabilityReason || "暂无公开判断依据"}</p>
        </div>
        {reset.resetNote && <div className="rounded-xl bg-[var(--surface-2)] p-3 text-xs leading-6"><strong>补充说明：</strong>{reset.resetNote}</div>}
        <p className="flex items-start gap-1.5 text-[11px] leading-5 text-[var(--muted)]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          概率为社区公开信息估算，不代表官方承诺；未核验的外链会单独标注。
        </p>
      </div>
    </div>
  );
}

function TimeField({ label, value }: { label: string; value?: string }) {
  return <div><div className="mb-1 text-[11px] text-[var(--muted)]">{label}</div><div className="font-mono text-xs font-semibold">{formatBeijingDate(value)}</div><div className="mt-0.5 text-[10px] text-[var(--muted)]">北京时间 UTC+8</div></div>;
}

function PostCard({ post, onAction, onSelectAuthor, onToast }: {
  post: Post;
  onAction: (id: string, action: "liked" | "reposted" | "bookmarked") => void;
  onSelectAuthor: (handle: string) => void;
  onToast: (message: string) => void;
}) {
  const provider = PROVIDERS[post.provider];
  const copyPost = async () => {
    const text = `${post.author} ${post.handle}\n${post.timeVerified ? formatBeijingTime(post.publishedAt) : formatBeijingDate(post.publishedAt)}\n${post.originalText}\n${post.summary}\n${post.sourceNote}`;
    try { await navigator.clipboard.writeText(text); onToast("已复制帖子内容"); }
    catch { onToast("复制失败，请检查浏览器剪贴板权限"); }
  };

  return (
    <article className={`border-b border-[var(--line)] px-4 py-4 transition hover:bg-[var(--hover)] ${post.category === "reset" ? `border-l-[3px] ${PROVIDER_BORDER[post.provider]}` : ""}`}>
      {post.pinned && <div className="mb-2 ml-[52px] flex items-center gap-1.5 text-[11px] font-semibold text-amber-500"><Zap size={14} />最新重置动态</div>}
      <div className="flex gap-3">
        <button onClick={() => onSelectAuthor(post.handle)} aria-label={`筛选 ${post.author}`} className="h-fit rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">
          <Avatar name={post.author} provider={post.provider} avatarUrl={post.avatarUrl} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <button onClick={() => onSelectAuthor(post.handle)} className="truncate text-sm font-extrabold hover:underline">{post.author}</button>
            <CheckCircle2 size={16} className={`shrink-0 ${post.sourceVerified ? "text-blue-500" : "text-[var(--muted)]"}`} />
            <span className="truncate font-mono text-xs text-[var(--muted)]">{post.handle}</span>
            <span className="text-xs text-[var(--muted)]">·</span>
            <time className="font-mono text-[11px] text-[var(--muted)]" dateTime={post.publishedAt}>{post.timeVerified ? formatBeijingTime(post.publishedAt) : formatBeijingDate(post.publishedAt)}</time>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold"><ProviderMark provider={post.provider} />{provider.product}</span>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${post.category === "reset" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"}`}>
              {post.category === "reset" ? "↻ 额度重置事件" : "普通帖子"}
            </span>
            {!post.sourceVerified && <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">来源待核验</span>}
          </div>

          <p className="mt-3 text-[14px] leading-7">{post.summary}</p>
          <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3.5 py-3">
            <div className="text-xs leading-6 text-[var(--text)] opacity-80">{post.originalText}</div>
            <div className="mt-2 border-t border-dashed border-[var(--line)] pt-2 text-[11px] leading-5 text-[var(--muted)]">{post.sourceNote}</div>
          </div>

          {post.category === "reset" && <ResetDetails post={post} />}

          <div className="mt-4 flex max-w-[380px] items-center justify-between text-xs text-[var(--muted)]">
            <button onClick={() => onAction(post.id, "reposted")} className={`inline-flex items-center gap-1.5 transition hover:text-emerald-500 ${post.reposted ? "font-bold text-emerald-500" : ""}`}><Repeat2 size={18} />{post.reposts.toLocaleString()}</button>
            <button onClick={() => onAction(post.id, "liked")} className={`inline-flex items-center gap-1.5 transition hover:text-rose-500 ${post.liked ? "font-bold text-rose-500" : ""}`}><Heart size={18} fill={post.liked ? "currentColor" : "none"} />{post.likes.toLocaleString()}</button>
            <button onClick={() => onAction(post.id, "bookmarked")} className={`inline-flex items-center gap-1.5 transition hover:text-blue-500 ${post.bookmarked ? "font-bold text-blue-500" : ""}`}><Bookmark size={18} fill={post.bookmarked ? "currentColor" : "none"} />{post.bookmarked ? "已收藏" : "收藏"}</button>
            <button onClick={copyPost} className="inline-flex items-center gap-1.5 transition hover:text-blue-500"><Copy size={18} />复制</button>
          </div>
        </div>
      </div>
    </article>
  );
}

function SidebarLink({ active, icon: Icon, label, count, onClick }: {
  active: boolean; icon: React.ElementType; label: string; count?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={`flex w-full items-center justify-between rounded-full px-3.5 py-3 text-left transition hover:bg-[var(--hover)] ${active ? "font-extrabold" : "font-medium"}`}>
      <span className="flex items-center gap-4"><Icon size={22} className={active ? "text-blue-500" : ""} /><span className="hidden xl:inline text-[15px]">{label}</span></span>
      {!!count && <span className="hidden rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500 xl:inline">{count}</span>}
    </button>
  );
}

export default function ResetRadar() {
  const { mode, setMode, isDark } = useTheme();
  const { message: toast, show: showToast } = useToast();
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [activeNav, setActiveNav] = useState<NavKey>("feed");
  const [category, setCategory] = useState<"all" | PostCategory>("all");
  const [provider, setProvider] = useState<"all" | Provider>("all");
  const [selectedHandle, setSelectedHandle] = useState("");
  const [query, setQuery] = useState("");
  const [followed, setFollowed] = useState<Record<string, boolean>>(
    Object.fromEntries(PEOPLE.map((person) => [person.handle, true]))
  );
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const resetCount = useMemo(() => posts.filter((post) => post.category === "reset").length, [posts]);
  const normalCount = posts.length - resetCount;
  const alertCount = useMemo(() => posts.filter((post) => post.category === "reset" && post.pinned).length, [posts]);

  const visiblePosts = useMemo(() => posts
    .filter((post) => activeNav !== "bookmarks" || post.bookmarked)
    .filter((post) => category === "all" || post.category === category)
    .filter((post) => provider === "all" || post.provider === provider)
    .filter((post) => !selectedHandle || post.handle === selectedHandle)
    .filter((post) => {
      const haystack = [post.author, post.handle, post.providerLabel, post.summary, post.originalText, post.sourceNote].join(" ").toLowerCase();
      return haystack.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
  [posts, activeNav, category, provider, selectedHandle, query]);

  const toggleAction = useCallback((id: string, action: "liked" | "reposted" | "bookmarked") => {
    setPosts((current) => current.map((post) => {
      if (post.id !== id) return post;
      const next = !post[action];
      if (action === "liked") return { ...post, liked: next, likes: Math.max(0, post.likes + (next ? 1 : -1)) };
      if (action === "reposted") return { ...post, reposted: next, reposts: Math.max(0, post.reposts + (next ? 1 : -1)) };
      return { ...post, bookmarked: next };
    }));
    if (action === "bookmarked") showToast("收藏状态已更新");
  }, [showToast]);

  const refreshPosts = async () => {
    setRefreshing(true);
    try {
      // TODO: Replace with API call, e.g. await api.get("/api/posts")
      await new Promise((resolve) => window.setTimeout(resolve, 350));
      showToast(`数据由 Muse 每小时自动拉取更新 · 上次更新 ${formatBeijingTime(STATUS.updatedAt)}`);
    } catch {
      showToast("同步失败，请稍后重试");
    } finally {
      setRefreshing(false);
    }
  };

  const copyBriefing = async () => {
    const lines = [
      `御三家 AI 额度追踪快讯 · ${formatBeijingTime(now.toISOString())}（北京时间）`,
      ...(["google", "openai", "anthropic"] as Provider[]).map((key) => {
        const st = STATUS.providers[key];
        return `${PROVIDERS[key].product}：${st.summary}；24h 再重置概率约 ${st.probability24h}%（社区估算）`;
      }),
      "说明：重置概率为社区估算，不代表官方承诺。",
    ];
    try { await navigator.clipboard.writeText(lines.join("\n")); showToast("已复制最新快讯"); }
    catch { showToast("复制失败，请检查剪贴板权限"); }
  };

  const selectNav = (nav: NavKey) => {
    setActiveNav(nav);
    if (nav !== "bookmarks") setSelectedHandle("");
  };

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] antialiased">
      <style>{`
        :root{--page:#fff;--surface:#fff;--surface-2:#f7f9fa;--text:#0f1419;--muted:#687782;--line:#e8edf0;--hover:#f7f9fa}
        :root[data-theme="dark"]{--page:#000;--surface:#000;--surface-2:#16181c;--text:#e7e9ea;--muted:#858d93;--line:#2f3336;--hover:#101214;color-scheme:dark}
        *{box-sizing:border-box}
      `}</style>

      {toast && <div role="status" className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 sm:bottom-5 rounded-full bg-[#1d9bf0] px-4 py-2.5 text-xs font-semibold text-white shadow-xl">{toast}</div>}

      <div className="mx-auto flex max-w-[1320px] justify-center">
        {/* Left navigation */}
        <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 flex-col justify-between border-r border-[var(--line)] px-2 py-4 sm:flex xl:w-[250px] xl:px-4">
          <div>
            <div className="mb-7 flex items-center gap-3 px-3">
              <img src={`${import.meta.env.BASE_URL}logo.png`} alt="ResetRadar 标志" className="h-9 w-9 shrink-0 rounded-[10px]" />
              <div className="hidden xl:block"><div className="text-lg font-black tracking-tight">ResetRadar</div><div className="text-[11px] text-[var(--muted)]">御三家额度追踪</div></div>
            </div>
            <nav className="space-y-1">
              <SidebarLink active={activeNav === "feed"} icon={Radio} label="实时监测流" count={alertCount} onClick={() => selectNav("feed")} />
              <SidebarLink active={activeNav === "people"} icon={Users} label="关键人物雷达" count={PEOPLE.length} onClick={() => selectNav("people")} />
              <SidebarLink active={activeNav === "probability"} icon={TrendingUp} label="24h 重置概率" onClick={() => selectNav("probability")} />
              <SidebarLink active={activeNav === "history"} icon={CalendarDays} label="重置日历" onClick={() => selectNav("history")} />
              <SidebarLink active={activeNav === "bookmarks"} icon={Bookmark} label="已收藏情报" onClick={() => selectNav("bookmarks")} />
            </nav>
            <button onClick={refreshPosts} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#1d9bf0] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#1688d0]">
              <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} /><span className="hidden xl:inline">刷新数据</span>
            </button>
            <div className="mt-6 hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3.5 xl:block">
              <div className="mb-2 text-[11px] font-bold text-[var(--muted)]">御三家 · 24h 重置概率</div>
              {(["google", "openai", "anthropic"] as Provider[]).map((key) => (
                <button key={key} onClick={() => { setProvider(key); setActiveNav("feed"); }} className="flex w-full items-center gap-2 py-1.5 text-left">
                  <ProviderMark provider={key} small />
                  <span className="flex-1 truncate text-[11px] font-semibold">{PROVIDERS[key].name}</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-500">~{STATUS.providers[key].probability24h}%</span>
                </button>
              ))}
              <p className="mt-2 border-t border-[var(--line)] pt-2 text-[10px] leading-4 text-[var(--muted)]">社区估算，点击查看该厂商动态。</p>
            </div>
          </div>
          <div className="hidden space-y-3 xl:block">
            <div className="px-2 text-[11px] font-semibold text-[var(--muted)]">外观模式</div>
            <ThemeControl mode={mode} onChange={setMode} compact />
            <div className="px-2 text-[10px] leading-5 text-[var(--muted)]">所有时间统一显示北京时间 UTC+8。概率为社区估算。</div>
          </div>
        </aside>

        {/* Main column */}
        <main className="min-h-screen w-full min-w-0 max-w-[650px] border-r border-[var(--line)] pb-16 sm:pb-0">
          <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--page)]/85 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2"><h1 className="truncate text-base font-extrabold sm:text-lg">御三家 AI 额度追踪</h1><span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-extrabold tracking-wide text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />LIVE</span></div>
                <p className="mt-1 font-mono text-[10px] text-[var(--muted)]">{`${formatBeijingTime(now.toISOString())} BJT`}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setMode(mode === "system" ? "light" : mode === "light" ? "dark" : "system")} title={`外观：${mode === "system" ? "跟随系统" : mode === "light" ? "浅色" : "深色"}`} className="rounded-full p-2 text-[var(--muted)] transition hover:bg-[var(--hover)] hover:text-blue-500 xl:hidden">{mode === "system" ? <Monitor size={18} /> : mode === "light" ? <Sun size={18} /> : <Moon size={18} />}</button>
                <button onClick={copyBriefing} title="复制御三家快讯" className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--hover)]"><Copy size={16} /><span className="hidden sm:inline">快讯</span></button>
                <button onClick={refreshPosts} className="flex items-center gap-1.5 rounded-full border border-[var(--line)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--hover)]"><RefreshCw size={16} className={refreshing ? "animate-spin text-blue-500" : ""} /><span className="hidden sm:inline">刷新</span></button>
              </div>
            </div>

            {activeNav === "feed" || activeNav === "bookmarks" ? (
              <div className="grid grid-cols-3 border-t border-[var(--line)]">
                {([{ id: "all", label: "全部动态" }, { id: "reset", label: "额度重置" }, { id: "person", label: "普通帖子" }] as const).map((tab) => (
                  <button key={tab.id} onClick={() => setCategory(tab.id)} className={`relative py-3 text-xs font-bold transition hover:bg-[var(--hover)] ${category === tab.id ? "text-[var(--text)]" : "text-[var(--muted)]"}`}>
                    {tab.label}{category === tab.id && <span className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-full bg-[#1d9bf0]" />}
                  </button>
                ))}
              </div>
            ) : null}
          </header>

          {activeNav === "feed" && <OverviewCards onSelect={(p) => setProvider(p)} />}

          {/* Compact overview */}
          <section className="border-b border-[var(--line)] px-4 py-3">
            <div className="flex flex-wrap gap-1.5">
              {(["all", "google", "openai", "anthropic"] as const).map((key) => (
                <button key={key} onClick={() => setProvider(key)} className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${provider === key ? "border-[#1d9bf0] bg-[#1d9bf0] text-white" : "border-[var(--line)] text-[var(--muted)] hover:bg-[var(--hover)]"}`}>
                  {key === "all" ? "全部厂商" : PROVIDERS[key].name}
                </button>
              ))}
              {selectedHandle && <button onClick={() => setSelectedHandle("")} className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-1.5 text-[11px] font-semibold text-blue-500">账号：{selectedHandle}<X size={14} /></button>}
            </div>
          </section>

          {activeNav === "feed" || activeNav === "bookmarks" ? (
            <>
              <div className="border-b border-[var(--line)] px-4 py-3">
                <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索帖子、人物、模型或关键词" className="w-full rounded-full bg-[var(--surface-2)] py-2.5 pl-9 pr-9 text-xs outline-none ring-0 placeholder:text-[var(--muted)] focus:ring-1 focus:ring-blue-500" />{query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"><X size={16} /></button>}</div>
              </div>
              <div className="flex items-center justify-between px-4 py-3"><h2 className="text-sm font-extrabold">{activeNav === "bookmarks" ? "已收藏情报" : "最新动态"}</h2><span className="text-[10px] text-[var(--muted)]">按发布时间倒序 · 北京时间</span></div>
              {visiblePosts.length ? visiblePosts.map((post) => <PostCard key={post.id} post={post} onAction={toggleAction} onSelectAuthor={(handle) => { setSelectedHandle(handle); setActiveNav("feed"); }} onToast={showToast} />) : <EmptyState title="暂无最新帖子 / 重置事件" description="没有符合当前筛选条件的内容。试试清除搜索词或切换筛选条件。" onClear={() => { setQuery(""); setCategory("all"); setProvider("all"); setSelectedHandle(""); }} />}
            </>
          ) : null}

          {activeNav === "people" && <PeopleView followed={followed} onToggle={(handle) => setFollowed((current) => ({ ...current, [handle]: !current[handle] }))} onSelect={(handle) => { setSelectedHandle(handle); setActiveNav("feed"); }} />}
          {activeNav === "probability" && <ProbabilityView />}
          {activeNav === "history" && <HistoryView />}
        </main>

        {/* Right rail */}
        <aside className="hidden w-[340px] shrink-0 space-y-4 px-5 py-4 lg:block">
          <div className="sticky top-4 space-y-4">
            <div className="relative"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" /><input value={query} onChange={(event) => { setQuery(event.target.value); setActiveNav("feed"); }} placeholder="搜索重置公告、关键人物..." className="w-full rounded-full bg-[var(--surface-2)] py-3 pl-10 pr-4 text-xs outline-none focus:ring-1 focus:ring-blue-500" /></div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">御三家状态</h3><span className="text-[10px] text-[var(--muted)]">3 PROVIDERS</span></div>
              {(["google", "openai", "anthropic"] as Provider[]).map((key) => {
                const st = STATUS.providers[key];
                return <button key={key} onClick={() => { setProvider(key); setActiveNav("feed"); }} className="-mx-2 flex w-full items-center gap-3 rounded-lg border-b border-[var(--line)] px-2 py-3 text-left transition last:border-0 hover:bg-[var(--hover)]">
                  <ProviderMark provider={key} />
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold">{PROVIDERS[key].product}</span><span className="mt-1 block truncate text-[10px] text-[var(--muted)]">{`最近重置 ${formatBeijingDate(st.lastResetAt)}`}</span></span>
                  <span className="text-xs font-bold text-emerald-500">{"~" + st.probability24h + "%"}</span>
                </button>;
              })}
              <p className="mt-2 text-[10px] leading-5 text-[var(--muted)]">概率为社区公开信息估算，不代表官方承诺。</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-extrabold">关键人物监听</h3><button onClick={() => setActiveNav("people")} className="text-xs font-semibold text-blue-500">全部人物</button></div>
              {PEOPLE.slice(0, 6).map((person) => <button key={person.handle} onClick={() => { setSelectedHandle(person.handle); setActiveNav("feed"); }} className="flex w-full items-center gap-2.5 rounded-xl px-1 py-2 text-left transition hover:bg-[var(--hover)]"><Avatar name={person.name} provider={person.provider} avatarUrl={person.avatarUrl} small /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{person.name}</span><span className="block truncate font-mono text-[10px] text-[var(--muted)]">{person.handle}</span></span><ProviderMark provider={person.provider} /></button>)}
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-extrabold"><ShieldCheck size={16} className="text-blue-500" />数据说明</div>
              <p className="text-[11px] leading-6 text-[var(--muted)]">所有时间统一显示为北京时间（UTC+8）。官方原帖、第三方转述和社区推测应分别标记。概率仅为社区估算，不代表官方承诺；未能打开的外链会明确标注为待核验。</p>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--line)] bg-[var(--page)]/95 px-1 py-2 backdrop-blur-xl sm:hidden">
        {([{ id: "feed" as const, Icon: Radio, label: "动态" }, { id: "people" as const, Icon: Users, label: "人物" }, { id: "probability" as const, Icon: TrendingUp, label: "概率" }, { id: "history" as const, Icon: CalendarDays, label: "日历" }, { id: "bookmarks" as const, Icon: Bookmark, label: "收藏" }]).map(({ id, Icon, label }) => <button key={id} onClick={() => selectNav(id)} className={`flex flex-col items-center gap-1 py-1 text-[10px] font-semibold ${activeNav === id ? "text-blue-500" : "text-[var(--muted)]"}`}><Icon size={22} /><span>{label}</span></button>)}
      </nav>
    </div>
  );
}

function OverviewCards({ onSelect }: { onSelect: (provider: Provider) => void }) {
  const nextUpdate = formatBeijingTime(new Date(new Date(STATUS.updatedAt).getTime() + 1 * 3600 * 1000).toISOString());
  return (
    <section className="border-b border-[var(--line)] px-4 py-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-sm font-extrabold">今日雷达总览 · 24h 重置概率</h2>
        <span className="shrink-0 text-[10px] text-[var(--muted)]">{`更新于 ${formatBeijingTime(STATUS.updatedAt)}`}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["google", "openai", "anthropic"] as Provider[]).map((key) => {
          const st = STATUS.providers[key];
          return (
            <button key={key} onClick={() => onSelect(key)} className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-3 text-left transition hover:bg-[var(--hover)]">
              <span className="flex items-center gap-1.5"><ProviderMark provider={key} /><span className="truncate text-[11px] font-bold">{PROVIDERS[key].name}</span></span>
              <span className="mt-2 block font-mono text-2xl font-black leading-none text-emerald-500">~{st.probability24h}%</span>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${st.probability24h}%` }} /></span>
              <span className="mt-2 line-clamp-2 hidden min-h-8 text-[10px] leading-4 text-[var(--muted)] min-[420px]:block">{st.summary}</span>
              <span className="mt-1.5 block truncate text-[9px] text-[var(--muted)]">最近重置 {st.lastResetAt.slice(5, 10)}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-[var(--muted)]">概率为社区公开信息估算，不代表官方承诺。数据每小时自动更新，下一次约 {nextUpdate}。</p>
    </section>
  );
}

function EmptyState({ title, description, onClear }: { title: string; description: string; onClear: () => void }) {
  return <div className="px-6 py-16 text-center"><Sparkles size={30} className="mx-auto mb-3 text-blue-500" /><h3 className="text-sm font-extrabold">{title}</h3><p className="mx-auto mt-2 max-w-xs text-xs leading-6 text-[var(--muted)]">{description}</p><button onClick={onClear} className="mt-4 rounded-full border border-[var(--line)] px-4 py-2 text-xs font-semibold hover:bg-[var(--hover)]">清除筛选</button></div>;
}

function PeopleView({ followed, onToggle, onSelect }: { followed: Record<string, boolean>; onToggle: (handle: string) => void; onSelect: (handle: string) => void }) {
  return <section className="p-4"><h2 className="text-base font-extrabold">关键人物雷达</h2><p className="mt-1 text-xs text-[var(--muted)]">点击人物查看其动态；同步开关目前仅管理本地关注状态。</p><div className="mt-4 grid gap-2.5 sm:grid-cols-2">{PEOPLE.map((person) => <div key={person.handle} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] p-3"><button onClick={() => onSelect(person.handle)} className="flex min-w-0 flex-1 items-center gap-3 text-left"><Avatar name={person.name} provider={person.provider} avatarUrl={person.avatarUrl} /><span className="min-w-0"><span className="block truncate text-xs font-bold">{person.name}</span><span className="mt-0.5 block truncate font-mono text-[10px] text-[var(--muted)]">{person.handle}</span><span className="mt-1 block truncate text-[10px] text-[var(--muted)]">{person.role}</span></span></button><button onClick={() => onToggle(person.handle)} className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-bold ${followed[person.handle] ? "border-[var(--line)] text-[var(--muted)]" : "border-blue-500 bg-blue-500 text-white"}`}>{followed[person.handle] ? "已关注" : "关注"}</button></div>)}</div></section>;
}

function ProbabilityView() {
  const items = (["openai", "google", "anthropic"] as Provider[]).map((provider) => ({ provider, st: STATUS.providers[provider] }));
  return <section className="space-y-3 p-4"><div><h2 className="text-base font-extrabold">未来 24h 再重置概率</h2><p className="mt-1 text-xs leading-5 text-[var(--muted)]">基于公开信息与历史节奏的社区估算，不代表官方承诺。{`数据更新于 ${formatBeijingTime(STATUS.updatedAt)}（北京时间），由 Muse 每小时拉取更新。`}</p></div>{items.map(({ provider, st }) => <div key={provider} className="rounded-2xl border border-[var(--line)] p-4"><div className="flex items-center gap-2"><ProviderMark provider={provider} /><strong className="flex-1 text-sm">{PROVIDERS[provider].product}</strong><strong className="font-mono text-lg text-emerald-500">~{st.probability24h}%</strong></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${st.probability24h}%` }} /></div><p className="mt-3 text-xs font-semibold leading-6">{st.summary}</p><p className="mt-1 text-xs leading-6 text-[var(--muted)]">判断依据：{st.probabilityReason}</p><p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">最近一次重置：{st.lastResetTitle} · {formatBeijingDate(st.lastResetAt)}</p></div>)}</section>;
}

function HistoryView() {
  const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
  const [selected, setSelected] = useState(todayKey);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, typeof HISTORY>();
    for (const event of HISTORY) {
      const day = event.at.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), event]);
    }
    return map;
  }, []);

  // GitHub-style heatmap: columns = weeks, rows = Mon..Sun (Beijing dates)
  const WEEKS = 20;
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const todayDate = new Date(Date.UTC(ty, tm - 1, td));
  const dowMon = (todayDate.getUTCDay() + 6) % 7;
  const endSunday = new Date(todayDate.getTime() + (6 - dowMon) * 86400000);
  const startMonday = new Date(endSunday.getTime() - (WEEKS * 7 - 1) * 86400000);
  const keyOf = (d: Date) => d.toISOString().slice(0, 10);
  const allWeeks: { key: string; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; future: boolean }[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(startMonday.getTime() + (w * 7 + r) * 86400000);
      const key = keyOf(d);
      col.push({ key, future: key > todayKey });
    }
    allWeeks.push(col);
  }
  const levelOf = (count: number) => (count >= 4 ? 4 : count);
  const LEVEL_BG = ["rgba(128,128,128,0.18)", "rgba(29,155,240,0.35)", "rgba(29,155,240,0.55)", "rgba(29,155,240,0.8)", "rgba(29,155,240,1)"];
  const totalResets = HISTORY.length;
  const busiest = [...eventsByDay.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  const renderHeatmap = (cols: typeof allWeeks, cell: number, gap: number) => {
    const monthLabels = cols.map((col, i) => {
      const m = Number(col[0].key.slice(5, 7));
      if (i === 0) return m;
      const prev = Number(cols[i - 1][0].key.slice(5, 7));
      return m !== prev ? m : null;
    });
    return (
      <div>
        <div className="flex" style={{ marginLeft: 28, gap }}>
          {monthLabels.map((m, i) => <div key={i} className="shrink-0 text-[10px] leading-4 text-[var(--muted)]" style={{ width: cell }}>{m ? `${m}月` : ""}</div>)}
        </div>
        <div className="flex" style={{ gap: 8 }}>
          <div className="grid shrink-0 text-[9px] text-[var(--muted)]" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gap }}>
            {["一", "", "三", "", "五", "", "日"].map((w, i) => <div key={i} className="flex w-5 items-center">{w}</div>)}
          </div>
          <div className="grid" style={{ gridTemplateRows: `repeat(7, ${cell}px)`, gridAutoFlow: "column", gridAutoColumns: `${cell}px`, gap }}>
            {cols.flatMap((col) => col.map((cellDay) => {
              const events = eventsByDay.get(cellDay.key) ?? [];
              const count = events.length;
              const providers = [...new Set(events.map((e) => e.provider))];
              const isSelected = cellDay.key === selected;
              const isToday = cellDay.key === todayKey;
              const tip = count ? `${cellDay.key} · ${count} 次重置（${providers.map((pr) => PROVIDERS[pr].name).join("、")}）` : `${cellDay.key} · 无重置`;
              return (
                <button key={cellDay.key} title={tip} aria-label={tip} disabled={cellDay.future} onClick={() => setSelected(cellDay.key)}
                  className={`rounded-[4px] transition ${cellDay.future ? "opacity-30" : "hover:ring-1 hover:ring-[var(--muted)] active:scale-95"} ${isSelected ? "ring-2 ring-[#1d9bf0]" : ""} ${isToday ? "ring-1 ring-[var(--text)]" : ""}`}
                  style={{ width: cell, height: cell, backgroundColor: LEVEL_BG[levelOf(count)] }} />
              );
            }))}
          </div>
        </div>
      </div>
    );
  };

  const selectedEvents = (eventsByDay.get(selected) ?? []).slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const sortedHistory = HISTORY.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return (
    <section className="p-4">
      <h2 className="text-base font-extrabold">重置日历</h2>
      <p className="mt-1 text-xs text-[var(--muted)]">仿 GitHub 贡献图的热力日历：每格是一天，颜色越深表示御三家当天重置次数越多。点击格子查看当天详情。所有时间统一为北京时间 UTC+8。</p>

      <div className="mt-4 rounded-2xl border border-[var(--line)] p-3">
        {/* Mobile: fewer weeks, bigger tap targets */}
        <div className="overflow-x-auto sm:hidden">{renderHeatmap(allWeeks.slice(-12), 20, 3)}</div>
        {/* Desktop: full 20 weeks */}
        <div className="hidden overflow-x-auto sm:block">{renderHeatmap(allWeeks, 14, 3)}</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[10px] text-[var(--muted)]">{`近 ${WEEKS} 周共 ${totalResets} 次重置${busiest ? ` · 最多的一天 ${busiest[0]}（${busiest[1].length} 次）` : ""}`}</span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--muted)]">少 {LEVEL_BG.map((bg, i) => <span key={i} className="inline-block h-[10px] w-[10px] rounded-[2px]" style={{ backgroundColor: bg }} />)} 多</span>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-extrabold">{selected} 的重置事件</h3>
        {selectedEvents.length ? (
          <div className="mt-2 space-y-2">
            {selectedEvents.map((event) => (
              <div key={`${event.provider}-${event.at}`} className={`rounded-2xl border border-[var(--line)] border-l-[3px] ${PROVIDER_BORDER[event.provider]} p-3`}>
                <div className="flex items-center gap-2"><ProviderMark provider={event.provider} small /><span className="text-xs font-bold">{event.title}</span><span className="ml-auto shrink-0 font-mono text-[10px] text-[var(--muted)]">{formatBeijingDate(event.at)}</span></div>
                <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{event.detail}</p>
              </div>
            ))}
          </div>
        ) : <div className="mt-2 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--line)] py-6 text-center"><CalendarDays size={20} className="text-[var(--muted)]" /><p className="text-xs text-[var(--muted)]">这一天没有重置记录</p></div>}
      </div>

      <h3 className="mt-6 text-sm font-extrabold">全部重置历史</h3>
      <div className="relative mt-4 space-y-5 border-l-2 border-[var(--muted)]/30 pl-5">
        {sortedHistory.map((event) => <div key={`${event.provider}-${event.at}`} className="relative"><span className="absolute -left-[26px] top-1 h-3 w-3 rounded-full bg-blue-500 ring-4 ring-[var(--page)]" /><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[11px] font-bold text-blue-500">{formatBeijingDate(event.at)}</span><ProviderMark provider={event.provider} /></div><h4 className="mt-1 text-sm font-bold">{event.title}</h4><p className="mt-1 text-xs leading-6 text-[var(--muted)]">{event.detail}</p></div>)}
      </div>
    </section>
  );
}
