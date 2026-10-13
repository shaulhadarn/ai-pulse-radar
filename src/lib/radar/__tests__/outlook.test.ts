import { describe, expect, it } from "vitest";
import { buildInsights } from "../insights";
import { breakoutScore, buildOutlook, verdictOf } from "../outlook";
import { computeTrends, rankItems } from "../rank";
import type { RadarSnapshot, RawItem } from "../types";

const now = new Date("2026-10-13T12:00:00Z");

function raw(id: string, title: string, source: RawItem["source"], hoursOld: number, score = 10): RawItem {
  return { id, source, title, url: `https://example.com/${id}`, publishedAt: new Date(now.getTime() - hoursOld * 3_600_000).toISOString(), engagement: { score } };
}

function snapshot(items: RawItem[]): RadarSnapshot {
  const ranked = rankItems(items, now);
  return { generatedAt: now.toISOString(), items: ranked, sources: [], trends: computeTrends(ranked) };
}

describe("buildOutlook", () => {
  const insights = buildInsights(
    snapshot([
      // Agents: big but old news.
      ...Array.from({ length: 40 }, (_, i) => raw(`a${i}`, `New agent framework release ${i}`, i % 2 ? "github" : "hackernews", 30 + i, 300)),
      // Filler so no single small technique dominates the heat.
      ...["RAG pipeline with reranking", "MCP server for Postgres", "LoRA fine-tuning recipe", "Quantization for faster inference", "Evals for prompt changes"].flatMap((title, i) => [
        raw(`f${i}a`, title, "hackernews", 20 + i, 40),
        raw(`f${i}b`, title, "reddit", 26 + i, 40),
        raw(`f${i}c`, title, "github", 40 + i, 40),
      ]),
      // Agent loops: small, fresh and spreading.
      raw("l1", "Running an agent loop until tests pass", "hackernews", 1, 300),
      raw("l2", "Ralph loop for long-running agents", "reddit", 2, 200),
      raw("l3", "My agent loop harness", "x", 3, 100),
      raw("l4", "Feedback loops beat one-shot prompts", "hackernews", 30, 50),
    ]),
  );
  const outlook = buildOutlook(insights);

  it("ranks the fresh, accelerating technique as the next wave", () => {
    expect(outlook.upcoming[0].insight.technique).toBe("agent-loops");
    expect(outlook.upcoming[0].reasons.join(" ")).toMatch(/platforms|pace|12h/);
    expect(outlook.meta["agent-loops"]?.nextWave).toBe(true);
  });

  it("builds a three-step plan with distinct techniques", () => {
    expect(outlook.plan.map((s) => s.kind)).toEqual(["adopt", "experiment", "build"]);
    expect(new Set(outlook.plan.map((s) => s.technique)).size).toBe(3);
  });

  it("surfaces only fresh posts as early signals, best first", () => {
    expect(outlook.earlySignals.map((i) => i.id)).toEqual(expect.arrayContaining(["l1", "l2", "l3"]));
    expect(outlook.earlySignals.map((i) => i.id)).not.toContain("l4");
    const ranks = outlook.earlySignals.map((i) => i.rank);
    expect(ranks).toEqual(ranks.toSorted((a, b) => b - a));
  });
});

describe("breakoutScore and verdictOf", () => {
  it("rewards acceleration and penalises mainstream share", () => {
    const base = { freshShare: 50, avgRank: 50, sources: ["x", "reddit"] as const, share: 5 };
    expect(breakoutScore({ ...base, sources: [...base.sources], velocity: 3 })).toBeGreaterThan(breakoutScore({ ...base, sources: [...base.sources], velocity: 0.5 }));
    expect(breakoutScore({ ...base, sources: [...base.sources], velocity: 1, share: 2 })).toBeGreaterThan(breakoutScore({ ...base, sources: [...base.sources], velocity: 1, share: 30 }));
  });

  it("adopts hot and accelerating, tries rising, watches the rest", () => {
    expect(verdictOf({ momentum: "hot", velocity: 1.2 }, 40)).toBe("adopt");
    expect(verdictOf({ momentum: "hot", velocity: 0.5 }, 40)).toBe("watch");
    expect(verdictOf({ momentum: "rising", velocity: null }, 30)).toBe("try");
    expect(verdictOf({ momentum: "steady", velocity: 1 }, 65)).toBe("try");
  });
});
