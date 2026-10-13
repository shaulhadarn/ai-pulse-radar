import { PLAYBOOK, type Play } from "./playbook";
import { TECHNIQUES, techniqueLabel } from "./taxonomy";
import { SOURCE_IDS, type RadarItem, type RadarSnapshot, type SourceId, type TechniqueId } from "./types";

export type Momentum = "hot" | "rising" | "emerging" | "steady";

export interface TechniqueInsight {
  technique: TechniqueId;
  label: string;
  description: string;
  momentum: Momentum;
  mentions: number;
  heat: number;
  /** Share of all classified signal heat, 0-100. */
  share: number;
  /** Average rank of the items using this technique. */
  avgRank: number;
  /** Share of its items posted in the last 12 hours, 0-100. */
  freshShare: number;
  /**
   * How fast posting about this technique is speeding up compared with the radar as a whole,
   * so 2 means it is accelerating twice as fast as everything else. Sources skew recent (X
   * search, new repos), and comparing with the whole radar cancels that out. Null when there
   * is too little data to say.
   */
  velocity: number | null;
  /** Posts per 6-hour bucket over the last 48 hours, oldest first. */
  activity: number[];
  sourceMix: Record<SourceId, number>;
  /** Techniques that most often appear in the same posts. */
  related: { technique: TechniqueId; label: string; together: number }[];
  /** 0-100: high discussion with few GitHub projects means room to build. */
  opportunityScore: number;
  sources: SourceId[];
  evidence: RadarItem[];
  items: RadarItem[];
  play: Play;
}

export interface ToolMention {
  name: string;
  mentions: number;
  sources: SourceId[];
}

export interface Pulse {
  totalSignals: number;
  last24h: number;
  liveSources: number;
  techniquesSeen: number;
  /** The technique with the fastest-growing posting rate among those with enough data. */
  fastest: TechniqueInsight | null;
}

export interface Insights {
  generatedAt: string;
  headline: string;
  pulse: Pulse;
  techniques: TechniqueInsight[];
  opportunities: TechniqueInsight[];
  tools: ToolMention[];
  topRepos: RadarItem[];
  hottestDiscussions: RadarItem[];
}

/** Named tools, models and frameworks worth counting across all signals. */
const TOOLS: { name: string; pattern: RegExp }[] = [
  { name: "Claude Code", pattern: /\bclaude code\b/i },
  { name: "Claude", pattern: /\bclaude\b(?! code)/i },
  { name: "Codex", pattern: /\bcodex\b/i },
  { name: "Cursor", pattern: /\bcursor\b/i },
  { name: "Gemini", pattern: /\bgemini\b/i },
  { name: "GPT", pattern: /\bGPT-?\d/i },
  { name: "MCP", pattern: /\bMCP\b|\bmodel context protocol\b/i },
  { name: "Qwen", pattern: /\bqwen/i },
  { name: "DeepSeek", pattern: /\bdeepseek/i },
  { name: "Llama", pattern: /\bllama ?\d|\bllama\.cpp\b/i },
  { name: "Ollama", pattern: /\bollama\b/i },
  { name: "vLLM", pattern: /\bvLLM\b/i },
  { name: "LangGraph / LangChain", pattern: /\blang(graph|chain)\b/i },
  { name: "Hugging Face", pattern: /\bhugging ?face\b/i },
  { name: "OpenRouter", pattern: /\bopenrouter\b/i },
  { name: "Playwright", pattern: /\bplaywright\b/i },
  { name: "Copilot", pattern: /\bcopilot\b/i },
  { name: "Kimi", pattern: /\bkimi\b/i },
  { name: "Mistral", pattern: /\bmistral\b/i },
  { name: "Grok", pattern: /\bgrok\b/i },
];

const HOUR = 3_600_000;
const FRESH_HOURS = 12;
const BUCKET_HOURS = 6;
const BUCKETS = 8;
const EVIDENCE_PER_TECHNIQUE = 4;
/** Below this many posts in the 48-hour window, a velocity number is noise. */
const MIN_POSTS_FOR_VELOCITY = 4;

