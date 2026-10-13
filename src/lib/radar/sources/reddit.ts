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

const arcticSchema = z.object({
  data: z.array(postSchema.shape.data.extend({ removed_by_category: z.string().nullish() })),
});

/** Posts kept per subreddit from the archive, so busy subreddits don't flood the radar. */
const ARCHIVE_PER_SUBREDDIT = 10;

/**
 * Arctic Shift (https://arctic-shift.photon-reddit.com) archives Reddit posts and
 * serves them without a key. It records votes minutes after posting, so they are
 * only used to pick each subreddit's liveliest posts, then dropped so ranking
 * treats Reddit's engagement as unknown rather than near zero.
 */
async function fetchFromArcticShift(now = Date.now()): Promise<RawItem[]> {
  const after = Math.floor(now / 1000) - 24 * 3600;
  const lists = await Promise.all(
    subreddits().map((sub) =>
      fetchJson(`https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(sub)}&after=${after}&limit=100&sort=desc`, {
        schema: arcticSchema,
        timeoutMs: 15_000,
      }),
    ),
  );
  return lists.flatMap((list) => {
    const live = list.data
      .filter((post) => !post.removed_by_category && !/^\[ ?(removed|deleted)/i.test(post.title) && post.selftext !== "[removed]")
      .toSorted((a, b) => b.score + 2 * b.num_comments - (a.score + 2 * a.num_comments))
      .slice(0, ARCHIVE_PER_SUBREDDIT);
    return parseReddit({ data: { children: live.map((data) => ({ data })) } }).map((item) => ({ ...item, engagement: { score: 0 } }));
  });
}

export const redditSource: SourceAdapter = {
  id: "reddit",
  label: "Reddit",
  isEnabled: () => true,
  setupHint: "Reddit blocks cloud hosts and Jina, so posts come from the Arctic Shift archive. Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for live scores.",
  async fetchItems(ctx) {
    const token = await getAppToken();
    const path = `/r/${subreddits().join("+")}/top${token ? "" : ".json"}?t=day&limit=100&raw_json=1`;
    if (token) {
      return parseReddit(await fetchJson(`https://oauth.reddit.com${path}`, { schema: redditListingSchema, headers: { Authorization: `Bearer ${token}` } }));
    }
    try {
      return parseReddit(await fetchJson(`https://www.reddit.com${path}`, { schema: redditListingSchema, jina: true, ctx }));
    } catch (err) {
      // Reddit blocks Vercel and Jina's servers alike, so fall back to an archive of public posts.
      try {
        return await fetchFromArcticShift();
      } catch (archiveErr) {
        throw new Error(`${(err as Error).message}; Arctic Shift failed: ${(archiveErr as Error).message}`);
      }
    }
  },
};
