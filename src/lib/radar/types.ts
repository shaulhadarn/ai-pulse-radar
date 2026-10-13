export const SOURCE_IDS = ["hackernews", "reddit", "github", "x"] as const;
export type SourceId = (typeof SOURCE_IDS)[number];

/** An item as returned by a source adapter, before classification and scoring. */
export interface RawItem {
  /** Globally unique id, prefixed with the source id (e.g. `hackernews:123`). */
  id: string;
  source: SourceId;
  title: string;
  url: string;
  /** Where people talk about it, when that differs from `url` (HN thread, Reddit post). */
  discussionUrl?: string;
  author?: string;
  summary?: string;
  /** Sub-channel inside the source, such as a subreddit or a repo language. */
  channel?: string;
  publishedAt: string;
  engagement: {
    /** Points, upvotes, stars or likes, depending on the source. */
    score: number;
    comments?: number;
  };
}

export interface RadarItem extends RawItem {
  techniques: TechniqueId[];
  /** 0 to 100, higher is more worth your attention right now. */
  rank: number;
}

export interface SourceAdapter {
  id: SourceId;
  label: string;
  /** False when the source needs credentials that are not configured. */
  isEnabled(): boolean;
  /** Short hint shown in the UI when the source is disabled. */
  setupHint?: string;
  fetchItems(): Promise<RawItem[]>;
}

export interface SourceStatus {
  id: SourceId;
  label: string;
  enabled: boolean;
  ok: boolean;
  count: number;
  error?: string;
  setupHint?: string;
}

export interface TrendStat {
  technique: TechniqueId;
  label: string;
  mentions: number;
  /** Sum of item ranks, so a few hot items outweigh many quiet ones. */
  heat: number;
  sources: SourceId[];
  topItemId: string;
}

export interface RadarSnapshot {
  generatedAt: string;
  items: RadarItem[];
  sources: SourceStatus[];
  trends: TrendStat[];
}

export type TechniqueId =
  | "agents"
  | "mcp-tools"
  | "coding-agents"
  | "rag"
  | "context-engineering"
  | "reasoning"
  | "fine-tuning"
  | "inference"
  | "local-models"
  | "open-weights"
  | "frontier-models"
  | "multimodal"
  | "evals"
  | "safety";