export function buildInsights(snapshot: RadarSnapshot): Insights {
  const now = Date.parse(snapshot.generatedAt);
  const totalHeat = snapshot.trends.reduce((sum, t) => sum + t.heat, 0) || 1;
  const meta = new Map(TECHNIQUES.map((t) => [t.id, t]));
  const baseline = velocityOf(snapshot.items.map((i) => (now - Date.parse(i.publishedAt)) / HOUR)) || 1;

  const techniques = snapshot.trends.map((trend): TechniqueInsight => {
    const items = snapshot.items.filter((i) => i.techniques.includes(trend.technique));
    const ages = items.map((i) => (now - Date.parse(i.publishedAt)) / HOUR);
    const avgRank = items.reduce((sum, i) => sum + i.rank, 0) / Math.max(1, items.length);
    const fresh = ages.filter((a) => a < FRESH_HOURS).length;
    const share = (100 * trend.heat) / totalHeat;
    const freshShare = (100 * fresh) / Math.max(1, items.length);
    const raw = velocityOf(ages);
    const velocity = raw === null ? null : raw / baseline;
    return {
      technique: trend.technique,
      label: trend.label,
      description: meta.get(trend.technique)?.description ?? "",
      momentum: momentumOf({ share, avgRank, freshShare, mentions: trend.mentions, sources: trend.sources.length, velocity }),
      mentions: trend.mentions,
      heat: trend.heat,
      share: Math.round(share * 10) / 10,
      avgRank: Math.round(avgRank),
      freshShare: Math.round(freshShare),
      velocity: velocity === null ? null : Math.round(velocity * 10) / 10,
      activity: activityOf(ages),
      sourceMix: sourceMixOf(items),
      related: relatedOf(trend.technique, items),
      opportunityScore: 0,
      sources: trend.sources,
      evidence: items.slice(0, EVIDENCE_PER_TECHNIQUE),
      items,
      play: PLAYBOOK[trend.technique],
    };
  });
  scoreOpportunities(techniques);

  const withVelocity = techniques.filter((t) => t.velocity !== null && t.mentions >= MIN_POSTS_FOR_VELOCITY);
  // Only something actually outpacing the radar counts as rising.
  const fastest = withVelocity.filter((t) => (t.velocity ?? 0) > 1).toSorted((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))[0] ?? null;

  return {
    generatedAt: snapshot.generatedAt,
    headline: headlineOf(techniques),
    pulse: {
      totalSignals: snapshot.items.length,
      last24h: snapshot.items.filter((i) => now - Date.parse(i.publishedAt) < 24 * HOUR).length,
      liveSources: snapshot.sources.filter((s) => s.ok).length,
      techniquesSeen: techniques.length,
      fastest,
    },
    techniques,
    opportunities: techniques
      .filter((t) => t.mentions >= 3)
      .toSorted((a, b) => b.opportunityScore - a.opportunityScore)
      .slice(0, 3),
    tools: countTools(snapshot.items),
    topRepos: snapshot.items
      .filter((i) => i.source === "github")
      .toSorted((a, b) => b.engagement.score - a.engagement.score)
      .slice(0, 6),
    hottestDiscussions: snapshot.items
      .filter((i) => i.source !== "github" && (i.engagement.comments ?? 0) > 0)
      .toSorted((a, b) => (b.engagement.comments ?? 0) - (a.engagement.comments ?? 0))
      .slice(0, 6),
  };
}

/**
 * Hot: a big slice of today's signal, seen on several platforms.
 * Rising: posting rate is climbing, or most posts are new and rank well.
 * Emerging: few posts, but strong ones.
 */
