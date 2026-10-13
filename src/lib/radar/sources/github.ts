import { z } from "zod";
import { fetchJson, hoursAgo } from "../http";
import type { RawItem, SourceAdapter } from "../types";

/** One search per topic, since GitHub search cannot OR topics together. */
export const GITHUB_TOPICS = ["llm", "ai-agents", "mcp", "rag", "generative-ai"];
const LOOKBACK_DAYS = 14;
const MIN_STARS = 30;

const repoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  html_url: z.string(),
  description: z.string().nullish(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  language: z.string().nullish(),
  created_at: z.string(),
  owner: z.object({ login: z.string() }),
  topics: z.array(z.string()).nullish(),
});

export const githubSearchSchema = z.object({ items: z.array(repoSchema) });

export function parseGitHub(data: z.infer<typeof githubSearchSchema>): RawItem[] {
  return data.items.map((repo) => ({
    id: `github:${repo.id}`,
    source: "github",
    title: repo.full_name,
    url: repo.html_url,
    author: repo.owner.login,
    channel: repo.language ?? undefined,
    // Topics carry strong technique signal (e.g. "rag", "mcp-server"), so fold them into the summary.
    summary: [repo.description, repo.topics?.length ? `Topics: ${repo.topics.join(", ")}` : ""].filter(Boolean).join(" · "),
    publishedAt: repo.created_at,
    engagement: { score: repo.stargazers_count, comments: repo.forks_count },
  }));
}

export const githubSource: SourceAdapter = {
  id: "github",
  label: "GitHub",
  isEnabled: () => true,
  setupHint: "Set GITHUB_TOKEN to raise the API rate limit.",
  async fetchItems(ctx) {
    const since = hoursAgo(LOOKBACK_DAYS * 24).toISOString().slice(0, 10);
    const headers: Record<string, string> = { "X-GitHub-Api-Version": "2022-11-28" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const results = await Promise.allSettled(
      GITHUB_TOPICS.map((topic) => {
        const q = `topic:${topic} created:>${since} stars:>${MIN_STARS}`;
        const params = new URLSearchParams({ q, sort: "stars", order: "desc", per_page: "30" });
        return fetchJson(`https://api.github.com/search/repositories?${params}`, { schema: githubSearchSchema, headers, jina: true, ctx });
      }),
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    if (!ok.length) throw (results[0] as PromiseRejectedResult).reason;
    return ok.flatMap((r) => parseGitHub(r.value));
  },
};
