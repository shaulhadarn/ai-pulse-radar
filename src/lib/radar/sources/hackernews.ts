import { z } from "zod";
import { fetchJson, hoursAgo } from "../http";
import { isAiRelated } from "../taxonomy";
import type { RawItem, SourceAdapter } from "../types";

const hitSchema = z.object({
  objectID: z.string(),
  title: z.string().nullish(),
  url: z.string().nullish(),
  author: z.string().nullish(),
  points: z.number().nullish(),
  num_comments: z.number().nullish(),
  created_at_i: z.number(),
  story_text: z.string().nullish(),
});

export const hnResponseSchema = z.object({ hits: z.array(hitSchema) });

const LOOKBACK_HOURS = 48;
const MIN_POINTS = 25;

export function parseHackerNews(data: z.infer<typeof hnResponseSchema>): RawItem[] {
  return data.hits.flatMap((hit): RawItem[] => {
    const title = hit.title?.trim();
    if (!title) return [];
    const summary = hit.story_text ? stripHtml(hit.story_text).slice(0, 280) : undefined;
    if (!isAiRelated(`${title} ${summary ?? ""}`)) return [];
    const discussionUrl = `https://news.ycombinator.com/item?id=${hit.objectID}`;
    return [
      {
        id: `hackernews:${hit.objectID}`,
        source: "hackernews",
        title,
        url: hit.url || discussionUrl,
        discussionUrl,
        author: hit.author ?? undefined,
        summary,
        publishedAt: new Date(hit.created_at_i * 1000).toISOString(),
        engagement: { score: hit.points ?? 0, comments: hit.num_comments ?? 0 },
      },
    ];
  });
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

export const hackerNewsSource: SourceAdapter = {
  id: "hackernews",
  label: "Hacker News",
  isEnabled: () => true,
  async fetchItems(ctx) {
    const since = Math.floor(hoursAgo(LOOKBACK_HOURS).getTime() / 1000);
    const params = new URLSearchParams({
      tags: "story",
      numericFilters: `created_at_i>${since},points>${MIN_POINTS}`,
      hitsPerPage: "300",
    });
    const data = await fetchJson(`https://hn.algolia.com/api/v1/search_by_date?${params}`, {
      schema: hnResponseSchema,
      jina: true,
      ctx,
    });
    return parseHackerNews(data);
  },
};
