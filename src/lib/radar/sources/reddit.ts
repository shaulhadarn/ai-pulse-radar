import { z } from "zod";
import { fetchJson } from "../http";
import type { RawItem, SourceAdapter } from "../types";

export const DEFAULT_SUBREDDITS = ["LocalLLaMA", "MachineLearning", "ClaudeAI", "OpenAI", "singularity", "ChatGPTCoding", "AI_Agents"];

const postSchema = z.object({
  data: z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().nullish(),
    permalink: z.string(),
    author: z.string().nullish(),
    subreddit: z.string(),
    score: z.number(),
    num_comments: z.number(),
    created_utc: z.number(),
    selftext: z.string().nullish(),
    stickied: z.boolean().nullish(),
    over_18: z.boolean().nullish(),
  }),
});

export const redditListingSchema = z.object({
  data: z.object({ children: z.array(postSchema) }),
});

const tokenSchema = z.object({ access_token: z.string() });

export function parseReddit(listing: z.infer<typeof redditListingSchema>): RawItem[] {
  return listing.data.children.flatMap(({ data: post }): RawItem[] => {
    if (post.stickied || post.over_18) return [];
    const discussionUrl = `https://www.reddit.com${post.permalink}`;
    const isSelfPost = !post.url || post.url.includes(post.permalink);
    return [
      {
        id: `reddit:${post.id}`,
        source: "reddit",
        title: post.title.trim(),
        url: isSelfPost ? discussionUrl : post.url!,
        discussionUrl,
        author: post.author ?? undefined,
        channel: `r/${post.subreddit}`,
        summary: post.selftext ? post.selftext.replace(/\s+/g, " ").slice(0, 280) : undefined,
        publishedAt: new Date(post.created_utc * 1000).toISOString(),
        engagement: { score: post.score, comments: post.num_comments },
      },
    ];
  });
}

function subreddits(): string[] {
  const fromEnv = process.env.REDDIT_SUBREDDITS?.split(",").map((s) => s.trim()).filter(Boolean);
  return fromEnv?.length ? fromEnv : DEFAULT_SUBREDDITS;
}

/**
 * Reddit blocks many anonymous requests from cloud hosts. With app credentials
 * (a free "script" app at reddit.com/prefs/apps) we use the OAuth API instead.
 */
async function getAppToken(): Promise<string | undefined> {
  const id = process.env.REDDIT_CLIENT_ID;
  const secret = process.env.REDDIT_CLIENT_SECRET;
  if (!id || !secret) return undefined;
  const { access_token } = await fetchJson("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    schema: tokenSchema,
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  return access_token;
}

export const redditSource: SourceAdapter = {
  id: "reddit",
  label: "Reddit",
  isEnabled: () => true,
  setupHint: "If Reddit blocks anonymous requests, set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.",
  async fetchItems() {
    const token = await getAppToken();
    const base = token ? "https://oauth.reddit.com" : "https://www.reddit.com";
    const path = `/r/${subreddits().join("+")}/top${token ? "" : ".json"}?t=day&limit=100&raw_json=1`;
    const listing = await fetchJson(base + path, {
      schema: redditListingSchema,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return parseReddit(listing);
  },
};
