import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { fetchJson } from "../http";
import { extractJson, jinaMode } from "../jina";
import { redditSource } from "../sources/reddit";
import { parseXProfileMarkdown, snowflakeToDate } from "../sources/x";

const schema = z.object({ ok: z.boolean() });

function mockFetch(handler: (url: string) => Response) {
  const fn = vi.fn(async (input: RequestInfo | URL) => handler(String(input)));
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("jinaMode", () => {
  it("defaults to fallback and accepts off/always", () => {
    expect(jinaMode()).toBe("fallback");
    vi.stubEnv("JINA_MODE", "always");
    expect(jinaMode()).toBe("always");
    vi.stubEnv("JINA_MODE", "OFF");
    expect(jinaMode()).toBe("off");
  });
});

describe("extractJson", () => {
  it("strips a Jina header before the body", () => {
    expect(extractJson('Title: \nURL Source: https://x\n\nMarkdown Content:\n{"ok":true}\n')).toEqual({ ok: true });
  });
});

describe("fetchJson with Jina", () => {
  it("retries through Jina when the source blocks us", async () => {
    const fetchMock = mockFetch((url) => (url.startsWith("https://r.jina.ai/") ? new Response('{"ok":true}') : new Response("blocked", { status: 403 })));
    const usedJina = vi.fn();
    await expect(fetchJson("https://www.reddit.com/r/a.json", { schema, jina: true, ctx: { usedJina } })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe("https://r.jina.ai/https://www.reddit.com/r/a.json");
    expect(usedJina).toHaveBeenCalled();
  });

  it("does not use Jina for requests that did not opt in, or when it is off", async () => {
    mockFetch(() => new Response("blocked", { status: 403 }));
    await expect(fetchJson("https://example.com/a", { schema })).rejects.toThrow("HTTP 403");
    vi.stubEnv("JINA_MODE", "off");
    await expect(fetchJson("https://example.com/a", { schema, jina: true })).rejects.toThrow("HTTP 403");
  });

  it("goes straight to Jina in always mode", async () => {
    vi.stubEnv("JINA_MODE", "always");
    const fetchMock = mockFetch(() => new Response('{"ok":true}'));
    await fetchJson("https://example.com/a", { schema, jina: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://r.jina.ai/https://example.com/a");
  });

  it("reports both failures when the fallback also fails", async () => {
    mockFetch((url) => new Response("no", { status: url.includes("jina") ? 451 : 403 }));
    await expect(fetchJson("https://example.com/a", { schema, jina: true })).rejects.toThrow(/HTTP 403.*Jina fallback failed.*451/);
  });
});

describe("X profiles through Jina", () => {
  // 1977000000000000000 >> 22 encodes a time in 2025-2026; build ids from dates instead.
  const idAt = (iso: string) => ((BigInt(Date.parse(iso) - 1288834974657) << BigInt(22)) + BigInt(7)).toString();
  const now = new Date("2026-10-13T12:00:00Z");

  it("decodes snowflake ids to dates", () => {
    expect(snowflakeToDate(idAt("2026-10-12T08:00:00Z")).toISOString()).toBe("2026-10-12T08:00:00.000Z");
  });

  it("splits a profile page into recent posts", () => {
    const fresh = idAt("2026-10-12T08:00:00Z");
    const fresh2 = idAt("2026-10-11T08:00:00Z");
    const old = idAt("2026-08-01T08:00:00Z");
    const markdown = `
Andrej Karpathy
@karpathy

[Oct 12](https://x.com/karpathy/status/${fresh})

New post on context engineering: why agents need a scratchpad, not a bigger window.

[42](https://x.com/karpathy/status/${fresh}/analytics)

[Oct 11](https://x.com/karpathy/status/${fresh2})

Tried the new open weights model on llama.cpp and it is very fast for local inference.

![Image](https://pbs.twimg.com/media/x.jpg)

[Aug 1](https://x.com/karpathy/status/${old})

An old post that is too old to keep around.
`;
    const items = parseXProfileMarkdown(markdown, "karpathy", now);
    expect(items.map((i) => i.id)).toEqual([`x:${fresh}`, `x:${fresh2}`]);
    expect(items[0]).toMatchObject({
      title: "New post on context engineering: why agents need a scratchpad, not a bigger window.",
      url: `https://x.com/karpathy/status/${fresh}`,
      author: "@karpathy",
      publishedAt: "2026-10-12T08:00:00.000Z",
    });
    expect(items[1].title).not.toContain("pbs.twimg.com");
  });
});

describe("Reddit fallback", () => {
  it("reads the Arctic Shift archive when Reddit blocks both us and Jina", async () => {
    const post = {
      id: "abc",
      title: "New MCP server for agents",
      url: null,
      permalink: "/r/LocalLLaMA/comments/abc/x/",
      author: "a",
      subreddit: "LocalLLaMA",
      score: 12,
      num_comments: 3,
      created_utc: 1_791_800_000,
    };
    const fetchMock = mockFetch((url) => {
      if (url.startsWith("https://arctic-shift.photon-reddit.com/"))
        return Response.json({ data: [post, { ...post, id: "gone", title: "[ Removed by moderator ]", removed_by_category: "moderator" }] });
      if (url.startsWith("https://r.jina.ai/")) return new Response("You've been blocked by network security.");
      return new Response("blocked", { status: 403 });
    });
    vi.stubEnv("REDDIT_SUBREDDITS", "LocalLLaMA");
    const items = await redditSource.fetchItems({ usedJina: vi.fn() });
    expect(items).toMatchObject([{ id: "reddit:abc", channel: "r/LocalLLaMA", engagement: { score: 0 } }]);
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("subreddit=LocalLLaMA");
  });
});
