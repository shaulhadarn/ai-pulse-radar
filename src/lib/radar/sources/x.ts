import { z } from "zod";
import { fetchJson } from "../http";
import { jinaMode, readWithJina } from "../jina";
import type { FetchContext, RawItem, SourceAdapter } from "../types";

/**
 * Default search. Override with X_QUERY, for example to follow specific people:
 * `(from:karpathy OR from:simonw OR from:swyx) -is:retweet`
 */
export const DEFAULT_X_QUERY =
  '(LLM OR "AI agent" OR "AI agents" OR MCP OR RAG OR "fine-tuning" OR "open weights" OR "reasoning model" OR "Claude Code") -is:retweet -is:reply lang:en has:links';

const tweetSchema = z.object({
  id: z.string(),
  text: z.string(),
  author_id: z.string().nullish(),
  created_at: z.string(),
  public_metrics: z
    .object({ like_count: z.number(), retweet_count: z.number(), reply_count: z.number(), quote_count: z.number().nullish() })
    .nullish(),
});

export const xSearchSchema = z.object({
  data: z.array(tweetSchema).nullish(),
  includes: z.object({ users: z.array(z.object({ id: z.string(), username: z.string() })).nullish() }).nullish(),
});

export function parseX(res: z.infer<typeof xSearchSchema>): RawItem[] {
  const usernames = new Map(res.includes?.users?.map((u) => [u.id, u.username]));
  return (res.data ?? []).map((tweet) => {
    const username = tweet.author_id ? usernames.get(tweet.author_id) : undefined;
    const url = `https://x.com/${username ?? "i"}/status/${tweet.id}`;
    const m = tweet.public_metrics;
    const text = tweet.text.replace(/https:\/\/t\.co\/\S+/g, "").replace(/\s+/g, " ").trim();
    return {
      id: `x:${tweet.id}`,
      source: "x",
      title: text.length > 140 ? `${text.slice(0, 137)}…` : text,
      summary: text.length > 140 ? text : undefined,
      url,
      discussionUrl: url,
      author: username ? `@${username}` : undefined,
      publishedAt: tweet.created_at,
      engagement: {
        score: m ? m.like_count + 2 * m.retweet_count + 2 * (m.quote_count ?? 0) : 0,
        comments: m?.reply_count ?? 0,
      },
    } satisfies RawItem;
  });
}

/** AI builders and labs whose profiles are read through Jina when there is no X API key. Override with X_ACCOUNTS. */
export const DEFAULT_X_ACCOUNTS = [
  "karpathy",
  "simonw",
  "swyx",
  "AnthropicAI",
  "OpenAI",
  "GoogleDeepMind",
  "huggingface",
  "_akhaliq",
  "omarsar0",
  "rasbt",
];

const X_EPOCH_MS = 1288834974657;
const MAX_POST_AGE_DAYS = 7;

/** Post ids are Snowflakes, so the creation time is encoded in the id itself. */
export function snowflakeToDate(id: string): Date {
  return new Date(Number(BigInt(id) >> BigInt(22)) + X_EPOCH_MS);
}

/**
 * Pulls posts out of a profile page rendered to markdown by Jina Reader. On
 * x.com each post opens with its timestamp, which links to `/status/<id>`, so a
 * post's text runs from its first status link to the next post's first link.
 */
export function parseXProfileMarkdown(markdown: string, handle: string, now = new Date()): RawItem[] {
  const statusLink = new RegExp(`(?:\\[[^\\]]*\\])?\\(https://(?:x|twitter)\\.com/${handle}/status/(\\d+)[^)]*\\)`, "gi");
  const firstLinks: { id: string; start: number; end: number }[] = [];
  for (const match of markdown.matchAll(statusLink)) {
    if (!firstLinks.some((l) => l.id === match[1])) {
      firstLinks.push({ id: match[1], start: match.index, end: match.index + match[0].length });
    }
  }

  return firstLinks.flatMap((link, i): RawItem[] => {
    const text = cleanMarkdown(markdown.slice(link.end, firstLinks[i + 1]?.start ?? markdown.length));
    const publishedAt = snowflakeToDate(link.id);
    const ageDays = (now.getTime() - publishedAt.getTime()) / 86_400_000;
    if (text.length < 20 || ageDays > MAX_POST_AGE_DAYS || ageDays < -1) return [];

    const url = `https://x.com/${handle}/status/${link.id}`;
    return [
      {
        id: `x:${link.id}`,
        source: "x",
        title: text.length > 140 ? `${text.slice(0, 137)}…` : text,
        summary: text.length > 140 ? text.slice(0, 400) : undefined,
        url,
        discussionUrl: url,
        author: `@${handle}`,
        publishedAt: publishedAt.toISOString(),
        // Profile pages don't expose reliable counts, so these rank on freshness and topic.
        engagement: { score: 0 },
      },
    ];
  });
}

function cleanMarkdown(segment: string): string {
  return segment
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links -> their text
    .replace(/https?:\/\/\S+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    // Drop UI chrome: handles, counters, timestamps and short labels.
    .filter((line) => line.length > 3 && !/^(@\w+|[\d.,]+[KM]?|\d+[smhd]|·|Pinned|Quote|Show more|Repost(ed)?|Translate post)$/i.test(line))
    .slice(0, 8)
    .join(" ")
    .replace(/[*_#>`]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function xAccounts(): string[] {
  const fromEnv = process.env.X_ACCOUNTS?.split(",").map((s) => s.trim().replace(/^@/, "")).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_X_ACCOUNTS;
}

async function fetchProfilesViaJina(ctx: FetchContext): Promise<RawItem[]> {
  const handles = xAccounts();
  const results: PromiseSettledResult<RawItem[]>[] = [];
  // A few at a time keeps us inside Jina's keyless rate limit.
  for (let i = 0; i < handles.length; i += 4) {
    const batch = handles.slice(i, i + 4).map(async (handle) => {
      const markdown = await readWithJina(`https://x.com/${handle}`, { format: "markdown", waitForSelector: "article" });
      return parseXProfileMarkdown(markdown, handle);
    });
    results.push(...(await Promise.allSettled(batch)));
  }
  const ok = results.filter((r) => r.status === "fulfilled");
  if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
  ctx.usedJina();
  return ok.flatMap((r) => r.value);
}

export const xSource: SourceAdapter = {
  id: "x",
  label: "X",
  isEnabled: () => Boolean(process.env.X_BEARER_TOKEN) || jinaMode() !== "off",
  setupHint: "Without X_BEARER_TOKEN, posts are read from public profiles through Jina Reader.",
  async fetchItems(ctx) {
    if (!process.env.X_BEARER_TOKEN) return fetchProfilesViaJina(ctx);
    const params = new URLSearchParams({
      query: process.env.X_QUERY || DEFAULT_X_QUERY,
      max_results: "100",
      sort_order: "relevancy",
      "tweet.fields": "created_at,public_metrics,author_id",
      expansions: "author_id",
      "user.fields": "username",
    });
    const res = await fetchJson(`https://api.x.com/2/tweets/search/recent?${params}`, {
      schema: xSearchSchema,
      headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
    });
    return parseX(res);
  },
};
