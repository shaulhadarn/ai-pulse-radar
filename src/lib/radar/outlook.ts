import type { Insights, Momentum, TechniqueInsight } from "./insights";
import type { RadarItem, TechniqueId } from "./types";

/** What to do about a technique, in the order a builder would act on it. */
export type Verdict = "adopt" | "try" | "watch";

export interface UpcomingTechnique {
  insight: TechniqueInsight;
  /** 0-100: accelerating, fresh, well-ranked and spreading across platforms, but not yet mainstream. */
  breakout: number;
  verdict: Verdict;
  /** The facts behind the score, in plain words. */
  reasons: string[];
}

export interface PlanStep {
  kind: "adopt" | "experiment" | "build";
  technique: TechniqueId;
  title: string;
  body: string;
}

/** Per-technique facts the client dashboard shows next to filters and signals. */
export interface TechniqueMeta {
  momentum: Momentum;
  velocity: number | null;
  breakout: number;
  nextWave: boolean;
}

export interface Outlook {
  upcoming: UpcomingTechnique[];
  plan: PlanStep[];
  /** Fresh, well-ranked posts about the upcoming techniques: the earliest evidence of the next wave. */
  earlySignals: RadarItem[];
  meta: Partial<Record<TechniqueId, TechniqueMeta>>;
}

const UPCOMING_COUNT = 4;
/** Above this share of today's heat a technique is already mainstream, not upcoming. */
const MAINSTREAM_SHARE = 20;
/** Fewer posts than this and one lucky post can top the list. */
const MIN_POSTS = 3;
const HOUR = 3_600_000;

export function buildOutlook(insights: Insights): Outlook {
  const now = Date.parse(insights.generatedAt);
  const scored = insights.techniques
    .filter((t) => t.mentions >= MIN_POSTS)
    .map((t) => {
      const breakout = breakoutScore(t);
      return { insight: t, breakout, verdict: verdictOf(t, breakout), reasons: reasonsFor(t) };
    });

  const upcoming = scored
    // Hot techniques are already big on several platforms: they belong in "adopt", not the next wave.
    .filter((s) => s.insight.share < MAINSTREAM_SHARE && s.insight.momentum !== "hot")
    .toSorted((a, b) => b.breakout - a.breakout)
    .slice(0, UPCOMING_COUNT);
  const nextWave = new Set(upcoming.map((u) => u.insight.technique));

  const meta: Outlook["meta"] = {};
  for (const s of scored) {
    meta[s.insight.technique] = {
      momentum: s.insight.momentum,
      velocity: s.insight.velocity,
      breakout: s.breakout,
      nextWave: nextWave.has(s.insight.technique),
    };
  }

  const earlySignals = insights.techniques
    .filter((t) => nextWave.has(t.technique))
    .flatMap((t) => t.items)
    .filter((item, i, all) => all.findIndex((other) => other.id === item.id) === i)
    .filter((item) => now - Date.parse(item.publishedAt) < 24 * HOUR)
    .toSorted((a, b) => b.rank - a.rank)
    .slice(0, 5);

  return { upcoming, plan: planOf(insights, upcoming), earlySignals, meta };
}

/**
 * Weighted blend, each part 0-1: acceleration against the whole radar counts most, then how
 * fresh and how well-ranked its posts are, then novelty (smaller share) and platform spread.
 */
export function breakoutScore(t: Pick<TechniqueInsight, "velocity" | "freshShare" | "avgRank" | "sources" | "share">): number {
  const accel = t.velocity === null ? 0.3 : clamp((Math.log2(Math.max(t.velocity, 0.01)) + 1) / 3);
  const fresh = t.freshShare / 100;
  const quality = t.avgRank / 100;
  const spread = t.sources.length / 4;
  const novelty = 1 - Math.min(1, t.share / (MAINSTREAM_SHARE + 5));
  return Math.round(100 * (0.35 * accel + 0.2 * fresh + 0.2 * quality + 0.1 * spread + 0.15 * novelty));
}

/** Adopt what is already big and still speeding up; try what is climbing; watch the rest. */
export function verdictOf(t: Pick<TechniqueInsight, "momentum" | "velocity">, breakout: number): Verdict {
  if (t.momentum === "hot" && (t.velocity ?? 1) >= 1) return "adopt";
  if (t.momentum === "rising" || breakout >= 60) return "try";
  return "watch";
}

function reasonsFor(t: TechniqueInsight): string[] {
  const reasons: string[] = [];
  if (t.velocity !== null && t.velocity >= 1.15) reasons.push(`${t.velocity}× the radar's pace`);
  if (t.sources.length >= 3) reasons.push(`on ${t.sources.length} platforms`);
  if (t.freshShare >= 40) reasons.push(`${t.freshShare}% posted in the last 12h`);
  if (t.avgRank >= 50) reasons.push(`strong posts (avg rank ${t.avgRank})`);
  if (reasons.length === 0) reasons.push(`${t.mentions} posts, ${t.share}% of attention`);
  return reasons;
}

function planOf(insights: Insights, upcoming: UpcomingTechnique[]): PlanStep[] {
  const used = new Set<TechniqueId>();
  const pick = <T extends { technique: TechniqueId }>(candidates: T[]) => {
    const found = candidates.find((c) => !used.has(c.technique));
    if (found) used.add(found.technique);
    return found;
  };
  const steps: PlanStep[] = [];
  const adopt = pick(insights.techniques.filter((t) => t.momentum === "hot")) ?? pick(insights.techniques);
  if (adopt) steps.push({ kind: "adopt", technique: adopt.technique, title: `Adopt ${adopt.label}`, body: adopt.play.apply });
  const experiment = pick(upcoming.map((u) => u.insight));
  if (experiment) steps.push({ kind: "experiment", technique: experiment.technique, title: `Prototype with ${experiment.label}`, body: experiment.play.apply });
  const build = pick(insights.opportunities) ?? pick(insights.techniques);
  if (build) steps.push({ kind: "build", technique: build.technique, title: `Build on ${build.label}`, body: build.play.opportunity });
  return steps;
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}
