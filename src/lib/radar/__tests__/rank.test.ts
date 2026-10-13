import { describe, expect, it } from "vitest";
import { canonicalUrl, computeTrends, dedupe, rankItems } from "../rank";
import type { RawItem } from "../types";

const now = new Date("2026-10-13T12:00:00Z");

function item(overrides: Partial<RawItem> & Pick<RawItem, "id">): RawItem {
  return {
    source: "hackernews",
    title: "Untitled",
    url: `https://example.com/${overrides.id}`,
    publishedAt: "2026-10-13T10:00:00Z",
    engagement: { score: 10, comments: 0 },
    ...overrides,
  };
}

describe("rankItems", () => {
  it("ranks higher engagement above lower within a source", () => {
    const ranked = rankItems(
      [item({ id: "a", engagement: { score: 10 } }), item({ id: "b", engagement: { score: 900, comments: 300 } })],
      now,
    );
    expect(ranked.map((i) => i.id)).toEqual(["b", "a"]);
    expect(ranked[0].rank).toBeLessThanOrEqual(100);
  });

  it("normalises engagement per source so small sources still compete", () => {
    const ranked = rankItems(
      [
        item({ id: "hn", source: "hackernews", engagement: { score: 1000 } }),
        item({ id: "gh", source: "github", engagement: { score: 80 } }),
      ],
      now,
    );
    expect(ranked[0].rank).toBeCloseTo(ranked[1].rank, 0);
  });

  it("decays old items", () => {
    const [fresh, stale] = rankItems(
      [item({ id: "fresh" }), item({ id: "stale", publishedAt: "2026-10-10T10:00:00Z" })],
      now,
    );
    expect(fresh.id).toBe("fresh");
    expect(fresh.rank).toBeGreaterThan(stale.rank);
  });

  it("attaches techniques", () => {
    const [ranked] = rankItems([item({ id: "a", title: "Claude Code agents with MCP" })], now);
    expect(ranked.techniques).toEqual(expect.arrayContaining(["agents", "mcp-tools", "coding-agents", "frontier-models"]));
  });
});

describe("dedupe", () => {
  it("keeps the best-ranked copy of the same link", () => {
    const ranked = rankItems(
      [
        item({ id: "hn", url: "https://www.example.com/post/?utm_source=hn", engagement: { score: 500 } }),
        item({ id: "rd", source: "reddit", url: "https://example.com/post", engagement: { score: 1 } }),
      ],
      now,
    );
    const result = dedupe(ranked);
    expect(result).toHaveLength(1);
  });

  it("canonicalises common URL variants", () => {
    expect(canonicalUrl("https://twitter.com/a/status/1")).toBe(canonicalUrl("https://x.com/a/status/1"));
    expect(canonicalUrl("https://old.reddit.com/r/x/")).toBe(canonicalUrl("https://www.reddit.com/r/x"));
  });
});

describe("computeTrends", () => {
  it("aggregates heat and sources per technique", () => {
    const ranked = rankItems(
      [
        item({ id: "1", title: "RAG with rerankers" }),
        item({ id: "2", source: "reddit", title: "My RAG pipeline" }),
        item({ id: "3", title: "New benchmark for evals" }),
      ],
      now,
    );
    const trends = computeTrends(ranked);
    const rag = trends.find((t) => t.technique === "rag");
    expect(rag?.mentions).toBe(2);
    expect(rag?.sources.sort()).toEqual(["hackernews", "reddit"]);
    expect(trends[0].technique).toBe("rag");
  });
});
