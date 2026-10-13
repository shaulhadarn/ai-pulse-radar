import { computeTrends, dedupe, rankItems } from "./rank";
import type { RadarSnapshot, RawItem, SourceAdapter, SourceStatus } from "./types";

const MAX_ITEMS = 300;

/** Pulls every enabled source in parallel; one failing source never sinks the others. */
export async function buildSnapshot(adapters: SourceAdapter[], now = new Date()): Promise<RadarSnapshot> {
  const results = await Promise.all(
    adapters.map(async (adapter): Promise<{ status: SourceStatus; items: RawItem[] }> => {
      const base = { id: adapter.id, label: adapter.label, setupHint: adapter.setupHint };
      if (!adapter.isEnabled()) {
        return { status: { ...base, enabled: false, ok: false, count: 0 }, items: [] };
      }
      try {
        const items = await adapter.fetchItems();
        return { status: { ...base, enabled: true, ok: true, count: items.length }, items };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        console.warn(`[radar] ${adapter.id} failed:`, error);
        return { status: { ...base, enabled: true, ok: false, count: 0, error }, items: [] };
      }
    }),
  );

  const items = dedupe(rankItems(results.flatMap((r) => r.items), now)).slice(0, MAX_ITEMS);
  return {
    generatedAt: now.toISOString(),
    items,
    sources: results.map((r) => r.status),
    trends: computeTrends(items),
  };
}
