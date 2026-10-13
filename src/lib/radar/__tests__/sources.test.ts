import { describe, expect, it } from "vitest";
import { githubSearchSchema, parseGitHub } from "../sources/github";
import { hnResponseSchema, parseHackerNews } from "../sources/hackernews";
import { parseReddit, redditListingSchema } from "../sources/reddit";
import { parseX, xSearchSchema } from "../sources/x";
import githubFixture from "./fixtures/github.json";
import hnFixture from "./fixtures/hackernews.json";
import redditFixture from "./fixtures/reddit.json";
import xFixture from "./fixtures/x.json";

describe("Hacker News adapter", () => {
  it("keeps AI stories, drops the rest, and links the thread", () => {
    const items = parseHackerNews(hnResponseSchema.parse(hnFixture));
    expect(items.map((i) => i.id)).toEqual(["hackernews:1001", "hackernews:1003"]);
    expect(items[0]).toMatchObject({
      url: "https://simonwillison.net/2026/Oct/12/mcp/",
      discussionUrl: "https://news.ycombinator.com/item?id=1001",
      engagement: { score: 412, comments: 188 },
    });
    // Ask HN posts have no url, so they point at the thread.
    expect(items[1].url).toBe("https://news.ycombinator.com/item?id=1003");
  });
});

describe("Reddit adapter", () => {
  it("parses posts and skips stickied ones", () => {
    const items = parseReddit(redditListingSchema.parse(redditFixture));
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ channel: "r/LocalLLaMA", url: "https://huggingface.co/Qwen/Qwen3-Next" });
    expect(items[1].url).toBe(items[1].discussionUrl);
  });
});

describe("GitHub adapter", () => {
  it("maps repos and folds topics into the summary", () => {
    const [repo] = parseGitHub(githubSearchSchema.parse(githubFixture));
    expect(repo).toMatchObject({ id: "github:42", title: "acme/agent-kit", engagement: { score: 1530, comments: 77 } });
    expect(repo.summary).toContain("Topics: ai-agents, mcp");
  });
});

describe("X adapter", () => {
  it("resolves usernames and weights reposts", () => {
    const [post] = parseX(xSearchSchema.parse(xFixture));
    expect(post).toMatchObject({ author: "@karpathy", url: "https://x.com/karpathy/status/777" });
    expect(post.engagement.score).toBe(1000 + 2 * 200 + 2 * 50);
    expect(post.title).not.toContain("t.co");
  });
});
