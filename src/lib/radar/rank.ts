import { classify, techniqueLabel } from "./taxonomy";
import type { RadarItem, RawItem, SourceId, TechniqueId, TrendStat } from "./types";

/** Hours for an item's freshness weight to halve. */
const HALF_LIFE_HOURS = 24;

const NEUTRAL_ENGAGEMENT = 0.5;

const WEIGHTS = { engagement: 0.6, freshness: 0.3, specificity: 0.1 };

/**
 * Ranks items 0-100. Engagement is log-scaled and normalised within each source,
 * so 50 GitHub stars and 500 HN points can compete fairly.
 */
export function rankItems(raw: RawItem[], now: Date): RadarItem[] {
  const peakBySource = new Map<SourceId, number>();
  for (const item of raw) {
    const e = engagementOf(item);
    peakBySource.set(item.source, Math.max(peakBySource.get(item.source) ?? 0, e));
  }

  return raw
    .map((item) => {
      const techniques = classify(`${item.title} ${item.summary ?? ""}`);
      const peak = peakBySource.get(item.source) ?? 0;
      // Sources read without counts (X through Jina) get a neutral score instead of zero.
      const engagement = peak === 0 ? NEUTRAL_ENGAGEMENT : Math.log1p(engagementOf(item)) / Math.log1p(peak);
      const ageHours = Math.max(0, (now.getTime() - Date.parse(item.publishedAt)) / 3_600_000);
      const freshness = Math.pow(0.5, ageHours / HALF_LIFE_HOURS);
      const specificity = Math.min(techniques.length, 3) / 3;
      const rank =
        100 * (WEIGHTS.engagement * engagement + WEIGHTS.freshness * freshness + WEIGHTS.specificity * specificity);
      return { ...item, techniques, rank: Math.round(rank * 10) / 10 };
    })
    .sort((a, b) => b.rank - a.rank);
}

function engagementOf(item: RawItem): number {
  return Math.max(0, item.engagement.score) + 2 * (item.engagement.comments ?? 0);
}

/** Same story posted in several places: keep the copy with the best rank. */
export function dedupe(items: RadarItem[]): RadarItem[] {
  const seen = new Map<string, RadarItem>();
  for (const item of items) {
    const key = canonicalUrl(item.url);
    const existing = seen.get(key);
    if (!existing || item.rank > existing.rank) seen.set(key, item);
  }
  return [...seen.values()].sort((a, b) => b.rank - a.rank);
}

export function canonicalUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const p of [...u.searchParams.keys()]) if (p.startsWith("utm_") || p === "ref") u.searchParams.delete(p);
    const host = u.hostname.replace(/^(www|old|m|mobile)\./, "").replace(/^twitter\.com$/, "x.com");
    return `${host}${u.pathname.replace(/\/$/, "")}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export function computeTrends(items: RadarItem[]): TrendStat[] {
  const byTechnique = new Map<TechniqueId, TrendStat>();
  for (const item of items) {
    for (const technique of item.techniques) {
      const stat = byTechnique.get(technique) ?? {
        technique,
        label: techniqueLabel(technique),
        mentions: 0,
        heat: 0,
        sources: [],
        topItemId: item.id,
      };
      stat.mentions += 1;
      stat.heat += item.rank;
      if (!stat.sources.includes(item.source)) stat.sources.push(item.source);
      byTechnique.set(technique, stat);
    }
  }
  return [...byTechnique.values()]
    .map((s) => ({ ...s, heat: Math.round(s.heat) }))
    .sort((a, b) => b.heat - a.heat);
}
