import { PLAYBOOK, type Play } from "./playbook";
import { TECHNIQUES } from "./taxonomy";
import type { RadarItem, RadarSnapshot, SourceId, TechniqueId } from "./types";

export type Momentum = "hot" | "rising" | "steady" | "emerging";

export interface TechniqueInsight {
  technique: TechniqueId;
  label: string;
  description: string;
  momentum: Momentum;
  mentions: number;
  /** Share of all classified signal heat, 0-100. */
  share: number;
  /** Average rank of the items using this technique. */
  avgRank: number;
  /** Share of its items posted in the last 12 hours, 0-100. */
  freshShare: number;
  sources: SourceId[];
  evidence: RadarItem[];
  play: Play;
}

export interface ToolMention {
  name: string;
  mentions: number;
  sources: SourceId[];
}

export interface Insights {
  generatedAt: string;
  totalSignals: number;
  headline: string;
  techniques: TechniqueInsight[];
  tools: ToolMention[];
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

const FRESH_HOURS = 12;
const EVIDENCE_PER_TECHNIQUE = 4;

export function buildInsights(snapshot: RadarSnapshot): Insights {
  const now = Date.parse(snapshot.generatedAt);
  const totalHeat = snapshot.trends.reduce((sum, t) => sum + t.heat, 0) || 1;
  const meta = new Map(TECHNIQUES.map((t) => [t.id, t]));

  const techniques = snapshot.trends.map((trend): TechniqueInsight => {
    const items = snapshot.items.filter((i) => i.techniques.includes(trend.technique));
    const avgRank = items.reduce((sum, i) => sum + i.rank, 0) / Math.max(1, items.length);
    const fresh = items.filter((i) => now - Date.parse(i.publishedAt) < FRESH_HOURS * 3_600_000).length;
    const share = (100 * trend.heat) / totalHeat;
    const freshShare = (100 * fresh) / Math.max(1, items.length);
    return {
      technique: trend.technique,
      label: trend.label,
      description: meta.get(trend.technique)?.description ?? "",
      momentum: momentumOf({ share, avgRank, freshShare, mentions: trend.mentions, sources: trend.sources.length }),
      mentions: trend.mentions,
      share: Math.round(share * 10) / 10,
      avgRank: Math.round(avgRank),
      freshShare: Math.round(freshShare),
      sources: trend.sources,
      evidence: items.slice(0, EVIDENCE_PER_TECHNIQUE),
      play: PLAYBOOK[trend.technique],
    };
  });

  return {
    generatedAt: snapshot.generatedAt,
    totalSignals: snapshot.items.length,
    headline: headlineOf(techniques),
    techniques,
    tools: countTools(snapshot.items),
  };
}

/**
 * Hot: a big slice of today's signal, seen on several platforms.
 * Rising: mostly new posts that rank well. Emerging: few posts, but strong ones.
 */
export function momentumOf(t: { share: number; avgRank: number; freshShare: number; mentions: number; sources: number }): Momentum {
  if (t.share >= 10 && t.sources >= 2) return "hot";
  if (t.freshShare >= 50 && t.avgRank >= 45 && t.mentions >= 3) return "rising";
  if (t.mentions <= 5 && t.avgRank >= 50) return "emerging";
  return "steady";
}

function headlineOf(techniques: TechniqueInsight[]): string {
  const [first, second, third] = techniques;
  if (!first) return "No signals yet. Try a rescan.";
  const rising = techniques.find((t) => t.momentum === "rising" || t.momentum === "emerging");
  const lead = [first, second, third].filter(Boolean).map((t) => t.label);
  const leadText = lead.length > 1 ? `${lead.slice(0, -1).join(", ")} and ${lead.at(-1)}` : lead[0];
  const tail = rising && !lead.includes(rising.label) ? ` ${rising.label} is the one to watch.` : "";
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
