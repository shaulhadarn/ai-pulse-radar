import { describe, expect, it } from "vitest";
import { buildInsights, momentumOf, velocityOf } from "../insights";
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

describe("buildInsights", () => {
  it("ranks techniques, attaches evidence and a playbook, and counts tools", () => {
    const insights = buildInsights(
      snapshot([
        raw("1", "Running Claude Code in a Ralph loop until tests pass", "hackernews", 2, 400),
        raw("2", "Agent loops with a verifier beat one-shot prompts", "reddit", 3, 200),
        raw("3", "My agent loop harness for long-running agents", "x", 5),
        raw("4", "Fine-tuning Qwen with LoRA", "github", 40, 5),
      ]),
    );
    const loops = insights.techniques.find((t) => t.technique === "agent-loops");
    expect(loops).toMatchObject({ mentions: 3, momentum: "hot" });
    expect(loops?.evidence[0].id).toBe("1");
    expect(loops?.play.apply).toMatch(/exit condition/);
    expect(insights.tools.map((t) => t.name)).toEqual(expect.arrayContaining(["Claude Code", "Qwen"]));
    expect(insights.headline).toContain("Agent loops");
    expect(loops?.sourceMix).toEqual({ hackernews: 1, reddit: 1, x: 1, github: 0 });
    expect(loops?.activity.at(-1)).toBe(3);
    expect(loops?.related.map((r) => r.technique)).toContain("coding-agents");
    // Talked about everywhere, no repos yet: the strongest opportunity.
    expect(insights.opportunities[0].technique).toBe("agent-loops");
    expect(insights.pulse).toMatchObject({ totalSignals: 4, last24h: 3 });
  });

  it("handles an empty scan", () => {
    expect(buildInsights(snapshot([])).headline).toMatch(/No signals/);
  });
});

describe("momentumOf", () => {
  it("separates hot, rising, emerging and steady", () => {
    expect(momentumOf({ share: 20, avgRank: 50, freshShare: 10, mentions: 30, sources: 3 })).toBe("hot");
    expect(momentumOf({ share: 4, avgRank: 55, freshShare: 70, mentions: 6, sources: 1 })).toBe("rising");
    expect(momentumOf({ share: 2, avgRank: 60, freshShare: 10, mentions: 2, sources: 1 })).toBe("emerging");
    expect(momentumOf({ share: 3, avgRank: 30, freshShare: 10, mentions: 9, sources: 2 })).toBe("steady");
  });
});

describe("velocityOf", () => {
  it("compares the last 12 hours with the 36 before", () => {
    expect(velocityOf([1, 2])).toBeNull();
    expect(velocityOf([1, 2, 3, 20, 30, 40])).toBeCloseTo((3 / 12) / (3 / 36));
    expect(velocityOf([20, 25, 30, 40])).toBe(0);
  });
});
