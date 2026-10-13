# AI Pulse Radar

A web app that scans X, Hacker News, Reddit and GitHub for what people are actually building with AI, ranks every signal, and groups them by technique (agents, MCP, RAG, fine-tuning, local models and more) so you can see which tools and methods are gaining momentum before choosing a stack for your next AI app.

## What it does

- **Pulls four sources in parallel.** Hacker News (Algolia API), Reddit (top of the day across AI subreddits), GitHub (new repos by topic, sorted by stars) and X (API v2 recent search, when you add a token). One failing source never blocks the others, and the sidebar shows the health of each.
- **Ranks signals 0 to 100.** Engagement is log-scaled and normalised per source, so 80 stars on a new repo can compete with 800 points on HN. Freshness halves every 24 hours, and items that name specific techniques get a small boost.
- **Tags techniques.** A regex taxonomy in `src/lib/radar/taxonomy.ts` tags each item, and the "Technique momentum" panel sums rank per technique so you see where the energy is.
- **Dedupes cross-posts** by canonical URL, keeping the best-ranked copy.
- **Caches for 15 minutes** with Next.js Cache Components (`"use cache"` with a custom `radar` profile), with a Rescan button that invalidates the cache on demand.
- **JSON feed** at `/api/radar` for scripts, digests or other apps.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional, every key is optional
npm run dev
```

Open http://localhost:3000.

| Variable | Needed for |
| --- | --- |
| `X_BEARER_TOKEN` | Turns on the X source. Recent search needs a paid X API tier. |
| `X_QUERY` | Custom X search, for example a list of accounts to follow. |
| `GITHUB_TOKEN` | Higher GitHub search rate limit. |
| `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` | Reddit OAuth, for hosts where anonymous requests are blocked. |
| `REDDIT_SUBREDDITS` | Comma-separated subreddits to scan. |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types and runs `tsc` |
| `npm test` | Vitest unit tests for parsing, ranking and tagging |

CI runs all of these on every push and pull request.

## Project layout

```
src/
  app/                    page, server action, /api/radar route
  components/             radar-dashboard.tsx (client-side filters and cards)
  lib/radar/
    sources/              one adapter per platform, each validated with zod
    taxonomy.ts           technique definitions and matching
    rank.ts               ranking, dedupe and trend aggregation
    snapshot.ts           runs all adapters and builds a snapshot
    get-radar.ts          cached entry point used by the page and API
```

### Adding a platform

Write a `SourceAdapter` in `src/lib/radar/sources/` (an `id`, `isEnabled()` and `fetchItems()` returning `RawItem[]`), add a fixture-backed test, and register it in `sources/index.ts`. Add the id to `SOURCE_IDS` in `types.ts` and a badge style in the dashboard.

## Deploying

Deploys to Vercel with no extra configuration. Add the environment variables in the project settings.
