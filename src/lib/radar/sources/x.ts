import { z } from "zod";
import { fetchJson } from "../http";
import type { RawItem, SourceAdapter } from "../types";

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

export const xSource: SourceAdapter = {
  id: "x",
  label: "X",
  isEnabled: () => Boolean(process.env.X_BEARER_TOKEN),
  setupHint: "Add an X API bearer token as X_BEARER_TOKEN to include posts from X.",
  async fetchItems() {
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
