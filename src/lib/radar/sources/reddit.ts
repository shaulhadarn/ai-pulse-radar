import { z } from "zod";
import { fetchJson, isBlocked } from "../http";
import { extractJson, jinaMode, readWithJina } from "../jina";
import type { FetchContext, RawItem, SourceAdapter } from "../types";

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
  const fromEnv = process.env.REDDIT_SUBREDDITS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

/** Atom feed entries (`/top/.rss`). Feeds carry no vote counts, so ranking treats them as neutral. */
export function parseRedditFeed(xml: string): RawItem[] {
  const decode = (s: string) =>
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].flatMap(([, entry]): RawItem[] => {
    const tag = (name: string) => entry.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1];
    const id = tag("id")?.trim().replace(/^t3_/, "");
    const title = tag("title");
    const discussionUrl = entry.match(/<link[^>]*href="([^"]+)"/)?.[1];
    const published = tag("published") ?? tag("updated");
    if (!id || !title || !discussionUrl || !published) return [];
    const html = decode(tag("content") ?? "");
    // Link posts put the target behind a "[link]" anchor; self posts point at the thread.
    const linked = html.match(/<a href="([^"]+)">\[link\]<\/a>/)?.[1];
    const text = decode(html.replace(/<[^>]+>/g, " "))
      .replace(/submitted by[\s\S]*$/, "")
      .replace(/\s+/g, " ")
      .trim();
    const subreddit = entry.match(/<category[^>]*term="([^"]+)"/)?.[1];
    return [
      {
        id: `reddit:${id}`,
        source: "reddit",
        title: decode(title).trim(),
        url: linked ?? decode(discussionUrl),
        discussionUrl: decode(discussionUrl),
        author: tag("name")
          ?.trim()
          .replace(/^\/u\//, ""),
        channel: subreddit ? `r/${subreddit}` : undefined,
        summary: text ? text.slice(0, 280) : undefined,
        publishedAt: new Date(published.trim()).toISOString(),
        engagement: { score: 0 },
      },
    ];
  });
}

/**
 * Reddit blocks Vercel and also Jina's own servers on www.reddit.com, so when
 * the direct call is refused we try other Reddit hosts and the RSS feed through Jina.
 */
async function fetchViaJinaRoutes(query: string, ctx: FetchContext): Promise<RawItem[]> {
  const json = (host: string, headers?: Record<string, string>) => async () =>
    parseReddit(redditListingSchema.parse(extractJson(await readWithJina(`https://${host}${query.replace("/top?", "/top.json?")}`, { headers }))));
  const routes: { name: string; load: () => Promise<RawItem[]> }[] = [
    { name: "www", load: json("www.reddit.com") },
    // Jina can route a read through a proxy, which Reddit may not block.
    { name: "proxy", load: json("www.reddit.com", { "X-Proxy": "auto" }) },
    { name: "api", load: json("api.reddit.com") },
    ...(["markdown", "text"] as const).map((format) => ({
      name: `rss-${format}`,
      load: async () => {
        const out = await readWithJina(`https://www.reddit.com${query.replace("/top?", "/top/.rss?")}`, { format });
        throw new Error(`DEBUG ${out.length}: ${out.slice(0, 1200).replace(/\s+/g, " ")}`);
      },
    })),
  ];
  const errors: string[] = [];
  for (const route of routes) {
    try {
      const items = await route.load();
      ctx.usedJina();
      return items;
    } catch (err) {
      errors.push(`${route.name}: ${(err as Error).message.slice(0, route.name.startsWith("rss") ? 1300 : 90)}`);
    }
  }
  throw new Error(`Jina could not read Reddit (${errors.join(" | ")})`);
}

export const redditSource: SourceAdapter = {
  id: "reddit",
  label: "Reddit",
  isEnabled: () => true,
  setupHint: "Reddit blocks many cloud hosts. Jina Reader is used as a fallback, or set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET.",
  async fetchItems(ctx) {
    const token = await getAppToken();
    const query = `/r/${subreddits().join("+")}/top?t=day&limit=100&raw_json=1`;
    if (token) {
      const listing = await fetchJson(`https://oauth.reddit.com${query}`, {
        schema: redditListingSchema,
        headers: { Authorization: `Bearer ${token}` },
      });
      return parseReddit(listing);
    }

    const mode = jinaMode();
    if (mode === "always") return fetchViaJinaRoutes(query, ctx);
    try {
      return parseReddit(await fetchJson(`https://www.reddit.com${query.replace("/top?", "/top.json?")}`, { schema: redditListingSchema }));
    } catch (err) {
      if (mode === "off" || !isBlocked(err)) throw err;
      return fetchViaJinaRoutes(query, ctx);
    }
  },
};
