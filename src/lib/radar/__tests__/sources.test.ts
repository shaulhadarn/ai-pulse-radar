import { describe, expect, it } from "vitest";
import { githubSearchSchema, parseGitHub } from "../sources/github";
import { hnResponseSchema, parseHackerNews } from "../sources/hackernews";
import { parseReddit, parseRedditFeed, redditListingSchema } from "../sources/reddit";
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

  it("parses the Atom feed used when the JSON API is blocked", () => {
    const feed = `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><author><name>/u/alice</name></author><category term="LocalLLaMA" label="r/LocalLLaMA"/>
        <content type="html">&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;New quant method &amp;amp; results&lt;/p&gt;&lt;/div&gt; submitted by &lt;a href=&quot;https://www.reddit.com/user/alice&quot;&gt; /u/alice &lt;/a&gt; &lt;br/&gt; &lt;span&gt;&lt;a href=&quot;https://huggingface.co/x/y&quot;&gt;[link]&lt;/a&gt;&lt;/span&gt;</content>
        <id>t3_abc123</id><link href="https://www.reddit.com/r/LocalLLaMA/comments/abc123/new_quant/" />
        <updated>2026-10-13T01:00:00+00:00</updated><published>2026-10-13T00:30:00+00:00</published>
        <title>New quant method &amp; results</title></entry>
    </feed>`;
    const [item] = parseRedditFeed(feed);
    expect(item).toMatchObject({
      id: "reddit:abc123",
      title: "New quant method & results",
      url: "https://huggingface.co/x/y",
      discussionUrl: "https://www.reddit.com/r/LocalLLaMA/comments/abc123/new_quant/",
      author: "alice",
      channel: "r/LocalLLaMA",
      publishedAt: "2026-10-13T00:30:00.000Z",
    });
    expect(item.summary).toBe("New quant method & results");
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