export function momentumOf(t: {
  share: number;
  avgRank: number;
  freshShare: number;
  mentions: number;
  sources: number;
  velocity?: number | null;
}): Momentum {
  if (t.share >= 10 && t.sources >= 2) return "hot";
  if (t.mentions >= 3 && ((t.velocity ?? 0) >= 1.5 || (t.freshShare >= 50 && t.avgRank >= 45))) return "rising";
  if (t.mentions <= 5 && t.avgRank >= 50) return "emerging";
  return "steady";
}

/** Posts per hour in the last 12 hours divided by posts per hour in the 36 hours before. */
export function velocityOf(agesInHours: number[]): number | null {
  const recent = agesInHours.filter((a) => a < FRESH_HOURS).length;
  const earlier = agesInHours.filter((a) => a >= FRESH_HOURS && a < BUCKETS * BUCKET_HOURS).length;
  if (recent + earlier < MIN_POSTS_FOR_VELOCITY) return null;
  const earlierRate = earlier / (BUCKETS * BUCKET_HOURS - FRESH_HOURS);
  const recentRate = recent / FRESH_HOURS;
  // One phantom earlier post keeps a brand-new topic from reading as infinitely fast.
  return recentRate / Math.max(earlierRate, 1 / (BUCKETS * BUCKET_HOURS - FRESH_HOURS));
}

function activityOf(agesInHours: number[]): number[] {
  const buckets = Array.from({ length: BUCKETS }, () => 0);
  for (const age of agesInHours) {
    const index = Math.floor(age / BUCKET_HOURS);
    if (index >= 0 && index < BUCKETS) buckets[BUCKETS - 1 - index] += 1;
  }
  return buckets;
}

function sourceMixOf(items: RadarItem[]): Record<SourceId, number> {
  const mix = Object.fromEntries(SOURCE_IDS.map((s) => [s, 0])) as Record<SourceId, number>;
  for (const item of items) mix[item.source] += 1;
  return mix;
}

function relatedOf(technique: TechniqueId, items: RadarItem[]): TechniqueInsight["related"] {
  const counts = new Map<TechniqueId, number>();
  for (const item of items) for (const t of item.techniques) if (t !== technique) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, together]) => ({ technique: t, label: techniqueLabel(t), together }));
}

/**
 * Demand is the heat of people talking about a technique on X, HN and Reddit; the gap is the
 * share of its posts that are discussion rather than new GitHub projects. Lots of talk with
 * few projects leaves room to build. Square-rooting demand keeps the giants from flattening
 * every niche to a single-digit score; squaring the gap marks crowded spaces down hard.
 */
function scoreOpportunities(techniques: TechniqueInsight[]) {
  const talk = techniques.map((t) => t.items.filter((i) => i.source !== "github").reduce((sum, i) => sum + i.rank, 0));
  const peak = Math.max(1, ...talk);
  techniques.forEach((t, i) => {
    const gap = (t.mentions - t.sourceMix.github) / Math.max(1, t.mentions);
    t.opportunityScore = Math.round(100 * Math.sqrt(talk[i] / peak) * gap ** 2);
  });
}

function headlineOf(techniques: TechniqueInsight[]): string {
  const [first, second, third] = techniques;
  if (!first) return "No signals yet. Try a rescan.";
  const lead = [first, second, third].filter(Boolean).map((t) => t.label);
  const leadText = lead.length > 1 ? `${lead.slice(0, -1).join(", ")} and ${lead.at(-1)}` : lead[0];
  const rising = techniques.find((t) => (t.momentum === "rising" || t.momentum === "emerging") && !lead.includes(t.label));
  const tail = rising ? ` ${rising.label} is the one to watch.` : "";
  return `${leadText} dominate what builders are talking about right now.${tail}`;
}

function countTools(items: RadarItem[]): ToolMention[] {
  return TOOLS.map(({ name, pattern }) => {
    const hits = items.filter((i) => pattern.test(`${i.title} ${i.summary ?? ""}`));
    return { name, mentions: hits.length, sources: [...new Set(hits.map((i) => i.source))] };
  })
    .filter((t) => t.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 12);
}
